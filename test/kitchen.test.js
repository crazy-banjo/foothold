// The kitchen job: measuring with fractions.

import test from 'node:test';
import assert from 'node:assert/strict';

import { diagnose, predict } from '../src/engine/diagnose.js';
import { currentSkill, newLearner, nextProblem, recordResult } from '../src/engine/learner.js';
import { createRng } from '../src/engine/rng.js';
import {
  ALL_SCOOPS,
  canMeasure,
  fewestScoops,
  show,
  showCups,
  toFraction,
  toUnits,
} from '../src/kitchen/fractions.js';
import { kitchenJob as job } from '../src/kitchen/job.js';
import { PATTERNS } from '../src/kitchen/patterns.js';
import { SKILLS, generate } from '../src/kitchen/problems.js';

const f = (n, d) => ({ n, d });
const pattern = (id) => PATTERNS.find((p) => p.id === id);
const predicted = (id, problem) => predict(job, pattern(id), problem);

const count = (need, scoop) => ({ skill: 'count-scoops', need, have: null, batches: null, scoops: [scoop] });
const other = (need, scoop) => ({ skill: 'other-scoop', need, have: null, batches: null, scoops: [scoop] });
const topUp = (need, have) => ({ skill: 'top-up-mixed', need, have, batches: null, scoops: ALL_SCOOPS });
const batches = (need, n) => ({ skill: 'batches', need, have: null, batches: n, scoops: ALL_SCOOPS });
const half = (need) => ({ skill: 'half-batch', need, have: null, batches: 0.5, scoops: ALL_SCOOPS });

function samples(perSkill = 200) {
  const rng = createRng(99);
  const out = [];
  for (const skill of SKILLS) {
    for (let i = 0; i < perSkill; i++) out.push(generate(skill.id, rng));
  }
  return out;
}

test('fractions convert to and from twenty-fourths of a cup', () => {
  assert.equal(toUnits(f(3, 4)), 18);
  assert.equal(toUnits(f(1, 3)), 8);
  assert.equal(toUnits(f(3, 2)), 36);
  assert.deepEqual(toFraction(18), f(3, 4));
  assert.deepEqual(toFraction(12), f(1, 2));
  assert.deepEqual(toFraction(54), f(9, 4));
});

test('fractions are written the way a recipe writes them', () => {
  assert.equal(show(f(3, 4)), '{3/4}');
  assert.equal(show(f(3, 2)), '1 {1/2}');
  assert.equal(show(f(2, 1)), '2');
  assert.equal(showCups(f(3, 4)), '{3/4} cup');
  assert.equal(showCups(f(1, 1)), '1 cup');
  assert.equal(showCups(f(5, 4)), '1 {1/4} cups');
});

test('fewestScoops finds an exact measure or none', () => {
  assert.deepEqual(fewestScoops(18, ALL_SCOOPS), [12, 6]);
  assert.deepEqual(fewestScoops(9, ALL_SCOOPS), [6, 3]);
  assert.deepEqual(fewestScoops(18, [6]), [6, 6, 6]);
  assert.equal(fewestScoops(4, ALL_SCOOPS), null);
  assert.equal(canMeasure(4, ALL_SCOOPS), false);
  assert.equal(canMeasure(0, ALL_SCOOPS), false);
});

test('every situation can be measured with the scoops that are clean', () => {
  for (const problem of samples()) {
    const amount = job.expected(problem);
    assert.ok(Number.isInteger(amount) && amount > 0, JSON.stringify(problem));
    assert.ok(canMeasure(amount, problem.scoops), JSON.stringify(problem));
  }
});

test('every skill can produce several different situations', () => {
  const rng = createRng(5);
  for (const skill of SKILLS) {
    const keys = new Set();
    for (let i = 0; i < 100; i++) keys.add(job.key(generate(skill.id, rng)));
    assert.ok(keys.size >= 6, `${skill.id} only has ${keys.size} situations`);
  }
});

test('patterns predict the documented wrong answers', () => {
  // 3/4 cup with the quarter-cup scoop: 3 scoops.
  assert.equal(job.expected(count(f(3, 4), 6)), 18);
  assert.equal(predicted('counts-bottom', count(f(3, 4), 6)), 24);
  assert.equal(predicted('one-scoop', count(f(3, 4), 6)), 6);

  // 1/2 cup with the quarter-cup scoop: 2 scoops.
  assert.equal(predicted('keeps-top-number', other(f(1, 2), 6)), 6);
  assert.equal(predicted('adds-to-top-and-bottom', other(f(1, 2), 6)), 18);
  assert.equal(predicted('counts-bottom', other(f(1, 2), 6)), 24);

  // 3/4 cup with the eighth-cup scoop: 6 scoops. 3/4 "becomes" 7/8.
  assert.equal(predicted('keeps-top-number', other(f(3, 4), 3)), 9);
  assert.equal(predicted('adds-to-top-and-bottom', other(f(3, 4), 3)), 21);

  // 3/4 cup needed, 1/2 cup already there: add 1/4 cup.
  assert.equal(job.expected(topUp(f(3, 4), f(1, 2))), 6);
  assert.equal(predicted('ignores-what-is-there', topUp(f(3, 4), f(1, 2))), 18);
  assert.equal(predicted('subtracts-top-and-bottom', topUp(f(3, 4), f(1, 2))), 24);
  assert.equal(predicted('subtracts-tops-only', topUp(f(3, 4), f(1, 2))), 12);

  // Two batches of 3/8 cup: 3/4 cup.
  assert.equal(job.expected(batches(f(3, 8), 2)), 18);
  assert.equal(predicted('amount-unchanged', batches(f(3, 8), 2)), 9);
  assert.equal(predicted('adds-batches', batches(f(3, 8), 2)), 15);
  // Two batches of 1/2 cup "is" 1/4 cup.
  assert.equal(predicted('multiplies-bottom', batches(f(1, 2), 2)), 6);

  // Half of 1/4 cup: 1/8 cup.
  assert.equal(job.expected(half(f(1, 4))), 3);
  assert.equal(predicted('halves-bottom', half(f(1, 4))), 12);
  assert.equal(predicted('amount-unchanged', half(f(1, 4))), 6);
});

test('patterns stay silent where they do not apply', () => {
  // A whole cup with a smaller scoop: counting the bottom number is right.
  assert.equal(predicted('counts-bottom', other(f(1, 1), 6)), null);
  // An amount the scoops cannot measure is never predicted (1/6 cup).
  assert.equal(predicted('multiplies-bottom', batches(f(1, 3), 2)), null);
  // Same bottom numbers: subtracting the tops is the right method.
  const like = { ...topUp(f(5, 8), f(1, 8)), skill: 'top-up' };
  assert.equal(predicted('subtracts-tops-only', like), null);
  assert.equal(predicted('subtracts-top-and-bottom', like), null);
});

test('a pattern never predicts the right answer or an unmeasurable amount', () => {
  for (const problem of samples()) {
    for (const p of PATTERNS) {
      const amount = predict(job, p, problem);
      if (amount === null) continue;
      assert.notEqual(amount, job.expected(problem));
      assert.ok(canMeasure(amount, problem.scoops));
    }
  }
});

test('every pattern applies to some situation the game can pose', () => {
  const used = new Set();
  for (const problem of samples()) {
    for (const p of PATTERNS) if (predict(job, p, problem) !== null) used.add(p.id);
  }
  assert.deepEqual([...used].sort(), PATTERNS.map((p) => p.id).sort());
});

test('pattern hints are sentences for every situation they apply to', () => {
  for (const problem of samples(100)) {
    for (const p of PATTERNS) {
      const amount = predict(job, p, problem);
      if (amount === null) continue;
      const hint = p.hint(problem, amount);
      assert.equal(typeof hint, 'string');
      assert.ok(hint.length > 20);
      assert.ok(!/undefined|NaN|null|\/1\}|\{0\//.test(hint), hint);
    }
  }
});

test('diagnose recognises right answers, patterns and slips', () => {
  const problem = count(f(3, 4), 6);
  assert.equal(diagnose(job, problem, 18).correct, true);
  assert.deepEqual(diagnose(job, problem, 24).patterns, ['counts-bottom']);
  assert.deepEqual(diagnose(job, problem, 6).patterns, ['one-scoop']);
  const slip = diagnose(job, problem, 12);
  assert.deepEqual(slip.patterns, []);
  assert.equal(slip.slip, true);
  const unknown = diagnose(job, problem, 36);
  assert.deepEqual(unknown.patterns, []);
  assert.equal(unknown.slip, false);
});

test('the learner model works through every kitchen skill', () => {
  const learner = newLearner();
  const rng = createRng(21);
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const problem = nextProblem(learner, job, rng);
    seen.add(problem.skill);
    recordResult(learner, job, problem, []);
  }
  assert.equal(seen.size, SKILLS.length);
  assert.equal(currentSkill(learner, job), null);
  // Progress in one job is kept apart from the others.
  assert.deepEqual(Object.keys(learner.jobs), ['kitchen']);
});
