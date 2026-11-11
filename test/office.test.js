// The town office job: plans that are linear equations in one unknown.

import test from 'node:test';
import assert from 'node:assert/strict';

import { diagnose, predict } from '../src/engine/diagnose.js';
import { currentSkill, newLearner, nextProblem, recordResult } from '../src/engine/learner.js';
import { createRng } from '../src/engine/rng.js';
import { officeJob as job } from '../src/office/job.js';
import { PATTERNS } from '../src/office/patterns.js';
import { ORDER_MAX, SKILLS, generate } from '../src/office/problems.js';

const pattern = (id) => PATTERNS.find((p) => p.id === id);
const predicted = (id, problem) => predict(job, pattern(id), problem);
const buy = (fee, each, budget) => ({ skill: 'charge-plus-each', kind: 'buy', each, fee, budget });
const earn = (fee, each, target) => ({ skill: 'earn-a-target', kind: 'earn', each, fee, target });

function samples(perSkill = 400) {
  const rng = createRng(23);
  const out = [];
  for (const skill of SKILLS) {
    for (let i = 0; i < perSkill; i++) out.push(generate(skill.id, rng));
  }
  return out;
}

test('every situation has a whole-number answer that can be ordered', () => {
  for (const p of samples()) {
    const n = job.expected(p);
    assert.ok(Number.isInteger(n), JSON.stringify(p));
    assert.ok(n >= 1 && n <= ORDER_MAX, JSON.stringify(p));
    if (p.kind === 'buy') {
      // n is the most the budget pays for.
      assert.ok(p.fee + p.each * n <= p.budget, JSON.stringify(p));
      assert.ok(p.fee + p.each * (n + 1) > p.budget, JSON.stringify(p));
    } else {
      assert.equal(p.each * n - p.fee, p.target, JSON.stringify(p));
      assert.ok(p.target > 0);
    }
  }
});

test('each skill generates the kind of situation it describes', () => {
  const rng = createRng(4);
  for (let i = 0; i < 300; i++) {
    let p = generate('so-much-each', rng);
    assert.equal(p.fee, 0);
    assert.equal(p.budget % p.each, 0);

    p = generate('charge-plus-each', rng);
    assert.ok(p.fee > 0);
    assert.equal((p.budget - p.fee) % p.each, 0);

    p = generate('money-left-over', rng);
    assert.notEqual((p.budget - p.fee) % p.each, 0);

    p = generate('earn-a-target', rng);
    assert.equal(p.kind, 'earn');
    assert.ok(p.fee > 0);
  }
});

test('every skill can produce many different situations', () => {
  const rng = createRng(5);
  for (const skill of SKILLS) {
    const keys = new Set();
    for (let i = 0; i < 100; i++) keys.add(job.key(generate(skill.id, rng)));
    assert.ok(keys.size >= 30, `${skill.id} only has ${keys.size} situations`);
  }
});

test('patterns predict the documented wrong answers', () => {
  // $6 charge plus $2 each from $26: 6 + 2n = 26, so n = 10.
  const p = buy(6, 2, 26);
  assert.equal(job.expected(p), 10);
  assert.equal(predicted('ignores-charge', p), 13);
  assert.equal(predicted('stops-after-charge', p), 20);
  assert.equal(predicted('divides-first', p), 7);
  assert.equal(predicted('adds-charge', p), 16);
  assert.equal(predicted('joins-charge-and-price', p), null); // 26 ÷ 8 is not whole

  // $4 charge plus $2 each from $36: joining gives 36 ÷ 6 = 6.
  assert.equal(job.expected(buy(4, 2, 36)), 16);
  assert.equal(predicted('joins-charge-and-price', buy(4, 2, 36)), 6);

  // $20 plus $6 each from $65: 7 hours, with $3 left over.
  const over = { ...buy(20, 6, 65), skill: 'money-left-over' };
  assert.equal(job.expected(over), 7);
  assert.equal(predicted('rounds-up', over), 8);
  assert.equal(predicted('ignores-charge', over), 10);

  // $2 each after $30 costs, to leave $50: 2n − 30 = 50, so n = 40.
  const e = earn(30, 2, 50);
  assert.equal(job.expected(e), 40);
  assert.equal(predicted('takes-cost-off-target', e), 10);
  assert.equal(predicted('ignores-cost', e), 25);
  assert.equal(predicted('stops-at-sales-needed', e), 80);
});

test('patterns stay silent where they do not apply', () => {
  const plain = { skill: 'so-much-each', kind: 'buy', each: 8, fee: 0, budget: 56 };
  for (const p of PATTERNS) assert.equal(predict(job, p, plain), null, p.id);
  assert.equal(predicted('rounds-up', buy(6, 2, 26)), null);
  // More than the order form accepts is never predicted.
  assert.equal(predicted('stops-after-charge', buy(10, 5, 160)), null);
});

test('a pattern never predicts the right answer or a number that cannot be ordered', () => {
  for (const p of samples()) {
    for (const each of PATTERNS) {
      const n = predict(job, each, p);
      if (n === null) continue;
      assert.notEqual(n, job.expected(p));
      assert.ok(Number.isInteger(n) && n >= 1 && n <= ORDER_MAX);
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
      assert.ok(!/undefined|NaN|null|\$-|\$0\b/.test(hint), hint);
    }
  }
});

test('diagnose recognises right answers, patterns and slips', () => {
  const p = buy(6, 2, 26);
  assert.equal(diagnose(job, p, 10).correct, true);
  assert.deepEqual(diagnose(job, p, 13).patterns, ['ignores-charge']);
  assert.deepEqual(diagnose(job, p, 7).patterns, ['divides-first']);
  const slip = diagnose(job, p, 11);
  assert.deepEqual(slip.patterns, []);
  assert.equal(slip.slip, true);
});

test('the learner model works through every office skill', () => {
  const learner = newLearner();
  const rng = createRng(41);
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const problem = nextProblem(learner, job, rng);
    seen.add(problem.skill);
    recordResult(learner, job, problem, []);
  }
  assert.equal(seen.size, SKILLS.length);
  assert.equal(currentSkill(learner, job), null);
});
