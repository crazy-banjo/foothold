// The workshop job: the distance round shapes and the space inside them.

import test from 'node:test';
import assert from 'node:assert/strict';

import { diagnose, predict } from '../src/engine/diagnose.js';
import { currentSkill, newLearner, nextProblem, recordResult } from '../src/engine/learner.js';
import { createRng } from '../src/engine/rng.js';
import { workshopJob as job } from '../src/workshop/job.js';
import { PATTERNS } from '../src/workshop/patterns.js';
import { CUT_MAX, SKILLS, around, generate, inside } from '../src/workshop/problems.js';

const pattern = (id) => PATTERNS.find((p) => p.id === id);
const predicted = (id, problem) => predict(job, pattern(id), problem);
const rect = (need, w, h) => ({ skill: 'x', need, shape: { type: 'rect', w, h } });
const lShape = (need, w, h, cw, ch) => ({ skill: 'x', need, shape: { type: 'L', w, h, cw, ch } });
const tri = (w, h) => ({ skill: 'x', need: 'inside', shape: { type: 'tri', w, h } });

function samples(perSkill = 400) {
  const rng = createRng(29);
  const out = [];
  for (const skill of SKILLS) {
    for (let i = 0; i < perSkill; i++) out.push(generate(skill.id, rng));
  }
  return out;
}

/** Count the unit squares of a shape one by one, as a check on the formulas. */
function countSquares(shape) {
  let squares = 0;
  for (let x = 0; x < shape.w; x++) {
    for (let y = 0; y < shape.h; y++) {
      // y counts down from the top; the cut-away corner is at the top right.
      if (shape.type === 'L' && x >= shape.w - shape.cw && y < shape.ch) continue;
      squares += 1;
    }
  }
  return squares;
}

/** Walk the outline of an L shape side by side, as a check on the formula. */
function walkAround({ w, h, cw, ch }) {
  return w + (h - ch) + cw + ch + (w - cw) + h;
}

test('the formulas agree with counting squares and walking the outline', () => {
  for (const p of samples()) {
    const { shape } = p;
    if (shape.type === 'tri') {
      assert.equal(inside(shape) * 2, countSquares(shape));
    } else {
      assert.equal(inside(shape), countSquares(shape), JSON.stringify(shape));
    }
    if (shape.type === 'L') assert.equal(around(shape), walkAround(shape), JSON.stringify(shape));
    if (shape.type === 'rect') assert.equal(around(shape), shape.w + shape.h + shape.w + shape.h);
  }
});

test('every situation has a whole-number answer the cutting list accepts', () => {
  for (const p of samples()) {
    const n = job.expected(p);
    assert.ok(Number.isInteger(n), JSON.stringify(p));
    assert.ok(n >= 1 && n <= CUT_MAX, JSON.stringify(p));
    const { shape } = p;
    if (shape.type === 'L') {
      // The cut-away corner leaves a real L, with every side at least 1 foot.
      assert.ok(shape.cw >= 1 && shape.cw <= shape.w - 2, JSON.stringify(shape));
      assert.ok(shape.ch >= 1 && shape.ch <= shape.h - 2, JSON.stringify(shape));
    }
  }
});

test('every skill can produce many different situations', () => {
  const rng = createRng(5);
  for (const skill of SKILLS) {
    const keys = new Set();
    for (let i = 0; i < 150; i++) keys.add(job.key(generate(skill.id, rng)));
    assert.ok(keys.size >= 20, `${skill.id} only has ${keys.size} situations`);
  }
});

test('patterns predict the documented wrong answers', () => {
  // A 4 by 3 rectangle: 14 feet round, 12 squares inside.
  assert.equal(job.expected(rect('around', 4, 3)), 14);
  assert.equal(job.expected(rect('inside', 4, 3)), 12);
  assert.equal(predicted('inside-for-around', rect('around', 4, 3)), 12);
  assert.equal(predicted('around-for-inside', rect('inside', 4, 3)), 14);
  assert.equal(predicted('adds-two-sides', rect('around', 4, 3)), 7);
  assert.equal(predicted('adds-two-sides', rect('inside', 4, 3)), 7);

  // A 7 by 5 L with a 3 by 2 corner cut away: 24 feet round, 29 squares.
  const edge = lShape('around', 7, 5, 3, 2);
  const floor = lShape('inside', 7, 5, 3, 2);
  assert.equal(job.expected(edge), 24);
  assert.equal(job.expected(floor), 29);
  assert.equal(predicted('written-sides-only', edge), 19);
  assert.equal(predicted('inside-for-around', edge), 29);
  assert.equal(predicted('whole-rectangle', floor), 35);
  assert.equal(predicted('counts-overlap-twice', floor), 7 * 3 + 4 * 5);
  assert.equal(predicted('around-for-inside', floor), 24);

  // A triangle 6 along the bottom and 4 high: 12 square feet.
  assert.equal(job.expected(tri(6, 4)), 12);
  assert.equal(predicted('forgets-half', tri(6, 4)), 24);
  assert.equal(predicted('adds-two-sides', tri(6, 4)), 10);
});

test('patterns stay silent where they do not apply', () => {
  // A 6 by 3 rectangle is 18 round and 18 inside: mixing them up cannot show.
  assert.equal(predicted('inside-for-around', rect('around', 6, 3)), null);
  assert.equal(predicted('around-for-inside', rect('inside', 6, 3)), null);
  assert.equal(predicted('written-sides-only', rect('around', 4, 3)), null);
  assert.equal(predicted('forgets-half', rect('inside', 4, 3)), null);
  assert.equal(predicted('whole-rectangle', rect('inside', 4, 3)), null);
});

test('a pattern never predicts the right answer or a number the list rejects', () => {
  for (const p of samples()) {
    for (const each of PATTERNS) {
      const n = predict(job, each, p);
      if (n === null) continue;
      assert.notEqual(n, job.expected(p));
      assert.ok(Number.isInteger(n) && n >= 1 && n <= CUT_MAX);
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
      assert.ok(!/undefined|NaN|null/.test(hint), hint);
    }
  }
});

test('diagnose recognises right answers, patterns and slips', () => {
  const p = rect('around', 4, 3);
  assert.equal(diagnose(job, p, 14).correct, true);
  assert.deepEqual(diagnose(job, p, 12).patterns, ['inside-for-around']);
  assert.deepEqual(diagnose(job, p, 7).patterns, ['adds-two-sides']);
  const slip = diagnose(job, p, 15);
  assert.deepEqual(slip.patterns, []);
  assert.equal(slip.slip, true);
});

test('the learner model works through every workshop skill', () => {
  const learner = newLearner();
  const rng = createRng(43);
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const problem = nextProblem(learner, job, rng);
    seen.add(problem.skill);
    recordResult(learner, job, problem, []);
  }
  assert.equal(seen.size, SKILLS.length);
  assert.equal(currentSkill(learner, job), null);
});
