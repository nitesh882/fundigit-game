import { Link, Navigate, useParams } from "react-router-dom";
import { LEVELS, MODES, questionSeconds } from "@/config/gameModes";

export default function LevelSelection() {
  const { mode } = useParams();
  const selectedMode = MODES.find((item) => item.id === mode);
  if (!selectedMode) return <Navigate to="/game" replace />;

  return (
    <main className="min-h-screen px-4 pb-12 pt-28">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-4 text-5xl text-cyan-300" aria-hidden="true">{selectedMode.icon}</div>
        <h1 className="mb-4 text-4xl font-bold text-cyan-300 sm:text-5xl">{selectedMode.label} Mode</h1>
        <p className="mb-10 text-slate-300">Choose your difficulty level</p>
        <div className="grid gap-5 md:grid-cols-3">
          {LEVELS.map((level) => (
            <Link key={level.id} to={`/game/play/${mode}/${level.id}`} className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-6 transition hover:-translate-y-1 hover:border-cyan-300">
              <div className="mb-4 text-4xl" aria-hidden="true">{level.icon}</div>
              <h2 className="mb-2 text-2xl font-bold text-cyan-100">{level.label}</h2>
              <p className="mb-5 text-sm text-slate-300">{level.description}</p>
              <p className="text-sm text-cyan-200">{questionSeconds(mode, level.id)} seconds per question</p>
              <p className="mt-2 text-xs text-slate-300">{mode === "fraction" ? `Denominators up to ${{ easy: 6, medium: 12, hard: 20 }[level.id]}` : `Numbers from 1 to ${{ easy: 9, medium: 99, hard: 999 }[level.id]}`}</p>
              <span className="mt-6 block rounded-lg bg-cyan-500 py-2 font-bold text-slate-950">Play Now →</span>
            </Link>
          ))}
        </div>
        <p className="mt-8 text-sm text-slate-300">{mode === "fraction" ? "Each round mixes five additions and five subtractions. Equivalent fractions count." : "Correct answers earn up to 10 points. You can skip a question for zero points."}</p>
        <div className="mt-8"><Link to="/game" className="btn-secondary">← Back to Game Modes</Link></div>
      </div>
    </main>
  );
}
