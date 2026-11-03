export const MODES = [
  { id: "add", label: "Addition", icon: "+", description: "Build your number sense", hint: "Practice carrying digits" },
  { id: "sub", label: "Subtraction", icon: "−", description: "Find the difference", hint: "Practice borrowing digits" },
  { id: "mul", label: "Multiplication", icon: "×", description: "Multiply your skills", hint: "Whole-number products" },
  { id: "div", label: "Division", icon: "÷", description: "Split and conquer", hint: "Exact whole-number answers" },
  { id: "fraction", label: "Fractions", icon: "½", description: "Add and subtract fractions", hint: "Equivalent fractions count" },
];

export const LEVELS = [
  { id: "easy", label: "Easy", icon: "🌱", description: "Perfect for warming up" },
  { id: "medium", label: "Medium", icon: "🔥", description: "Test your skills" },
  { id: "hard", label: "Hard", icon: "⚡", description: "Take on the challenge" },
];

export const questionSeconds = (mode, level) =>
  (mode === "fraction" ? { easy: 40, medium: 30, hard: 20 } : { easy: 30, medium: 20, hard: 10 })[level];

export const modeLabel = (id) => MODES.find((mode) => mode.id === id)?.label || id;
