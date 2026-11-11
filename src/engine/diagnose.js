// Diagnosis, for any job.
//
// A job describes one kind of work (making change, measuring ingredients).
// Every answer in a job is a whole number of some small unit: cents at the
// counter, twenty-fourths of a cup in the kitchen. A job provides:
//
//   id, name
//   skills      [{ id, name, about }] in teaching order
//   patterns    [{ id, name, about, predict(problem), hint(problem, answer) }]
//   generate(skillId, rng)   a new situation for a skill
//   expected(problem)        the right answer
//   key(problem)             a string that identifies the situation
//   canGive(problem, amount) whether that amount can be handed over at all
//   isSlip(problem, diff)    whether a miss by `diff` is one piece off
//
// A mistake pattern is a model of one wrong way of thinking: `predict`
// returns what someone thinking that way would hand over. Diagnosis asks
// which patterns predict the amount that was actually handed over.

/** What this pattern would give here, or null if it doesn't apply. */
export function predict(job, pattern, problem) {
  const amount = pattern.predict(problem);
  if (amount === null || amount === undefined || amount <= 0) return null;
  if (!Number.isInteger(amount)) return null;
  if (amount === job.expected(problem)) return null;
  if (!job.canGive(problem, amount)) return null;
  return amount;
}

/**
 * @returns {{
 *   correct: boolean,
 *   answer: number,
 *   expected: number,
 *   diff: number,        // answer − expected; positive means too much
 *   patterns: string[],  // ids of every pattern that predicts this answer
 *   slip: boolean,       // one piece off, and no pattern explains it
 * }}
 */
export function diagnose(job, problem, answer) {
  const expected = job.expected(problem);
  const diff = answer - expected;
  if (diff === 0) {
    return { correct: true, answer, expected, diff, patterns: [], slip: false };
  }
  const patterns = job.patterns.filter((p) => predict(job, p, problem) === answer).map((p) => p.id);
  const slip = patterns.length === 0 && job.isSlip(problem, diff);
  return { correct: false, answer, expected, diff, patterns, slip };
}
