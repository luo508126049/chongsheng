import { describe, expect, it } from "vitest";
import { AiStoryService } from "./ai-story-service.js";

describe("AiStoryService", () => {
  it("parses valid structured JSON", () => {
    const service = new AiStoryService();
    const output = service.parseStoryOutput(JSON.stringify({
      need_clarify: false,
      ask: "",
      narrative: "你做出了选择。",
      state_delta: { age_add: 1, risk_add: 5 },
      options: [{ id: "A", title: "继续", desc: "稳住", risk_hint: "低" }],
      death: { is_dead: false, death_id: "", death_cause: "", ending_id: "", ending_type: "" }
    }));
    expect(output.options[0].id).toBe("A");
  });

  it("adds fallback options when model omits options and ask", () => {
    const service = new AiStoryService();
    const output = service.parseStoryOutput(JSON.stringify({
      need_clarify: false,
      ask: "",
      narrative: "卡住了。",
      state_delta: {},
      options: [],
      death: { is_dead: false, death_id: "", death_cause: "", ending_id: "", ending_type: "" }
    }));
    expect(output.options.length).toBe(3);
  });
});
