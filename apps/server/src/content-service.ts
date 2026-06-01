import type { ContentKind, EventCard, GameState } from "./types.js";
import { store, type GameRepository } from "./store.js";

const idKeys: Record<ContentKind, string> = {
  world_packs: "world_id",
  event_cards: "event_id",
  death_cards: "death_id",
  talents: "talent_id",
  achievements: "achievement_id"
};

export class ContentService {
  constructor(private readonly repo: GameRepository = store) {}

  async pickEvent(worldId: string, state: GameState): Promise<EventCard> {
    const matchedCards = await (this.repo.contentForState?.(worldId, state) ?? []);
    const allCards = matchedCards.length ? matchedCards : await this.repo.eventCardsForWorld(worldId);
    const candidates = allCards.filter((card) => {
      if (card.status !== "enabled") return false;
      const trigger = card.trigger_json;
      if (trigger.age_min !== undefined && state.age < trigger.age_min) return false;
      if (trigger.age_max !== undefined && state.age > trigger.age_max) return false;
      if (trigger.risk_min !== undefined && state.risk < trigger.risk_min) return false;
      if (trigger.risk_max !== undefined && state.risk > trigger.risk_max) return false;
      if (trigger.flags_all?.some((flag) => !state.flags[flag])) return false;
      if (trigger.flags_any?.length && !trigger.flags_any.some((flag) => state.flags[flag])) return false;
      return true;
    });
    const pool = candidates.length ? candidates : allCards.filter((card) => card.status === "enabled" && card.world_id === worldId);
    const total = pool.reduce((sum, card) => sum + Math.max(1, card.weight), 0);
    let cursor = Math.floor(Math.random() * total);
    for (const card of pool) {
      cursor -= Math.max(1, card.weight);
      if (cursor <= 0) return card;
    }
    return pool[0] ?? (await this.repo.getContent("event_cards"))[0];
  }

  validateContent(kind: ContentKind, items: unknown[]): string[] {
    const errors: string[] = [];
    const key = idKeys[kind] as keyof Record<string, unknown>;
    items.forEach((item, index) => {
      if (!item || typeof item !== "object") {
        errors.push(`第 ${index + 1} 条不是对象`);
        return;
      }
      if (!(key in item) || !String((item as Record<string, unknown>)[key]).trim()) {
        errors.push(`第 ${index + 1} 条缺少 ${String(key)}`);
      }
      if (kind === "event_cards") {
        const event = item as Partial<EventCard>;
        if (!event.prompt_stub) errors.push(`${event.event_id ?? `第 ${index + 1} 条`} 缺少 prompt_stub`);
        if (!event.weight || event.weight < 1) errors.push(`${event.event_id ?? `第 ${index + 1} 条`} weight 必须 >= 1`);
        if (!event.outcome_templates || Object.keys(event.outcome_templates).length < 2) {
          errors.push(`${event.event_id ?? `第 ${index + 1} 条`} 至少需要 2 个选项倾向`);
        }
      }
    });
    return errors;
  }

  list(kind: ContentKind) {
    return this.repo.getContent(kind);
  }

  async import(kind: ContentKind, items: unknown[]) {
    const errors = this.validateContent(kind, items);
    if (errors.length) return { ok: false, errors };
    return { ok: true, data: await this.repo.replaceContent(kind, items as never) };
  }

  upsert(kind: ContentKind, item: never) {
    return this.repo.upsertContent(kind, idKeys[kind] as never, item);
  }

  delete(kind: ContentKind, id: string) {
    this.repo.deleteContent(kind, idKeys[kind] as never, id);
  }
}
