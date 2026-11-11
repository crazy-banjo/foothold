// The delivery depot job: fuelling the van.

import test from 'node:test';
import assert from 'node:assert/strict';

import { PUMP_MAX, depotJob as job } from '../src/depot/job.js';
import { PATTERNS } from '../src/depot/patterns.js';
import { SKILLS, generate, tripGallons, tripMiles } from '../src/depot/problems.js';
import { diagnose, predict } from '../src/engine/diagnose.js';
import { currentSkill, newLearner, nextProblem, recordResult } from '../src/engine/learner.js';
import { createRng } from '../src/engine/rng.js';

const pattern = (id) => PATTERNS.find((p) => p.id === id);
const predicted = (id, problem) => predict(job, pattern(id), problem);
const trip = (gallons, miles, distance, more = {}) => ({
  skill: 'longer-trip',
  gallons,
  miles,
  distance,
  roundTrip: false,
  tank: 0,
  ...more,
});

function samples(perSkill = 300) {
  const rng = createRng(17);
  const out = [];
  for (const skill of SKILLS) {
    for (let i = 0; i < perSkill; i++) out.push(generate(skill.id, rng));
  }
  return out;
}

test('every situation has a whole-number answer the pump can deliver', () => {
  for (const problem of samples()) {
    const amount = job.expected(problem);
    assert.ok(Number.isInteger(amount), JSON.stringify(problem));
    assert.ok(amount >= 1 && amount <= PUMP_MAX, JSON.stringify(problem));
    // Miles for one gallon is a whole number.
    assert.equal(problem.miles % problem.gallons, 0, JSON.stringify(problem));
    assert.ok(problem.tank < tripGallons(problem), JSON.stringify(problem));
  }
});

test('each skill generates the kind of situation it describes', () => {
  const rng = createRng(2);
  for (let i = 0; i < 300; i++) {
    let p = generate('per-gallon', rng);
    assert.equal(p.gallons, 1);

    p = generate('longer-trip', rng);
    assert.ok(p.gallons > 1);
    assert.equal(p.distance % p.miles, 0);
    assert.ok(p.distance > p.miles);

    p = generate('there-and-back', rng);
    assert.equal(p.roundTrip, true);
    assert.equal(tripMiles(p), p.distance * 2);

    p = generate('in-between', rng);
    assert.notEqual(p.distance % p.miles, 0);
    assert.ok(p.distance > p.miles);

    p = generate('part-full', rng);
    assert.ok(p.tank >= 1);
  }
});

test('every skill can produce several different situations', () => {
  const rng = createRng(5);
  for (const skill of SKILLS) {
    const keys = new Set();
    for (let i = 0; i < 100; i++) keys.add(job.key(generate(skill.id, rng)));
    assert.ok(keys.size >= 10, `${skill.id} only has ${keys.size} situations`);
  }
});

test('patterns predict the documented wrong answers', () => {
  // 2 gallons go 30 miles; the trip is 90 miles; the right answer is 6.
  const p = trip(2, 30, 90);
  assert.equal(job.expected(p), 6);
  assert.equal(predicted('adds-the-difference', p), 62);
  assert.equal(predicted('known-trip-fuel', p), 2);
  assert.equal(predicted('times-as-far', p), 3);
  assert.equal(predicted('divides-by-gallons', p), 45);

  // 10 miles on 1 gallon; 40 miles away, there and back: 8 gallons.
  const back = trip(1, 10, 40, { roundTrip: true });
  assert.equal(job.expected(back), 8);
  assert.equal(predicted('one-way', back), 4);

  // 2 gallons go 30 miles; 90 miles; 3 gallons already in: pump 3.
  const part = trip(2, 30, 90, { tank: 3 });
  assert.equal(job.expected(part), 3);
  assert.equal(predicted('ignores-tank', part), 6);
});

test('patterns stay silent where they do not apply', () => {
  // With the miles for one gallon given, there is nothing to scale wrongly.
  const unit = trip(1, 10, 60);
  for (const id of ['adds-the-difference', 'known-trip-fuel', 'times-as-far', 'divides-by-gallons']) {
    assert.equal(predicted(id, unit), null, id);
  }
  // An in-between trip is not a whole number of known trips.
  assert.equal(predicted('times-as-far', trip(4, 60, 90)), null);
  // More than the pump can deliver is never predicted.
  assert.equal(predicted('adds-the-difference', trip(5, 75, 300)), null);
  assert.equal(predicted('one-way', trip(2, 30, 90)), null);
  assert.equal(predicted('ignores-tank', trip(2, 30, 90)), null);
});

test('a pattern never predicts the right answer or an amount the pump cannot give', () => {
  for (const problem of samples()) {
    for (const p of PATTERNS) {
      const amount = predict(job, p, problem);
      if (amount === null) continue;
      assert.notEqual(amount, job.expected(problem));
      assert.ok(amount >= 1 && amount <= PUMP_MAX);
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
      assert.ok(!/undefined|NaN|null|\b1 gallons|\b1 times/.test(hint), hint);
    }
  }
});

test('diagnose recognises right answers, patterns and slips', () => {
  const p = trip(2, 30, 90);
  assert.equal(diagnose(job, p, 6).correct, true);
  assert.deepEqual(diagnose(job, p, 62).patterns, ['adds-the-difference']);
  assert.deepEqual(diagnose(job, p, 3).patterns, ['times-as-far']);
  const slip = diagnose(job, p, 7);
  assert.deepEqual(slip.patterns, []);
  assert.equal(slip.slip, true);
  const unknown = diagnose(job, p, 20);
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
