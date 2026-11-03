import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiRequest, authRequest } from "@/lib/apiClient";
import { LEVELS, MODES, modeLabel } from "@/config/gameModes";

const REFRESH_INTERVAL_MS = 5000;
const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

function useScoreList(path, privateRequest, enabled) {
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({ path: "", entries: [], loading: true, error: "" });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let sequence = 0;
    let controller;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      const requestNumber = ++sequence;
      try {
        const { data } = await (privateRequest ? authRequest : apiRequest)(path, { signal });
        if (active && requestNumber === sequence) {
          setState({ path, entries: Array.isArray(data) ? data : [], loading: false, error: "" });
        }
      } catch (error) {
        if (active && requestNumber === sequence && !signal.aborted) {
          setState((previous) => ({ path, entries: previous.path === path ? previous.entries : [], loading: false, error: error.message || "Unable to load scores." }));
        }
      }
    };
    void load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      sequence += 1;
      controller?.abort();
      clearInterval(interval);
    };
  }, [path, privateRequest, enabled, retry]);

  return {
    ...(state.path === path ? state : { entries: [], loading: true, error: "" }),
    retry: () => setRetry((value) => value + 1),
  };
}

export default function Leaderboard() {
  const location = useLocation();
  const [mode, setMode] = useState(MODES.some((item) => item.id === location.state?.mode) ? location.state.mode : "add");
  const [difficulty, setDifficulty] = useState(LEVELS.some((item) => item.id === location.state?.difficulty) ? location.state.difficulty : "medium");
  const [activeTab, setActiveTab] = useState(location.state?.tab === "history" ? "history" : "top");
  const top = useScoreList(`/api/leaderboard?mode=${mode}&difficulty=${difficulty}`, false, activeTab === "top");
  const history = useScoreList("/api/history?limit=50", true, activeTab === "history");
  const current = activeTab === "top" ? top : history;

  return (
    <main className="min-h-screen px-4 pb-12 pt-28">
      <div className="mx-auto max-w-4xl rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-4 sm:p-8">
        <h1 className="mb-6 text-center text-3xl font-bold text-cyan-300 sm:text-4xl">🏆 Hall of Fame</h1>
        <div className="mb-6 flex flex-wrap justify-center gap-3" aria-label="Score views">
          {[["top", "Top Leaderboard"], ["history", "My History"]].map(([id, label]) => <button key={id} type="button" aria-pressed={activeTab === id} onClick={() => setActiveTab(id)} className={`rounded-lg px-5 py-3 font-bold ${activeTab === id ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}>{label}</button>)}
        </div>
        {activeTab === "top" ? (
          <>
            <p className="mb-5 text-center text-sm text-slate-300">Completed ten-question rounds, ranked by score. Earlier completion wins a tie.</p>
            <div className="mb-4 flex flex-wrap justify-center gap-2" aria-label="Filter by mode">
              {MODES.map((item) => <button key={item.id} type="button" aria-pressed={mode === item.id} onClick={() => setMode(item.id)} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === item.id ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-200"}`}>{item.icon} {item.label}</button>)}
            </div>
            <div className="mb-6 flex flex-wrap justify-center gap-2" aria-label="Filter by difficulty">
              {LEVELS.map((item) => <button key={item.id} type="button" aria-pressed={difficulty === item.id} onClick={() => setDifficulty(item.id)} className={`rounded-lg px-3 py-2 text-sm font-bold ${difficulty === item.id ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-200"}`}>{item.icon} {item.label}</button>)}
            </div>
          </>
        ) : <p className="mb-6 text-center text-sm text-slate-300">Your latest games across all modes and difficulties, including unfinished rounds.</p>}

        <div className="space-y-3" aria-live="polite" aria-busy={current.loading}>
          {current.loading && <p className="py-8 text-center text-cyan-100">{activeTab === "top" ? "Loading leaderboard..." : "Loading your history..."}</p>}
          {current.error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-center"><p role="alert" className="mb-3 text-red-200">{current.error}</p><button type="button" className="btn-secondary" onClick={current.retry}>Retry</button></div>}
          {!current.loading && !current.error && current.entries.length === 0 && <div className="py-8 text-center text-slate-300"><p>{activeTab === "top" ? `No scores yet for ${modeLabel(mode)} (${difficulty}).` : "No games played yet."}</p><p className="mt-2 text-sm">Play a round to see your progress here.</p></div>}
          {current.entries.map((entry, index) => (
            <article key={entry.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${activeTab === "top" && index === 0 ? "bg-yellow-400 text-slate-950" : "bg-cyan-950 text-cyan-200"}`}>{index + 1}</span>
                <div className="min-w-0"><h2 className="break-words font-bold text-cyan-100">{entry.name}</h2><p className="text-xs text-slate-300">{modeLabel(entry.mode)} · {entry.difficulty}</p>{activeTab === "history" && <p className="mt-1 text-xs text-slate-300">{entry.status === "COMPLETED" || entry.completed === true ? "Completed" : "Unfinished"} · {entry.answeredQuestions ?? 10}/10 questions</p>}</div>
              </div>
              <div className="text-right"><p className="text-2xl font-bold text-cyan-300">{entry.score} pts</p><time className="text-xs text-slate-300" dateTime={entry.playedAt}>{formatDate(entry.playedAt)}</time></div>
            </article>
          ))}
        </div>
        <div className="mt-8 text-center"><Link to="/game" className="btn-primary">Play Game →</Link></div>
      </div>
    </main>
  );
}
