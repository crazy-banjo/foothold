// Progress is kept in this browser only. Nothing is ever sent anywhere.
// Storage can be unavailable (private windows, blocked site data), so the
// game must work without it.

import { newLearner } from '../engine/learner.js';

const KEY = 'foothold.v1';

export function loadLearner() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && saved.version === 1 && typeof saved.skills === 'object') {
      return { ...newLearner(), ...saved };
    }
  } catch {
    // Fall through to a fresh start.
  }
  return newLearner();
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
