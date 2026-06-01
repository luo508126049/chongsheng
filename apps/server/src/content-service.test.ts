import { describe, expect, it } from "vitest";
import { ContentService } from "./content-service.js";
import { createInitialState } from "./rule-engine.js";

describe("ContentService", () => {
  it("picks enabled events matching age", async () => {
    const service = new ContentService();
    const state = createInitialState();
    const event = await service.pickEvent("real_common_life", { ...state, age: 17 });
    expect(event.status).toBe("enabled");
    expect(event.world_id).toBe("real_common_life");
  });

  it("validates event cards before import", () => {
    const service = new ContentService();
    const errors = service.validateContent("event_cards", [{ event_id: "BROKEN", weight: 0 }]);
    expect(errors.length).toBeGreaterThan(0);
  });
});
