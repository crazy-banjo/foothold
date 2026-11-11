// The delivery depot screen. Sam hands over a delivery; the player pumps
// just enough fuel for the trip. Nothing ever asks "2 is to 30 as what is
// to 90?".

import { PUMP_MAX, depotJob } from '../depot/job.js';
import { tripGallons, tripMiles } from '../depot/problems.js';
import { customerSvg } from './art.js';
import { h } from './dom.js';

const SAM = { skin: '#9a6340', hair: '#2b1d16', shirt: '#3d6fb0' };

const PLACES = [
  'Hillside Farm',
  'The Quarry',
  'Mill Road',
  'Lakeside',
  'The Sawmill',
  'Orchard End',
  'Old Bridge',
  'Pine Hollow',
];

const TANK_HOLDS = 50;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The van's tank, filled to scale but with no marks on it. */
function tankSvg(already, pumped) {
  const width = 268;
  const level = (gallons) => (Math.min(gallons, TANK_HOLDS) / TANK_HOLDS) * width;
  return `<svg class="tank" viewBox="0 0 300 54" width="300" height="54" aria-hidden="true">
    <defs><clipPath id="tank-inside"><rect x="6" y="8" width="${width}" height="38" rx="12"/></clipPath></defs>
    <g clip-path="url(#tank-inside)">
      <rect x="6" y="8" width="${width}" height="38" class="bowl-glass"/>
      <rect x="6" y="8" width="${level(already + pumped)}" height="38" class="tank-pumped"/>
      <rect x="6" y="8" width="${level(already)}" height="38" class="tank-already"/>
    </g>
    <rect x="6" y="8" width="${width}" height="38" rx="12" class="bowl-edge"/>
    <rect x="${width + 6}" y="20" width="16" height="14" rx="3" class="tank-cap"/>
  </svg>`;
}

function docketLines(problem) {
  const { gallons, miles, distance, roundTrip, tank } = problem;
  return [
    roundTrip
      ? `It is ${distance} miles away. The van must get there and back.`
      : `It is ${distance} miles away.`,
    `This van goes ${miles} miles on ${plural(gallons, 'gallon')}.`,
    tank > 0 ? `The tank already has ${plural(tank, 'gallon')} in it.` : 'The tank is empty.',
  ];
}

/** The columns of the trip table, as [gallons, miles] pairs. */
function tableColumns(problem, tries) {
  const { gallons, miles } = problem;
  const total = tripMiles(problem);
  const rate = miles / gallons;
  const columns = [[gallons, miles]];
  if (tries >= 2) {
    // One more known pair to reason from: the miles for 1 gallon, or for 2
    // gallons when the plate already gives 1.
    const extra = gallons > 1 ? 1 : 2;
    if (extra * rate !== total) columns.push([extra, extra * rate]);
  }
  columns.push(['?', total]);
  return columns;
}

export const depotView = {
  job: depotJob,
  boss: 'Sam',
  // Job titles, by the number of skills learned. Promotions are earned
  // only by learning; they cannot be bought and are never lost.
  ranks: [
    { at: 0, title: 'Yard Hand' },
    { at: 1, title: 'Fuel Hand' },
    { at: 2, title: 'Driver’s Mate' },
    { at: 4, title: 'Dispatcher' },
    { at: 5, title: 'Depot Manager' },
  ],
  title: 'The delivery depot',
  subject: 'Pre-algebra',
  blurb: 'Pump just enough fuel for each trip.',
  taskWord: 'Delivery',
  labels: {
    tray: 'The fuel pump',
    clear: 'Start over',
    submit: 'Send the van',
    next: 'Next delivery',
  },
  allLearnedLine: 'You plan fuel like an old hand. The town office has been asking about you.',

  setUp(problem, rng) {
    return { place: rng.pick(PLACES) };
  },

  scene(round) {
    const mood = round.done ? 'happy' : round.wrong.length > 0 ? 'puzzled' : 'neutral';
    const says = round.done
      ? 'Off it goes!'
      : round.wrong.length > 0
        ? 'Hold on. Let’s look.'
        : 'Pump just enough fuel.';
    return [
      h('div', { class: 'customer' }, h('div', { html: customerSvg(SAM, mood) }), h('p', { class: 'bubble' }, says)),
      h(
        'div',
        { class: 'recipe' },
        h('h2', { class: 'recipe-name' }, `Delivery: ${round.extra.place}`),
        docketLines(round.problem).map((line) => h('p', {}, line)),
      ),
    ];
  },

  /**
   * The pump: a display and four buttons. It keeps its own buttons on the
   * page while the amount changes, and tells the game the new amount.
   */
  control(round, api) {
    let amount = api.amount;
    const display = h('output', { class: 'pump-display' });
    const tank = h('div', { class: 'tank-holder' });
    const draw = () => {
      display.textContent = plural(amount, 'gallon');
      tank.innerHTML = tankSvg(round.problem.tank, amount);
    };
    const step = (by, label) =>
      h(
        'button',
        {
          class: 'quiet pump-step',
          type: 'button',
          disabled: round.done,
          'aria-label': label,
          onclick: () => {
            amount = Math.max(0, Math.min(PUMP_MAX, amount + by));
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
      tank,
      h(
        'div',
        { class: 'pump-row' },
        step(-10, 'Take 10 gallons off'),
        step(-1, 'Take 1 gallon off'),
        display,
        step(1, 'Pump 1 more gallon'),
        step(10, 'Pump 10 more gallons'),
      ),
    );
  },

  check(round) {
    const { problem, result, hint } = round;
    const tries = round.wrong.length;
    const rate = problem.miles / problem.gallons;
    const inTank = result.answer + problem.tank;
    const reach = inTank * rate;
    const total = tripMiles(problem);
    let note = hint;
    if (!note && result.slip) note = 'You are very close. It is off by just one gallon.';
    const columns = tableColumns(problem, tries);
    const needed = tripGallons(problem);
    return [
      h(
        'p',
        {},
        problem.tank > 0
          ? `You pumped ${plural(result.answer, 'gallon')}. With the ${problem.tank} already there, the tank has ${plural(inTank, 'gallon')}.`
          : `You pumped ${plural(result.answer, 'gallon')}.`,
      ),
      h('p', { class: 'equation' }, `That takes the van ${reach} miles.`),
      h(
        'p',
        {},
        reach < total
          ? `The trip is ${total} miles${problem.roundTrip ? ', there and back' : ''}. The van would stop ${total - reach} miles short.`
          : `The trip is only ${total} miles${problem.roundTrip ? ', there and back' : ''}. That is more fuel than it needs.`,
      ),
      note && h('p', { class: 'note' }, note),
      h(
        'figure',
        {},
        h('figcaption', {}, 'The van’s trip table:'),
        h(
          'table',
          { class: 'trip-table' },
          h('tr', {}, h('th', { scope: 'row' }, 'Gallons'), columns.map(([gallons]) => h('td', {}, String(gallons)))),
          h('tr', {}, h('th', { scope: 'row' }, 'Miles'), columns.map(([, miles]) => h('td', {}, String(miles)))),
        ),
      ),
      tries >= 3 &&
        h(
          'p',
          { class: 'answer' },
          problem.tank > 0
            ? `The trip needs ${plural(needed, 'gallon')}. The tank has ${problem.tank}, so pump ${result.expected}.`
            : `The trip needs ${plural(needed, 'gallon')}.`,
        ),
    ];
  },

  dayLine(day, tasks) {
    if (day.firstTry === tasks) return 'Every van got there and back with nothing wasted.';
    if (day.firstTry >= tasks - 2) return 'A good day. We checked the tricky trips together.';
    return 'Some hard trips today. Checking them is how you get better.';
  },
};
