import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authRequest } from "@/lib/apiClient";
import { MODE_LABEL, isValidGame, validateAnswer } from "@/utils/gameUtils";

const newRequestId = () => crypto.randomUUID();
const freshRecord = () => ({ requestId: newRequestId(), sessionId: null, pending: null });
const emptyMarks = (question, mode) => Array.from({ length: mode === "add" || mode === "sub" ? question?.questionColumns ?? 0 : 0 }, () => "");
const readRecord = (key) => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    return saved?.requestId ? saved : freshRecord();
  } catch {
    return freshRecord();
  }
};

export default function GameBoard() {
  const { mode = "add", level = "medium" } = useParams();
  const { user } = useAuth();
  if (!isValidGame(mode, level)) return (
    <main className="min-h-screen pt-28 px-4 text-center">
      <h1 className="text-3xl text-cyan-300 font-bold">Choose a valid game</h1>
      <Link to="/game" className="btn-primary mt-6">Choose Game Mode</Link>
    </main>
  );
  return <GameRound key={`${user?.id}:${mode}:${level}`} userId={user?.id ?? "player"} mode={mode} level={level} />;
}

function GameRound({ mode, level, userId }) {
  const navigate = useNavigate();
  const storageKey = `viemit:game:${userId}:${mode}:${level}`;
  const [initialRecord] = useState(() => readRecord(storageKey));
  const recordRef = useRef(initialRecord);
  const sessionRef = useRef(null);
  const controllerRef = useRef(null);
  const generationRef = useRef(0);
  const retryRef = useRef(null);
  const timedOutRef = useRef(null);
  const answerRef = useRef(null);
  const numeratorRef = useRef(null);
  const denominatorRef = useRef(null);
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [answer, setAnswer] = useState("");
  const [numerator, setNumerator] = useState("");
  const [denominator, setDenominator] = useState("");
  const [carryMap, setCarryMap] = useState([]);
  const [activeInput, setActiveInput] = useState(mode === "fraction" ? "num" : "answer");
  const [clock, setClock] = useState(() => ({ now: Date.now(), offset: 0 }));

  const saveRecord = useCallback((record) => {
    recordRef.current = record;
    sessionStorage.setItem(storageKey, JSON.stringify(record));
  }, [storageKey]);

  const acceptSession = useCallback((next) => {
    if (!next?.id || !["ACTIVE", "COMPLETED", "ABANDONED"].includes(next.status)) throw new Error("The server returned an invalid game response.");
    const changedQuestion = sessionRef.current?.question?.id !== next.question?.id;
    sessionRef.current = next;
    setSession(next);
    setClock({ now: Date.now(), offset: Date.parse(next.serverTime) - Date.now() || 0 });
    // Keep only active rounds resumable. A later visit to a completed mode should
    // start a new round instead of reopening an old result screen.
    saveRecord(next.status === "ACTIVE"
      ? { ...recordRef.current, sessionId: next.id, pending: null }
      : freshRecord());
    if (changedQuestion) {
      setAnswer("");
      setNumerator("");
      setDenominator("");
      setCarryMap(emptyMarks(next.question, mode));
      setActiveInput(mode === "fraction" ? "num" : "answer");
      setFormError("");
      timedOutRef.current = null;
    }
    setPhase(next.status === "ACTIVE" ? "ready" : next.status.toLowerCase());
  }, [mode, saveRecord]);

  const runOperation = useCallback(async (operation) => {
    if (controllerRef.current) return;
    const controller = new AbortController();
    const generation = generationRef.current;
    controllerRef.current = controller;
    retryRef.current = operation;
    setError("");
    setFormError("");
    setPhase(operation.kind === "answer" ? "submitting" : operation.kind === "end" ? "ending" : "loading");
    if (operation.kind === "answer" || operation.kind === "end") saveRecord({ ...recordRef.current, pending: operation });
    try {
      let response;
      const options = { signal: controller.signal };
      if (operation.kind === "load") {
        try {
          response = await authRequest(`/api/game/sessions/${operation.sessionId}`, options);
        } catch (failure) {
          if (failure.status !== 404) throw failure;
          response = await authRequest("/api/game/sessions", { ...options, method: "POST", body: JSON.stringify({ mode, level, requestId: recordRef.current.requestId }) });
        }
      } else if (operation.kind === "start") {
        saveRecord(recordRef.current);
        response = await authRequest("/api/game/sessions", { ...options, method: "POST", body: JSON.stringify({ mode, level, requestId: operation.requestId }) });
      } else {
        response = await authRequest(`/api/game/sessions/${operation.sessionId}/${operation.kind === "answer" ? "answers" : "end"}`, {
          ...options, method: "POST", ...(operation.body ? { body: JSON.stringify(operation.body) } : {}),
        });
      }
      if (controller.signal.aborted || generation !== generationRef.current) return;
      const next = operation.kind === "answer" ? response.data.session : response.data;
      acceptSession(next);
      if (operation.kind === "answer") {
        const result = response.data.result;
        setFeedback(result.timedOut ? "Time's up! (0 pts)" : operation.body.action === "skip" ? "Question skipped (0 pts)" : result.answerCorrect ? `Correct! +${result.earnedPoints} pts${result.earnedPoints === 8 ? " — add carry/borrow marks for full credit." : ""}` : "Incorrect (0 pts). Keep trying!");
      }
      retryRef.current = null;
    } catch (failure) {
      if (controller.signal.aborted || generation !== generationRef.current) return;
      if (failure.status === 409 && operation.kind === "answer") {
        const recovery = { kind: "load", sessionId: operation.sessionId };
        retryRef.current = recovery;
        saveRecord({ ...recordRef.current, pending: null });
        try {
          const { data } = await authRequest(`/api/game/sessions/${operation.sessionId}`, { signal: controller.signal });
          if (controller.signal.aborted || generation !== generationRef.current) return;
          acceptSession(data);
          setError("This round changed in another tab. The latest game state has been restored.");
          retryRef.current = null;
        } catch (recoveryFailure) {
          if (controller.signal.aborted || generation !== generationRef.current) return;
          setPhase("error");
          setError(recoveryFailure.message || "Unable to recover the latest game state. Retry the request.");
        }
        return;
      }
      const rejected = operation.kind === "answer" && failure.status >= 400 && failure.status < 500 && sessionRef.current;
      if (rejected) {
        saveRecord({ ...recordRef.current, pending: null });
        retryRef.current = null;
      }
      setPhase(rejected ? "ready" : "error");
      setError(failure.status ? failure.message : "Connection interrupted. Retry the request to recover this round without losing points.");
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [acceptSession, level, mode, saveRecord]);

  useEffect(() => {
    const generation = generationRef.current;
    // Defer startup so React StrictMode cleanup can cancel the first effect safely.
    Promise.resolve().then(() => {
      if (generation !== generationRef.current) return;
      const record = recordRef.current;
      void runOperation(record.pending || (record.sessionId ? { kind: "load", sessionId: record.sessionId } : { kind: "start", requestId: record.requestId }));
    });
    return () => {
      generationRef.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [runOperation]);

  const question = session?.question;
  const remaining = question ? Math.max(0, Math.ceil((Date.parse(question.expiresAt) - clock.now - clock.offset) / 1000)) : 0;
  const editable = phase === "ready" && remaining > 0;

  useEffect(() => {
    if (session?.status !== "ACTIVE") return undefined;
    const interval = setInterval(() => setClock((current) => ({ ...current, now: Date.now() })), 200);
    return () => clearInterval(interval);
  }, [session?.status]);

  useEffect(() => {
    if (phase !== "ready" || remaining > 0 || !question || timedOutRef.current === question.id) return undefined;
    const timeout = setTimeout(() => {
      timedOutRef.current = question.id;
      void runOperation({ kind: "answer", sessionId: session.id, body: { questionId: question.id, answerText: "", carryMap: [], action: "timeout" } });
    }, 0);
    return () => clearTimeout(timeout);
  }, [phase, question, remaining, runOperation, session?.id]);

  useEffect(() => {
    if (phase === "ready") (mode === "fraction" ? numeratorRef : answerRef).current?.focus();
  }, [mode, question?.id, phase]);

  const clearInput = useCallback(() => {
    if (!editable) return;
    setAnswer(""); setNumerator(""); setDenominator("");
    setCarryMap(emptyMarks(question, mode));
    setActiveInput(mode === "fraction" ? "num" : "answer");
    setFormError("");
  }, [editable, mode, question]);

  const enterDigit = useCallback((digit) => {
    if (!editable) return;
    const text = String(digit);
    setFormError("");
    if (activeInput.startsWith("carry:")) {
      const index = Number(activeInput.split(":")[1]);
      if (digit !== 0 && digit !== 1) return;
      setCarryMap((current) => current.map((entry, position) => position === index ? text : entry));
    } else {
      const update = (current) => current.length < 6 ? current + text : current;
      if (activeInput === "num") setNumerator(update);
      else if (activeInput === "den") setDenominator(update);
      else setAnswer(update);
    }
  }, [activeInput, editable]);

  const deleteDigit = useCallback(() => {
    if (!editable) return;
    if (activeInput.startsWith("carry:")) {
      const index = Number(activeInput.split(":")[1]);
      setCarryMap((current) => current.map((entry, position) => position === index ? "" : entry));
    } else if (activeInput === "num") setNumerator((current) => current.slice(0, -1));
    else if (activeInput === "den") setDenominator((current) => current.slice(0, -1));
    else setAnswer((current) => current.slice(0, -1));
  }, [activeInput, editable]);

  const submit = useCallback((action = "answer") => {
    if (phase !== "ready" || !question) return;
    if (action === "answer") {
      const validation = validateAnswer(mode, answer, numerator, denominator);
      if (validation) { setFormError(validation); return; }
    }
    void runOperation({ kind: "answer", sessionId: session.id, body: { questionId: question.id, answerText: action === "answer" ? mode === "fraction" ? `${numerator}/${denominator}` : answer : "", carryMap, action } });
  }, [answer, carryMap, denominator, mode, numerator, phase, question, runOperation, session]);

  useEffect(() => {
    const onKey = (event) => {
      if (!editable || event.ctrlKey || event.metaKey || event.altKey) return;
      const nativeInput = /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable;
      if (event.key === "Escape") { event.preventDefault(); clearInput(); }
      else if (!nativeInput && /^\d$/.test(event.key)) { event.preventDefault(); enterDigit(Number(event.key)); }
      else if (!nativeInput && event.key === "Backspace") { event.preventDefault(); deleteDigit(); }
      else if (!nativeInput && event.target.tagName !== "BUTTON" && event.key === "Enter" && !event.repeat) { event.preventDefault(); submit(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearInput, deleteDigit, editable, enterDigit, submit]);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.render_game_to_text = () => JSON.stringify({ phase, status: session?.status, sessionId: session?.id, mode, level, question, score: session?.score ?? 0, answeredQuestions: session?.answeredQuestions ?? 0, answerText: mode === "fraction" ? `${numerator}/${denominator}` : answer, carryMap });
    return () => { delete window.render_game_to_text; };
  }, [answer, carryMap, denominator, level, mode, numerator, phase, question, session]);

  const playAgain = () => {
    if (controllerRef.current) return;
    const record = freshRecord();
    saveRecord(record);
    setFeedback("");
    void runOperation({ kind: "start", requestId: record.requestId });
  };
  const inputChange = (setter) => (event) => {
    if (/^\d{0,6}$/.test(event.target.value)) { setter(event.target.value); setFormError(""); }
  };

  if (session && ["completed", "abandoned"].includes(phase)) return (
    <main className="min-h-screen flex items-center justify-center pt-24 pb-10 px-4">
      <div className="card-container text-center space-y-6">
        <div aria-hidden="true" className="text-5xl">{phase === "completed" ? "🏆" : "🎮"}</div>
        <h1 className="text-3xl font-bold text-cyan-300">{phase === "completed" ? "Game Complete!" : "Game Ended"}</h1>
        <p className="text-slate-300">{session.answeredQuestions} of {session.totalQuestions} questions played</p>
        <p className="text-4xl font-bold text-cyan-300">Score: {session.score}</p>
        <p className="text-sm text-slate-300">{phase === "completed" ? "Saved to your history and leaderboard." : "Saved as unfinished in your history. Complete all 10 questions to enter the leaderboard."}</p>
        <div className="grid gap-3">
          <button type="button" onClick={playAgain} className="btn-primary">Play Again</button>
          <button type="button" onClick={() => navigate("/game")} className="btn-secondary">Change Mode</button>
          <button type="button" onClick={() => navigate("/leaderboard", { state: { mode, difficulty: level, tab: phase === "abandoned" ? "history" : "top" } })} className="btn-secondary">{phase === "abandoned" ? "View History" : "View Leaderboard"}</button>
        </div>
      </div>
    </main>
  );

  const columns = question?.questionColumns ?? 1;
  const grid = { gridTemplateColumns: `repeat(${columns + 1}, minmax(0, 1fr))` };
  const digits = (value) => String(value).padStart(columns, " ").split("");
  const inputClass = "w-full min-w-0 rounded-lg border-2 border-cyan-500/50 bg-slate-800 px-3 py-3 text-center font-mono text-2xl font-bold text-white focus:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:opacity-60";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center pt-24 pb-10 px-3 sm:px-4">
      <div className="w-full max-w-lg mb-4">
        <div className="flex justify-between gap-3 mb-2 text-sm text-cyan-200">
          <h1 className="font-bold">{MODE_LABEL[mode]} · <span className="capitalize">{level}</span></h1>
          <span aria-label="Time remaining" className={remaining <= 5 ? "text-red-300 font-bold" : "font-mono"}>{question ? `${remaining}s` : "—"}</span>
        </div>
        <p className="mb-2 text-sm text-slate-300">Question {Math.min((session?.answeredQuestions ?? 0) + 1, 10)} of {session?.totalQuestions ?? 10}</p>
        <div role="progressbar" aria-label="Round progress" aria-valuemin={0} aria-valuemax={10} aria-valuenow={session?.answeredQuestions ?? 0} className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all" style={{ width: `${(session?.answeredQuestions ?? 0) * 10}%` }} />
        </div>
      </div>
      <section className="w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-4 sm:p-6 shadow-xl">
        <p className="text-xl font-bold text-cyan-300 mb-2">Score: {session?.score ?? 0}</p>
        <p role="status" className="min-h-12 text-sm text-cyan-100 mb-3">{phase === "loading" ? "Loading your round…" : phase === "submitting" ? "Checking your answer…" : phase === "ending" ? "Saving your round…" : feedback}</p>
        {error && <div role="alert" className="rounded-lg border border-amber-400/50 bg-amber-500/10 p-3 mb-4 text-sm text-amber-100"><p>{error}</p>{phase === "error" && <button type="button" onClick={() => { if (retryRef.current) void runOperation(retryRef.current); }} className="btn-secondary mt-3">Retry Request</button>}</div>}
        {question && <form onSubmit={(event) => { event.preventDefault(); submit(); }} aria-busy={phase === "submitting" || phase === "ending"}>
          <fieldset disabled={!editable} className="min-w-0">
            <legend className="sr-only">Solve the question</legend>
            {mode === "fraction" ? (
              <div className="space-y-5 mb-5">
                <div className="flex items-center justify-center gap-5 text-3xl font-mono font-bold" aria-label={`Question: ${question.a}/${question.denominatorA} ${question.operatorSymbol} ${question.b}/${question.denominatorB}`}>
                  <div className="text-center"><span className="block px-3">{question.a}</span><span className="block border-t-2 border-slate-200 px-3">{question.denominatorA}</span></div>
                  <span className="text-cyan-300">{question.operatorSymbol}</span>
                  <div className="text-center"><span className="block px-3">{question.b}</span><span className="block border-t-2 border-slate-200 px-3">{question.denominatorB}</span></div>
                </div>
                <div className="max-w-48 mx-auto">
                  <label htmlFor="game-numerator" className="block text-sm text-slate-300 mb-1">Numerator</label>
                  <input ref={numeratorRef} id="game-numerator" inputMode="numeric" autoComplete="off" maxLength={6} className={inputClass} value={numerator} onChange={inputChange(setNumerator)} onFocus={() => setActiveInput("num")} onKeyDown={(event) => { if (event.key === "/") { event.preventDefault(); denominatorRef.current?.focus(); } }} />
                  <div className="border-t-2 border-slate-200 my-2" />
                  <label htmlFor="game-denominator" className="block text-sm text-slate-300 mb-1">Denominator</label>
                  <input ref={denominatorRef} id="game-denominator" inputMode="numeric" autoComplete="off" maxLength={6} className={inputClass} value={denominator} onChange={inputChange(setDenominator)} onFocus={() => setActiveInput("den")} />
                </div>
                <p className="text-xs text-center text-slate-400">Equivalent fractions are accepted. Press / to move to the denominator.</p>
              </div>
            ) : (
              <div className="max-w-96 mx-auto mb-5">
                {(mode === "add" || mode === "sub") && <>
                  <p className="text-xs text-slate-300 mb-2">Mark each column where you {mode === "sub" ? "borrow" : "carry"} for full credit.</p>
                  <div className="grid gap-1 sm:gap-2 mb-2" style={grid}>
                    <span />{Array.from({ length: columns }, (_, index) => <button key={index} type="button" aria-label={`${mode === "sub" ? "Borrow" : "Carry"} for column ${index + 1}`} aria-pressed={carryMap[index] === "1"} onClick={() => {
                      setActiveInput(`carry:${index}`);
                      setCarryMap((current) => current.map((entry, position) => position === index ? entry === "1" ? "" : "1" : entry));
                    }} className={`h-9 min-w-0 rounded-md border text-sm font-bold ${activeInput === `carry:${index}` ? "border-cyan-100 bg-cyan-400/25" : "border-amber-400/60 bg-amber-400/10 text-amber-200"}`}>{carryMap[index] || (mode === "sub" ? "B" : "C")}</button>)}
                  </div>
                </>}
                <div className="grid gap-1 sm:gap-2 text-center font-mono text-2xl sm:text-3xl font-bold" style={grid} aria-label={`Question: ${question.a} ${question.operatorSymbol} ${question.b}`}>
                  <span />{digits(question.a).map((digit, index) => <span key={`a-${index}`} className="py-1">{digit.trim()}</span>)}
                  <span className="text-cyan-300 py-1">{question.operatorSymbol}</span>{digits(question.b).map((digit, index) => <span key={`b-${index}`} className="py-1">{digit.trim()}</span>)}
                  <div className="col-span-full border-b-2 border-cyan-400 my-2" />
                </div>
                <label htmlFor="game-answer" className="block text-sm text-slate-300 mb-2">Your answer</label>
                <input ref={answerRef} id="game-answer" inputMode="numeric" autoComplete="off" maxLength={6} className={inputClass} value={answer} onChange={inputChange(setAnswer)} onFocus={() => setActiveInput("answer")} />
              </div>
            )}
            {formError && <p role="alert" className="text-red-200 text-sm mb-4">{formError}</p>}
            <div className="max-w-xs mx-auto grid grid-cols-3 gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => <button key={digit} type="button" onClick={() => enterDigit(digit)} className="rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-lg font-bold hover:bg-cyan-500/25">{digit}</button>)}
              <button type="button" onClick={deleteDigit} className="rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm">Delete</button>
              <button type="button" onClick={() => enterDigit(0)} className="rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-lg font-bold">0</button>
              <button type="button" onClick={clearInput} className="rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm">Clear</button>
            </div>
            <button type="submit" className="btn-primary w-full">Submit Answer</button>
            <button type="button" onClick={() => submit("skip")} className="btn-secondary w-full mt-3">Skip Question</button>
          </fieldset>
          <button type="button" disabled={phase !== "ready"} onClick={() => void runOperation({ kind: "end", sessionId: session.id })} className="w-full mt-3 rounded-lg border border-red-400/50 px-4 py-2.5 text-red-200 font-semibold disabled:opacity-50">End Game</button>
        </form>}
      </section>
      <p className="max-w-lg text-center text-xs text-slate-400 mt-4">Use the keypad or your keyboard. Enter submits, Backspace deletes, and Esc clears. End Game saves an unfinished round to history.</p>
    </main>
  );
}
