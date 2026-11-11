// The shop counter job, and the general learner model exercised through it.

import test from 'node:test';
import assert from 'node:assert/strict';

import { SKILLS, generate } from '../src/counter/change.js';
import { countUp } from '../src/counter/countup.js';
import { counterJob as job } from '../src/counter/job.js';
import { BIG_TILL, TILL, breakdown, formatMoney, total } from '../src/counter/money.js';
import { PATTERNS } from '../src/counter/patterns.js';
import { diagnose, predict } from '../src/engine/diagnose.js';
import {
  MASTERY_STREAK,
  currentSkill,
  newLearner,
  nextProblem,
  recordResult,
  suspectedPatterns,
} from '../src/engine/learner.js';
import { createRng } from '../src/engine/rng.js';

const pattern = (id) => PATTERNS.find((p) => p.id === id);
const predicted = (id, price, paid) => predict(job, pattern(id), { price, paid });

function samples(count = 300) {
  const rng = createRng(42);
  const out = [];
  for (const skill of SKILLS) {
    for (let i = 0; i < count; i++) out.push(generate(skill.id, rng));
  }
  return out;
}

test('formatMoney', () => {
  assert.equal(formatMoney(240), '$2.40');
  assert.equal(formatMoney(500), '$5.00');
  assert.equal(formatMoney(40), '40¢');
  assert.equal(formatMoney(5), '5¢');
  assert.equal(formatMoney(1005), '$10.05');
});

test('breakdown uses the fewest pieces and adds up', () => {
  assert.deepEqual(breakdown(515).map((p) => p.id), ['five', 'dime', 'nickel']);
  assert.deepEqual(breakdown(2000).map((p) => p.id), ['twenty']);
  assert.deepEqual(breakdown(10000).map((p) => p.id), ['hundred']);
  for (let cents = 1; cents < 2100; cents += 7) assert.equal(total(breakdown(cents)), cents);
});

test('every generated situation has a price below what was paid', () => {
  for (const problem of samples()) {
    assert.ok(problem.price > 0, JSON.stringify(problem));
    assert.ok(problem.price < problem.paid, JSON.stringify(problem));
    assert.ok(problem.paid <= 10000, JSON.stringify(problem));
  }
});

test('each skill generates the kind of situation it describes', () => {
  const rng = createRng(7);
  for (let i = 0; i < 300; i++) {
    let p = generate('whole-dollars', rng);
    assert.equal(p.price % 100, 0);
    assert.equal(p.paid % 100, 0);

    p = generate('dimes-from-dollar', rng);
    assert.equal(p.paid, 100);
    assert.equal(p.price % 10, 0);

    p = generate('dollars-and-dimes', rng);
    assert.equal(p.price % 10, 0);
    assert.notEqual(p.price % 100, 0);
    assert.ok(p.price > 100);

    p = generate('cents-from-dollar', rng);
    assert.equal(p.paid, 100);
    assert.notEqual(p.price % 10, 0);

    p = generate('any-price', rng);
    assert.notEqual(p.price % 10, 0);
    assert.equal(p.paid % 100, 0);

    p = generate('extra-coins', rng);
    assert.notEqual(p.paid % 100, 0);
    // The extra coins make the change rounder than the price.
    assert.ok(p.paid % 100 <= p.price % 100);

    p = generate('big-bills', rng);
    assert.ok(p.paid === 5000 || p.paid === 10000);
    assert.ok(p.price > 1100);
    assert.equal(p.price % 10, 0);
    assert.notEqual(p.price % 100, 0);

    p = generate('big-bills-any', rng);
    assert.ok(p.paid === 5000 || p.paid === 10000);
    assert.notEqual(p.price % 10, 0);
  }
});

test('patterns predict the documented wrong answers', () => {
  // $2.40 paid with $5.00; the right change is $2.60.
  assert.equal(predicted('regroup-without-reducing', 240, 500), 360);
  assert.equal(predicted('smaller-from-larger', 240, 500), 340);
  assert.equal(predicted('zero-stays-ten', 240, 500), null);
  assert.equal(predicted('price-back', 240, 500), 240);
  assert.equal(predicted('ignores-price-cents', 240, 500), 300);
  assert.equal(predicted('stops-at-dollars', 240, 500), 200);
  assert.equal(predicted('stops-at-next-dollar', 240, 500), 60);

  // $2.37 paid with $5.00; the right change is $2.63.
  assert.equal(predicted('regroup-without-reducing', 237, 500), 373);
  assert.equal(predicted('smaller-from-larger', 237, 500), 337);
  assert.equal(predicted('zero-stays-ten', 237, 500), 273);

  // 37¢ paid with $1.00; the right change is 63¢.
  assert.equal(predicted('zero-stays-ten', 37, 100), 73);
  assert.equal(predicted('regroup-without-reducing', 37, 100), 173);

  // $12.00 paid with $20.00; the right change is $8.00.
  assert.equal(predicted('regroup-without-reducing', 1200, 2000), 1800);

  // $2.37 paid with $10.00; the right change is $7.63.
  assert.equal(predicted('zero-stays-ten', 237, 1000), 873);

  // $63.47 paid with $100.00; the right change is $36.53.
  assert.equal(job.expected({ price: 6347, paid: 10000 }), 3653);
  assert.equal(predicted('regroup-without-reducing', 6347, 10000), 14763);
  assert.equal(predicted('smaller-from-larger', 6347, 10000), 16347);
  assert.equal(predicted('zero-stays-ten', 6347, 10000), 4763);
  assert.equal(predicted('ignores-price-cents', 6347, 10000), 3700);
  assert.equal(predicted('stops-at-dollars', 6347, 10000), 3600);
  assert.equal(predicted('stops-at-next-dollar', 6347, 10000), 53);
});

test('patterns never apply when no regrouping is needed', () => {
  for (const id of ['regroup-without-reducing', 'smaller-from-larger', 'zero-stays-ten']) {
    assert.equal(predicted(id, 300, 500), null, id);
    assert.equal(predicted(id, 1000, 2000), null, id);
  }
});

test('a pattern never predicts the right answer or a non-positive amount', () => {
  for (const problem of samples()) {
    for (const p of PATTERNS) {
      const amount = predict(job, p, problem);
      if (amount === null) continue;
      assert.ok(amount > 0);
      assert.notEqual(amount, job.expected(problem));
    }
  }
});

test('pattern hints are sentences for every situation they apply to', () => {
  for (const problem of samples(100)) {
    for (const p of PATTERNS) {
      const amount = predict(job, p, problem);
      if (amount === null) continue;
      const hint = p.hint(problem, amount);
      assert.equal(typeof hint, 'string');
      assert.ok(hint.length > 20);
      assert.ok(!/undefined|NaN|\$-|-\d/.test(hint), hint);
    }
  }
});

test('diagnose recognises right answers, patterns and slips', () => {
  const problem = { skill: 'dollars-and-dimes', price: 240, paid: 500 };

  assert.equal(diagnose(job, problem, 260).correct, true);

  const tooMuch = diagnose(job, problem, 360);
  assert.equal(tooMuch.correct, false);
  assert.equal(tooMuch.diff, 100);
  assert.deepEqual(tooMuch.patterns, ['regroup-without-reducing']);
  assert.equal(tooMuch.slip, false);

  const slip = diagnose(job, problem, 250);
  assert.deepEqual(slip.patterns, []);
  assert.equal(slip.slip, true);

  const unknown = diagnose(job, problem, 417);
  assert.deepEqual(unknown.patterns, []);
  assert.equal(unknown.slip, false);
});

test('counting up always lands on the right change', () => {
  assert.deepEqual(
    countUp(237, 500).map((s) => s.add),
    [3, 60, 200],
  );
  assert.deepEqual(
    countUp(365, 515).map((s) => s.add),
    [5, 30, 100, 15],
  );
  assert.deepEqual(countUp(300, 500), [{ from: 300, to: 500, add: 200 }]);
  assert.deepEqual(
    countUp(6347, 10000).map((s) => s.add),
    [3, 50, 600, 3000],
  );
  for (const problem of samples()) {
    const steps = countUp(problem.price, problem.paid);
    assert.ok(steps.length >= 1 && steps.length <= 5);
    assert.equal(steps[0].from, problem.price);
    assert.equal(steps.at(-1).to, problem.paid);
    assert.equal(
      steps.reduce((sum, s) => sum + s.add, 0),
      job.expected(problem),
    );
    for (const step of steps) assert.ok(step.add > 0);
  }
});

test('every right answer can be made from the till', () => {
  assert.equal(Math.min(...TILL.map((d) => d.cents)), 1);
  assert.ok(TILL.every((d) => d.cents <= 1000));
  assert.deepEqual(
    BIG_TILL.slice(0, 2).map((d) => d.id),
    ['fifty', 'twenty'],
  );
});

test('a skill is mastered after enough first-try successes in a row', () => {
  const learner = newLearner();
  const problem = { skill: 'whole-dollars', price: 300, paid: 500 };
  assert.equal(currentSkill(learner, job).id, 'whole-dollars');
  recordResult(learner, job, problem, []);
  recordResult(learner, job, problem, [100]);
  for (let i = 0; i < MASTERY_STREAK - 1; i++) recordResult(learner, job, problem, []);
  assert.equal(currentSkill(learner, job).id, 'whole-dollars');
  recordResult(learner, job, problem, []);
  assert.equal(currentSkill(learner, job).id, 'dimes-from-dollar');
  assert.equal(learner.jobs.counter.skills['whole-dollars'].attempts, MASTERY_STREAK + 2);
});

test('evidence for a pattern builds with errors and fades with successes', () => {
  const learner = newLearner();
  const problem = { skill: 'dollars-and-dimes', price: 240, paid: 500 };
  recordResult(learner, job, problem, [360]);
  assert.deepEqual(
    suspectedPatterns(learner, job).map((s) => s.id),
    ['regroup-without-reducing'],
  );
  recordResult(learner, job, problem, [360, 250]);
  const seen = learner.jobs.counter.patterns['regroup-without-reducing'];
  assert.equal(seen.evidence, 2);
  assert.equal(seen.seen, 2);

  for (let i = 0; i < 4; i++) recordResult(learner, job, problem, []);
  assert.deepEqual(suspectedPatterns(learner, job), []);
});

test('a suspected pattern steers the next situation towards ones that test it', () => {
  const learner = newLearner();
  learner.jobs.counter = { skills: {}, patterns: {}, lastKey: null };
  for (const id of ['whole-dollars', 'dimes-from-dollar', 'dollars-and-dimes', 'cents-from-dollar']) {
    learner.jobs.counter.skills[id] = { attempts: 3, firstTry: 3, streak: 3, mastered: true };
  }
  learner.jobs.counter.patterns['zero-stays-ten'] = { evidence: 2, seen: 2 };
  const rng = createRng(3);
  let applicable = 0;
  for (let i = 0; i < 100; i++) {
    const problem = nextProblem(learner, job, rng);
    if (predict(job, pattern('zero-stays-ten'), problem) !== null) applicable += 1;
  }
  // About a quarter of situations are review of earlier skills.
  assert.ok(applicable >= 70, `only ${applicable} of 100 situations tested the pattern`);
});

test('nextProblem works through every skill and never repeats back to back', () => {
  const learner = newLearner();
  const rng = createRng(11);
  const seen = new Set();
  let previous = null;
  for (let i = 0; i < 500; i++) {
    const problem = nextProblem(learner, job, rng);
    assert.ok(problem.price < problem.paid);
    const key = job.key(problem);
    assert.notEqual(key, previous);
    previous = key;
    seen.add(problem.skill);
    recordResult(learner, job, problem, []);
  }
  assert.equal(seen.size, SKILLS.length);
  assert.equal(currentSkill(learner, job), null);
});
