import { z } from "zod";
import type { AiStoryOutput, EventCard, GameState, RunMessage, StoryOption } from "./types.js";

const optionSchema = z.object({
  id: z.string(),
  title: z.string(),
  desc: z.string(),
  risk_hint: z.enum(["低", "中", "高"])
});

const storySchema = z.object({
  need_clarify: z.boolean().default(false),
  ask: z.string().default(""),
  narrative: z.string().max(600),
  state_delta: z.object({
    age_add: z.number().optional(),
    int_add: z.number().optional(),
    str_add: z.number().optional(),
    cha_add: z.number().optional(),
    money_add: z.number().optional(),
    luck_add: z.number().optional(),
    risk_add: z.number().optional(),
    inventory_add: z.array(z.string()).optional(),
    inventory_remove: z.array(z.string()).optional(),
    relations_delta: z.record(z.number()).optional(),
    flags_set: z.array(z.string()).optional(),
    flags_unset: z.array(z.string()).optional(),
    main_quest_stage_set: z.number().optional()
  }).default({}),
  options: z.array(optionSchema).default([]),
  death: z.object({
    is_dead: z.boolean().default(false),
    death_id: z.string().default(""),
    death_cause: z.string().default(""),
    ending_id: z.string().default(""),
    ending_type: z.string().default("")
  }).default({ is_dead: false, death_id: "", death_cause: "", ending_id: "", ending_type: "" })
});

export class AiStoryService {
  async generateTurn(input: {
    worldName: string;
    worldRules: unknown;
    state: GameState;
    memorySummary: string;
    recentMessages: RunMessage[];
    eventCard: EventCard;
    userInput: string;
  }): Promise<AiStoryOutput> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return this.fallbackTurn(input);
    try {
      const output = await this.callDeepSeek(input, apiKey);
      return this.parseStoryOutput(output);
    } catch {
      try {
        const output = await this.callDeepSeek(input, apiKey, true);
        return this.parseStoryOutput(output);
      } catch {
        return this.fallbackTurn(input);
      }
    }
  }

  summarizeMemory(messages: RunMessage[]): string {
    const compact = messages
      .slice(-10)
      .map((message) => {
        if (typeof message.content === "object" && message.content && "narrative" in message.content) {
          return `AI:${String((message.content as { narrative: string }).narrative).slice(0, 80)}`;
        }
        if (typeof message.content === "object" && message.content && "text" in message.content) {
          return `玩家:${String((message.content as { text: string }).text).slice(0, 60)}`;
        }
        return `${message.role}:${JSON.stringify(message.content).slice(0, 80)}`;
      })
      .join("；");
    return compact.slice(0, 800);
  }

  parseStoryOutput(raw: string): AiStoryOutput {
    const text = raw.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
    const parsed = JSON.parse(text);
    const result = storySchema.parse(parsed);
    if (!result.options.length && !result.ask) {
      result.options = fallbackOptions();
    }
    return result;
  }

  private async callDeepSeek(input: Parameters<AiStoryService["generateTurn"]>[0], apiKey: string, strictRetry = false): Promise<string> {
    const endpoint = `${process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
        temperature: strictRetry ? 0.4 : 0.75,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是《重生一亿次》的文字人生模拟引擎。只输出严格JSON，不得输出JSON外文本。narrative不超过450中文字符，避免血腥、色情和违法教程。"
          },
          {
            role: "user",
            content: JSON.stringify({
              world: { name: input.worldName, rules: input.worldRules },
              state: input.state,
              memory_summary: input.memorySummary,
              recent_messages: input.recentMessages.slice(-6),
              event_card: input.eventCard,
              user_input: input.userInput,
              required_schema:
                "{need_clarify:boolean,ask:string,narrative:string,state_delta:object,options:[{id,title,desc,risk_hint}],death:{is_dead,death_id,death_cause,ending_id,ending_type}}"
            })
          }
        ]
      })
    });
    if (!response.ok) throw new Error(`DeepSeek failed: ${response.status}`);
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? "";
  }

  private fallbackTurn(input: Parameters<AiStoryService["generateTurn"]>[0]): AiStoryOutput {
    const ageStep = input.state.age < 22 ? 2 : input.state.age < 45 ? 4 : 6;
    const selected = inferRisk(input.userInput);
    const deltaByRisk = {
      低: { risk_add: -3, money_add: 3, cha_add: 1 },
      中: { risk_add: 8, money_add: 12, int_add: 1 },
      高: { risk_add: 24, money_add: 28, luck_add: 2 }
    }[selected];
    return {
      need_clarify: false,
      ask: "",
      narrative: `【${input.eventCard.title}】${input.eventCard.prompt_stub} 你选择了${input.userInput || "顺势观察"}。命运像一页被反复翻旧的纸，留下新的折痕，也把风险悄悄推近了一点。`,
      state_delta: {
        age_add: ageStep,
        ...deltaByRisk,
        flags_set: [`seen_${input.eventCard.event_id}`]
      },
      options: fallbackOptions(),
      death: { is_dead: false, death_id: "", death_cause: "", ending_id: "", ending_type: "" }
    };
  }
}

export function fallbackOptions(): StoryOption[] {
  return [
    { id: "A", title: "稳住局面", desc: "优先降低风险，收益较小。", risk_hint: "低" },
    { id: "B", title: "争取机会", desc: "承担适中风险，换取更好回报。", risk_hint: "中" },
    { id: "C", title: "赌一把大的", desc: "高风险高收益，可能快速推进结局。", risk_hint: "高" }
  ];
}

function inferRisk(text: string): "低" | "中" | "高" {
  if (/C|赌|硬|拼|全仓|冒险|高/.test(text)) return "高";
  if (/B|争|试|谈|中/.test(text)) return "中";
  return "低";
}
