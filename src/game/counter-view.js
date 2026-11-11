// The shop counter screen. A customer buys something and pays; the player
// hands back change from the till. Nothing ever asks "what is 5.00 − 2.40?".

import { countUp } from '../counter/countup.js';
import { counterJob } from '../counter/job.js';
import { TILL, breakdown, formatMoney } from '../counter/money.js';
import { customerSvg, numberLineSvg, pieceSvg } from './art.js';
import { h } from './dom.js';
import { pickItem, pickLook } from './goods.js';

const PIECES = TILL.map((d) => ({ ...d, value: d.cents }));

export const counterView = {
  job: counterJob,
  title: 'Nell’s shop counter',
  subject: 'Money',
  blurb: 'Hand each customer the right change.',
  taskWord: 'Customer',
  labels: {
    tray: 'Change you are handing back',
    empty: 'Pick bills and coins from your till.',
    given: 'Handed over.',
    pieces: 'Your till',
    clear: 'Start over',
    submit: 'Hand over the change',
    next: 'Next customer',
  },
  allLearnedLine: 'You can run the counter on your own now. The kitchen could use you too.',

  setUp(problem, rng) {
    return { item: pickItem(problem.price, rng), look: pickLook(rng) };
  },

  scene(round) {
    const { problem } = round;
    const { item, look } = round.extra;
    const mood = round.done ? 'happy' : round.wrong.length > 0 ? 'puzzled' : 'neutral';
    const says = round.done
      ? 'Thank you!'
      : round.wrong.length > 0
        ? 'Hmm, is that right?'
        : `${item.ask}, please.`;
    return [
      h('div', { class: 'customer' }, h('div', { html: customerSvg(look, mood) }), h('p', { class: 'bubble' }, says)),
      h(
        'div',
        { class: 'sale' },
        h(
          'div',
          { class: 'item' },
          h('span', { class: 'item-icon', 'aria-hidden': 'true' }, item.icon),
          h('p', { class: 'tag' }, h('span', { class: 'tag-name' }, item.name), ' ', h('strong', {}, formatMoney(problem.price))),
        ),
        h(
          'div',
          { class: 'paid' },
          h('p', { class: 'label' }, 'They hand you ', h('strong', {}, formatMoney(problem.paid))),
          h('div', { class: 'pieces', html: breakdown(problem.paid).map(pieceSvg).join('') }),
        ),
      ),
    ];
  },

  pieces: () => PIECES,
  pieceSvg,

  trayExtra(round, sum) {
    return h('p', { class: 'sum' }, 'Total: ', h('strong', {}, formatMoney(sum)));
  },

  /** The body of the "Let's check that" card. */
  check(round) {
    const { problem, result, hint } = round;
    const tries = round.wrong.length;
    const tooMuch = result.diff > 0;
    let note = hint;
    if (!note && result.slip) {
      note = `You are very close. It is off by just one ${Math.abs(result.diff) >= 100 ? 'bill' : 'coin'}.`;
    }
    return [
      h('p', {}, `The price is ${formatMoney(problem.price)}. You handed back ${formatMoney(result.answer)}.`),
      h(
        'p',
        { class: 'equation' },
        `${formatMoney(problem.price)} + ${formatMoney(result.answer)} = ${formatMoney(problem.price + result.answer)}`,
      ),
      h(
        'p',
        {},
        `The customer gave you ${formatMoney(problem.paid)}, so that is ${tooMuch ? 'too much' : 'not enough'} change.`,
      ),
      note && h('p', { class: 'note' }, note),
      h(
        'figure',
        {},
        h('figcaption', {}, 'Count up from the price to what they paid:'),
        h('div', { html: numberLineSvg(countUp(problem.price, problem.paid), tries >= 2) }),
      ),
      tries >= 3 && h('p', { class: 'answer' }, `The change is ${formatMoney(result.expected)}.`),
    ];
  },

  dayLine(day, tasks) {
    if (day.firstTry === tasks) {
      return 'Every customer got the right change, first time. The till adds up to the penny.';
    }
    if (day.firstTry >= tasks - 2) {
      return 'A good day. We checked the tricky ones together, and the till adds up.';
    }
    return 'Some hard ones today. Checking them is how you get better. And the till adds up.';
  },
};
