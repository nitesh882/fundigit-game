import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiRequest, authHeader } from "@/lib/apiClient";

const REFRESH_INTERVAL_MS = 5000;

const formatDate = (dateString) => {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  return date
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(",", "")
    .toUpperCase();
};

const toList = (value) => (Array.isArray(value) ? value : []);

const MODE_LABELS = {
  add: "Addition",
  sub: "Subtraction",
  mul: "Multiplication",
  div: "Division",
  fraction: "Fractions",
};

const Leaderboard = () => {
  const location = useLocation();

  const [mode, setMode] = useState(location.state?.mode || "add");
  const [difficulty, setDifficulty] = useState(
    location.state?.difficulty || "medium"
  );
  const [activeTab, setActiveTab] = useState("top");

  const [scores, setScores] = useState([]);
  const [history, setHistory] = useState([]);

  const [topLoading, setTopLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [topError, setTopError] = useState("");
  const [historyError, setHistoryError] = useState("");

  const fetchTopScores = useCallback(async () => {
    const token = localStorage.getItem("token");
    setTopLoading(true);
    setTopError("");

    try {
      const { data } = await apiRequest(
        `/api/leaderboard?mode=${encodeURIComponent(mode)}&difficulty=${encodeURIComponent(difficulty)}`,
        {
          headers: authHeader(token),
        }
      );

      setScores(toList(data));
    } catch (error) {
      console.error("Leaderboard fetch failed:", error);
      setScores([]);
      setTopError(error.message || "Unable to load leaderboard.");
    } finally {
      setTopLoading(false);
    }
  }, [difficulty, mode]);

  const fetchHistory = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setHistory([]);
      setHistoryError("Login required to view your history.");
      return;
    }

    setHistoryLoading(true);
    setHistoryError("");

    try {
      const { data } = await apiRequest("/api/history?limit=50", {
        headers: authHeader(token),
      });

      setHistory(toList(data));
    } catch (error) {
      console.error("History fetch failed:", error);
      setHistory([]);
      setHistoryError(error.message || "Unable to load history.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "top") return undefined;

    fetchTopScores();
    const intervalId = setInterval(fetchTopScores, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [activeTab, fetchTopScores]);

  useEffect(() => {
    if (activeTab !== "history") return undefined;

    fetchHistory();
    const intervalId = setInterval(fetchHistory, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [activeTab, fetchHistory]);

  const renderTopList = () => {
    if (topLoading && scores.length === 0) {
      return (
        <div className="py-12 text-center">
          <p className="text-lg text-cyan-100">Loading leaderboard...</p>
        </div>
      );
    }

    if (topError) {
      return (
        <div className="space-y-4 py-10 text-center">
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {topError}
          </p>
          <button
            type="button"
            onClick={fetchTopScores}
            className="rounded-lg border border-cyan-400/60 px-4 py-2 font-bold text-cyan-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-500/15"
          >
            Retry
          </button>
        </div>
      );
    }

    if (scores.length === 0) {
      return (
        <div className="py-12 text-center">
          <p className="mb-2 text-xl text-gray-300">
            No scores yet for {MODE_LABELS[mode] || mode} ({difficulty}).
          </p>
          <p className="text-cyan-200/80">Be the first to set a high score!</p>
        </div>
      );
    }

    return scores.map((entry, index) => {
      const rank = index + 1;

      return (
        <div
          key={entry.id || entry._id || `${entry.name}-${entry.playedAt}-${index}`}
          className="group flex flex-col items-center justify-between gap-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/70 hover:shadow-[0_10px_24px_rgba(34,211,238,0.15)] sm:flex-row"
        >
          <div className="flex w-full items-center gap-4 sm:w-auto">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold ${
                rank === 1
                  ? "bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]"
                  : rank === 2
                  ? "bg-slate-300 text-black"
                  : rank === 3
                  ? "bg-amber-600 text-black"
                  : "bg-slate-900 text-slate-300"
              }`}
            >
              {rank}
            </span>
            <div className="text-left">
              <p className="text-lg font-semibold text-white transition-colors group-hover:text-cyan-100">
                {entry.name}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {MODE_LABELS[entry.mode] || entry.mode} • {entry.difficulty}
              </p>
            </div>
          </div>

          <div className="flex w-full items-center justify-between gap-6 sm:w-auto sm:justify-end">
            <div className="hidden text-right sm:block">
              <span className="block text-xs text-slate-400">Played On</span>
              <span className="text-sm font-mono text-cyan-200/90">
                {formatDate(entry.playedAt)}
              </span>
            </div>
            <span className="text-2xl font-bold text-cyan-300">⭐ {entry.score}</span>
          </div>
        </div>
      );
    });
  };

  const renderHistoryList = () => {
    if (historyLoading && history.length === 0) {
      return (
        <div className="py-12 text-center">
          <p className="text-lg text-cyan-100">Loading your history...</p>
        </div>
      );
    }

    if (historyError) {
      return (
        <div className="space-y-4 py-10 text-center">
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {historyError}
          </p>
          <button
            type="button"
            onClick={fetchHistory}
            className="rounded-lg border border-cyan-400/60 px-4 py-2 font-bold text-cyan-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-500/15"
          >
            Retry
          </button>
        </div>
      );
    }

    if (history.length === 0) {
      return (
        <div className="py-12 text-center">
          <p className="mb-2 text-xl text-gray-300">No games played yet.</p>
          <p className="text-cyan-200/80">Complete a game to create history!</p>
        </div>
      );
    }

    return history.map((entry, index) => (
      <div
        key={entry.id || entry._id || `${entry.playedAt}-${index}`}
        className="flex flex-col items-center justify-between gap-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/70 hover:shadow-[0_10px_24px_rgba(34,211,238,0.15)] sm:flex-row"
      >
        <div className="w-full text-left sm:w-auto">
          <p className="text-lg font-semibold text-cyan-100">#{index + 1}</p>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {MODE_LABELS[entry.mode] || entry.mode} • {entry.difficulty}
          </p>
        </div>
        <div className="flex w-full items-center justify-between gap-6 sm:w-auto sm:justify-end">
          <span className="text-sm font-mono text-cyan-200/90">
            {formatDate(entry.playedAt)}
          </span>
          <span className="text-2xl font-bold text-cyan-300">⭐ {entry.score}</span>
        </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen px-4 pb-12 pt-24">
      <div className="card-container mx-auto max-w-4xl">
        <h2 className="mb-8 text-center text-4xl font-bold text-cyan-300">
          🏆 Hall of Fame
        </h2>

        <div className="mb-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("top")}
            className={`rounded-lg px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition-all duration-200 ${
              activeTab === "top"
                ? "bg-cyan-400 text-slate-950 shadow-[0_8px_22px_rgba(34,211,238,0.35)]"
                : "bg-slate-800 text-slate-300 hover:-translate-y-0.5 hover:bg-slate-700"
            }`}
          >
            Top Leaderboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`rounded-lg px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition-all duration-200 ${
              activeTab === "history"
                ? "bg-cyan-400 text-slate-950 shadow-[0_8px_22px_rgba(34,211,238,0.35)]"
                : "bg-slate-800 text-slate-300 hover:-translate-y-0.5 hover:bg-slate-700"
            }`}
          >
            My History
          </button>
        </div>

        {activeTab === "top" && (
          <div className="mb-8 flex flex-col justify-center gap-6 md:flex-row">
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { id: "add", label: "➕ Addition" },
                { id: "sub", label: "➖ Subtraction" },
                { id: "mul", label: "✖️ Multiplication" },
                { id: "div", label: "➗ Division" },
                { id: "fraction", label: "½ Fractions" },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition-all duration-200 ${
                    mode === m.id
                      ? "bg-cyan-400 text-slate-950 shadow-[0_8px_20px_rgba(34,211,238,0.3)]"
                      : "bg-slate-800 text-slate-300 hover:-translate-y-0.5 hover:bg-slate-700"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {[
                { id: "easy", label: "🌱 Easy" },
                { id: "medium", label: "🔥 Medium" },
                { id: "hard", label: "⚡ Hard" },
              ].map((l) => (
                <button
                  type="button"
                  key={l.id}
                  onClick={() => setDifficulty(l.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition-all duration-200 ${
                    difficulty === l.id
                      ? "bg-cyan-500/90 text-slate-950 shadow-[0_8px_20px_rgba(34,211,238,0.3)]"
                      : "bg-slate-800 text-slate-300 hover:-translate-y-0.5 hover:bg-slate-700"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <p className="mb-6 text-center text-sm text-cyan-100/90">
            Showing your latest games across all modes and difficulties.
          </p>
        )}

        <div className="custom-scrollbar max-h-[500px] space-y-4 overflow-y-auto pr-2">
          {activeTab === "top" ? renderTopList() : renderHistoryList()}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/game"
            className="btn-primary inline-block px-8 hover:!bg-cyan-400 hover:!text-slate-950 hover:!shadow-[0_10px_24px_rgba(34,211,238,0.35)]"
          >
            🎮 Play Game
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
