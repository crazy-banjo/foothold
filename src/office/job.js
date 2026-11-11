// The town office as a job: plans that have to add up. Answers are counts.

import { PATTERNS } from './patterns.js';
import { ORDER_MAX, SKILLS, expected, generate, problemKey } from './problems.js';

export const officeJob = {
  id: 'office',
  name: 'The town office',
  skills: SKILLS,
  patterns: PATTERNS,
  generate,
  expected,
  key: problemKey,
  canGive: (problem, amount) => amount >= 1 && amount <= ORDER_MAX,
  isSlip: (problem, diff) => Math.abs(diff) === 1,
};
