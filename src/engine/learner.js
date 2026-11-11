// The learner model, for any job: what has been mastered, which mistake
// patterns are suspected, and which situation to pose next.

import { diagnose, predict } from './diagnose.js';

/** First-try successes in a row needed to master a skill. */
export const MASTERY_STREAK = 3;
/** Evidence at which a pattern starts steering the choice of situations. */
export const SUSPECTED = 0.5;
/** Evidence at which a pattern is reported as showing up repeatedly. */
export const CONFIRMED = 1.5;

export function newLearner() {
  return { version: 2, coins: 0, day: 1, jobs: {} };
}

/** This learner's record for one job, created on first use. */
export function jobRecord(learner, job) {
  learner.jobs[job.id] ??= { skills: {}, patterns: {}, lastKey: null };
  return learner.jobs[job.id];
}

export function isMastered(learner, job, skillId) {
  return Boolean(learner.jobs[job.id]?.skills[skillId]?.mastered);
}

/** The first skill not yet mastered, or null when all are. */
export function currentSkill(learner, job) {
  return job.skills.find((s) => !isMastered(learner, job, s.id)) ?? null;
}

/**
 * Record one finished situation.
 * @param wrongAnswers every amount handed over before the right one, in order
 */
export function recordResult(learner, job, problem, wrongAnswers) {
  const record = jobRecord(learner, job);
  record.skills[problem.skill] ??= { attempts: 0, firstTry: 0, streak: 0, mastered: false };
  const skill = record.skills[problem.skill];
  skill.attempts += 1;
  if (wrongAnswers.length === 0) {
    skill.firstTry += 1;
    skill.streak += 1;
    if (skill.streak >= MASTERY_STREAK) skill.mastered = true;
    // Getting it right where a pattern would have gone wrong is evidence
    // against that pattern.
    for (const pattern of job.patterns) {
      const seen = record.patterns[pattern.id];
      if (seen && seen.evidence > 0 && predict(job, pattern, problem) !== null) {
        seen.evidence = seen.evidence < 0.4 ? 0 : seen.evidence / 2;
      }
    }
  } else {
    skill.streak = 0;
    // Only the first wrong answer counts: later ones come after hints.
    const { patterns } = diagnose(job, problem, wrongAnswers[0]);
    for (const id of patterns) {
      record.patterns[id] ??= { evidence: 0, seen: 0 };
      record.patterns[id].evidence += 1 / patterns.length;
      record.patterns[id].seen += 1;
    }
  }
  record.lastKey = job.key(problem);
}

/** Patterns with enough evidence to act on, strongest first. */
export function suspectedPatterns(learner, job) {
  const known = new Set(job.patterns.map((p) => p.id));
  return Object.entries(learner.jobs[job.id]?.patterns ?? {})
    .filter(([id, seen]) => seen.evidence >= SUSPECTED && known.has(id))
    .map(([id, seen]) => ({ id, evidence: seen.evidence, seen: seen.seen }))
    .sort((a, b) => b.evidence - a.evidence);
}

function chooseSkill(learner, job, rng) {
  const current = currentSkill(learner, job);
  if (!current) return rng.pick(job.skills.slice(-3)).id;
  const mastered = job.skills.filter((s) => isMastered(learner, job, s.id));
  // Keep earlier skills in rotation so they are not forgotten.
  if (mastered.length > 0 && rng.next() < 0.25) return rng.pick(mastered).id;
  return current.id;
}

/**
 * Choose the next situation. When a mistake pattern is suspected, prefer
 * situations where that pattern would show itself, and where the suspected
 * patterns would each give a different answer, so that one more answer
 * tells them apart.
 */
export function nextProblem(learner, job, rng) {
  const skillId = chooseSkill(learner, job, rng);
  const lastKey = learner.jobs[job.id]?.lastKey ?? null;
  const suspects = suspectedPatterns(learner, job).map((s) => ({
    ...s,
    pattern: job.patterns.find((p) => p.id === s.id),
  }));
  let best = null;
  let bestScore = -Infinity;
  for (let i = 0; i < 12; i++) {
    const problem = job.generate(skillId, rng);
    if (job.key(problem) === lastKey) continue;
    let score = rng.next() * 0.3;
    const predictions = [];
    for (const suspect of suspects) {
      const amount = predict(job, suspect.pattern, problem);
      if (amount !== null) {
        score += suspect.evidence;
        predictions.push(amount);
      }
    }
    if (predictions.length > 1 && new Set(predictions).size === predictions.length) score += 0.5;
    if (score > bestScore) {
      best = problem;
      bestScore = score;
    }
  }
  return best ?? job.generate(skillId, rng);
}
