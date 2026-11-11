// Measuring in the kitchen: the skills, in teaching order, and the
// situations for each. A situation is
//
//   { skill, need: { n, d }, have: { n, d } | null, batches: number | null,
//     scoops: [sizes that are clean] }
//
// The answer is always the amount to scoop into the bowl.

import { ALL_SCOOPS, CUP, toUnits } from './fractions.js';

export const SKILLS = [
  {
    id: 'count-scoops',
    name: 'Counting scoops',
    about: 'Measure an amount with the scoop that matches it, such as 3/4 cup with the quarter-cup scoop.',
  },
  {
    id: 'other-scoop',
    name: 'A different scoop',
    about: 'Measure an amount with a smaller scoop, such as 1/2 cup with the quarter-cup scoop.',
  },
  {
    id: 'top-up',
    name: 'Topping up',
    about: 'Add the rest when some is already in the bowl, such as 5/8 cup when 1/8 cup is there.',
  },
  {
    id: 'top-up-mixed',
    name: 'Topping up across sizes',
    about: 'Add the rest when the two amounts are in different sizes, such as 3/4 cup when 1/2 cup is there.',
  },
  {
    id: 'batches',
    name: 'Making more',
    about: 'Measure for two or three batches, such as 3 batches of 3/4 cup.',
  },
  {
    id: 'half-batch',
    name: 'Making half',
    about: 'Measure for half a batch, such as half of 3/4 cup.',
  },
];

const f = (n, d) => ({ n, d });

// [need n, need d]: measured with the scoop of the same bottom number.
const COUNT = [[2, 3], [3, 4], [3, 8], [5, 8], [7, 8], [5, 4], [4, 3], [3, 2], [7, 4]];
// [need n, need d, scoop d]
const OTHER = [[1, 2, 4], [1, 2, 8], [1, 4, 8], [3, 4, 8], [1, 1, 2], [1, 1, 3], [1, 1, 4], [3, 2, 4], [5, 4, 8]];
// [need n, need d, have n, have d]
const TOP_UP = [
  [2, 3, 1, 3], [3, 4, 1, 4], [3, 8, 1, 8], [5, 8, 1, 8], [5, 8, 3, 8], [7, 8, 1, 8],
  [7, 8, 3, 8], [7, 8, 5, 8], [5, 4, 3, 4], [4, 3, 2, 3], [5, 3, 1, 3],
];
const TOP_UP_MIXED = [
  [3, 4, 1, 2], [1, 2, 1, 4], [7, 8, 1, 2], [5, 8, 1, 4], [3, 4, 1, 8], [1, 2, 1, 8],
  [7, 8, 1, 4], [3, 4, 3, 8], [5, 8, 1, 2], [7, 8, 3, 4], [1, 2, 3, 8], [1, 1, 1, 3],
  [1, 1, 3, 4], [1, 1, 5, 8], [3, 2, 3, 4], [5, 4, 1, 2],
];
const BATCH = [[1, 2], [1, 3], [1, 4], [3, 4], [2, 3], [3, 8], [1, 8], [5, 8]];
const HALF = [[1, 2], [1, 4], [3, 4], [3, 2], [2, 3], [1, 1], [5, 4], [2, 1]];

const base = { have: null, batches: null, scoops: ALL_SCOOPS };

const GENERATORS = {
  'count-scoops': (rng) => {
    const [n, d] = rng.pick(COUNT);
    return { ...base, need: f(n, d), scoops: [CUP / d] };
  },
  'other-scoop': (rng) => {
    const [n, d, scoop] = rng.pick(OTHER);
    return { ...base, need: f(n, d), scoops: [CUP / scoop] };
  },
  'top-up': (rng) => {
    const [n, d, hn, hd] = rng.pick(TOP_UP);
    return { ...base, need: f(n, d), have: f(hn, hd) };
  },
  'top-up-mixed': (rng) => {
    const [n, d, hn, hd] = rng.pick(TOP_UP_MIXED);
    return { ...base, need: f(n, d), have: f(hn, hd) };
  },
  batches: (rng) => {
    const [n, d] = rng.pick(BATCH);
    return { ...base, need: f(n, d), batches: rng.pick([2, 2, 3]) };
  },
  'half-batch': (rng) => {
    const [n, d] = rng.pick(HALF);
    return { ...base, need: f(n, d), batches: 0.5 };
  },
};

export function generate(skillId, rng) {
  const make = GENERATORS[skillId];
  if (!make) throw new Error(`Unknown skill: ${skillId}`);
  return { skill: skillId, ...make(rng) };
}

/** The amount to scoop into the bowl. */
export function expected({ need, have, batches }) {
  if (have) return toUnits(need) - toUnits(have);
  if (batches) return toUnits(need) * batches;
  return toUnits(need);
}

export function problemKey({ skill, need, have, batches, scoops }) {
  return [skill, `${need.n}/${need.d}`, have ? `${have.n}/${have.d}` : '', batches ?? '', scoops.join(',')].join(':');
}
