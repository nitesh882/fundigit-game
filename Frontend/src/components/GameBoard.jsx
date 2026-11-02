import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest, authHeader } from "@/lib/apiClient";
import { generateFractionQuestion, simplifyFraction } from "@/utils/gameUtils";

const TOTAL_QUESTIONS = 10;

const GameBoard = () => {
  const { mode = "add", level = "medium" } = useParams();
  const navigate = useNavigate();

  const isScoreSavedRef = useRef(false);
  const timeoutHandledRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const isLoadingQuestionRef = useRef(false);

  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [answerDigits, setAnswerDigits] = useState([]);
  const [fractionQ, setFractionQ] = useState(null);
  const [fracNumInput, setFracNumInput] = useState("");
  const [fracDenInput, setFracDenInput] = useState("");
  const [carryRequiredMap, setCarryRequiredMap] = useState([]);
  const [carryMap, setCarryMap] = useState([]);
  const [activeInput, setActiveInput] = useState("answer");
  const [selectedCarryIndex, setSelectedCarryIndex] = useState(null);
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(1);
  const [timer, setTimer] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [questionError, setQuestionError] = useState("");
  const [operatorSymbol, setOperatorSymbol] = useState("?");
  const [feedback, setFeedback] = useState(null);

  const showCarryBorrow = mode === "add" || mode === "sub";

  // Stable generateQuestion that only depends on mode and level
  const generateQuestion = useCallback(async () => {
    if (isLoadingQuestionRef.current) return;
    isLoadingQuestionRef.current = true;

    try {
      setQuestionError("");
      timeoutHandledRef.current = false;

      if (mode === "fraction") {
        const q = generateFractionQuestion(level, "add");
        setFractionQ(q);
        setFracNumInput("");
        setFracDenInput("");
        setOperatorSymbol(q.operator || "+");
        setCarryRequiredMap([]);
        setCarryMap([]);
        setAnswerDigits([]);
        setActiveInput("num");
        setSelectedCarryIndex(null);
        setTimer(q.timeLimitSeconds || 30);
      } else {
        const { data } = await apiRequest(
          `/api/game/question?mode=${encodeURIComponent(
            mode
          )}&level=${encodeURIComponent(level)}`
        );

        const requiredMap = Array.isArray(data?.carryRequiredMap)
          ? data.carryRequiredMap
          : [];
        const answerLength =
          typeof data?.answerLength === "number" && data.answerLength > 0
            ? data.answerLength
            : 1;
        const timeLimitSeconds =
          typeof data?.timeLimitSeconds === "number" && data.timeLimitSeconds > 0
            ? data.timeLimitSeconds
            : 25;

        setNum1(data?.a ?? 0);
        setNum2(data?.b ?? 0);
        setOperatorSymbol(data?.operatorSymbol ?? "?");
        setAnswerDigits(Array(answerLength).fill(""));
        setCarryRequiredMap(requiredMap);
        setCarryMap(requiredMap.map((required) => (required ? "" : null)));
        setActiveInput("answer");
        setSelectedCarryIndex(null);
        setTimer(timeLimitSeconds);
      }
    } catch (error) {
      console.error("Unable to load question:", error);
      setQuestionError("Unable to load question. Please check backend connection.");
    } finally {
      isLoadingQuestionRef.current = false;
    }
  }, [level, mode]);

  const saveScore = useCallback(
    async (finalScore) => {
      if (isScoreSavedRef.current) return;
      isScoreSavedRef.current = true;

      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        setSaveError("");
        await apiRequest("/api/score", {
          method: "POST",
          headers: {
            ...authHeader(token),
          },
          body: JSON.stringify({
            score: finalScore,
            mode,
            difficulty: level,
          }),
        });
      } catch (error) {
        console.error("Unable to save score:", error);
        setSaveError("Score sync failed. Please check backend connection.");
      }
    },
    [level, mode]
  );

  const finalizeGame = useCallback(
    (finalScore) => {
      setGameOver(true);
      setTimer(null);
      void saveScore(finalScore);
    },
    [saveScore]
  );

  const handleSubmit = useCallback(
    async (timeout = false) => {
      if (gameOver || isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      let earnedPoints = 0;
      let isCorrect = false;

      if (mode === "fraction") {
        try {
          const n = parseInt(fracNumInput || "0", 10);
          const d = parseInt(fracDenInput || "1", 10) || 1;
          const submitted = simplifyFraction(n, d);
          const expected = fractionQ?.answer || null;
          if (!timeout && expected && submitted.n === expected.n && submitted.d === expected.d) {
            earnedPoints = 10;
            isCorrect = true;
          }
        } catch {
          earnedPoints = 0;
        }
      } else {
        const answerText = answerDigits.join("");
        try {
          const { data } = await apiRequest("/api/game/submit", {
            method: "POST",
            body: JSON.stringify({
              a: num1,
              b: num2,
              mode,
              level,
              answerText,
              carryMap,
              timeout,
            }),
          });
          earnedPoints = typeof data?.earnedPoints === "number" ? data.earnedPoints : 0;
          isCorrect = Boolean(data?.answerCorrect);
        } catch (error) {
          console.error("Unable to submit answer:", error);
          earnedPoints = 0;
        }
      }

      if (timeout) {
        setFeedback({ text: "⏰ Time's up! (0 pts)", type: "warning" });
      } else if (earnedPoints > 0 || isCorrect) {
        setFeedback({ text: `+${earnedPoints} Correct! 🎉`, type: "success" });
      } else {
        setFeedback({ text: "❌ Incorrect", type: "error" });
      }

      setTimeout(() => setFeedback(null), 1500);

      const nextScore = score + earnedPoints;
      setScore(nextScore);

      if (questionCount >= TOTAL_QUESTIONS) {
        finalizeGame(nextScore);
        isSubmittingRef.current = false;
        return;
      }

      setQuestionCount((prev) => prev + 1);
      await generateQuestion();
      isSubmittingRef.current = false;
    },
    [
      answerDigits,
      carryMap,
      finalizeGame,
      fracDenInput,
      fracNumInput,
      fractionQ,
      gameOver,
      generateQuestion,
      level,
      mode,
      num1,
      num2,
      questionCount,
      score,
    ]
  );

  const startFreshGame = useCallback(() => {
    isScoreSavedRef.current = false;
    timeoutHandledRef.current = false;
    isSubmittingRef.current = false;
    setSaveError("");
    setScore(0);
    setQuestionCount(1);
    setGameOver(false);
    setFeedback(null);
    void generateQuestion();
  }, [generateQuestion]);

  const handleNext = useCallback(() => {
    if (gameOver || isSubmittingRef.current) return;

    if (questionCount >= TOTAL_QUESTIONS) {
      finalizeGame(score);
      return;
    }

    setQuestionCount((prev) => prev + 1);
    void generateQuestion();
  }, [finalizeGame, gameOver, generateQuestion, questionCount, score]);

  const handleDigit = useCallback(
    (digit) => {
      const d = String(digit);
      if (mode === "fraction") {
        if (activeInput === "num") {
          setFracNumInput((s) => (s.length < 4 ? (s === "0" ? d : s + d) : s));
        } else {
          setFracDenInput((s) => (s.length < 4 ? (s === "0" ? d : s + d) : s));
        }
        return;
      }

      if (
        activeInput === "carry" &&
        selectedCarryIndex !== null &&
        carryRequiredMap[selectedCarryIndex]
      ) {
        const normalizedCarry = d === "0" ? "0" : "1";
        setCarryMap((prev) => {
          const next = [...prev];
          next[selectedCarryIndex] = normalizedCarry;
          return next;
        });
        return;
      }

      // Enter digits left-to-right into the answer boxes
      setAnswerDigits((prev) => {
        let insertIndex = prev.findIndex((val) => val === "");
        if (insertIndex === -1) return prev;

        const next = [...prev];
        next[insertIndex] = d;
        return next;
      });

      setActiveInput("answer");
      setSelectedCarryIndex(null);
    },
    [activeInput, carryRequiredMap, mode, selectedCarryIndex]
  );

  const handleDelete = useCallback(() => {
    if (mode === "fraction") {
      if (activeInput === "num") setFracNumInput((s) => s.slice(0, -1));
      else setFracDenInput((s) => s.slice(0, -1));
      return;
    }

    if (
      activeInput === "carry" &&
      selectedCarryIndex !== null &&
      carryRequiredMap[selectedCarryIndex]
    ) {
      setCarryMap((prev) => {
        const next = [...prev];
        next[selectedCarryIndex] = "";
        return next;
      });
      return;
    }

    // Delete the rightmost filled digit
    setAnswerDigits((prev) => {
      let removeIndex = -1;
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        if (prev[i] !== "") {
          removeIndex = i;
          break;
        }
      }

      if (removeIndex === -1) return prev;

      const next = [...prev];
      next[removeIndex] = "";
      return next;
    });

    setActiveInput("answer");
    setSelectedCarryIndex(null);
  }, [activeInput, carryRequiredMap, mode, selectedCarryIndex]);

  const handleClear = useCallback(() => {
    if (mode === "fraction") {
      setFracNumInput("");
      setFracDenInput("");
      setActiveInput("num");
      return;
    }

    setAnswerDigits((prev) => prev.map(() => ""));
    setCarryMap(carryRequiredMap.map((required) => (required ? "" : null)));
    setActiveInput("answer");
    setSelectedCarryIndex(null);
  }, [carryRequiredMap, mode]);

  // Start fresh game ONCE on mount or when mode/level change
  useEffect(() => {
    startFreshGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, level]);

  // Timer countdown: ticks down every second only when timer > 0
  useEffect(() => {
    if (gameOver || timer === null || timer <= 0) return;

    const intervalId = setInterval(() => {
      setTimer((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameOver, timer]);

  // Timeout handler: fires when timer reaches 0
  useEffect(() => {
    if (gameOver || timer === null || timer > 0 || timeoutHandledRef.current) return;
    timeoutHandledRef.current = true;
    void handleSubmit(true);
  }, [gameOver, handleSubmit, timer]);

  // Keyboard handlers: digits, Enter, Backspace, Escape
  useEffect(() => {
    const onKey = (e) => {
      if (gameOver) return;
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(Number(e.key));
      } else if (e.key === "Enter") {
        void handleSubmit(false);
      } else if (e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Escape") {
        handleClear();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameOver, handleDigit, handleSubmit, handleDelete, handleClear]);

  // UI for game over
  if (gameOver) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black to-slate-900 p-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-slate-900/90 p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
          <div className="mb-6 text-6xl animate-bounce">🎉</div>
          <h1 className="mb-4 text-4xl font-bold text-cyan-300">Game Complete!</h1>
          <div className="mb-6 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-lg p-6">
            <p className="text-gray-400 mb-2">Final Score</p>
            <p className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 text-transparent bg-clip-text">
              {score}
            </p>
          </div>
          {saveError && (
            <div className="p-3 mb-4 rounded-lg bg-yellow-500/20 border border-yellow-500 text-yellow-300 text-sm">
              ⚠️ {saveError}
            </div>
          )}
          <div className="grid gap-3">
            <button
              type="button"
              onClick={startFreshGame}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 font-bold text-slate-950 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_26px_rgba(34,211,238,0.4)]"
            >
              🔄 Play Again
            </button>
            <button
              type="button"
              onClick={() => navigate("/game")}
              className="rounded-lg border border-cyan-400/60 px-4 py-3 font-bold text-cyan-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-500/15"
            >
              🎮 Change Mode
            </button>
            <button
              type="button"
              onClick={() => navigate("/leaderboard", { state: { mode, difficulty: level } })}
              className="rounded-lg border border-purple-500/60 px-4 py-3 font-bold text-purple-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-purple-500/15"
            >
              🏆 View Leaderboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const questionColumns = Math.max(String(num1).length, String(num2).length);
  const boardColumns = Math.max(questionColumns, answerDigits.length);
  const totalColumns = boardColumns + 1; // extra column for operator symbol
  const carryOffset = Math.max(0, boardColumns - questionColumns);
  const answerOffset = Math.max(0, boardColumns - answerDigits.length);

  const topDigits = String(num1).padStart(boardColumns, " ").split("");
  const bottomDigits = String(num2).padStart(boardColumns, " ").split("");

  const progressPercentage = (questionCount / TOTAL_QUESTIONS) * 100;
  const currentTimer = timer ?? 0;
  const isTimeCritical = currentTimer <= 5;
  const isTimeWarning = currentTimer <= 10;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black to-slate-900 p-4 text-white">
      {/* Header with Progress */}
      <div className="w-full max-w-lg mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm font-semibold text-cyan-300">
            Question {questionCount} of {TOTAL_QUESTIONS}
          </div>
          <div
            className={`font-mono font-bold px-3 py-1 rounded-full border text-sm transition-colors ${
              timer === null
                ? "border-cyan-500/40 bg-slate-800 text-cyan-300"
                : isTimeCritical
                ? "border-red-500 bg-red-500/20 text-red-300 animate-pulse"
                : isTimeWarning
                ? "border-yellow-500 bg-yellow-500/20 text-yellow-300"
                : "border-cyan-500/40 bg-slate-800 text-cyan-300"
            }`}
          >
            ⏱️ {timer !== null ? `${timer}s` : "--"}
          </div>
        </div>

        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/20">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Main Game Board */}
      <div className="w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-6 text-center shadow-[0_20px_45px_rgba(0,0,0,0.45)] relative">
        {/* Score & Feedback Bar */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="text-xl font-bold text-cyan-300">⭐ Score: {score}</div>
          {feedback && (
            <div
              className={`text-sm font-bold px-3 py-1 rounded-full animate-bounce ${
                feedback.type === "success"
                  ? "bg-green-500/20 text-green-300 border border-green-500/50"
                  : feedback.type === "warning"
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50"
                  : "bg-red-500/20 text-red-300 border border-red-500/50"
              }`}
            >
              {feedback.text}
            </div>
          )}
        </div>

        {/* Error Messages */}
        {questionError && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/20 border border-red-500 text-red-300 text-sm">
            ❌ {questionError}
          </div>
        )}

        {/* Carry/Borrow Row */}
        {showCarryBorrow && carryRequiredMap.length > 0 && (
          <div
            className="mb-3 grid justify-center gap-2"
            style={{ gridTemplateColumns: `repeat(${totalColumns}, 48px)` }}
          >
            <div key="carry-operator-spacer" className="h-9" />
            {Array.from({ length: carryOffset }).map((_, index) => (
              <div key={`carry-offset-${index}`} className="h-9" />
            ))}
            {carryMap.map((value, index) =>
              carryRequiredMap[index] ? (
                <button
                  type="button"
                  key={`carry-${index}`}
                  onClick={() => {
                    setActiveInput("carry");
                    setSelectedCarryIndex(index);
                  }}
                  aria-label={`Set carry for column ${index + 1}`}
                  className={`h-9 rounded-lg border-2 text-sm font-bold transition-all duration-200 ${
                    selectedCarryIndex === index && activeInput === "carry"
                      ? "border-cyan-200 bg-cyan-400 text-black shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                      : "border-yellow-400 bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/40"
                  }`}
                >
                  {value || "C"}
                </button>
              ) : (
                <div key={`carry-empty-${index}`} className="h-9" />
              )
            )}
          </div>
        )}

        {/* Question Display */}
        {mode === "fraction" ? (
          <div className="mb-6 flex flex-col items-center justify-center gap-6">
            <div className="inline-flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-6">
              <div className="inline-block rounded-xl border border-cyan-500/20 bg-slate-800/60 px-5 py-4">
                <div className="text-4xl font-mono font-bold">
                  <div className="flex items-center justify-center gap-6">
                    <div className="w-12 text-center">
                      <div className="flex h-8 items-center justify-center text-2xl leading-none">
                        {fractionQ ? fractionQ.a.n : ""}
                      </div>
                      <div className="flex h-8 items-center justify-center border-t-2 border-white text-2xl leading-none">
                        {fractionQ ? fractionQ.a.d : ""}
                      </div>
                    </div>
                    <div className="text-3xl text-cyan-300">
                      {fractionQ ? fractionQ.operator : "+"}
                    </div>
                    <div className="w-12 text-center">
                      <div className="flex h-8 items-center justify-center text-2xl leading-none">
                        {fractionQ ? fractionQ.b.n : ""}
                      </div>
                      <div className="flex h-8 items-center justify-center border-t-2 border-white text-2xl leading-none">
                        {fractionQ ? fractionQ.b.d : ""}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-5xl text-cyan-300 font-bold">=</div>
              <div className="inline-flex flex-col items-center gap-3">
                <div className="rounded-xl border border-cyan-400/40 bg-slate-800/80 px-5 py-4 shadow-[0_10px_30px_rgba(34,211,238,0.12)]">
                  <div className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-cyan-200">
                    Your Answer
                  </div>
                  <div className="mx-auto flex w-24 flex-col items-center font-mono font-bold">
                    <button
                      type="button"
                      aria-label="Enter numerator"
                      aria-pressed={activeInput === "num"}
                      className={`flex h-12 w-full items-center justify-center rounded-md border px-3 text-2xl leading-none transition-all ${
                        activeInput === "num"
                          ? "border-cyan-300 bg-cyan-400/20 text-cyan-100 shadow-[0_0_0_3px_rgba(34,211,238,0.18)]"
                          : "border-transparent text-white hover:border-cyan-400/50 hover:bg-cyan-400/10"
                      }`}
                      onClick={() => setActiveInput("num")}
                    >
                      {fracNumInput || "_"}
                    </button>
                    <div className="my-1 w-full rounded-full border-t-2 border-white" />
                    <button
                      type="button"
                      aria-label="Enter denominator"
                      aria-pressed={activeInput === "den"}
                      className={`flex h-12 w-full items-center justify-center rounded-md border px-3 text-2xl leading-none transition-all ${
                        activeInput === "den"
                          ? "border-cyan-300 bg-cyan-400/20 text-cyan-100 shadow-[0_0_0_3px_rgba(34,211,238,0.18)]"
                          : "border-transparent text-white hover:border-cyan-400/50 hover:bg-cyan-400/10"
                      }`}
                      onClick={() => setActiveInput("den")}
                    >
                      {fracDenInput || "_"}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 text-[11px] font-bold uppercase tracking-wide">
                  <button
                    type="button"
                    onClick={() => setActiveInput("num")}
                    className={`rounded-full px-3 py-1 transition-all ${
                      activeInput === "num"
                        ? "bg-cyan-400 text-slate-950"
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    Numerator
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInput("den")}
                    className={`rounded-full px-3 py-1 transition-all ${
                      activeInput === "den"
                        ? "bg-cyan-400 text-slate-950"
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    Denominator
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="grid justify-center gap-2 font-mono text-3xl font-bold mb-4"
            style={{ gridTemplateColumns: `repeat(${totalColumns}, 48px)` }}
          >
            {/* Top row */}
            <span className="invisible flex items-center justify-center h-12"> </span>
            {topDigits.map((digit, index) => (
              <span
                key={`top-${index}`}
                className="flex items-center justify-center h-12 text-slate-100"
              >
                {digit === " " ? "" : digit}
              </span>
            ))}

            {/* Bottom row with operator */}
            <span
              className="text-cyan-300 flex items-center justify-center h-12"
              aria-hidden
            >
              {operatorSymbol}
            </span>
            {bottomDigits.map((digit, index) => (
              <span
                key={`bottom-${index}`}
                className="flex items-center justify-center h-12 text-slate-100"
              >
                {digit === " " ? "" : digit}
              </span>
            ))}

            {/* Separator line */}
            <div className="col-span-full border-b-2 border-cyan-400 my-1" />

            {/* Answer row */}
            <span className="invisible flex items-center justify-center h-12"> </span>
            {Array.from({ length: answerOffset }).map((_, index) => (
              <span key={`ans-spacer-${index}`} className="h-12" />
            ))}
            {answerDigits.map((digit, index) => (
              <div
                key={`answer-digit-${index}`}
                className={`flex h-12 items-center justify-center rounded-lg border-2 text-2xl font-bold transition-all duration-200 ${
                  digit !== ""
                    ? "border-cyan-400 bg-cyan-950/70 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.35)]"
                    : "border-cyan-500/40 bg-slate-800/80 text-cyan-200/40"
                }`}
              >
                {digit || "_"}
              </div>
            ))}
          </div>
        )}

        <div className="my-4 border-b border-cyan-500/20" />

        {/* Number Pad */}
        <div className="mx-auto mb-6 grid w-full max-w-xs grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
            <button
              type="button"
              key={digit}
              onClick={() => handleDigit(digit)}
              className="rounded-lg bg-slate-800 border border-slate-700 py-3 text-lg font-semibold text-white transition-all duration-200 hover:-translate-y-1 hover:bg-cyan-500 hover:text-slate-950 hover:shadow-[0_8px_20px_rgba(34,211,238,0.35)] active:scale-95"
            >
              {digit}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 font-bold text-slate-950 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(34,211,238,0.35)] active:scale-98"
          >
            ✓ Submit Answer
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-semibold text-slate-200 transition-all duration-200 hover:border-cyan-300 hover:text-cyan-100 hover:bg-slate-700"
            >
              ← Delete
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-semibold text-slate-200 transition-all duration-200 hover:border-cyan-300 hover:text-cyan-100 hover:bg-slate-700"
            >
              ⟲ Clear
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg border border-cyan-400/60 bg-cyan-500/15 px-3 py-2 font-semibold text-cyan-100 transition-all duration-200 hover:bg-cyan-500/25"
            >
              Next →
            </button>
          </div>

          <button
            type="button"
            onClick={() => finalizeGame(score)}
            className="w-full rounded-lg border border-red-400/50 bg-red-500/10 px-4 py-2 font-bold text-red-200 transition-all duration-200 hover:bg-red-500/20"
          >
            🛑 End Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
