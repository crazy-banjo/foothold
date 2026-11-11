// Diagnosis: compare what was handed back with what each mistake pattern
// would have handed back.

import { TILL } from './money.js';
import { PATTERNS, predict } from './patterns.js';

const SINGLE_PIECES = new Set(TILL.map((d) => d.cents));

/**
 * @returns {{
 *   correct: boolean,
 *   answer: number,
 *   expected: number,
 *   diff: number,        // answer − expected; positive means too much
 *   patterns: string[],  // ids of every pattern that predicts this answer
 *   slip: boolean,       // off by exactly one coin or bill, no pattern
 * }}
 */
export function diagnose(problem, answer) {
  const expected = problem.paid - problem.price;
  const diff = answer - expected;
  if (diff === 0) {
    return { correct: true, answer, expected, diff, patterns: [], slip: false };
  }
  const patterns = PATTERNS.filter((p) => predict(p, problem) === answer).map((p) => p.id);
  const slip = patterns.length === 0 && SINGLE_PIECES.has(Math.abs(diff));
  return { correct: false, answer, expected, diff, patterns, slip };
}
