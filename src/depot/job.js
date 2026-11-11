// The delivery depot as a job: dispatching. Answers are whole numbers of
// boxes, minutes or deliveries.

import { PATTERNS } from './patterns.js';
import { PLAN_MAX, SKILLS, expected, generate, problemKey } from './problems.js';

export const depotJob = {
  id: 'depot',
  name: 'The delivery depot',
  skills: SKILLS,
  patterns: PATTERNS,
  generate,
  expected,
  key: problemKey,
  canGive: (problem, amount) => amount >= 1 && amount <= PLAN_MAX,
  isSlip: (problem, diff) => Math.abs(diff) === 1,
};
