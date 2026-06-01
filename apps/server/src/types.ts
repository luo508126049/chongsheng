export type RiskHint = "低" | "中" | "高";
export type RunStatus = "active" | "ended";
export type MessageRole = "ai" | "user" | "system";

export interface GameState {
  age: number;
  int: number;
  str: number;
  cha: number;
  money: number;
  luck: number;
  risk: number;
  inventory: string[];
  relations: Record<string, number>;
  flags: Record<string, boolean | number | string>;
  main_quest_stage: number;
  used_death_save: boolean;
  stats: {
    wealth_peak: number;
    reputation_peak: number;
    low_risk_choices: number;
    mid_risk_choices: number;
    high_risk_choices: number;
    event_tags: Record<string, number>;
  };
}

export interface StateDelta {
  age_add?: number;
  int_add?: number;
  str_add?: number;
  cha_add?: number;
  money_add?: number;
  luck_add?: number;
  risk_add?: number;
  inventory_add?: string[];
  inventory_remove?: string[];
  relations_delta?: Record<string, number>;
  flags_set?: string[];
  flags_unset?: string[];
  main_quest_stage_set?: number;
}

export interface StoryOption {
  id: string;
  title: string;
  desc: string;
  risk_hint: RiskHint;
}

export interface DeathPayload {
  is_dead: boolean;
  death_id: string;
  death_cause: string;
  ending_id: string;
  ending_type: string;
}

export interface AiStoryOutput {
  need_clarify: boolean;
  ask: string;
  narrative: string;
  state_delta: StateDelta;
  options: StoryOption[];
  death: DeathPayload;
}

export interface RunMessage {
  idx: number;
  role: MessageRole;
  content: unknown;
  created_at: string;
}

export interface User {
  user_id: string;
  created_at: string;
  channel: string;
  memory_balance: number;
  rebirth_count: number;
}

export interface Run {
  run_id: string;
  user_id: string;
  world_id: string;
  status: RunStatus;
  state_json: GameState;
  selected_talents: string[];
  memory_summary: string;
  turn_index: number;
  created_at: string;
  updated_at: string;
}

export interface Settlement {
  settlement_id: string;
  run_id: string;
  user_id: string;
  title: string;
  description: string;
  survived_age: number;
  memory_reward: number;
  unlocked_payload: {
    talents: string[];
    achievements: string[];
  };
  report_json: {
    wealth_peak: number;
    reputation_peak: number;
    key_choices: string[];
    death_id?: string;
  };
  created_at: string;
}

export interface WorldPack {
  world_id: string;
  name: string;
  summary: string;
  rules_json: {
    supernatural_level: number;
    tones: string[];
    forbidden_topics: string[];
    occupations: string[];
  };
  status: "draft" | "enabled" | "disabled";
}

export interface EventCard {
  event_id: string;
  world_id: string;
  title: string;
  trigger_json: {
    age_min?: number;
    age_max?: number;
    risk_min?: number;
    risk_max?: number;
    flags_any?: string[];
    flags_all?: string[];
  };
  tags_json: string[];
  prompt_stub: string;
  outcome_templates: Record<string, string>;
  death_links_json: string[];
  weight: number;
  status: "draft" | "enabled" | "disabled";
}

export interface DeathCard {
  death_id: string;
  title: string;
  trigger_json: Record<string, unknown>;
  description: string;
  settlement_hook: string;
  status: "draft" | "enabled" | "disabled";
}

export interface Talent {
  talent_id: string;
  name: string;
  rarity: "普" | "稀" | "传";
  capacity_cost: number;
  effect_json: {
    start_bonus?: Partial<Pick<GameState, "int" | "str" | "cha" | "money" | "luck">>;
    memory_multiplier?: number;
    death_save_once?: boolean;
    risk_delta?: number;
  };
  unlock_condition_json: Record<string, unknown>;
  status: "draft" | "enabled" | "disabled";
}

export interface Achievement {
  achievement_id: string;
  name: string;
  description: string;
  condition_json: Record<string, unknown>;
  status: "draft" | "enabled" | "disabled";
}

export interface ContentStore {
  world_packs: WorldPack[];
  event_cards: EventCard[];
  death_cards: DeathCard[];
  talents: Talent[];
  achievements: Achievement[];
}

export type ContentKind = keyof ContentStore;
