// The workshop as a job: measuring up shapes. Answers are feet of edging,
// numbers of tiles, or square feet.

import { PATTERNS } from './patterns.js';
import { CUT_MAX, SKILLS, expected, generate, problemKey } from './problems.js';

export const workshopJob = {
  id: 'workshop',
  name: 'The workshop',
  skills: SKILLS,
  patterns: PATTERNS,
  generate,
  expected,
  key: problemKey,
  canGive: (problem, amount) => amount >= 1 && amount <= CUT_MAX,
  isSlip: (problem, diff) => Math.abs(diff) === 1,
};
