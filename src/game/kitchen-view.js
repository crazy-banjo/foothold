// The kitchen screen. Nell reads out what a recipe needs; the player
// measures it into the bowl with whichever scoops are clean. Nothing ever
// asks "what is 3/4 − 1/2?".

import { CUP, SCOOPS, fewestScoops, showCups, toFraction, toUnits } from '../kitchen/fractions.js';
import { kitchenJob } from '../kitchen/job.js';
import { customerSvg } from './art.js';
import { h, plain, rich } from './dom.js';

const NELL = { skin: '#e8b48a', hair: '#9a9ba1', shirt: '#8a5aa8' };

const FOODS = [
  { dish: 'Pancakes', ingredient: 'flour' },
  { dish: 'Custard', ingredient: 'milk' },
  { dish: 'Cookies', ingredient: 'sugar' },
  { dish: 'Rice pudding', ingredient: 'rice' },
  { dish: 'Porridge', ingredient: 'oats' },
  { dish: 'Soup', ingredient: 'stock' },
  { dish: 'Bread', ingredient: 'flour' },
  { dish: 'Muffins', ingredient: 'sugar' },
];

const BOWL_HOLDS = 3 * CUP;
const fractionOf = (value) => `{1/${CUP / value}}`;

// --------------------------------------------------------------- pictures

const SCOOP_RADIUS = { 24: 25, 12: 21, 8: 18, 6: 16, 3: 13 };

function scoopSvg(scoop) {
  const r = SCOOP_RADIUS[scoop.value];
  return `<svg class="scoop" viewBox="0 0 84 56" width="84" height="56" aria-hidden="true">
    <rect x="${28 + r - 4}" y="23" width="${52 - r}" height="10" rx="5" fill="#b9bec6" stroke="#6f7680" stroke-width="2"/>
    <circle cx="28" cy="28" r="${r}" fill="#e3e6ea" stroke="#6f7680" stroke-width="2"/>
    <circle cx="28" cy="28" r="${r - 4}" fill="#f7f8fa" stroke="#6f7680" stroke-width="1" opacity=".8"/>
    <text x="28" y="${scoop.value === CUP ? 34 : 35}" text-anchor="middle" font-size="${scoop.value === CUP ? 18 : 20}" font-weight="700" fill="#2b2622">${scoop.label}</text>
  </svg>`;
}

/** The mixing bowl, filled to scale but with no marks on it. */
function bowlSvg(already, added) {
  const top = 12;
  const bottom = 128;
  const level = (units) => (Math.min(units, BOWL_HOLDS) / BOWL_HOLDS) * (bottom - top);
  const total = level(already + added);
  const base = level(already);
  const over = already + added > BOWL_HOLDS;
  const shape = `M22 ${top}h96l-8 ${bottom - top - 6}a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6z`;
  return `<svg class="bowl" viewBox="0 0 140 136" width="140" height="136" aria-hidden="true">
    <defs><clipPath id="bowl-inside"><path d="${shape}"/></clipPath></defs>
    <g clip-path="url(#bowl-inside)">
      <rect x="0" y="0" width="140" height="136" class="bowl-glass"/>
      <rect x="0" y="${bottom - total}" width="140" height="${total}" class="bowl-added"/>
      <rect x="0" y="${bottom - base}" width="140" height="${base}" class="bowl-already"/>
    </g>
    <path d="${shape}" class="bowl-edge"/>
    ${over ? '<text x="70" y="9" text-anchor="middle" class="bowl-over">overflowing!</text>' : ''}
  </svg>`;
}

/**
 * Bars to scale: what is needed above, what is in the bowl below. Whole
 * cups are outlined so there is always something to compare against.
 * `mark` adds a dashed line at every multiple of that amount.
 */
function barsSvg(rows, mark) {
  const longest = Math.max(...rows.map((row) => row.parts.reduce((sum, p) => sum + p.units, 0)));
  const cups = Math.max(1, Math.ceil(longest / CUP));
  const left = 6;
  const width = 308;
  const unit = width / (cups * CUP);
  const pitch = 50;
  const height = rows.length * pitch + 18;

  const body = rows
    .map((row, i) => {
      const y = i * pitch + 18;
      let x = left;
      const parts = row.parts
        .map((part) => {
          const w = part.units * unit;
          const rect = `<rect x="${x}" y="${y}" width="${w}" height="22" class="bar bar-${part.kind}"/>`;
          x += w;
          return rect;
        })
        .join('');
      const outline = Array.from(
        { length: cups },
        (_, c) => `<rect x="${left + c * CUP * unit}" y="${y}" width="${CUP * unit}" height="22" class="cup-outline"/>`,
      ).join('');
      return `<text x="${left}" y="${y - 5}" class="bar-label">${row.label}</text>${outline}${parts}`;
    })
    .join('');

  let marks = '';
  if (mark) {
    for (let at = mark; at < cups * CUP; at += mark) {
      const x = left + at * unit;
      for (let i = 0; i < rows.length; i++) {
        const y = i * pitch + 18;
        marks += `<line x1="${x}" y1="${y - 3}" x2="${x}" y2="${y + 25}" class="bar-mark"/>`;
      }
    }
  }
  const cupLabel = `<text x="${left + CUP * unit}" y="${height - 2}" text-anchor="end" class="bar-note">1 cup</text>`;
  const label = rows
    .map((row) => `${row.label}: ${plain(showCups(toFraction(row.parts.reduce((s, p) => s + p.units, 0))))}`)
    .join('. ');
  return `<svg class="bars" viewBox="0 0 320 ${height}" role="img" aria-label="${label}.">${body}${marks}${cupLabel}</svg>`;
}

// ------------------------------------------------------------------ words

function recipeLines(problem, food) {
  const { need, have, batches, scoops } = problem;
  const amount = `${showCups(need)} of ${food.ingredient}`;
  const lines = [];
  if (batches) {
    lines.push(`One batch needs ${amount}.`);
    lines.push(batches === 0.5 ? 'Make half a batch.' : `Make ${batches} batches.`);
  } else {
    lines.push(`It needs ${amount}.`);
  }
  if (have) lines.push(`There is already ${showCups(have)} in the bowl. Add the rest.`);
  if (scoops.length === 1) lines.push(`Only the ${fractionOf(scoops[0])} cup scoop is clean.`);
  return lines;
}

/** "2 scoops of {1/2} cup and 1 scoop of {1/4} cup" */
function describeScoops(values) {
  const counts = new Map();
  for (const value of [...values].sort((a, b) => b - a)) counts.set(value, (counts.get(value) ?? 0) + 1);
  const parts = [...counts].map(([value, count]) => {
    const size = value === CUP ? '1 cup' : `${fractionOf(value)} cup`;
    return `${count} ${count === 1 ? 'scoop' : 'scoops'} of ${size}`;
  });
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
}

/** What the comparison bars should show for this situation. */
function comparison(problem, putIn) {
  const { need, have, batches } = problem;
  const needUnits = toUnits(need);
  const rows = [];
  if (batches === 0.5) {
    rows.push({ label: 'One batch', parts: [{ units: needUnits, kind: 'faint' }] });
    rows.push({ label: 'Half a batch', parts: [{ units: needUnits / 2, kind: 'need' }] });
  } else if (batches) {
    rows.push({ label: 'One batch', parts: [{ units: needUnits, kind: 'faint' }] });
    rows.push({
      label: `${batches} batches`,
      parts: Array.from({ length: batches }, () => ({ units: needUnits, kind: 'need' })),
    });
  } else {
    rows.push({ label: 'The recipe needs', parts: [{ units: needUnits, kind: 'need' }] });
  }
  rows.push({
    label: 'In the bowl',
    parts: [
      ...(have ? [{ units: toUnits(have), kind: 'already' }] : []),
      ...[...putIn].sort((a, b) => b - a).map((units) => ({ units, kind: 'added' })),
    ],
  });
  return rows;
}

/** The biggest clean scoop that every amount in the situation is a multiple of. */
function markSize(problem) {
  const amounts = [toUnits(problem.need), kitchenJob.expected(problem)];
  if (problem.have) amounts.push(toUnits(problem.have));
  return [...problem.scoops].sort((a, b) => b - a).find((size) => amounts.every((a) => a % size === 0)) ?? null;
}

// ------------------------------------------------------------------- view

export const kitchenView = {
  job: kitchenJob,
  boss: 'Nell',
  // Job titles, by the number of skills learned. Promotions are earned
  // only by learning; they cannot be bought and are never lost.
  ranks: [
    { at: 0, title: 'Kitchen Helper' },
    { at: 1, title: 'Prep Cook' },
    { at: 3, title: 'Line Cook' },
    { at: 5, title: 'Sous Chef' },
    { at: 6, title: 'Head Chef' },
  ],
  title: 'Nell’s kitchen',
  subject: 'Fractions',
  blurb: 'Measure what each recipe needs.',
  taskWord: 'Recipe',
  labels: {
    tray: 'In the bowl',
    empty: 'Pick a scoop to add to the bowl.',
    undo: 'Tap a scoop here to take it back out.',
    given: 'Measured.',
    pieces: 'Clean scoops',
    clear: 'Start over',
    submit: 'That’s the right amount',
    next: 'Next recipe',
  },
  allLearnedLine: 'You measure like a real cook now. The rest of Main Street will want your help soon.',

  setUp(problem, rng) {
    return { food: rng.pick(FOODS) };
  },

  scene(round) {
    const { problem } = round;
    const { food } = round.extra;
    const mood = round.done ? 'happy' : round.wrong.length > 0 ? 'puzzled' : 'neutral';
    const says = round.done ? 'Just right!' : round.wrong.length > 0 ? 'Hmm. Let’s look.' : `${food.dish} next.`;
    return [
      h('div', { class: 'customer' }, h('div', { html: customerSvg(NELL, mood) }), h('p', { class: 'bubble' }, says)),
      h(
        'div',
        { class: 'recipe' },
        h('h2', { class: 'recipe-name' }, food.dish),
        recipeLines(problem, food).map((line) => h('p', {}, rich(line))),
      ),
    ];
  },

  pieces: (round) => SCOOPS.filter((s) => round.problem.scoops.includes(s.value)),
  pieceSvg: scoopSvg,

  trayExtra(round, sum) {
    const already = round.problem.have ? toUnits(round.problem.have) : 0;
    return h('div', { class: 'bowl-holder', html: bowlSvg(already, sum) });
  },

  check(round) {
    const { problem, result, hint } = round;
    const tries = round.wrong.length;
    const putIn = round.lastTray.map((piece) => piece.value);
    const mark = tries >= 2 ? markSize(problem) : null;
    let note = hint;
    if (!note && result.slip) note = 'You are very close. It is off by just one scoop.';
    const right = fewestScoops(result.expected, problem.scoops);
    return [
      h('p', {}, rich(`You put in ${describeScoops(putIn)}.`)),
      h('p', {}, `That is ${result.diff > 0 ? 'too much' : 'not enough'}.`),
      note && h('p', { class: 'note' }, rich(note)),
      h(
        'figure',
        {},
        h('figcaption', {}, 'Compare what is needed with what is in the bowl:'),
        h('div', { html: barsSvg(comparison(problem, putIn), mark) }),
        mark && h('p', { class: 'mark-note' }, rich(`Each dashed line is ${mark === CUP ? '1' : fractionOf(mark)} cup.`)),
      ),
      tries >= 3 && h('p', { class: 'answer' }, rich(`The right amount to add is ${describeScoops(right)}.`)),
    ];
  },

  dayLine(day, tasks) {
    if (day.firstTry === tasks) return 'Every measure was right the first time. Nothing wasted.';
    if (day.firstTry >= tasks - 2) return 'A good day in the kitchen. We checked the tricky ones together.';
    return 'Some hard ones today. Checking them is how you get better.';
  },
};
