// A control for setting a whole number: a display with −10, −1, +1 and
// +10 buttons. Jobs whose answer is a count or a measure use it in place
// of a till. It keeps its own buttons on the page while the number
// changes, so keyboard focus is never lost, and tells the game the new
// amount through `api.set`.

import { h } from './dom.js';

/**
 * @param round    the current round (the buttons are disabled once done)
 * @param api      { amount, set(amount) } from the game shell
 * @param options  { max, unit: [singular, plural], picture?(amount) -> svg }
 */
export function stepper(round, api, { max, unit, picture }) {
  let amount = api.amount;
  const display = h('output', { class: 'pump-display' });
  const drawing = picture ? h('div', { class: 'tank-holder' }) : null;

  const draw = () => {
    display.textContent = `${amount} ${amount === 1 ? unit[0] : unit[1]}`;
    if (drawing) drawing.innerHTML = picture(amount);
  };

  const step = (by) =>
    h(
      'button',
      {
        class: 'quiet pump-step',
        type: 'button',
        disabled: round.done,
        'aria-label': by > 0 ? `Add ${by}` : `Take off ${-by}`,
        onclick: () => {
          amount = Math.max(0, Math.min(max, amount + by));
          draw();
          api.set(amount);
        },
      },
      by > 0 ? `+${by}` : `−${-by}`,
    );

  draw();
  return h(
    'div',
    { class: 'pump' },
    drawing,
    h('div', { class: 'pump-row' }, step(-10), step(-1), display, step(1), step(10)),
  );
}
