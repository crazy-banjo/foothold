// The delivery depot job: deliveries, boxes and minutes.

import test from 'node:test';
import assert from 'node:assert/strict';

import { depotJob as job } from '../src/depot/job.js';
import { PATTERNS } from '../src/depot/patterns.js';
import { PLAN_MAX, SKILLS, forEach, generate } from '../src/depot/problems.js';
import { diagnose, predict } from '../src/engine/diagnose.js';
import { currentSkill, newLearner, nextProblem, recordResult } from '../src/engine/learner.js';
import { createRng } from '../src/engine/rng.js';

const pattern = (id) => PATTERNS.find((p) => p.id === id);
const predicted = (id, problem) => predict(job, pattern(id), problem);

/** Boxes or minutes for today's deliveries, from a known pair. */
const amount = (per, knownDeliveries, knownAmount, today, start = 0) => ({
  skill: 'from-yesterday',
  ask: 'amount',
  per,
  known: { deliveries: knownDeliveries, amount: knownAmount },
  today,
  start,
});
/** Deliveries that some boxes or minutes allow. */
const count = (per, each, have, start = 0) => ({
  skill: 'what-fits',
  ask: 'deliveries',
  per,
  known: { deliveries: 1, amount: each },
  have,
  start,
});
const chain = (boxesEach, minutesEach, boxes) => ({ skill: 'boxes-then-minutes', ask: 'chain', boxesEach, minutesEach, boxes });

function samples(perSkill = 400) {
  const rng = createRng(17);
  const out = [];
  for (const skill of SKILLS) {
    for (let i = 0; i < perSkill; i++) out.push(generate(skill.id, rng));
  }
  return out;
}

test('every situation has a whole-number answer the board accepts', () => {
  for (const p of samples()) {
    const n = job.expected(p);
    assert.ok(Number.isInteger(n), JSON.stringify(p));
    assert.ok(n >= 1 && n <= PLAN_MAX, JSON.stringify(p));
    if (p.ask !== 'chain') assert.ok(Number.isInteger(forEach(p)), JSON.stringify(p));
  }
});

test('each skill generates the kind of situation it describes', () => {
  const rng = createRng(2);
  for (let i = 0; i < 300; i++) {
    let p = generate('each-delivery', rng);
    assert.equal(p.ask, 'amount');
    assert.equal(p.known.deliveries, 1);
    assert.equal(p.start, 0);

    p = generate('how-many-go-out', rng);
    assert.equal(p.ask, 'deliveries');
    assert.equal(p.have % p.known.amount, 0);

    p = generate('from-yesterday', rng);
    assert.ok(p.known.deliveries > 1);
    assert.notEqual(p.today, p.known.deliveries);

    p = generate('head-start', rng);
    assert.ok(p.start > 0);
    if (p.per === 'boxes') assert.ok(p.start < forEach(p) * p.today);

    p = generate('what-fits', rng);
    assert.notEqual((p.have - p.start) % p.known.amount, 0);

    p = generate('boxes-then-minutes', rng);
    assert.equal(p.boxes % p.boxesEach, 0);
  }
});

test('every skill can produce many different situations', () => {
  const rng = createRng(5);
  for (const skill of SKILLS) {
    const keys = new Set();
    for (let i = 0; i < 150; i++) keys.add(job.key(generate(skill.id, rng)));
    assert.ok(keys.size >= 30, `${skill.id} only has ${keys.size} situations`);
  }
});

test('the right answers are right', () => {
  // 7 deliveries of 6 boxes: 42 boxes.
  assert.equal(job.expected(amount('boxes', 1, 6, 7)), 42);
  // 4 deliveries took 60 minutes; 10 deliveries take 150.
  assert.equal(job.expected(amount('minutes', 4, 60, 10)), 150);
  // 7 deliveries of 6 boxes with 12 already on the van: load 30.
  assert.equal(job.expected(amount('boxes', 1, 6, 7, 12)), 30);
  // 7 deliveries of 15 minutes after 20 minutes of loading: 125.
  assert.equal(job.expected(amount('minutes', 1, 15, 7, 20)), 125);
  // 50 boxes at 6 each: 8 full deliveries.
  assert.equal(job.expected(count('boxes', 6, 50)), 8);
  // 100 minutes, 20 of them loading, 15 a delivery: 5.
  assert.equal(job.expected(count('minutes', 15, 100, 20)), 5);
  // 48 boxes at 6 boxes and 15 minutes a delivery: 8 deliveries, 120 minutes.
  assert.equal(job.expected(chain(6, 15, 48)), 120);
});

test('patterns predict the documented wrong answers', () => {
  assert.equal(predicted('adds-the-numbers', amount('boxes', 1, 6, 7)), 13);

  const scaled = amount('minutes', 4, 60, 12);
  assert.equal(job.expected(scaled), 180);
  assert.equal(predicted('adds-the-difference', scaled), 68);
  assert.equal(predicted('yesterdays-amount', scaled), 60);
  assert.equal(predicted('times-as-many', scaled), 3);

  assert.equal(predicted('ignores-head-start', amount('boxes', 1, 6, 7, 12)), 42);
  assert.equal(predicted('ignores-head-start', amount('minutes', 1, 15, 7, 20)), 105);

  assert.equal(predicted('subtracts-instead', { ...count('boxes', 6, 48), skill: 'how-many-go-out' }), 42);
  assert.equal(predicted('rounds-up', count('boxes', 6, 50)), 9);
  assert.equal(predicted('ignores-loading', count('minutes', 15, 100, 20)), 6);

  assert.equal(predicted('stops-at-deliveries', chain(6, 15, 48)), 8);
  assert.equal(predicted('multiplies-the-pair', chain(6, 15, 48)), 90);
});

test('patterns stay silent where they do not apply', () => {
  // The amount for one delivery is given, so there is nothing to scale.
  const each = amount('boxes', 1, 6, 7);
  for (const id of ['adds-the-difference', 'yesterdays-amount', 'times-as-many', 'ignores-head-start']) {
    assert.equal(predicted(id, each), null, id);
  }
  // 10 is not a whole number of times 4.
  assert.equal(predicted('times-as-many', amount('minutes', 4, 60, 10)), null);
  assert.equal(predicted('rounds-up', count('boxes', 6, 48)), null);
  assert.equal(predicted('ignores-loading', count('minutes', 15, 100)), null);
});

test('a pattern never predicts the right answer or a number the board rejects', () => {
  for (const p of samples()) {
    for (const each of PATTERNS) {
      const n = predict(job, each, p);
      if (n === null) continue;
      assert.notEqual(n, job.expected(p));
      assert.ok(Number.isInteger(n) && n >= 1 && n <= PLAN_MAX);
    }
  }
});

test('every pattern applies to some situation the game can pose', () => {
  const used = new Set();
  for (const p of samples()) {
    for (const each of PATTERNS) if (predict(job, each, p) !== null) used.add(each.id);
  }
  assert.deepEqual([...used].sort(), PATTERNS.map((p) => p.id).sort());
});

test('pattern hints are sentences for every situation they apply to', () => {
  for (const p of samples(150)) {
    for (const each of PATTERNS) {
      const n = predict(job, each, p);
      if (n === null) continue;
      const hint = each.hint(p, n);
      assert.equal(typeof hint, 'string');
      assert.ok(hint.length > 20);
      assert.ok(!/undefined|NaN|null|\b1 (boxes|minutes|deliveries|times)\b|deliverys/.test(hint), hint);
    }
  }
});

test('diagnose recognises right answers, patterns and slips', () => {
  const p = amount('minutes', 4, 60, 12);
  assert.equal(diagnose(job, p, 180).correct, true);
  assert.deepEqual(diagnose(job, p, 68).patterns, ['adds-the-difference']);
  assert.deepEqual(diagnose(job, p, 3).patterns, ['times-as-many']);
  const slip = diagnose(job, p, 181);
  assert.deepEqual(slip.patterns, []);
  assert.equal(slip.slip, true);
  const unknown = diagnose(job, p, 100);
  assert.deepEqual(unknown.patterns, []);
  assert.equal(unknown.slip, false);
});

test('the learner model works through every depot skill', () => {
  const learner = newLearner();
  const rng = createRng(31);
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const problem = nextProblem(learner, job, rng);
    seen.add(problem.skill);
    recordResult(learner, job, problem, []);
  }
  assert.equal(seen.size, SKILLS.length);
  assert.equal(currentSkill(learner, job), null);
});
