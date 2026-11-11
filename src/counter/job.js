// The shop counter as a job: making change. Amounts are in cents.

import { SKILLS, generate } from './change.js';
import { BIG_TILL } from './money.js';
import { PATTERNS } from './patterns.js';

const SINGLE_PIECES = new Set(BIG_TILL.map((d) => d.cents));

export const counterJob = {
  id: 'counter',
  name: 'The shop counter',
  skills: SKILLS,
  patterns: PATTERNS,
  generate,
  expected: (problem) => problem.paid - problem.price,
  key: (problem) => `${problem.price}/${problem.paid}`,
  // The till has pennies, so any amount can be handed over.
  canGive: () => true,
  isSlip: (problem, diff) => SINGLE_PIECES.has(Math.abs(diff)),
};
