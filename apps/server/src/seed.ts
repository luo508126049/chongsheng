import type { Achievement, ContentStore, DeathCard, EventCard, Talent, WorldPack } from "./types.js";

export const worldPacks: WorldPack[] = [
  {
    world_id: "real_common_life",
    name: "现实·普通人生",
    summary: "从普通家庭出发，在学业、打工、关系、健康和意外之间反复选择，靠每次重生积累一点点优势。",
    rules_json: {
      supernatural_level: 0,
      tones: ["搞笑", "严肃", "爽文"],
      forbidden_topics: ["详细暴力血腥", "违法教程", "露骨色情"],
      occupations: ["学生", "打工人", "创业者", "自由职业者"]
    },
    status: "enabled"
  },
  {
    world_id: "qingyun_cultivation",
    name: "青云界·凡人修仙",
    summary: "凡人带着重生记忆踏入仙门，在灵根、宗门、人情、机缘和天劫之间反复试错。",
    rules_json: {
      supernatural_level: 2,
      tones: ["严肃", "爽文"],
      forbidden_topics: ["详细暴力血腥", "邪术教程"],
      occupations: ["杂役弟子", "外门弟子", "散修", "炼丹学徒"]
    },
    status: "draft"
  }
];

export const eventCards: EventCard[] = [
  {
    event_id: "E001",
    world_id: "real_common_life",
    title: "入学第一天",
    trigger_json: { age_min: 6, age_max: 9, risk_max: 80 },
    tags_json: ["学业", "社交"],
    prompt_stub: "新班级里有人抢走你的座位，班主任还没注意到。提供忍让、沟通、强硬三类路径。",
    outcome_templates: {
      A: "低风险：礼貌沟通，关系小幅波动，智力或魅力小涨。",
      B: "中风险：找班主任说明，可能被同学记仇。",
      C: "高风险：当众反击，可能获得声望也可能升级冲突。"
    },
    death_links_json: [],
    weight: 12,
    status: "enabled"
  },
  {
    event_id: "E017",
    world_id: "real_common_life",
    title: "举报风波",
    trigger_json: { age_min: 13, age_max: 18, risk_max: 80 },
    tags_json: ["学业", "冲突"],
    prompt_stub: "班主任质问作弊；同桌暗中使坏；提供证据、人证、硬刚、忍让路径。",
    outcome_templates: {
      A: "低风险：调证据，风险降低，智力小涨。",
      B: "中风险：拉同学作证，关系波动大。",
      C: "高风险：硬刚权威，可能处分或逆袭。"
    },
    death_links_json: [],
    weight: 15,
    status: "enabled"
  },
  {
    event_id: "E024",
    world_id: "real_common_life",
    title: "兼职邀约",
    trigger_json: { age_min: 16, age_max: 22, risk_max: 90 },
    tags_json: ["财富", "骗局"],
    prompt_stub: "同学介绍高薪兼职，但合同含糊，地点也很偏。提供核实、试做、直接投入三种路径。",
    outcome_templates: {
      A: "低风险：先查资质，收益小但安全。",
      B: "中风险：短期试做，财富小涨但风险增加。",
      C: "高风险：直接投入，可能赚快钱也可能被骗。"
    },
    death_links_json: ["D002"],
    weight: 10,
    status: "enabled"
  },
  {
    event_id: "E041",
    world_id: "real_common_life",
    title: "深夜加班",
    trigger_json: { age_min: 23, age_max: 35, risk_max: 95 },
    tags_json: ["职场", "健康"],
    prompt_stub: "领导临时安排深夜加班，项目成败都压在你身上。提供回绝、硬扛、借机立功路径。",
    outcome_templates: {
      A: "低风险：回绝，健康更稳但机会变少。",
      B: "中风险：硬扛，财富或声望上涨，风险上涨。",
      C: "高风险：借机立功，收益大但可能触发疾病链。"
    },
    death_links_json: ["D003"],
    weight: 14,
    status: "enabled"
  },
  {
    event_id: "E052",
    world_id: "real_common_life",
    title: "创业合伙",
    trigger_json: { age_min: 24, age_max: 42, risk_max: 95 },
    tags_json: ["创业", "财富", "关系"],
    prompt_stub: "老同学带来创业计划，商业模式诱人，但资金和分工都没写清。提供保守参与、签约试点、全仓押注路径。",
    outcome_templates: {
      A: "低风险：小额参与，收益有限。",
      B: "中风险：签约试点，财富和关系波动。",
      C: "高风险：全仓押注，可能暴富或破产。"
    },
    death_links_json: ["D002"],
    weight: 9,
    status: "enabled"
  },
  {
    event_id: "E071",
    world_id: "real_common_life",
    title: "体检红灯",
    trigger_json: { age_min: 30, age_max: 70, risk_min: 40 },
    tags_json: ["健康", "家庭"],
    prompt_stub: "体检报告出现异常指标，家人催你复查，工作却正忙。提供立刻复查、拖一周、硬撑到底路径。",
    outcome_templates: {
      A: "低风险：复查治疗，财富略降，风险下降。",
      B: "中风险：拖延观察，风险小涨。",
      C: "高风险：继续硬撑，收益可能保住但疾病风险大涨。"
    },
    death_links_json: ["D003"],
    weight: 16,
    status: "enabled"
  }
];

export const deathCards: DeathCard[] = [
  {
    death_id: "D001",
    title: "意外事故",
    trigger_json: { risk_gte: 100 },
    description: "一次突发意外打断了这段人生，抢救没有带来转机。",
    settlement_hook: "如果当时少赌一次，命运也许会慢一点翻页。",
    status: "enabled"
  },
  {
    death_id: "D002",
    title: "财富归零",
    trigger_json: { money_lte: -80 },
    description: "债务和压力连锁爆发，你的人生被迫提前结算。",
    settlement_hook: "快钱从来都在暗处标好了价格。",
    status: "enabled"
  },
  {
    death_id: "D003",
    title: "积劳成疾",
    trigger_json: { risk_gte: 100, tag: "健康" },
    description: "长期透支终于压垮身体，你在一阵眩晕后失去意识。",
    settlement_hook: "不是每一次硬扛都能换来逆袭。",
    status: "enabled"
  }
];

export const talents: Talent[] = [
  { talent_id: "T001", name: "早慧", rarity: "普", capacity_cost: 1, effect_json: { start_bonus: { int: 8 } }, unlock_condition_json: { default: true }, status: "enabled" },
  { talent_id: "T002", name: "强健", rarity: "普", capacity_cost: 1, effect_json: { start_bonus: { str: 8 } }, unlock_condition_json: { default: true }, status: "enabled" },
  { talent_id: "T003", name: "讨喜", rarity: "普", capacity_cost: 1, effect_json: { start_bonus: { cha: 8 } }, unlock_condition_json: { default: true }, status: "enabled" },
  { talent_id: "T004", name: "小财运", rarity: "普", capacity_cost: 1, effect_json: { start_bonus: { money: 20 } }, unlock_condition_json: { default: true }, status: "enabled" },
  { talent_id: "T005", name: "好运一点点", rarity: "普", capacity_cost: 1, effect_json: { start_bonus: { luck: 8 } }, unlock_condition_json: { default: true }, status: "enabled" },
  { talent_id: "T006", name: "记性很好", rarity: "普", capacity_cost: 1, effect_json: { memory_multiplier: 1.1 }, unlock_condition_json: { rebirth_count_gte: 3 }, status: "enabled" },
  { talent_id: "T007", name: "危机嗅觉", rarity: "普", capacity_cost: 1, effect_json: { risk_delta: -3 }, unlock_condition_json: { rebirth_count_gte: 3 }, status: "enabled" },
  { talent_id: "T008", name: "冷静", rarity: "普", capacity_cost: 1, effect_json: { risk_delta: -5 }, unlock_condition_json: { rebirth_count_gte: 5 }, status: "enabled" },
  { talent_id: "T016", name: "硬命", rarity: "稀", capacity_cost: 2, effect_json: { death_save_once: true }, unlock_condition_json: { death_count_gte: 10 }, status: "enabled" },
  { talent_id: "T033", name: "逆天改命", rarity: "传", capacity_cost: 3, effect_json: { start_bonus: { luck: 15 }, memory_multiplier: 1.25 }, unlock_condition_json: { rebirth_count_gte: 50 }, status: "enabled" }
];

export const achievements: Achievement[] = [
  { achievement_id: "A001", name: "第一次死亡", description: "完成第一次人生结算。", condition_json: { first_death: true }, status: "enabled" },
  { achievement_id: "A002", name: "第一次重生", description: "完成一次天赋选择并开启新局。", condition_json: { first_rebirth: true }, status: "enabled" },
  { achievement_id: "A003", name: "活过30岁", description: "任意一局年龄达到30岁。", condition_json: { age_gte: 30 }, status: "enabled" },
  { achievement_id: "A004", name: "活过60岁", description: "任意一局年龄达到60岁。", condition_json: { age_gte: 60 }, status: "enabled" },
  { achievement_id: "A008", name: "第一次破产", description: "因财富归零触发结算。", condition_json: { death_id: "D002" }, status: "enabled" },
  { achievement_id: "A009", name: "财富峰值>1000", description: "任意一局财富峰值超过1000。", condition_json: { wealth_peak_gte: 1000 }, status: "enabled" },
  { achievement_id: "A022", name: "重生10次", description: "累计重生达到10次。", condition_json: { rebirth_count_gte: 10 }, status: "enabled" }
];

export const seedContent: ContentStore = {
  world_packs: worldPacks,
  event_cards: eventCards,
  death_cards: deathCards,
  talents,
  achievements
};
