import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const id = location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.hash]);

  return (
    <main>
      <section id="top" className="relative flex min-h-[85svh] items-center justify-center overflow-hidden px-4 pb-16 pt-28 text-center">
        <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-4xl">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">ViemIt · Fun Digit Game</p>
          <h1 className="mb-6 bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-5xl font-bold leading-tight text-transparent sm:text-7xl">Make every number count.</h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">A quick math challenge, a little focus, and ten chances to beat your best. Practice arithmetic and fractions, then see how your completed round ranks.</p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link to={isAuthenticated ? "/game" : "/signup"} className="btn-primary px-9">Play Now →</Link>
            <a href="#how-to-play" className="btn-secondary px-9 py-3">How to Play</a>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-slate-300"><span>5 math modes</span><span>3 difficulty levels</span><span>10 questions per round</span></div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 bg-black/30 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-10 text-center text-3xl font-bold text-cyan-300 sm:text-4xl">Small rounds. Steady progress.</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["+ − × ÷ ½", "Five ways to practice", "Try addition, subtraction, multiplication, exact division, and mixed fractions."],
              ["⏱", "A pace for you", "Choose easy, medium, or hard. Each question has its own countdown."],
              ["🏆", "Compare completed rounds", "Leaderboards group scores by mode and difficulty, so the challenge stays fair."],
              ["↗", "See your progress", "Your account keeps completed rounds and games you ended early in personal history."],
            ].map(([icon, title, description]) => (
              <article key={title} className="rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-6">
                <div className="mb-5 text-3xl text-cyan-300" aria-hidden="true">{icon}</div>
                <h3 className="mb-3 text-lg font-bold text-cyan-100">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-300">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-to-play" className="scroll-mt-24 px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-9 text-center text-3xl font-bold text-cyan-300">How to Play</h2>
          <ol className="space-y-4 text-slate-200">
            {[
              ["Choose your challenge", "Create an account, choose a math mode, then pick a difficulty. Each round has ten questions."],
              ["Enter an answer", "Use the number pad or your keyboard. Enter submits, Backspace deletes, and Escape clears. For fractions, select the numerator or denominator before typing."],
              ["Earn your points", "A correct answer earns 10 points. In addition and subtraction, missing or incorrect carry/borrow entries reduce a correct answer to 8. Wrong answers, skips, and timeouts earn zero."],
              ["Finish and compare", "Complete all ten questions to enter the leaderboard. End Game saves an unfinished entry to your history. Refreshing resumes your round while the timer continues."],
            ].map(([title, description], index) => (
              <li key={title} className="flex gap-4 rounded-xl border border-cyan-500/20 bg-slate-900/60 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 font-bold text-cyan-300" aria-hidden="true">{index + 1}</span>
                <div><h3 className="mb-1 font-bold text-cyan-100">{title}</h3><p className="text-sm leading-relaxed text-slate-300">{description}</p></div>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-center text-sm leading-relaxed text-slate-300">Arithmetic timers: 30 / 20 / 10 seconds. Fraction timers: 40 / 30 / 20 seconds for easy / medium / hard. Equivalent fractions are accepted; denominators must be positive.</p>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 bg-black/25 px-4 py-16 text-center">
        <h2 className="mb-4 text-3xl font-bold text-cyan-300">About ViemIt</h2>
        <p className="mx-auto max-w-2xl leading-relaxed text-slate-300">ViemIt turns math practice into a focused game. Build confidence with familiar operations, explore fractions, and challenge your own best score one round at a time.</p>
      </section>
      <footer className="border-t border-cyan-500/20 bg-black/50 px-4 py-8 text-center text-sm text-slate-300">
        <p>© {new Date().getFullYear()} ViemIt · Where numbers meet fun</p>
        <div className="mt-4 flex flex-wrap justify-center gap-6"><a href="#top">Back to Top</a><a href="#features">Features</a><a href="#how-to-play">How to Play</a></div>
      </footer>
    </main>
  );
}
