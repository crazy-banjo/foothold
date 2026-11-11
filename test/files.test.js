// Guards against the offline file list drifting from the source tree.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { counterView } from '../src/game/counter-view.js';
import { depotView } from '../src/game/depot-view.js';
import { kitchenView } from '../src/game/kitchen-view.js';
import { migrate } from '../src/game/storage.js';

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? sourceFiles(`${dir}/${entry.name}`) : [`./${dir}/${entry.name}`],
  );
}

test('the offline cache lists every source file', () => {
  const sw = readFileSync('sw.js', 'utf8');
  const listed = [...sw.matchAll(/'(\.\/[^']*)'/g)].map((m) => m[1]);
  for (const file of sourceFiles('src')) assert.ok(listed.includes(file), `${file} is missing from sw.js`);
  for (const file of listed.filter((f) => f.startsWith('./src/'))) {
    assert.doesNotThrow(() => readFileSync(file), `${file} is listed in sw.js but does not exist`);
  }
});

test('a save from the first version keeps its progress', () => {
  const old = {
    version: 1,
    coins: 71,
    day: 3,
    skills: { 'whole-dollars': { attempts: 3, firstTry: 3, streak: 3, mastered: true } },
    patterns: { 'price-back': { evidence: 1, seen: 1 } },
    lastKey: '300/500',
    intro: true,
    shop: ['paint'],
    toldAllLearned: false,
  };
  const save = migrate(old);
  assert.equal(save.version, 2);
  assert.equal(save.coins, 71);
  assert.equal(save.day, 3);
  assert.deepEqual(save.shop, ['paint']);
  assert.equal(save.jobs.counter.skills['whole-dollars'].mastered, true);
  assert.equal(save.jobs.counter.patterns['price-back'].seen, 1);
  assert.equal(save.skills, undefined);
  assert.deepEqual(save.told, {});
});

test('a damaged save is replaced, not trusted', () => {
  assert.equal(migrate(null), null);
  assert.equal(migrate('nonsense'), null);
  assert.equal(migrate({ version: 9 }), null);
  assert.equal(migrate({ version: 2, jobs: null }), null);
});

test('every job has a ladder of titles from no skills to all of them', () => {
  for (const view of [counterView, kitchenView, depotView]) {
    const steps = view.ranks.map((rank) => rank.at);
    assert.equal(steps[0], 0, view.title);
    assert.equal(steps.at(-1), view.job.skills.length, view.title);
    assert.deepEqual(steps, [...new Set(steps)].sort((a, b) => a - b), view.title);
    assert.equal(new Set(view.ranks.map((rank) => rank.title)).size, view.ranks.length, view.title);
  }
});
