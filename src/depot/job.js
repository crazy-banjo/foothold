// The delivery depot as a job: fuelling the van. Amounts are in gallons.

import { PATTERNS } from './patterns.js';
import { SKILLS, expected, generate, problemKey } from './problems.js';

/** The most the pump will deliver in one go. */
export const PUMP_MAX = 99;

export const depotJob = {
  id: 'depot',
  name: 'The delivery depot',
  skills: SKILLS,
  patterns: PATTERNS,
  generate,
  expected,
  key: problemKey,
  canGive: (problem, amount) => amount >= 1 && amount <= PUMP_MAX,
  isSlip: (problem, diff) => Math.abs(diff) === 1,
};
