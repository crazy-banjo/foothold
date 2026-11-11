// The kitchen as a job: measuring ingredients with scoops. Amounts are in
// twenty-fourths of a cup.

import { canMeasure } from './fractions.js';
import { PATTERNS } from './patterns.js';
import { SKILLS, expected, generate, problemKey } from './problems.js';

export const kitchenJob = {
  id: 'kitchen',
  name: 'The kitchen',
  skills: SKILLS,
  patterns: PATTERNS,
  generate,
  expected,
  key: problemKey,
  // Only amounts that the clean scoops can measure can end up in the bowl.
  canGive: (problem, amount) => canMeasure(amount, problem.scoops),
  isSlip: (problem, diff) => problem.scoops.includes(Math.abs(diff)),
};
