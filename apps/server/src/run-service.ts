import { AiStoryService, fallbackOptions } from "./ai-story-service.js";
import { ContentService } from "./content-service.js";
import {
  applyDelta,
  calculateMemoryReward,
  checkDeath,
  createInitialState,
  evaluateAchievements,
  reconcileNarrativeProgress
} from "./rule-engine.js";
import { store, type GameRepository } from "./store.js";
import type { AiStoryOutput, Run, StoryOption } from "./types.js";

export class RunService {
  private readonly ai: AiStoryService;
  private readonly content: ContentService;

  constructor(private readonly repo: GameRepository = store) {
    this.ai = new AiStoryService();
    this.content = new ContentService(this.repo);
  }

  async home(userId: string) {
    const user = await this.repo.ensureUser(userId);
    return {
      user,
      active_run: await this.repo.getActiveRun(userId),
      recent_settlements: await this.repo.listSettlements(userId),
      unlocked_talents_count: (await this.repo.getUnlockedTalentIds(userId)).length
    };
  }

  async newRun(userId: string, talentIds: string[] = [], worldId = "real_common_life") {
    const user = await this.repo.ensureUser(userId);
    const talents = await this.repo.talentsByIds(talentIds);
    const state = createInitialState(talents);
    const run = await this.repo.createRun({
      user_id: user.user_id,
      world_id: worldId,
      status: "active",
      state_json: state,
      selected_talents: talents.map((talent) => talent.talent_id),
      memory_summary: "",
      turn_index: 0
    });
    const initMessage: AiStoryOutput = {
      need_clarify: false,
      ask: "",
      narrative: `你睁开眼，人生又从${state.age}岁开始。上一世的碎片在脑海深处发烫，这一次，你打算先稳住脚步。`,
      state_delta: {},
      options: fallbackOptions(),
      death: { is_dead: false, death_id: "", death_cause: "", ending_id: "", ending_type: "" }
    };
    await this.repo.addMessage(run.run_id, "ai", initMessage);
    await this.repo.track("start_new_run", { world_id: worldId, talents: talentIds }, userId, run.run_id);
    return { run, ai_message: initMessage, options: initMessage.options, state_brief: this.stateBrief(run) };
  }

  async continueRun(userId: string) {
    await this.repo.ensureUser(userId);
    let run = await this.repo.getActiveRun(userId);
    if (!run) run = (await this.newRun(userId)).run;
    await this.repo.track("continue_run", {}, userId, run.run_id);
    return {
      run,
      messages: await this.repo.getMessages(run.run_id),
      options: await this.latestOptions(run.run_id),
      state_brief: this.stateBrief(run)
    };
  }

  async turn(userId: string, input: { run_id: string; input_type: "quick" | "free"; option_id?: string; free_text?: string }) {
    const run = await this.requireActiveRun(userId, input.run_id);
    const userText = input.input_type === "quick" ? this.optionIntent(input.option_id) : (input.free_text ?? "").slice(0, 120);
    await this.repo.addMessage(run.run_id, "user", { input_type: input.input_type, option_id: input.option_id, text: userText });
    await this.repo.track("chat_turn_submit", { input_type: input.input_type, option_id: input.option_id, free_text_len: input.free_text?.length ?? 0 }, userId, run.run_id);

    const world = await this.repo.worldPack(run.world_id);
    if (!world) throw new Error("world not found");
    const eventCard = await this.content.pickEvent(run.world_id, run.state_json);
    const started = Date.now();
    const story = await this.ai.generateTurn({
      worldName: world.name,
      worldRules: world.rules_json,
      state: run.state_json,
      memorySummary: run.memory_summary,
      recentMessages: await this.repo.getMessages(run.run_id),
      eventCard,
      userInput: userText
    });
    const selectedRisk = this.findRiskHint(input.option_id, story.options);
    let nextState = applyDelta(run.state_json, story.state_delta, eventCard.tags_json, selectedRisk);
    nextState = reconcileNarrativeProgress(run.state_json, nextState, story.narrative);
    const deathCheck = checkDeath(nextState, await this.repo.deathCards(), await this.repo.talentsByIds(run.selected_talents));
    nextState = deathCheck.savedState;
    const updatedRun: Run = {
      ...run,
      state_json: nextState,
      turn_index: run.turn_index + 1,
      memory_summary: (run.turn_index + 1) % 5 === 0 ? this.ai.summarizeMemory(await this.repo.getMessages(run.run_id)) : run.memory_summary
    };

    let settlement = undefined;
    if (deathCheck.isDead || story.death.is_dead) {
      updatedRun.status = "ended";
      story.death = {
        is_dead: true,
        death_id: deathCheck.deathCard?.death_id ?? story.death.death_id,
        death_cause: deathCheck.deathCard?.description ?? story.death.death_cause,
        ending_id: story.death.ending_id || "normal_end",
        ending_type: story.death.ending_type || "death"
      };
      story.options = [];
      settlement = await this.createSettlement(updatedRun, story);
    } else if (!story.options.length && !story.ask) {
      story.options = fallbackOptions();
    }

    const savedRun = await this.repo.updateRun(updatedRun);
    await this.repo.addMessage(savedRun.run_id, "ai", story);
    await this.repo.track(
      "ai_response_received",
      { latency_ms: Date.now() - started, output_len: story.narrative.length, options_count: story.options.length, event_id: eventCard.event_id },
      userId,
      run.run_id
    );
    return { ai_message: story, options: story.options, state_brief: this.stateBrief(savedRun), death: story.death, settlement };
  }

  async settle(userId: string, runId: string) {
    const run = await this.repo.getRun(runId);
    if (!run || run.user_id !== userId) throw new Error("run not found");
    return (await this.repo.getSettlement(runId)) ?? await this.createSettlement(run, {
      need_clarify: false,
      ask: "",
      narrative: "这一世暂时画上句号。",
      state_delta: {},
      options: [],
      death: { is_dead: true, death_id: "manual", death_cause: "主动结算", ending_id: "manual", ending_type: "manual" }
    });
  }

  async talentCandidates(userId: string) {
    const user = await this.repo.ensureUser(userId);
    const unlocked = new Set(await this.repo.getUnlockedTalentIds(userId));
    const talents = await this.repo.getContent("talents");
    const available = talents.filter((talent) => talent.status === "enabled" && (unlocked.has(talent.talent_id) || talent.unlock_condition_json.default || user.rebirth_count >= Number(talent.unlock_condition_json.rebirth_count_gte ?? Infinity)));
    return available.slice(0, 5);
  }

  async selectTalents(userId: string, talentIds: string[]) {
    const selected = await this.repo.talentsByIds(talentIds);
    const capacity = selected.reduce((sum, talent) => sum + talent.capacity_cost, 0);
    if (capacity > 3) throw new Error("talent capacity exceeded");
    const user = await this.repo.ensureUser(userId);
    user.rebirth_count += 1;
    await this.repo.updateUser(user);
    const newly = await this.repo.unlockAchievements(userId, evaluateAchievements(createInitialState(selected), await this.repo.achievements(), { rebirthCount: user.rebirth_count, deathId: undefined }));
    await this.repo.track("talent_selected", { talent_ids: talentIds, capacity }, userId);
    return { ...(await this.newRun(userId, talentIds)), unlocked_achievements: newly };
  }

  async atlas(userId: string) {
    const unlocked = new Set(await this.repo.getUnlockedTalentIds(userId));
    return (await this.repo.getContent("talents")).map((talent) => ({ ...talent, unlocked: unlocked.has(talent.talent_id) }));
  }

  async achievements(userId: string) {
    const unlocked = new Set(await this.repo.getUnlockedAchievementIds(userId));
    return (await this.repo.getContent("achievements")).map((achievement) => ({ ...achievement, unlocked: unlocked.has(achievement.achievement_id) }));
  }

  async shareText(userId: string, runId: string) {
    const settlement = await this.settle(userId, runId);
    return {
      text: `《重生一亿次》战报：${settlement.title}\n活到 ${settlement.survived_age} 岁，获得 ${settlement.memory_reward} 记忆碎片。\n${settlement.description}`
    };
  }

  private async createSettlement(run: Run, story: AiStoryOutput) {
    const talents = await this.repo.talentsByIds(run.selected_talents);
    const reward = calculateMemoryReward(run.state_json, talents);
    const user = await this.repo.ensureUser(run.user_id);
    user.memory_balance += reward;
    await this.repo.updateUser(user);
    const achievementIds = evaluateAchievements(run.state_json, await this.repo.achievements(), { rebirthCount: user.rebirth_count, deathId: story.death.death_id });
    const unlockedAchievements = await this.repo.unlockAchievements(run.user_id, achievementIds);
    await this.repo.unlockTalents(run.user_id, ["T006"]);
    await this.repo.track(story.death.ending_type === "death" ? "death_triggered" : "ending_reached", story.death, run.user_id, run.run_id);
    return this.repo.createSettlement({
      run_id: run.run_id,
      user_id: run.user_id,
      title: story.death.death_id === "D002" ? "钱途到此为止" : "这一世落幕",
      description: story.death.death_cause || story.narrative,
      survived_age: run.state_json.age,
      memory_reward: reward,
      unlocked_payload: { talents: ["T006"], achievements: unlockedAchievements },
      report_json: {
        wealth_peak: run.state_json.stats.wealth_peak,
        reputation_peak: run.state_json.stats.reputation_peak,
        key_choices: (await this.repo.getMessages(run.run_id)).filter((message) => message.role === "user").slice(-6).map((message) => JSON.stringify(message.content)),
        death_id: story.death.death_id
      }
    });
  }

  private stateBrief(run: Run) {
    const state = run.state_json;
    return {
      age: state.age,
      attrs: { int: state.int, str: state.str, cha: state.cha, money: state.money, luck: state.luck, risk: state.risk },
      inventory_count: state.inventory.length,
      relations_count: Object.keys(state.relations).length,
      turn_index: run.turn_index,
      status: run.status
    };
  }

  private async latestOptions(runId: string): Promise<StoryOption[]> {
    const latestAi = (await this.repo.getMessages(runId)).reverse().find((message) => message.role === "ai");
    const content = latestAi?.content as { options?: StoryOption[] } | undefined;
    return content?.options?.length ? content.options : fallbackOptions();
  }

  private async requireActiveRun(userId: string, runId: string) {
    const run = await this.repo.getRun(runId);
    if (!run || run.user_id !== userId) throw new Error("run not found");
    if (run.status !== "active") throw new Error("run ended");
    return run;
  }

  private optionIntent(optionId?: string) {
    if (optionId === "A") return "A 稳健选择：优先降低风险，保守推进。";
    if (optionId === "B") return "B 进取选择：承担适中风险，争取更高收益。";
    if (optionId === "C") return "C 高风险选择：赌一次大的，快速推进命运。";
    return "继续观察局势。";
  }

  private findRiskHint(optionId: string | undefined, options: StoryOption[]) {
    return options.find((option) => option.id === optionId)?.risk_hint;
  }
}

export const runService = new RunService();
