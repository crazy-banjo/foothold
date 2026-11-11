// All pictures are drawn in code as SVG, so the game needs no image files.

import { formatMoney } from '../engine/money.js';

// Coin sizes keep the real order: the dime is the smallest coin.
const COIN_SIZE = { quarter: 46, nickel: 40, penny: 36, dime: 32 };

export function pieceSvg(denomination) {
  const { id, label, kind } = denomination;
  if (kind === 'bill') {
    return `<svg class="bill" viewBox="0 0 96 44" width="96" height="44" aria-hidden="true">
      <rect x="1" y="1" width="94" height="42" rx="6" fill="#cfe6c4" stroke="#4f7d48" stroke-width="2"/>
      <rect x="8" y="8" width="80" height="28" rx="3" fill="none" stroke="#4f7d48" stroke-width="1.5" opacity=".6"/>
      <text x="48" y="30" text-anchor="middle" font-size="20" font-weight="700" fill="#28502a">${label}</text>
    </svg>`;
  }
  const size = COIN_SIZE[id];
  // Smaller coins get a larger label so that it stays readable.
  const fontSize = Math.min(20, Math.round((15 * 46) / size));
  const [fill, edge] = id === 'penny' ? ['#d9905a', '#93522a'] : ['#d5d9de', '#7b828b'];
  return `<svg class="coin" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="24" cy="24" r="22" fill="${fill}" stroke="${edge}" stroke-width="2"/>
    <circle cx="24" cy="24" r="17" fill="none" stroke="${edge}" stroke-width="1" opacity=".6"/>
    <text x="24" y="${24 + fontSize * 0.36}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="#2b2622">${label}</text>
  </svg>`;
}

const MOUTH = {
  neutral: 'M33 43h14',
  happy: 'M31 40q9 9 18 0',
  puzzled: 'M34 44q6-2 12 1',
};

export function customerSvg(look, mood) {
  const brow =
    mood === 'puzzled'
      ? '<path d="M29 28q4-3 8 0M43 26q4-3 8 0" fill="none" stroke="#2b2622" stroke-width="2" stroke-linecap="round"/>'
      : '';
  return `<svg viewBox="0 0 80 84" width="96" height="100" aria-hidden="true">
    <path d="M8 84c0-18 14-26 32-26s32 8 32 26z" fill="${look.shirt}"/>
    <circle cx="40" cy="36" r="21" fill="${look.skin}"/>
    <path d="M19 33a21 21 0 0 1 42 0c-5-9-13-11-21-11s-16 2-21 11z" fill="${look.hair}"/>
    <circle cx="33" cy="35" r="2.4" fill="#2b2622"/>
    <circle cx="47" cy="35" r="2.4" fill="#2b2622"/>
    ${brow}
    <path d="${MOUTH[mood]}" fill="none" stroke="#2b2622" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`;
}

/**
 * A number line from the price up to what was paid, one hop per step.
 * The size of each hop is shown only when `showAmounts` is true.
 */
export function numberLineSvg(steps, showAmounts) {
  const stops = [steps[0].from, ...steps.map((s) => s.to)];
  const left = 34;
  const span = 272;
  const x = (i) => left + (span * i) / (stops.length - 1);
  const hops = steps
    .map((step, i) => {
      const a = x(i);
      const b = x(i + 1);
      const mid = (a + b) / 2;
      const label = showAmounts ? `+${formatMoney(step.add)}` : '+ ?';
      return `<path d="M${a} 56Q${mid} 12 ${b} 56" class="hop"/>
        <text x="${mid}" y="24" text-anchor="middle" class="hop-label">${label}</text>`;
    })
    .join('');
  const marks = stops
    .map((cents, i) => {
      const end = i === 0 || i === stops.length - 1;
      return `<circle cx="${x(i)}" cy="60" r="${end ? 5 : 4}" class="stop"/>
        <text x="${x(i)}" y="82" text-anchor="middle" class="stop-label${end ? ' end' : ''}">${formatMoney(cents)}</text>`;
    })
    .join('');
  return `<svg class="number-line" viewBox="0 0 340 92" role="img" aria-label="${numberLineText(steps, showAmounts)}">
    <line x1="${left - 16}" y1="60" x2="${left + span + 16}" y2="60" class="line"/>
    ${hops}${marks}
  </svg>`;
}

export function numberLineText(steps, showAmounts) {
  const parts = steps.map((s) =>
    showAmounts
      ? `${formatMoney(s.from)} plus ${formatMoney(s.add)} is ${formatMoney(s.to)}`
      : `from ${formatMoney(s.from)} to ${formatMoney(s.to)}`,
  );
  return `Counting up: ${parts.join(', then ')}.`;
}
