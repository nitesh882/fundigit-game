export const SYMBOL = { add:"+", sub:"−", mul:"×", div:"÷" };

export const MODE_LABEL = {
  add:"Addition",
  sub:"Subtraction",
  mul:"Multiplication",
  div:"Division"
};

export function getRange(level) {
  return level==="easy"?10:level==="medium"?100:1000;
}

export function calcAnswer(mode,n1,n2) {
  if(mode==="add") return n1+n2;
  if(mode==="sub") return n1-n2;
  if(mode==="mul") return n1*n2;
  if(mode==="div") return n2 !== 0 ? parseFloat((n1/n2).toFixed(2)) : 0;
  return 0;
}

// --- Fraction utilities ---
export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

export function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs((a * b) / gcd(a, b));
}

export function simplifyFraction(n, d) {
  if (d === 0) return { n: 0, d: 1 };
  const sign = d < 0 ? -1 : 1;
  const g = gcd(n, d);
  return { n: (n / g) * sign, d: Math.abs(d / g) };
}

export function addFractions(a, b) {
  const common = lcm(a.d, b.d) || (a.d * b.d);
  const na = (a.n * (common / a.d)) + (b.n * (common / b.d));
  return simplifyFraction(na, common);
}

export function subFractions(a, b) {
  const common = lcm(a.d, b.d) || (a.d * b.d);
  const na = (a.n * (common / a.d)) - (b.n * (common / b.d));
  return simplifyFraction(na, common);
}

export function generateFractionQuestion(level = "medium", operator = "add") {
  // level influences max denominator/numerator
  const maxDen = level === "easy" ? 6 : level === "medium" ? 12 : 20;
  const maxNum = Math.max(1, Math.floor(maxDen * 0.9));

  // generate two proper fractions
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const d1 = randInt(2, maxDen);
  const d2 = randInt(2, maxDen);
  const n1 = randInt(1, Math.min(maxNum, d1 - 1));
  const n2 = randInt(1, Math.min(maxNum, d2 - 1));

  const q = {
    a: { n: n1, d: d1 },
    b: { n: n2, d: d2 },
    operator: operator === "sub" ? "-" : "+",
    timeLimitSeconds: level === "hard" ? 20 : level === "easy" ? 40 : 30,
  };

  // compute answer
  const ans = operator === "sub" ? subFractions(q.a, q.b) : addFractions(q.a, q.b);
  q.answer = ans; // simplified
  return q;
}
