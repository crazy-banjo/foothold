// A form with one blank and a number pad to fill it in. Jobs whose answer
// is a count or a measure use it in place of a till.
//
// The blank is written into a sentence ("Load ▢ boxes"). Digits can be
// tapped on the pad or typed on a keyboard. The pad keeps its own buttons
// on the page while the number changes, so keyboard focus is never lost,
// and tells the game the new amount through `api.set`.

import { h } from './dom.js';

// Only one pad is on the page at a time; this is its keyboard listener.
let listening = null;

/**
 * @param round    the current round (the pad is disabled once it is done)
 * @param api      { amount, set(amount) } from the game shell
 * @param options  { max, before, unit: [singular, plural] }
 *                 `before` is the text ahead of the blank, such as "Load".
 */
export function numberPad(round, api, { max, before, unit }) {
  let amount = api.amount; // 0 means the blank is empty

  const blank = h('output', { class: 'blank' });
  const after = h('span', {});
  const draw = () => {
    blank.textContent = amount > 0 ? String(amount) : '';
    blank.setAttribute('aria-label', amount > 0 ? String(amount) : 'blank');
    after.textContent = amount === 1 ? unit[0] : unit[1];
  };

  const set = (next) => {
    if (round.done || next > max) return;
    amount = next;
    draw();
    api.set(amount);
  };
  const press = (key) => {
    if (key === 'clear') set(0);
    else if (key === 'back') set(Math.floor(amount / 10));
    else set(amount * 10 + key);
  };

  const key = (label, value, name) =>
    h(
      'button',
      { class: 'key', type: 'button', disabled: round.done, 'aria-label': name, onclick: () => press(value) },
      label,
    );

  const root = h(
    'div',
    { class: 'number-pad' },
    h('p', { class: 'form-line' }, before, ' ', blank, ' ', after),
    h(
      'div',
      { class: 'keys' },
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => key(String(digit), digit)),
      key('C', 'clear', 'Clear'),
      key('0', 0),
      key('⌫', 'back', 'Delete the last digit'),
    ),
  );

  if (listening) document.removeEventListener('keydown', listening);
  listening = (event) => {
    if (!root.isConnected || round.done) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    if (/^[0-9]$/.test(event.key)) {
      press(Number(event.key));
      event.preventDefault();
    } else if (event.key === 'Backspace') {
      press('back');
      event.preventDefault();
    } else if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
      document.getElementById('hand-over')?.click();
    }
  };
  document.addEventListener('keydown', listening);

  draw();
  return root;
}
