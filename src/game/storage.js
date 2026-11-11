// Progress is kept in this browser only. Nothing is ever sent anywhere.
// Storage can be unavailable (private windows, blocked site data), so the
// game must work without it.

import { newLearner } from '../engine/learner.js';

const KEY = 'foothold.v1';

/** A brand-new save: the learner model plus the story and shop state. */
export function freshSave() {
  return { ...newLearner(), intro: false, shop: [], toldAllLearned: false };
}

export function loadLearner() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && saved.version === 1 && typeof saved.skills === 'object') {
      const save = { ...freshSave(), ...saved };
      if (!Array.isArray(save.shop)) save.shop = [];
      return save;
    }
  } catch {
    // Fall through to a fresh start.
  }
  return freshSave();
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
