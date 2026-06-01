import type { Achievement, DeathCard, GameState, StateDelta, Talent } from "./types.js";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function createInitialState(talents: Talent[] = []): GameState {
  const state: GameState = {
    age: 6,
    int: 40,
    str: 40,
    cha: 40,
    money: 30,
    luck: 40,
    risk: 10,
    inventory: [],
    relations: { 父母: 50 },
    flags: {},
    main_quest_stage: 0,
    used_death_save: false,
    stats: {
      wealth_peak: 30,
      reputation_peak: 40,
      low_risk_choices: 0,
      mid_risk_choices: 0,
      high_risk_choices: 0,
      event_tags: {}
    }
  };
  for (const talent of talents) {
    const bonus = talent.effect_json.start_bonus ?? {};
    state.int += bonus.int ?? 0;
    state.str += bonus.str ?? 0;
    state.cha += bonus.cha ?? 0;
    state.money += bonus.money ?? 0;
    state.luck += bonus.luck ?? 0;
    state.risk += talent.effect_json.risk_delta ?? 0;
  }
  return normalizeState(state);
}

export function normalizeState(state: GameState): GameState {
  return {
    ...state,
    int: clamp(Math.round(state.int), 0, 100),
    str: clamp(Math.round(state.str), 0, 100),
    cha: clamp(Math.round(state.cha), 0, 100),
    money: Math.round(state.money),
    luck: clamp(Math.round(state.luck), 0, 100),
    risk: clamp(Math.round(state.risk), 0, 120),
    age: Math.max(0, Math.round(state.age)),
    inventory: Array.from(new Set(state.inventory)),
    stats: {
      ...state.stats,
      wealth_peak: Math.max(state.stats.wealth_peak, Math.round(state.money)),
      reputation_peak: Math.max(state.stats.reputation_peak, Math.round(state.cha))
    }
  };
}

export function applyDelta(state: GameState, delta: StateDelta, tags: string[] = [], riskHint?: string): GameState {
  const next: GameState = structuredClone(state);
  next.age += delta.age_add ?? 0;
  next.int += delta.int_add ?? 0;
  next.str += delta.str_add ?? 0;
  next.cha += delta.cha_add ?? 0;
  next.money += delta.money_add ?? 0;
  next.luck += delta.luck_add ?? 0;
  next.risk += delta.risk_add ?? 0;
  next.inventory.push(...(delta.inventory_add ?? []));
  const remove = new Set(delta.inventory_remove ?? []);
  next.inventory = next.inventory.filter((item) => !remove.has(item));
  for (const [name, change] of Object.entries(delta.relations_delta ?? {})) {
    next.relations[name] = clamp((next.relations[name] ?? 0) + change, -100, 100);
  }
  for (const flag of delta.flags_set ?? []) next.flags[flag] = true;
  for (const flag of delta.flags_unset ?? []) delete next.flags[flag];
  if (delta.main_quest_stage_set !== undefined) next.main_quest_stage = delta.main_quest_stage_set;
  for (const tag of tags) next.stats.event_tags[tag] = (next.stats.event_tags[tag] ?? 0) + 1;
  if (riskHint === "低") next.stats.low_risk_choices += 1;
  if (riskHint === "中") next.stats.mid_risk_choices += 1;
  if (riskHint === "高") next.stats.high_risk_choices += 1;
  return normalizeState(next);
}

export function reconcileNarrativeProgress(previous: GameState, next: GameState, narrative: string): GameState {
  const floor = inferNarrativeAgeFloor(narrative);
  const minimumProgressAge = previous.age + defaultAgeStep(previous.age);
  return normalizeState({
    ...next,
    age: Math.max(next.age, floor ?? 0, minimumProgressAge)
  });
}

export function inferNarrativeAgeFloor(narrative: string): number | undefined {
  const text = narrative.replace(/\s+/g, "");
  const floors: number[] = [];
  if (/小学|入学|班主任|同桌/.test(text)) floors.push(6);
  if (/初中|中考|青春期/.test(text)) floors.push(13);
  if (/高中|高考|志愿/.test(text)) floors.push(16);
  if (/大学|本科|校园|实习|考研/.test(text)) floors.push(18);
  if (/大学毕业|毕业后|拿到学位|本科毕业/.test(text)) floors.push(22);
  if (/入职|职场|公司|加班|领导|同事|工资/.test(text)) floors.push(23);
  if (/创业|合伙|融资|公司倒闭|项目失败|生意/.test(text)) floors.push(24);
  if (/两次创业|二次创业|再次创业|连续创业/.test(text)) floors.push(28);
  if (/结婚|婚姻|买房|房贷/.test(text)) floors.push(26);
  if (/中年|体检|孩子|家庭压力/.test(text)) floors.push(35);
  if (/破产|债务|负债|露宿街头|流落街头|无家可归/.test(text)) floors.push(24);
  if (/退休|养老金/.test(text)) floors.push(60);
  if (/老年|晚年|孙辈/.test(text)) floors.push(70);
  return floors.length ? Math.max(...floors) : undefined;
}

function defaultAgeStep(age: number): number {
  if (age < 18) return 2;
  if (age < 25) return 3;
  if (age < 45) return 4;
  if (age < 70) return 5;
  return 2;
}

export function checkDeath(state: GameState, deathCards: DeathCard[], talents: Talent[] = []) {
  const hasDeathSave = talents.some((talent) => talent.effect_json.death_save_once);
  if (state.risk >= 100 && hasDeathSave && !state.used_death_save) {
    const saved = normalizeState({ ...state, risk: 65, used_death_save: true });
    return { isDead: false, savedState: saved, deathCard: undefined };
  }
  if (state.risk >= 100) {
    return { isDead: true, savedState: state, deathCard: deathCards.find((card) => card.death_id === "D001") ?? deathCards[0] };
  }
  if (state.money <= -80) {
    return { isDead: true, savedState: state, deathCard: deathCards.find((card) => card.death_id === "D002") ?? deathCards[0] };
  }
  if (state.age >= 85) {
    return { isDead: true, savedState: state, deathCard: deathCards.find((card) => card.death_id === "D003") ?? deathCards[0] };
  }
  return { isDead: false, savedState: state, deathCard: undefined };
}

export function calculateMemoryReward(state: GameState, talents: Talent[] = []): number {
  const base = 8 + Math.floor(state.age / 8) + Math.max(0, Math.floor(state.stats.wealth_peak / 200));
  const multiplier = talents.reduce((value, talent) => value * (talent.effect_json.memory_multiplier ?? 1), 1);
  return Math.max(5, Math.round(base * multiplier));
}

export function evaluateAchievements(
  state: GameState,
  achievements: Achievement[],
  context: { deathId?: string; rebirthCount: number }
): string[] {
  return achievements
    .filter((achievement) => achievement.status === "enabled")
    .filter((achievement) => {
      const condition = achievement.condition_json;
      if (condition.first_death) return Boolean(context.deathId);
      if (condition.first_rebirth) return context.rebirthCount >= 1;
      if (typeof condition.age_gte === "number") return state.age >= condition.age_gte;
      if (typeof condition.wealth_peak_gte === "number") return state.stats.wealth_peak >= condition.wealth_peak_gte;
      if (typeof condition.rebirth_count_gte === "number") return context.rebirthCount >= condition.rebirth_count_gte;
      if (condition.death_id) return context.deathId === condition.death_id;
      return false;
    })
    .map((achievement) => achievement.achievement_id);
}
