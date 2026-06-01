export interface StoryOption {
  id: string;
  title: string;
  desc: string;
  risk_hint: "低" | "中" | "高";
}

export interface AiMessage {
  need_clarify: boolean;
  ask: string;
  narrative: string;
  state_delta: Record<string, unknown>;
  options: StoryOption[];
  death: {
    is_dead: boolean;
    death_id: string;
    death_cause: string;
    ending_id: string;
    ending_type: string;
  };
}

export interface RunRecord {
  run_id: string;
  user_id: string;
  world_id: string;
  status: "active" | "ended";
  turn_index: number;
  state_json: GameState;
}

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
  flags: Record<string, unknown>;
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

export interface RunMessage {
  idx: number;
  role: "ai" | "user" | "system";
  content: AiMessage | { text: string; option_id?: string; input_type?: string };
  created_at: string;
}

export interface StateBrief {
  age: number;
  attrs: {
    int: number;
    str: number;
    cha: number;
    money: number;
    luck: number;
    risk: number;
  };
  inventory_count: number;
  relations_count: number;
  turn_index: number;
  status: string;
}

export interface Talent {
  talent_id: string;
  name: string;
  rarity: string;
  capacity_cost: number;
  effect_json: Record<string, unknown>;
  unlock_condition_json: Record<string, unknown>;
  unlocked?: boolean;
}

export interface Achievement {
  achievement_id: string;
  name: string;
  description: string;
  condition_json: Record<string, unknown>;
  unlocked?: boolean;
}

export interface Settlement {
  settlement_id: string;
  run_id: string;
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
  };
}
