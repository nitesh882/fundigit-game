import { Link } from "react-router-dom";
import { MODES } from "@/config/gameModes";

export default function ModeSelection() {
  return (
    <main className="min-h-screen px-4 pb-12 pt-28">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-center text-4xl font-bold text-cyan-300 sm:text-5xl">Choose Your Game Mode</h1>
        <p className="mb-10 text-center text-slate-300">Pick a challenge. Make it a new personal best.</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((mode) => (
            <Link key={mode.id} to={`/game/level/${mode.id}`} className="group rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-6 text-center transition hover:-translate-y-1 hover:border-cyan-300 hover:bg-slate-800/80">
              <div className="mb-4 text-5xl text-cyan-300" aria-hidden="true">{mode.icon}</div>
              <h2 className="mb-2 text-xl font-bold text-cyan-100">{mode.label}</h2>
              <p className="text-sm text-slate-300">{mode.description}</p>
              <p className="mt-4 rounded-lg bg-cyan-950/50 px-3 py-2 text-xs text-slate-300">{mode.hint}</p>
            </Link>
          ))}
        </div>
        <p className="mt-9 text-center text-sm text-slate-300">Ten questions per round. Complete a round to join the leaderboard.</p>
        <div className="mt-8 text-center"><Link to="/" className="btn-secondary">← Back to Home</Link></div>
      </div>
    </main>
  );
}
