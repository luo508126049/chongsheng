import { PrismaClient, type Prisma } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";
import { nanoid } from "nanoid";
import type {
  Achievement,
  ContentKind,
  ContentStore,
  DeathCard,
  EventCard,
  GameState,
  Run,
  RunMessage,
  Settlement,
  Talent,
  User,
  WorldPack
} from "./types.js";
import type { GameRepository } from "./store.js";

const prisma = new PrismaClient();
const iso = (value: Date) => value.toISOString();
const json = (value: unknown) => value as InputJsonValue;

export class PrismaStore implements GameRepository {
  async ensureUser(userId: string): Promise<User> {
    const user = await prisma.user.upsert({
      where: { userId },
      update: {},
      create: { userId, channel: "web_h5" }
    });
    await this.ensureDefaultTalents(userId);
    return toUser(user);
  }

  async getUser(userId: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({ where: { userId } });
    return user ? toUser(user) : undefined;
  }

  async updateUser(user: User): Promise<void> {
    await prisma.user.update({
      where: { userId: user.user_id },
      data: {
        channel: user.channel,
        memoryBalance: user.memory_balance,
        rebirthCount: user.rebirth_count
      }
    });
  }

  async createRun(run: Omit<Run, "run_id" | "created_at" | "updated_at">): Promise<Run> {
    await prisma.run.updateMany({
      where: { userId: run.user_id, status: "active" },
      data: { status: "ended" }
    });
    const record = await prisma.run.create({
      data: {
        runId: `run_${nanoid(10)}`,
        userId: run.user_id,
        worldId: run.world_id,
        status: run.status,
        stateJson: json(run.state_json),
        selectedTalents: json(run.selected_talents),
        memorySummary: run.memory_summary,
        turnIndex: run.turn_index
      }
    });
    return toRun(record);
  }

  async updateRun(run: Run): Promise<Run> {
    const record = await prisma.run.update({
      where: { runId: run.run_id },
      data: {
        status: run.status,
        stateJson: json(run.state_json),
        selectedTalents: json(run.selected_talents),
        memorySummary: run.memory_summary,
        turnIndex: run.turn_index
      }
    });
    return toRun(record);
  }

  async getRun(runId: string): Promise<Run | undefined> {
    const run = await prisma.run.findUnique({ where: { runId } });
    return run ? toRun(run) : undefined;
  }

  async getActiveRun(userId: string): Promise<Run | undefined> {
    const run = await prisma.run.findFirst({
      where: { userId, status: "active" },
      orderBy: { updatedAt: "desc" }
    });
    return run ? toRun(run) : undefined;
  }

  async listSettlements(userId: string, limit = 10): Promise<Settlement[]> {
    const settlements = await prisma.settlement.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    return settlements.map(toSettlement);
  }

  async addMessage(runId: string, role: RunMessage["role"], content: unknown): Promise<RunMessage> {
    const latest = await prisma.runMessage.aggregate({
      where: { runId },
      _max: { idx: true }
    });
    const record = await prisma.runMessage.create({
      data: {
        runId,
        idx: (latest._max.idx ?? -1) + 1,
        role,
        content: json(content)
      }
    });
    return toMessage(record);
  }

  async getMessages(runId: string, limit = 20): Promise<RunMessage[]> {
    const messages = await prisma.runMessage.findMany({
      where: { runId },
      orderBy: { idx: "desc" },
      take: limit
    });
    return messages.reverse().map(toMessage);
  }

  async createSettlement(input: Omit<Settlement, "settlement_id" | "created_at">): Promise<Settlement> {
    const record = await prisma.settlement.create({
      data: {
        settlementId: `set_${nanoid(10)}`,
        runId: input.run_id,
        userId: input.user_id,
        title: input.title,
        description: input.description,
        survivedAge: input.survived_age,
        memoryReward: input.memory_reward,
        unlockedPayload: json(input.unlocked_payload),
        reportJson: json(input.report_json)
      }
    });
    return toSettlement(record);
  }

  async getSettlement(runId: string): Promise<Settlement | undefined> {
    const settlement = await prisma.settlement.findUnique({ where: { runId } });
    return settlement ? toSettlement(settlement) : undefined;
  }

  async getUnlockedTalentIds(userId: string): Promise<string[]> {
    await this.ensureUser(userId);
    const rows = await prisma.userTalent.findMany({ where: { userId }, select: { talentId: true } });
    return rows.map((row: { talentId: string }) => row.talentId);
  }

  async unlockTalents(userId: string, talentIds: string[]): Promise<string[]> {
    await this.ensureUser(userId);
    const uniqueIds = Array.from(new Set(talentIds));
    const existing = new Set((await prisma.userTalent.findMany({ where: { userId, talentId: { in: uniqueIds } }, select: { talentId: true } })).map((row: { talentId: string }) => row.talentId));
    const newly = uniqueIds.filter((id) => !existing.has(id));
    if (newly.length) {
      await prisma.userTalent.createMany({
      data: newly.map((talentId: string) => ({ userId, talentId })),
        skipDuplicates: true
      });
    }
    return newly;
  }

  async getUnlockedAchievementIds(userId: string): Promise<string[]> {
    const rows = await prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } });
    return rows.map((row: { achievementId: string }) => row.achievementId);
  }

  async unlockAchievements(userId: string, achievementIds: string[]): Promise<string[]> {
    await this.ensureUser(userId);
    const uniqueIds = Array.from(new Set(achievementIds));
    const existing = new Set((await prisma.userAchievement.findMany({ where: { userId, achievementId: { in: uniqueIds } }, select: { achievementId: true } })).map((row: { achievementId: string }) => row.achievementId));
    const newly = uniqueIds.filter((id) => !existing.has(id));
    if (newly.length) {
      await prisma.userAchievement.createMany({
      data: newly.map((achievementId: string) => ({ userId, achievementId })),
        skipDuplicates: true
      });
    }
    return newly;
  }

  async track(name: string, payload: unknown, userId?: string, runId?: string): Promise<void> {
    await prisma.telemetryEvent.create({
      data: { name, payload: json(payload), userId, runId }
    });
  }

  async getContent<K extends ContentKind>(kind: K): Promise<ContentStore[K]> {
    switch (kind) {
      case "world_packs":
        return (await prisma.worldPack.findMany({ orderBy: { worldId: "asc" } })).map(toWorldPack) as ContentStore[K];
      case "event_cards":
        return (await prisma.eventCard.findMany({ orderBy: { eventId: "asc" } })).map(toEventCard) as ContentStore[K];
      case "death_cards":
        return (await prisma.deathCard.findMany({ orderBy: { deathId: "asc" } })).map(toDeathCard) as ContentStore[K];
      case "talents":
        return (await prisma.talent.findMany({ orderBy: { talentId: "asc" } })).map(toTalent) as ContentStore[K];
      case "achievements":
        return (await prisma.achievement.findMany({ orderBy: { achievementId: "asc" } })).map(toAchievement) as ContentStore[K];
    }
  }

  async replaceContent<K extends ContentKind>(kind: K, items: ContentStore[K]): Promise<ContentStore[K]> {
    switch (kind) {
      case "world_packs":
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const ids = (items as WorldPack[]).map((item) => item.world_id);
          await tx.worldPack.deleteMany({ where: { worldId: { notIn: ids } } });
          for (const item of items as WorldPack[]) await upsertWorld(tx, item);
        });
        break;
      case "event_cards":
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const ids = (items as EventCard[]).map((item) => item.event_id);
          await tx.eventCard.deleteMany({ where: { eventId: { notIn: ids } } });
          for (const item of items as EventCard[]) await upsertEvent(tx, item);
        });
        break;
      case "death_cards":
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const ids = (items as DeathCard[]).map((item) => item.death_id);
          await tx.deathCard.deleteMany({ where: { deathId: { notIn: ids } } });
          for (const item of items as DeathCard[]) await upsertDeath(tx, item);
        });
        break;
      case "talents":
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const ids = (items as Talent[]).map((item) => item.talent_id);
          await tx.talent.updateMany({ where: { talentId: { notIn: ids } }, data: { status: "disabled" } });
          for (const item of items as Talent[]) await upsertTalent(tx, item);
        });
        break;
      case "achievements":
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const ids = (items as Achievement[]).map((item) => item.achievement_id);
          await tx.achievement.updateMany({ where: { achievementId: { notIn: ids } }, data: { status: "disabled" } });
          for (const item of items as Achievement[]) await upsertAchievement(tx, item);
        });
        break;
    }
    return this.getContent(kind);
  }

  async upsertContent<K extends ContentKind>(kind: K, _idKey: keyof ContentStore[K][number], item: ContentStore[K][number]): Promise<ContentStore[K][number]> {
    switch (kind) {
      case "world_packs":
        return toWorldPack(await upsertWorld(prisma, item as WorldPack)) as ContentStore[K][number];
      case "event_cards":
        return toEventCard(await upsertEvent(prisma, item as EventCard)) as ContentStore[K][number];
      case "death_cards":
        return toDeathCard(await upsertDeath(prisma, item as DeathCard)) as ContentStore[K][number];
      case "talents":
        return toTalent(await upsertTalent(prisma, item as Talent)) as ContentStore[K][number];
      case "achievements":
        return toAchievement(await upsertAchievement(prisma, item as Achievement)) as ContentStore[K][number];
    }
  }

  async deleteContent<K extends ContentKind>(kind: K, _idKey: keyof ContentStore[K][number], id: string): Promise<void> {
    switch (kind) {
      case "world_packs":
        await prisma.worldPack.delete({ where: { worldId: id } });
        return;
      case "event_cards":
        await prisma.eventCard.delete({ where: { eventId: id } });
        return;
      case "death_cards":
        await prisma.deathCard.delete({ where: { deathId: id } });
        return;
      case "talents":
        await prisma.talent.update({ where: { talentId: id }, data: { status: "disabled" } });
        return;
      case "achievements":
        await prisma.achievement.update({ where: { achievementId: id }, data: { status: "disabled" } });
        return;
    }
  }

  async talentsByIds(ids: string[]): Promise<Talent[]> {
    return (await prisma.talent.findMany({ where: { talentId: { in: ids } } })).map(toTalent);
  }

  async achievements(): Promise<Achievement[]> {
    return (await prisma.achievement.findMany()).map(toAchievement);
  }

  async eventCardsForWorld(worldId: string): Promise<EventCard[]> {
    return (await prisma.eventCard.findMany({ where: { worldId } })).map(toEventCard);
  }

  async deathCards(): Promise<DeathCard[]> {
    return (await prisma.deathCard.findMany()).map(toDeathCard);
  }

  async worldPack(worldId: string): Promise<WorldPack | undefined> {
    const requested = await prisma.worldPack.findUnique({ where: { worldId } });
    if (requested) return toWorldPack(requested);
    const fallback = await prisma.worldPack.findFirst({ where: { status: "enabled" }, orderBy: { worldId: "asc" } });
    return fallback ? toWorldPack(fallback) : undefined;
  }

  async contentForState(worldId: string, state: GameState): Promise<EventCard[]> {
    const cards = await prisma.eventCard.findMany({
      where: {
        worldId,
        status: "enabled"
      }
    });
    return cards.map(toEventCard).filter((card: EventCard) => {
      const trigger = card.trigger_json;
      if (trigger.age_min !== undefined && state.age < trigger.age_min) return false;
      if (trigger.age_max !== undefined && state.age > trigger.age_max) return false;
      if (trigger.risk_min !== undefined && state.risk < trigger.risk_min) return false;
      if (trigger.risk_max !== undefined && state.risk > trigger.risk_max) return false;
      if (trigger.flags_all?.some((flag: string) => !state.flags[flag])) return false;
      if (trigger.flags_any?.length && !trigger.flags_any.some((flag: string) => state.flags[flag])) return false;
      return true;
    });
  }

  private async ensureDefaultTalents(userId: string): Promise<void> {
    const defaultIds = (await prisma.talent.findMany({
      where: {
        status: "enabled",
        unlockConditionJson: { path: "$.default", equals: true }
      },
      select: { talentId: true }
    })).map((talent: { talentId: string }) => talent.talentId);
    if (!defaultIds.length) return;
    await prisma.userTalent.createMany({
      data: defaultIds.map((talentId: string) => ({ userId, talentId })),
      skipDuplicates: true
    });
  }
}

type Db = PrismaClient | Prisma.TransactionClient;

function upsertWorld(db: Db, item: WorldPack) {
  return db.worldPack.upsert({
    where: { worldId: item.world_id },
    update: { name: item.name, summary: item.summary, rulesJson: json(item.rules_json), status: item.status },
    create: { worldId: item.world_id, name: item.name, summary: item.summary, rulesJson: json(item.rules_json), status: item.status }
  });
}

function upsertEvent(db: Db, item: EventCard) {
  return db.eventCard.upsert({
    where: { eventId: item.event_id },
    update: {
      worldId: item.world_id,
      title: item.title,
      triggerJson: json(item.trigger_json),
      tagsJson: json(item.tags_json),
      promptStub: item.prompt_stub,
      outcomeTemplates: json(item.outcome_templates),
      deathLinksJson: json(item.death_links_json),
      weight: item.weight,
      status: item.status
    },
    create: {
      eventId: item.event_id,
      worldId: item.world_id,
      title: item.title,
      triggerJson: json(item.trigger_json),
      tagsJson: json(item.tags_json),
      promptStub: item.prompt_stub,
      outcomeTemplates: json(item.outcome_templates),
      deathLinksJson: json(item.death_links_json),
      weight: item.weight,
      status: item.status
    }
  });
}

function upsertDeath(db: Db, item: DeathCard) {
  return db.deathCard.upsert({
    where: { deathId: item.death_id },
    update: { title: item.title, triggerJson: json(item.trigger_json), description: item.description, settlementHook: item.settlement_hook, status: item.status },
    create: { deathId: item.death_id, title: item.title, triggerJson: json(item.trigger_json), description: item.description, settlementHook: item.settlement_hook, status: item.status }
  });
}

function upsertTalent(db: Db, item: Talent) {
  return db.talent.upsert({
    where: { talentId: item.talent_id },
    update: { name: item.name, rarity: item.rarity, capacityCost: item.capacity_cost, effectJson: json(item.effect_json), unlockConditionJson: json(item.unlock_condition_json), status: item.status },
    create: { talentId: item.talent_id, name: item.name, rarity: item.rarity, capacityCost: item.capacity_cost, effectJson: json(item.effect_json), unlockConditionJson: json(item.unlock_condition_json), status: item.status }
  });
}

function upsertAchievement(db: Db, item: Achievement) {
  return db.achievement.upsert({
    where: { achievementId: item.achievement_id },
    update: { name: item.name, description: item.description, conditionJson: json(item.condition_json), status: item.status },
    create: { achievementId: item.achievement_id, name: item.name, description: item.description, conditionJson: json(item.condition_json), status: item.status }
  });
}

function toUser(user: { userId: string; createdAt: Date; channel: string; memoryBalance: number; rebirthCount: number }): User {
  return { user_id: user.userId, created_at: iso(user.createdAt), channel: user.channel, memory_balance: user.memoryBalance, rebirth_count: user.rebirthCount };
}

function toRun(run: { runId: string; userId: string; worldId: string; status: string; stateJson: unknown; selectedTalents: unknown; memorySummary: string; turnIndex: number; createdAt: Date; updatedAt: Date }): Run {
  return {
    run_id: run.runId,
    user_id: run.userId,
    world_id: run.worldId,
    status: run.status as Run["status"],
    state_json: run.stateJson as unknown as GameState,
    selected_talents: Array.isArray(run.selectedTalents) ? run.selectedTalents.map(String) : [],
    memory_summary: run.memorySummary,
    turn_index: run.turnIndex,
    created_at: iso(run.createdAt),
    updated_at: iso(run.updatedAt)
  };
}

function toMessage(message: { idx: number; role: string; content: unknown; createdAt: Date }): RunMessage {
  return { idx: message.idx, role: message.role as RunMessage["role"], content: message.content, created_at: iso(message.createdAt) };
}

function toSettlement(settlement: { settlementId: string; runId: string; userId: string; title: string; description: string; survivedAge: number; memoryReward: number; unlockedPayload: unknown; reportJson: unknown; createdAt: Date }): Settlement {
  return {
    settlement_id: settlement.settlementId,
    run_id: settlement.runId,
    user_id: settlement.userId,
    title: settlement.title,
    description: settlement.description,
    survived_age: settlement.survivedAge,
    memory_reward: settlement.memoryReward,
    unlocked_payload: settlement.unlockedPayload as unknown as Settlement["unlocked_payload"],
    report_json: settlement.reportJson as unknown as Settlement["report_json"],
    created_at: iso(settlement.createdAt)
  };
}

function toWorldPack(world: { worldId: string; name: string; summary: string; rulesJson: unknown; status: string }): WorldPack {
  return { world_id: world.worldId, name: world.name, summary: world.summary, rules_json: world.rulesJson as WorldPack["rules_json"], status: world.status as WorldPack["status"] };
}

function toEventCard(event: { eventId: string; worldId: string; title: string; triggerJson: unknown; tagsJson: unknown; promptStub: string; outcomeTemplates: unknown; deathLinksJson: unknown; weight: number; status: string }): EventCard {
  return {
    event_id: event.eventId,
    world_id: event.worldId,
    title: event.title,
    trigger_json: event.triggerJson as EventCard["trigger_json"],
    tags_json: Array.isArray(event.tagsJson) ? event.tagsJson.map(String) : [],
    prompt_stub: event.promptStub,
    outcome_templates: event.outcomeTemplates as EventCard["outcome_templates"],
    death_links_json: Array.isArray(event.deathLinksJson) ? event.deathLinksJson.map(String) : [],
    weight: event.weight,
    status: event.status as EventCard["status"]
  };
}

function toDeathCard(death: { deathId: string; title: string; triggerJson: unknown; description: string; settlementHook: string; status: string }): DeathCard {
  return { death_id: death.deathId, title: death.title, trigger_json: death.triggerJson as DeathCard["trigger_json"], description: death.description, settlement_hook: death.settlementHook, status: death.status as DeathCard["status"] };
}

function toTalent(talent: { talentId: string; name: string; rarity: string; capacityCost: number; effectJson: unknown; unlockConditionJson: unknown; status: string }): Talent {
  return {
    talent_id: talent.talentId,
    name: talent.name,
    rarity: talent.rarity as Talent["rarity"],
    capacity_cost: talent.capacityCost,
    effect_json: talent.effectJson as Talent["effect_json"],
    unlock_condition_json: talent.unlockConditionJson as Talent["unlock_condition_json"],
    status: talent.status as Talent["status"]
  };
}

function toAchievement(achievement: { achievementId: string; name: string; description: string; conditionJson: unknown; status: string }): Achievement {
  return {
    achievement_id: achievement.achievementId,
    name: achievement.name,
    description: achievement.description,
    condition_json: achievement.conditionJson as Achievement["condition_json"],
    status: achievement.status as Achievement["status"]
  };
}
