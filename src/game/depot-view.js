// The delivery depot screen. Sam hands over the day's round; the player
// loads the boxes, books the minutes, or plans how many deliveries fit.
// Nothing ever asks "4 is to 60 as 10 is to what?".

import { depotJob } from '../depot/job.js';
import { PLAN_MAX, forEach } from '../depot/problems.js';
import { customerSvg } from './art.js';
import { h } from './dom.js';
import { stepper } from './stepper.js';

const SAM = { skin: '#9a6340', hair: '#2b1d16', shirt: '#3d6fb0' };

const ROUTES = [
  'Hillside Farm',
  'The Quarry',
  'Mill Road',
  'Lakeside',
  'The Sawmill',
  'Orchard End',
  'Old Bridge',
  'Pine Hollow',
];

const boxes = (n) => `${n} ${n === 1 ? 'box' : 'boxes'}`;
const minutes = (n) => `${n} ${n === 1 ? 'minute' : 'minutes'}`;
const deliveries = (n) => `${n} ${n === 1 ? 'delivery' : 'deliveries'}`;

/** What the player is setting in this situation. */
function unitOf(problem) {
  if (problem.ask === 'deliveries') return ['delivery', 'deliveries'];
  if (problem.ask === 'chain' || problem.per === 'minutes') return ['minute', 'minutes'];
  return ['box', 'boxes'];
}

function docketLines(p) {
  if (p.ask === 'chain') {
    return [
      `Each delivery gets ${boxes(p.boxesEach)} and takes ${minutes(p.minutesEach)}.`,
      `There are ${boxes(p.boxes)} to deliver.`,
      'Book the van for the whole job.',
    ];
  }
  const isBoxes = p.per === 'boxes';
  const { known, start } = p;
  const first =
    known.deliveries === 1
      ? isBoxes
        ? `Each delivery gets ${boxes(known.amount)}.`
        : `Each delivery takes ${minutes(known.amount)}.`
      : isBoxes
        ? `Yesterday, ${deliveries(known.deliveries)} used ${boxes(known.amount)}.`
        : `Yesterday, ${deliveries(known.deliveries)} took ${minutes(known.amount)}.`;
  const loading = `Loading the van takes ${minutes(start)} first.`;

  if (p.ask === 'amount') {
    return [
      first,
      `Today there are ${deliveries(p.today)}.`,
      start > 0 && (isBoxes ? `${boxes(start)} ${start === 1 ? 'is' : 'are'} already on the van.` : loading),
      isBoxes
        ? start > 0
          ? 'Load the boxes the van still needs.'
          : 'Load the van.'
        : start > 0
          ? 'Book the van for the whole job.'
          : 'Book the van for the deliveries.',
    ].filter(Boolean);
  }
  return [
    first,
    isBoxes ? `There are ${boxes(p.have)} in the yard.` : `The van is free for ${minutes(p.have)}.`,
    start > 0 && loading,
    isBoxes ? 'Plan as many full deliveries as the boxes allow.' : 'Plan as many deliveries as fit.',
  ].filter(Boolean);
}

/** What the answer would mean on the road. Every line here is simply true. */
function consequence(p, answer) {
  const over = (n, what) => (n > 0 ? `, with ${what(n)} over` : '');

  if (p.ask === 'chain') {
    const fit = Math.floor(answer / p.minutesEach);
    return [
      `You booked ${minutes(answer)}.`,
      `That is time for ${deliveries(fit)}${over(answer % p.minutesEach, minutes)}.`,
      `Those carry ${boxes(fit * p.boxesEach)}. There are ${boxes(p.boxes)} to deliver.`,
    ];
  }

  const rate = forEach(p);
  const { start } = p;

  if (p.ask === 'amount' && p.per === 'boxes') {
    const onVan = answer + start;
    const needed = rate * p.today;
    return [
      start > 0
        ? `You loaded ${boxes(answer)}. With the ${start} already on the van, that makes ${onVan}.`
        : `You loaded ${boxes(answer)}.`,
      `That is enough for ${deliveries(Math.floor(onVan / rate))}${over(onVan % rate, boxes)}.`,
      `Today there are ${deliveries(p.today)}. ${onVan < needed ? 'Some would go without.' : 'That is more than they need.'}`,
    ];
  }

  if (p.ask === 'amount') {
    const left = answer - start;
    const enough = answer >= rate * p.today + start;
    return [
      start > 0 && left >= 0
        ? `You booked ${minutes(answer)}. After ${minutes(start)} of loading, ${left} ${left === 1 ? 'is' : 'are'} left.`
        : `You booked ${minutes(answer)}.`,
      left < 0
        ? `Loading the van alone takes ${minutes(start)}.`
        : `That is time for ${deliveries(Math.floor(left / rate))}${over(left % rate, minutes)}.`,
      `Today there are ${deliveries(p.today)}. ${enough ? 'The van would be booked for longer than it needs.' : 'The van would not finish.'}`,
    ];
  }

  const needed = answer * rate + start;
  if (p.per === 'boxes') {
    return [
      `You planned ${deliveries(answer)}.`,
      `They need ${boxes(needed)}.`,
      needed > p.have
        ? `There are ${boxes(p.have)} in the yard. That is ${boxes(needed - p.have)} short.`
        : `There are ${boxes(p.have)} in the yard. That leaves ${p.have - needed}, enough for another delivery.`,
    ];
  }
  return [
    `You planned ${deliveries(answer)}.`,
    start > 0
      ? `They take ${minutes(answer * rate)}, plus ${start} of loading. That is ${minutes(needed)}.`
      : `They take ${minutes(needed)}.`,
    needed > p.have
      ? `The van is free for ${minutes(p.have)}. That is ${minutes(needed - p.have)} too long.`
      : `The van is free for ${minutes(p.have)}. That leaves ${p.have - needed}, enough for another delivery.`,
  ];
}

/** Sam's table: the rows, as [heading, ...cells], and a note under it. */
function table(p, tries) {
  if (p.ask === 'chain') {
    const made = tries >= 2 ? p.boxes / p.boxesEach : '?';
    return {
      rows: [
        ['Deliveries', 1, made],
        ['Boxes', p.boxesEach, p.boxes],
        ['Minutes', p.minutesEach, '?'],
      ],
      note: null,
    };
  }
  const rate = forEach(p);
  const { known, start } = p;
  const columns = [[known.deliveries, known.amount]];
  let note = null;

  if (p.ask === 'amount') {
    // One more known pair to reason from on a second miss: the amount for
    // 1 delivery, or for 2 when the amount for 1 is already given.
    const extra = known.deliveries > 1 ? 1 : 2;
    if (tries >= 2 && extra !== p.today) columns.push([extra, extra * rate]);
    columns.push([p.today, '?']);
    if (start > 0) {
      note = p.per === 'boxes' ? `${boxes(start)} of these ${start === 1 ? 'is' : 'are'} already on the van.` : `Loading adds ${minutes(start)}.`;
    }
  } else {
    if (tries >= 2) columns.push([2, 2 * rate]);
    if (start > 0 && tries >= 2) {
      columns.push(['?', p.have - start]);
      note = `After loading, ${minutes(p.have - start)} are left for deliveries.`;
    } else {
      columns.push(['?', p.have]);
      if (start > 0) note = `Loading takes ${minutes(start)} of this first.`;
    }
  }
  return {
    rows: [
      ['Deliveries', ...columns.map((c) => c[0])],
      [p.per === 'boxes' ? 'Boxes' : 'Minutes', ...columns.map((c) => c[1])],
    ],
    note,
  };
}

function answerLine(p, right) {
  if (p.ask === 'chain') {
    return `${deliveries(p.boxes / p.boxesEach)}, at ${minutes(p.minutesEach)} each, take ${minutes(right)}.`;
  }
  const rate = forEach(p);
  if (p.ask === 'deliveries') return `${deliveries(right)} ${right === 1 ? 'fits' : 'fit'}.`;
  if (p.per === 'boxes') {
    return p.start > 0
      ? `The deliveries need ${boxes(rate * p.today)}. ${p.start} ${p.start === 1 ? 'is' : 'are'} on the van, so load ${right}.`
      : `The deliveries need ${boxes(right)}.`;
  }
  return p.start > 0
    ? `The deliveries take ${minutes(rate * p.today)}. With ${p.start} of loading, book ${right}.`
    : `The deliveries take ${minutes(right)}.`;
}

export const depotView = {
  job: depotJob,
  boss: 'Sam',
  // Job titles, by the number of skills learned. Promotions are earned
  // only by learning; they cannot be bought and are never lost.
  ranks: [
    { at: 0, title: 'Yard Hand' },
    { at: 1, title: 'Loader' },
    { at: 3, title: 'Driver’s Mate' },
    { at: 5, title: 'Dispatcher' },
    { at: 6, title: 'Depot Manager' },
  ],
  title: 'The delivery depot',
  subject: 'Pre-algebra',
  blurb: 'Load the van and plan its day.',
  taskWord: 'Round',
  labels: {
    tray: 'The planning board',
    clear: 'Start over',
    submit: 'Send the van',
    next: 'Next round',
  },
  allLearnedLine: 'You run the yard like an old hand. The town office has been asking about you.',

  setUp(problem, rng) {
    return { route: rng.pick(ROUTES) };
  },

  scene(round) {
    const mood = round.done ? 'happy' : round.wrong.length > 0 ? 'puzzled' : 'neutral';
    const says = round.done ? 'Off it goes!' : round.wrong.length > 0 ? 'Hold on. Let’s look.' : 'Here is the next round.';
    return [
      h('div', { class: 'customer' }, h('div', { html: customerSvg(SAM, mood) }), h('p', { class: 'bubble' }, says)),
      h(
        'div',
        { class: 'recipe' },
        h('h2', { class: 'recipe-name' }, `Route: ${round.extra.route}`),
        docketLines(round.problem).map((line) => h('p', {}, line)),
      ),
    ];
  },

  control(round, api) {
    return stepper(round, api, { max: PLAN_MAX, unit: unitOf(round.problem) });
  },

  check(round) {
    const { problem, result, hint } = round;
    const tries = round.wrong.length;
    const [first, second, third] = consequence(problem, result.answer);
    const { rows, note: tableNote } = table(problem, tries);
    let note = hint;
    if (!note && result.slip) note = 'You are very close. It is off by just one.';
    return [
      h('p', {}, first),
      h('p', { class: 'equation' }, second),
      h('p', {}, third),
      note && h('p', { class: 'note' }, note),
      h(
        'figure',
        {},
        h('figcaption', {}, 'Sam’s table:'),
        h(
          'table',
          { class: 'trip-table' },
          rows.map(([heading, ...cells]) =>
            h('tr', {}, h('th', { scope: 'row' }, heading), cells.map((cell) => h('td', {}, String(cell)))),
          ),
        ),
        tableNote && h('p', { class: 'mark-note' }, tableNote),
      ),
      tries >= 3 && h('p', { class: 'answer' }, answerLine(problem, result.expected)),
    ];
  },

  dayLine(day, tasks) {
    if (day.firstTry === tasks) return 'Every van went out right the first time.';
    if (day.firstTry >= tasks - 2) return 'A good day. We checked the tricky rounds together.';
    return 'Some hard rounds today. Checking them is how you get better.';
  },
};
