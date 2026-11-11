// The learner model: what has been mastered, which mistake patterns are
// suspected, and which situation to pose next.

import { SKILLS, generate, problemKey } from './change.js';
import { diagnose } from './diagnose.js';
import { PATTERNS, getPattern, predict } from './patterns.js';

/** First-try successes in a row needed to master a skill. */
export const MASTERY_STREAK = 3;
/** Evidence at which a pattern starts steering the choice of problems. */
export const SUSPECTED = 0.5;
/** Evidence at which a pattern is reported as seen more than once. */
export const CONFIRMED = 1.5;

export function newLearner() {
  return { version: 1, coins: 0, day: 1, skills: {}, patterns: {}, lastKey: null };
}

function skillRecord(learner, id) {
  learner.skills[id] ??= { attempts: 0, firstTry: 0, streak: 0, mastered: false };
  return learner.skills[id];
}

export function isMastered(learner, id) {
  return Boolean(learner.skills[id]?.mastered);
}

/** The first skill not yet mastered, or null when all are. */
export function currentSkill(learner) {
  return SKILLS.find((s) => !isMastered(learner, s.id)) ?? null;
}

/**
 * Record one finished situation.
 * @param wrongAnswers every amount handed over before the right one, in order
 */
export function recordResult(learner, problem, wrongAnswers) {
  const skill = skillRecord(learner, problem.skill);
  const firstTry = wrongAnswers.length === 0;
  skill.attempts += 1;
  if (firstTry) {
    skill.firstTry += 1;
    skill.streak += 1;
    if (skill.streak >= MASTERY_STREAK) skill.mastered = true;
    // Getting it right where a pattern would have gone wrong is evidence
    // against that pattern.
    for (const pattern of PATTERNS) {
      const record = learner.patterns[pattern.id];
      if (record && record.evidence > 0 && predict(pattern, problem) !== null) {
        record.evidence = record.evidence < 0.4 ? 0 : record.evidence / 2;
      }
    }
  } else {
    skill.streak = 0;
    // Only the first wrong answer counts: later ones come after hints.
    const { patterns } = diagnose(problem, wrongAnswers[0]);
    for (const id of patterns) {
      learner.patterns[id] ??= { evidence: 0, seen: 0 };
      learner.patterns[id].evidence += 1 / patterns.length;
      learner.patterns[id].seen += 1;
    }
  }
  learner.lastKey = problemKey(problem);
}

/** Patterns with enough evidence to act on, strongest first. */
export function suspectedPatterns(learner) {
  return Object.entries(learner.patterns)
    .filter(([id, record]) => record.evidence >= SUSPECTED && getPattern(id))
    .map(([id, record]) => ({ id, evidence: record.evidence, seen: record.seen }))
    .sort((a, b) => b.evidence - a.evidence);
}

function chooseSkill(learner, rng) {
  const current = currentSkill(learner);
  if (!current) return rng.pick(SKILLS.slice(-3)).id;
  const mastered = SKILLS.filter((s) => isMastered(learner, s.id));
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
export function nextProblem(learner, rng) {
  const skillId = chooseSkill(learner, rng);
  const suspects = suspectedPatterns(learner);
  let best = null;
  let bestScore = -Infinity;
  for (let i = 0; i < 12; i++) {
    const problem = generate(skillId, rng);
    if (problemKey(problem) === learner.lastKey) continue;
    let score = rng.next() * 0.3;
    const predictions = [];
    for (const suspect of suspects) {
      const amount = predict(getPattern(suspect.id), problem);
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
  return best ?? generate(skillId, rng);
}
