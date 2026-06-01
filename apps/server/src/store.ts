import { nanoid } from "nanoid";
import type {
  Achievement,
  ContentKind,
  ContentStore,
  EventCard,
  GameState,
  Run,
  RunMessage,
  Settlement,
  Talent,
  User
} from "./types.js";
import { seedContent } from "./seed.js";

const now = () => new Date().toISOString();

type Awaitable<T> = T | Promise<T>;

export interface GameRepository {
  ensureUser(userId: string): Awaitable<User>;
  getUser(userId: string): Awaitable<User | undefined>;
  updateUser(user: User): Awaitable<void>;
  createRun(run: Omit<Run, "run_id" | "created_at" | "updated_at">): Awaitable<Run>;
  updateRun(run: Run): Awaitable<Run>;
  getRun(runId: string): Awaitable<Run | undefined>;
  getActiveRun(userId: string): Awaitable<Run | undefined>;
  listSettlements(userId: string, limit?: number): Awaitable<Settlement[]>;
  addMessage(runId: string, role: RunMessage["role"], content: unknown): Awaitable<RunMessage>;
  getMessages(runId: string, limit?: number): Awaitable<RunMessage[]>;
  createSettlement(input: Omit<Settlement, "settlement_id" | "created_at">): Awaitable<Settlement>;
  getSettlement(runId: string): Awaitable<Settlement | undefined>;
  getUnlockedTalentIds(userId: string): Awaitable<string[]>;
  unlockTalents(userId: string, talentIds: string[]): Awaitable<string[]>;
  getUnlockedAchievementIds(userId: string): Awaitable<string[]>;
  unlockAchievements(userId: string, achievementIds: string[]): Awaitable<string[]>;
  track(name: string, payload: unknown, userId?: string, runId?: string): Awaitable<void>;
  getContent<K extends ContentKind>(kind: K): Awaitable<ContentStore[K]>;
  replaceContent<K extends ContentKind>(kind: K, items: ContentStore[K]): Awaitable<ContentStore[K]>;
  upsertContent<K extends ContentKind>(kind: K, idKey: keyof ContentStore[K][number], item: ContentStore[K][number]): Awaitable<ContentStore[K][number]>;
  deleteContent<K extends ContentKind>(kind: K, idKey: keyof ContentStore[K][number], id: string): Awaitable<void>;
  talentsByIds(ids: string[]): Awaitable<Talent[]>;
  achievements(): Awaitable<Achievement[]>;
  eventCardsForWorld(worldId: string): Awaitable<EventCard[]>;
  deathCards(): Awaitable<ContentStore["death_cards"]>;
  worldPack(worldId: string): Awaitable<ContentStore["world_packs"][number] | undefined>;
  contentForState?(worldId: string, state: GameState): Awaitable<ContentStore["event_cards"]>;
}

export class MemoryStore implements GameRepository {
  private users = new Map<string, User>();
  private runs = new Map<string, Run>();
  private messages = new Map<string, RunMessage[]>();
  private settlements = new Map<string, Settlement>();
  private userTalents = new Map<string, Set<string>>();
  private userAchievements = new Map<string, Set<string>>();
  private telemetry: Array<{ name: string; user_id?: string; run_id?: string; payload: unknown; created_at: string }> = [];
  content: ContentStore = structuredClone(seedContent);

  ensureUser(userId: string): User {
    const existing = this.users.get(userId);
    if (existing) return existing;
    const user: User = {
      user_id: userId,
      created_at: now(),
      channel: "web_h5",
      memory_balance: 0,
      rebirth_count: 0
    };
    this.users.set(userId, user);
    this.userTalents.set(userId, new Set(this.defaultTalentIds()));
    return user;
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  updateUser(user: User): void {
    this.users.set(user.user_id, user);
  }

  createRun(run: Omit<Run, "run_id" | "created_at" | "updated_at">): Run {
    const record: Run = {
      ...run,
      run_id: `run_${nanoid(10)}`,
      created_at: now(),
      updated_at: now()
    };
    for (const existing of this.runs.values()) {
      if (existing.user_id === record.user_id && existing.status === "active") {
        existing.status = "ended";
        existing.updated_at = now();
      }
    }
    this.runs.set(record.run_id, record);
    this.messages.set(record.run_id, []);
    return record;
  }

  updateRun(run: Run): Run {
    const updated = { ...run, updated_at: now() };
    this.runs.set(updated.run_id, updated);
    return updated;
  }

  getRun(runId: string): Run | undefined {
    return this.runs.get(runId);
  }

  getActiveRun(userId: string): Run | undefined {
    return Array.from(this.runs.values())
      .filter((run) => run.user_id === userId && run.status === "active")
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  }

  listSettlements(userId: string, limit = 10): Settlement[] {
    return Array.from(this.settlements.values())
      .filter((settlement) => settlement.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  addMessage(runId: string, role: RunMessage["role"], content: unknown): RunMessage {
    const list = this.messages.get(runId) ?? [];
    const message: RunMessage = {
      idx: list.length,
      role,
      content,
      created_at: now()
    };
    list.push(message);
    this.messages.set(runId, list);
    return message;
  }

  getMessages(runId: string, limit = 20): RunMessage[] {
    const list = this.messages.get(runId) ?? [];
    return list.slice(Math.max(0, list.length - limit));
  }

  createSettlement(input: Omit<Settlement, "settlement_id" | "created_at">): Settlement {
    const settlement: Settlement = {
      ...input,
      settlement_id: `set_${nanoid(10)}`,
      created_at: now()
    };
    this.settlements.set(settlement.run_id, settlement);
    return settlement;
  }

  getSettlement(runId: string): Settlement | undefined {
    return this.settlements.get(runId);
  }

  getUnlockedTalentIds(userId: string): string[] {
    this.ensureUser(userId);
    return Array.from(this.userTalents.get(userId) ?? []);
  }

  unlockTalents(userId: string, talentIds: string[]): string[] {
    const set = this.userTalents.get(userId) ?? new Set<string>();
    const newly: string[] = [];
    for (const id of talentIds) {
      if (!set.has(id)) {
        set.add(id);
        newly.push(id);
      }
    }
    this.userTalents.set(userId, set);
    return newly;
  }

  getUnlockedAchievementIds(userId: string): string[] {
    return Array.from(this.userAchievements.get(userId) ?? []);
  }

  unlockAchievements(userId: string, achievementIds: string[]): string[] {
    const set = this.userAchievements.get(userId) ?? new Set<string>();
    const newly: string[] = [];
    for (const id of achievementIds) {
      if (!set.has(id)) {
        set.add(id);
        newly.push(id);
      }
    }
    this.userAchievements.set(userId, set);
    return newly;
  }

  track(name: string, payload: unknown, userId?: string, runId?: string): void {
    this.telemetry.push({ name, payload, user_id: userId, run_id: runId, created_at: now() });
  }

  getContent<K extends ContentKind>(kind: K): ContentStore[K] {
    return this.content[kind];
  }

  replaceContent<K extends ContentKind>(kind: K, items: ContentStore[K]): ContentStore[K] {
    this.content[kind] = items;
    return this.content[kind];
  }

  upsertContent<K extends ContentKind>(kind: K, idKey: keyof ContentStore[K][number], item: ContentStore[K][number]): ContentStore[K][number] {
    const list = [...this.content[kind]] as Array<ContentStore[K][number]>;
    const id = item[idKey];
    const index = list.findIndex((entry) => entry[idKey] === id);
    if (index >= 0) list[index] = item;
    else list.push(item);
    this.content[kind] = list as ContentStore[K];
    return item;
  }

  deleteContent<K extends ContentKind>(kind: K, idKey: keyof ContentStore[K][number], id: string): void {
    this.content[kind] = (this.content[kind] as Array<ContentStore[K][number]>).filter((entry) => entry[idKey] !== id) as ContentStore[K];
  }

  talentsByIds(ids: string[]): Talent[] {
    return this.content.talents.filter((talent) => ids.includes(talent.talent_id));
  }

  achievements(): Achievement[] {
    return this.content.achievements;
  }

  eventCardsForWorld(worldId: string): EventCard[] {
    return this.content.event_cards.filter((card) => card.world_id === worldId);
  }

  deathCards(): ContentStore["death_cards"] {
    return this.content.death_cards;
  }

  worldPack(worldId: string): ContentStore["world_packs"][number] | undefined {
    return this.content.world_packs.find((pack) => pack.world_id === worldId) ?? this.content.world_packs[0];
  }

  contentForState(worldId: string, _state: GameState): ContentStore["event_cards"] {
    return this.eventCardsForWorld(worldId);
  }

  private defaultTalentIds(): string[] {
    return this.content.talents
      .filter((talent) => talent.status === "enabled" && talent.unlock_condition_json.default)
      .map((talent) => talent.talent_id);
  }
}

export const store = new MemoryStore();
