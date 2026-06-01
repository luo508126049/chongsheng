import type { Achievement, RunMessage, Settlement, StateBrief, StoryOption, Talent } from "./types";

const base = import.meta.env.VITE_API_BASE || "";
const userId = localStorage.getItem("rebirth_user_id") || "demo-user";
localStorage.setItem("rebirth_user_id", userId);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
      ...init?.headers
    }
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  home: () => request<{
    user: { memory_balance: number; rebirth_count: number };
    active_run?: { run_id: string; status: string };
    recent_settlements: Settlement[];
    unlocked_talents_count: number;
  }>("/v1/home"),
  newRun: (talentIds: string[] = []) => request<RunResponse>("/v1/run/new", { method: "POST", body: JSON.stringify({ talent_ids: talentIds }) }),
  continueRun: () => request<{ run: { run_id: string }; messages: RunMessage[]; options: StoryOption[]; state_brief: StateBrief }>("/v1/run/continue", { method: "POST", body: "{}" }),
  turn: (payload: { run_id: string; input_type: "quick" | "free"; option_id?: string; free_text?: string }) =>
    request<RunResponse>("/v1/run/turn", { method: "POST", body: JSON.stringify(payload) }),
  settle: (runId: string) => request<Settlement>("/v1/run/settle", { method: "POST", body: JSON.stringify({ run_id: runId }) }),
  talentCandidates: () => request<Talent[]>("/v1/talents/candidates"),
  selectTalents: (talentIds: string[]) => request<RunResponse & { unlocked_achievements: string[] }>("/v1/talents/select", { method: "POST", body: JSON.stringify({ talent_ids: talentIds }) }),
  atlas: () => request<Talent[]>("/v1/atlas"),
  achievements: () => request<Achievement[]>("/v1/achievements"),
  shareText: (runId: string) => request<{ text: string }>("/v1/share/text", { method: "POST", body: JSON.stringify({ run_id: runId }) }),
  adminList: <T>(kind: string) => request<T[]>(`/admin/content/${kind}`),
  adminImport: (kind: string, items: unknown[]) => request<{ ok: boolean; errors?: string[] }>(`/admin/content/${kind}/import`, { method: "POST", body: JSON.stringify({ items }) })
};

export interface RunResponse {
  run?: { run_id: string };
  ai_message: {
    narrative: string;
    ask: string;
    options: StoryOption[];
    death: { is_dead: boolean };
  };
  options: StoryOption[];
  state_brief: StateBrief;
  settlement?: Settlement;
}
