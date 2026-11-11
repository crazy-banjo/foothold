// Kitchen amounts are whole numbers of twenty-fourths of a cup. Halves,
// thirds, quarters and eighths are all whole numbers in that unit, so no
// rounding ever happens.

export const CUP = 24;

export const SCOOPS = [
  { id: 'cup', value: 24, label: '1', name: '1 cup scoop' },
  { id: 'half', value: 12, label: '½', name: 'half cup scoop' },
  { id: 'third', value: 8, label: '⅓', name: 'third cup scoop' },
  { id: 'quarter', value: 6, label: '¼', name: 'quarter cup scoop' },
  { id: 'eighth', value: 3, label: '⅛', name: 'eighth cup scoop' },
];

export const ALL_SCOOPS = SCOOPS.map((s) => s.value);

/** { n: 3, d: 4 } -> 18 */
export function toUnits({ n, d }) {
  return (n * CUP) / d;
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

/** 18 -> { n: 3, d: 4 } in lowest terms. */
export function toFraction(units) {
  const g = gcd(units, CUP);
  return { n: units / g, d: CUP / g };
}

/**
 * A fraction as text, written the way a recipe would: "{3/4}", "1 {1/2}",
 * "2". Braces mark the parts to typeset as stacked fractions.
 */
export function show({ n, d }) {
  if (n % d === 0) return String(n / d);
  const whole = Math.floor(n / d);
  const rest = `{${n % d}/${d}}`;
  return whole > 0 ? `${whole} ${rest}` : rest;
}

/** "{3/4} cup", "1 {1/2} cups". */
export function showCups(fraction) {
  return `${show(fraction)} ${fraction.n > fraction.d ? 'cups' : 'cup'}`;
}

/**
 * The fewest scoops (from the allowed sizes) that measure an amount
 * exactly, largest first, or null when it cannot be measured.
 */
export function fewestScoops(amount, sizes) {
  const best = new Array(amount + 1).fill(null);
  best[0] = [];
  for (let total = 1; total <= amount; total++) {
    for (const size of sizes) {
      const rest = best[total - size];
      if (size <= total && rest && (!best[total] || rest.length + 1 < best[total].length)) {
        best[total] = [...rest, size];
      }
    }
  }
  return best[amount] ? best[amount].sort((a, b) => b - a) : null;
}

export function canMeasure(amount, sizes) {
  return amount > 0 && fewestScoops(amount, sizes) !== null;
}
