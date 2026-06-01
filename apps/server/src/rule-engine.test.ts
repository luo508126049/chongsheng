import { describe, expect, it } from "vitest";
import { applyDelta, calculateMemoryReward, checkDeath, createInitialState, reconcileNarrativeProgress } from "./rule-engine.js";
import { deathCards, talents } from "./seed.js";

describe("RuleEngine", () => {
  it("clamps base attributes and risk", () => {
    const state = createInitialState();
    const next = applyDelta(state, { int_add: 200, str_add: -200, risk_add: 200 });
    expect(next.int).toBe(100);
    expect(next.str).toBe(0);
    expect(next.risk).toBe(120);
  });

  it("applies start bonuses from talents", () => {
    const state = createInitialState(talents.filter((talent) => talent.talent_id === "T001"));
    expect(state.int).toBe(48);
  });

  it("uses death-save talent once", () => {
    const state = createInitialState();
    const lethal = applyDelta(state, { risk_add: 120 });
    const result = checkDeath(lethal, deathCards, talents.filter((talent) => talent.talent_id === "T016"));
    expect(result.isDead).toBe(false);
    expect(result.savedState.used_death_save).toBe(true);
  });

  it("calculates memory multiplier", () => {
    const state = createInitialState();
    const reward = calculateMemoryReward(state, talents.filter((talent) => talent.talent_id === "T006"));
    expect(reward).toBeGreaterThan(8);
  });

  it("reconciles age when narrative jumps life stages", () => {
    const state = createInitialState();
    const next = reconcileNarrativeProgress(
      state,
      applyDelta(state, { money_add: -120 }),
      "你大学毕业后两次创业失败，最终因破产露宿街头。"
    );
    expect(next.age).toBeGreaterThanOrEqual(28);
  });

  it("advances age even when model omits age delta", () => {
    const state = createInitialState();
    const next = reconcileNarrativeProgress(state, applyDelta(state, { risk_add: 1 }), "这一年你继续谨慎生活。");
    expect(next.age).toBeGreaterThan(state.age);
  });
});
