export const MODE_LABEL = { add: "Addition", sub: "Subtraction", mul: "Multiplication", div: "Division", fraction: "Fractions" };
export const LEVELS = ["easy", "medium", "hard"];
export const isValidGame = (mode, level) => Object.hasOwn(MODE_LABEL, mode) && LEVELS.includes(level);

// Validate input syntax only. Answers and points are evaluated by the API.
export function validateAnswer(mode, answer, numerator, denominator) {
  if (mode === "fraction") {
    if (!/^\d{1,6}$/.test(numerator) || !/^\d{1,6}$/.test(denominator)) return "Enter both a numerator and a denominator.";
    if (Number(denominator) === 0) return "The denominator must be greater than zero.";
  } else if (!/^\d{1,6}$/.test(answer)) return "Enter your answer, or skip this question.";
  return "";
}
