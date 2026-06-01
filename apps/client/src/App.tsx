import {
  BookOpen,
  Brain,
  ChevronRight,
  Database,
  Home,
  ListChecks,
  MessageCircle,
  RotateCcw,
  ScrollText,
  Settings,
  Sparkles,
  Trophy,
  UserRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, type RunResponse } from "./api";
import type { Achievement, RunMessage, Settlement, StateBrief, StoryOption, Talent } from "./types";

type View = "home" | "chat" | "settlement" | "talent" | "atlas" | "achievements" | "settings" | "admin";

interface ChatEntry {
  role: "ai" | "user";
  text: string;
}

export function App() {
  const [view, setView] = useState<View>("home");
  const [home, setHome] = useState<Awaited<ReturnType<typeof api.home>> | null>(null);
  const [runId, setRunId] = useState("");
  const [stateBrief, setStateBrief] = useState<StateBrief | null>(null);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [options, setOptions] = useState<StoryOption[]>([]);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void refreshHome();
  }, []);

  async function refreshHome() {
    setError("");
    const data = await api.home();
    setHome(data);
  }

  function applyRunResponse(response: RunResponse) {
    if (response.run?.run_id) setRunId(response.run.run_id);
    setStateBrief(response.state_brief);
    if (response.ai_message) {
      setMessages((current) => [...current, { role: "ai", text: response.ai_message.narrative || response.ai_message.ask }]);
    }
    setOptions(response.options ?? response.ai_message?.options ?? []);
    if (response.settlement) {
      setSettlement(response.settlement);
      setView("settlement");
    } else {
      setView("chat");
    }
  }

  async function startRun(talentIds: string[] = []) {
    await withBusy(async () => {
      const response = await api.newRun(talentIds);
      setMessages([]);
      applyRunResponse(response);
      await refreshHome();
    });
  }

  async function continueRun() {
    await withBusy(async () => {
      const response = await api.continueRun();
      setRunId(response.run.run_id);
      setStateBrief(response.state_brief);
      setOptions(response.options);
      setMessages(response.messages.map(toChatEntry).filter(Boolean) as ChatEntry[]);
      setView("chat");
    });
  }

  async function submitOption(option: StoryOption) {
    setMessages((current) => [...current, { role: "user", text: `${option.id}. ${option.title}` }]);
    await withBusy(async () => applyRunResponse(await api.turn({ run_id: runId, input_type: "quick", option_id: option.id })));
  }

  async function submitFree(text: string) {
    if (!text.trim()) return;
    setMessages((current) => [...current, { role: "user", text }]);
    await withBusy(async () => applyRunResponse(await api.turn({ run_id: runId, input_type: "free", free_text: text })));
  }

  async function withBusy(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="rail">
        <div className="brand-mark">重</div>
        <NavButton active={view === "home"} icon={<Home />} label="首页" onClick={() => setView("home")} />
        <NavButton active={view === "chat"} icon={<MessageCircle />} label="人生" onClick={() => runId && setView("chat")} />
        <NavButton active={view === "talent"} icon={<Sparkles />} label="天赋" onClick={() => setView("talent")} />
        <NavButton active={view === "atlas"} icon={<BookOpen />} label="图鉴" onClick={() => setView("atlas")} />
        <NavButton active={view === "achievements"} icon={<Trophy />} label="成就" onClick={() => setView("achievements")} />
        <NavButton active={view === "admin"} icon={<Database />} label="后台" onClick={() => setView("admin")} />
        <NavButton active={view === "settings"} icon={<Settings />} label="设置" onClick={() => setView("settings")} />
      </aside>

      <main className="main-surface">
        <Header stateBrief={stateBrief} busy={busy} />
        {error && <div className="error-strip">{error}</div>}
        {view === "home" && <HomeView home={home} onStart={() => startRun()} onContinue={continueRun} onOpenTalent={() => setView("talent")} />}
        {view === "chat" && <ChatView messages={messages} options={options} stateBrief={stateBrief} busy={busy} onOption={submitOption} onFree={submitFree} onRestart={() => setView("talent")} />}
        {view === "settlement" && settlement && <SettlementView settlement={settlement} onRebirth={() => setView("talent")} onHome={() => setView("home")} runId={runId} />}
        {view === "talent" && <TalentView onConfirm={startRun} />}
        {view === "atlas" && <AtlasView />}
        {view === "achievements" && <AchievementsView />}
        {view === "settings" && <SettingsView />}
        {view === "admin" && <AdminView />}
      </main>
    </div>
  );
}

function Header({ stateBrief, busy }: { stateBrief: StateBrief | null; busy: boolean }) {
  return (
    <header className="topbar">
      <div>
        <h1>重生一亿次</h1>
        <p>AI 文本人生模拟 · H5 MVP</p>
      </div>
      <div className="status-pills">
        <span>年龄 {stateBrief?.age ?? "--"}</span>
        <span>回合 {stateBrief?.turn_index ?? 0}</span>
        <span className={busy ? "pulse" : ""}>{busy ? "命运推演中" : stateBrief?.status ?? "待开局"}</span>
      </div>
    </header>
  );
}

function HomeView({ home, onStart, onContinue, onOpenTalent }: { home: Awaited<ReturnType<typeof api.home>> | null; onStart: () => void; onContinue: () => void; onOpenTalent: () => void }) {
  return (
    <section className="home-grid">
      <div className="intro-panel">
        <div className="ink-circle"><RotateCcw /></div>
        <h2>每一次选择，都是下一世的伏笔。</h2>
        <p>从普通人生开始试错：学业、财富、关系、健康、意外。死后结算记忆碎片，选择天赋，再次重开。</p>
        <div className="action-row">
          {home?.active_run ? <button className="primary" onClick={onContinue}>继续本局 <ChevronRight size={18} /></button> : null}
          <button className="secondary" onClick={onStart}>开始重生</button>
          <button className="ghost" onClick={onOpenTalent}>选择天赋</button>
        </div>
      </div>
      <Metric label="记忆碎片" value={home?.user.memory_balance ?? 0} icon={<Sparkles />} />
      <Metric label="累计重生" value={home?.user.rebirth_count ?? 0} icon={<RotateCcw />} />
      <Metric label="已解锁天赋" value={home?.unlocked_talents_count ?? 0} icon={<Brain />} />
      <div className="history-panel">
        <h3>最近结算</h3>
        {home?.recent_settlements.length ? home.recent_settlements.map((item) => (
          <div className="history-row" key={item.settlement_id}>
            <span>{item.title}</span>
            <strong>{item.survived_age} 岁</strong>
          </div>
        )) : <p className="muted">暂无结算，先开一局。</p>}
      </div>
    </section>
  );
}

function ChatView({ messages, options, stateBrief, busy, onOption, onFree, onRestart }: {
  messages: ChatEntry[];
  options: StoryOption[];
  stateBrief: StateBrief | null;
  busy: boolean;
  onOption: (option: StoryOption) => void;
  onFree: (text: string) => void;
  onRestart: () => void;
}) {
  const [text, setText] = useState("");
  const attrs = stateBrief?.attrs;
  return (
    <section className="chat-layout">
      <div className="chat-card">
        <div className="message-list">
          {messages.map((message, index) => (
            <div className={`bubble ${message.role}`} key={`${message.role}-${index}`}>
              {message.text}
            </div>
          ))}
          {busy && <div className="bubble ai pulse">命运正在生成下一页...</div>}
        </div>
        <div className="choice-stack">
          {options.map((option) => (
            <button className={`choice risk-${option.risk_hint}`} key={option.id} disabled={busy} onClick={() => onOption(option)}>
              <strong>{option.id} {option.title}</strong>
              <span>{option.desc}</span>
              <em>{option.risk_hint}</em>
            </button>
          ))}
        </div>
        <form className="free-form" onSubmit={(event) => { event.preventDefault(); void onFree(text); setText(""); }}>
          <input value={text} maxLength={120} onChange={(event) => setText(event.target.value)} placeholder="输入自定义行动，最多120字" />
          <button disabled={busy || !text.trim()}>提交</button>
        </form>
      </div>
      <aside className="side-drawer">
        <h3><UserRound size={18} /> 状态</h3>
        {attrs ? Object.entries(attrs).map(([key, value]) => <StatBar key={key} label={attrName(key)} value={value} danger={key === "risk"} />) : null}
        <button className="secondary wide" onClick={onRestart}>重开 / 选天赋</button>
      </aside>
    </section>
  );
}

function SettlementView({ settlement, onRebirth, onHome, runId }: { settlement: Settlement; onRebirth: () => void; onHome: () => void; runId: string }) {
  const [share, setShare] = useState("");
  return (
    <section className="settlement">
      <ScrollText className="large-icon" />
      <h2>{settlement.title}</h2>
      <p>{settlement.description}</p>
      <div className="settlement-grid">
        <Metric label="存活年限" value={`${settlement.survived_age} 岁`} icon={<UserRound />} />
        <Metric label="记忆碎片" value={`+${settlement.memory_reward}`} icon={<Sparkles />} />
        <Metric label="财富峰值" value={settlement.report_json.wealth_peak} icon={<Database />} />
      </div>
      {settlement.unlocked_payload.achievements.length ? <p className="unlock-line">解锁成就：{settlement.unlocked_payload.achievements.join("、")}</p> : null}
      <div className="action-row center">
        <button className="primary" onClick={onRebirth}>立即重生</button>
        <button className="secondary" onClick={async () => setShare((await api.shareText(runId)).text)}>生成分享文本</button>
        <button className="ghost" onClick={onHome}>返回首页</button>
      </div>
      {share && <pre className="share-box">{share}</pre>}
    </section>
  );
}

function TalentView({ onConfirm }: { onConfirm: (talentIds: string[]) => void }) {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => { void api.talentCandidates().then(setTalents); }, []);
  const used = useMemo(() => talents.filter((talent) => selected.includes(talent.talent_id)).reduce((sum, talent) => sum + talent.capacity_cost, 0), [selected, talents]);
  return (
    <section className="library-view">
      <div className="section-title">
        <h2>选择本世天赋</h2>
        <p>容量 {used}/3，确认后立即开启新局。</p>
      </div>
      <div className="card-grid">
        {talents.map((talent) => {
          const active = selected.includes(talent.talent_id);
          return (
            <button className={`talent-card ${active ? "active" : ""}`} key={talent.talent_id} onClick={() => setSelected((current) => active ? current.filter((id) => id !== talent.talent_id) : [...current, talent.talent_id])}>
              <span>{talent.rarity}</span>
              <h3>{talent.name}</h3>
              <p>占用 {talent.capacity_cost} 格</p>
            </button>
          );
        })}
      </div>
      <button className="primary" disabled={used > 3} onClick={() => onConfirm(selected)}>确认重生</button>
    </section>
  );
}

function AtlasView() {
  const [items, setItems] = useState<Talent[]>([]);
  useEffect(() => { void api.atlas().then(setItems); }, []);
  return <Library title="天赋图鉴" items={items.map((item) => ({ id: item.talent_id, title: item.unlocked ? item.name : "未解锁天赋", desc: item.unlocked ? `稀有度 ${item.rarity} · 占用 ${item.capacity_cost}` : "继续重生以揭开剪影" }))} />;
}

function AchievementsView() {
  const [items, setItems] = useState<Achievement[]>([]);
  useEffect(() => { void api.achievements().then(setItems); }, []);
  return <Library title="成就" items={items.map((item) => ({ id: item.achievement_id, title: item.unlocked ? item.name : "未完成", desc: item.description }))} />;
}

function SettingsView() {
  return (
    <section className="settings-view">
      <h2>设置</h2>
      <label><span>状态简报</span><input type="checkbox" defaultChecked /></label>
      <label><span>文本密度</span><select defaultValue="medium"><option value="short">短</option><option value="medium">中</option><option value="long">长</option></select></label>
      <label><span>风格偏好</span><select defaultValue="爽文"><option>搞笑</option><option>严肃</option><option>爽文</option></select></label>
    </section>
  );
}

function AdminView() {
  const [kind, setKind] = useState("event_cards");
  const [items, setItems] = useState<unknown[]>([]);
  const [json, setJson] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { void api.adminList<unknown>(kind).then((data) => { setItems(data); setJson(JSON.stringify(data, null, 2)); }); }, [kind]);
  return (
    <section className="admin-view">
      <div className="section-title">
        <h2>内容后台</h2>
        <p>JSON 导入导出，当前 {items.length} 条。</p>
      </div>
      <select value={kind} onChange={(event) => setKind(event.target.value)}>
        <option value="world_packs">世界观</option>
        <option value="event_cards">事件卡</option>
        <option value="death_cards">死法卡</option>
        <option value="talents">天赋</option>
        <option value="achievements">成就</option>
      </select>
      <textarea value={json} onChange={(event) => setJson(event.target.value)} />
      <button className="primary" onClick={async () => {
        const parsed = JSON.parse(json) as unknown[];
        const result = await api.adminImport(kind, parsed);
        setNotice(result.ok ? "导入成功" : result.errors?.join("\n") ?? "导入失败");
      }}>导入 JSON</button>
      {notice && <pre className="share-box">{notice}</pre>}
    </section>
  );
}

function Library({ title, items }: { title: string; items: Array<{ id: string; title: string; desc: string }> }) {
  return (
    <section className="library-view">
      <div className="section-title"><h2>{title}</h2><p>长线成长记录会持续驱动下一局。</p></div>
      <div className="card-grid">{items.map((item) => <div className="plain-card" key={item.id}><span>{item.id}</span><h3>{item.title}</h3><p>{item.desc}</p></div>)}</div>
    </section>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={`nav-btn ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return <div className="metric">{icon}<span>{label}</span><strong>{value}</strong></div>;
}

function StatBar({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  const max = danger ? 120 : 100;
  return <div className="stat"><div><span>{label}</span><strong>{value}</strong></div><i><b style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></i></div>;
}

function toChatEntry(message: RunMessage): ChatEntry | null {
  if (message.role === "ai" && "narrative" in message.content) return { role: "ai", text: message.content.narrative };
  if (message.role === "user" && "text" in message.content) return { role: "user", text: message.content.text };
  return null;
}

function attrName(key: string) {
  return ({ int: "智力", str: "体质", cha: "魅力", money: "财富", luck: "幸运", risk: "风险" } as Record<string, string>)[key] ?? key;
}
