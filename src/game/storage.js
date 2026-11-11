// Progress is kept in this browser only. Nothing is ever sent anywhere.
// Storage can be unavailable (private windows, blocked site data), so the
// game must work without it.

import { newLearner } from '../engine/learner.js';

const KEY = 'foothold.v1';

/** A brand-new save: the learner model plus the story and shop state. */
export function freshSave() {
  return { ...newLearner(), intro: false, shop: [], told: {} };
}

/** Bring a save written by an earlier version of the game up to date. */
export function migrate(saved) {
  if (!saved || typeof saved !== 'object') return null;
  if (saved.version === 1) {
    // Version 1 had only the shop counter, with its record at the top level.
    const { skills, patterns, lastKey, toldAllLearned, ...rest } = saved;
    saved = {
      ...rest,
      version: 2,
      jobs: { counter: { skills: skills ?? {}, patterns: patterns ?? {}, lastKey: lastKey ?? null } },
      told: toldAllLearned ? { counter: true } : {},
    };
  }
  if (saved.version !== 2 || typeof saved.jobs !== 'object' || saved.jobs === null) return null;
  const save = { ...freshSave(), ...saved };
  if (!Array.isArray(save.shop)) save.shop = [];
  if (typeof save.told !== 'object' || save.told === null) save.told = {};
  return save;
}

export function loadLearner() {
  try {
    return migrate(JSON.parse(localStorage.getItem(KEY))) ?? freshSave();
  } catch {
    return freshSave();
  }
}

export function saveLearner(learner) {
  try {
    localStorage.setItem(KEY, JSON.stringify(learner));
  } catch {
    // Progress simply won't carry over to the next visit.
  }
}

export function clearLearner() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
