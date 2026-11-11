// The town office screen. Ida hands over a plan that has to add up; the
// player fills in the one number that makes it work. Nothing ever asks
// "solve 20 + 6x = 62".

import { officeJob } from '../office/job.js';
import { ORDER_MAX } from '../office/problems.js';
import { customerSvg } from './art.js';
import { h } from './dom.js';
import { numberPad } from './number-pad.js';

const IDA = { skin: '#f6d3b3', hair: '#b5432e', shirt: '#2f7f6b' };

// Things bought at a price each.
const EACH = [
  { title: 'Paint for the benches', unit: ['can', 'cans'], line: (each) => `A can of paint costs $${each}.` },
  { title: 'Flags for the parade', unit: ['flag', 'flags'], line: (each) => `A flag costs $${each}.` },
  { title: 'Bulbs for the streetlights', unit: ['bulb', 'bulbs'], line: (each) => `A new bulb costs $${each}.` },
  { title: 'Hanging baskets', unit: ['basket', 'baskets'], line: (each) => `A hanging basket costs $${each}.` },
  { title: 'Trophies for field day', unit: ['trophy', 'trophies'], line: (each) => `A trophy costs $${each}.` },
];

// Things bought at a price each, after a charge paid once.
const CHARGE = [
  {
    title: 'Chairs for the hall',
    unit: ['chair', 'chairs'],
    line: (fee, each) => `The hall costs $${fee} to open, plus $${each} for each chair set out.`,
  },
  {
    title: 'Posters for the fair',
    unit: ['poster', 'posters'],
    line: (fee, each) => `The printer charges $${fee} to set up, plus $${each} for each poster.`,
  },
  {
    title: 'The bus for the school trip',
    unit: ['seat', 'seats'],
    line: (fee, each) => `The bus costs $${fee} for the driver, plus $${each} for each seat.`,
  },
  {
    title: 'Tables for the market',
    unit: ['table', 'tables'],
    line: (fee, each) => `The tent costs $${fee} to put up, plus $${each} for each table.`,
  },
];

// Things sold to raise money, after a cost.
const EARN = [
  {
    title: 'The summer fair',
    unit: ['ticket', 'tickets'],
    cause: 'the park',
    line: (fee, each) => `The fair costs $${fee} to set up. Each ticket sold brings in $${each}.`,
  },
  {
    title: 'The bake sale',
    unit: ['cake', 'cakes'],
    cause: 'new library books',
    line: (fee, each) => `The ingredients cost $${fee}. Each cake sells for $${each}.`,
  },
  {
    title: 'The car wash',
    unit: ['car', 'cars'],
    cause: 'the playground',
    line: (fee, each) => `Soap and sponges cost $${fee}. Each car washed brings in $${each}.`,
  },
];

// Two offers to hire the same thing, each a charge plus a price each hour.
const MATCH = [
  { title: 'Hiring a digger', unit: ['hour', 'hours'], first: 'Hillside Hire', second: 'Valley Hire' },
  { title: 'Hiring a stage', unit: ['hour', 'hours'], first: 'Hillside Hire', second: 'Valley Hire' },
  { title: 'Hiring a generator', unit: ['hour', 'hours'], first: 'Hillside Hire', second: 'Valley Hire' },
];

// Tickets sold at two prices.
const MIX = [
  { title: 'The school play', unit: ['adult ticket', 'adult tickets'], event: 'the play' },
  { title: 'The town pool', unit: ['adult ticket', 'adult tickets'], event: 'the pool' },
  { title: 'The museum', unit: ['adult ticket', 'adult tickets'], event: 'the museum' },
];

const some = (n, unit) => `${n} ${n === 1 ? unit[0] : unit[1]}`;

/** The cost of each of two offers after `hours`. */
const costs = (p, hours) => [p.fee1 + p.each1 * hours, p.fee2 + p.each2 * hours];
/** The money from `dearer` tickets at the higher price and the rest at the lower. */
const takings = (p, dearer) => p.price1 * dearer + p.price2 * (p.tickets - dearer);

function docketLines(p, plan) {
  if (p.kind === 'match') {
    return [
      `${plan.first} charges $${p.fee1} to deliver, plus $${p.each1} for each hour.`,
      `${plan.second} charges $${p.fee2} to deliver, plus $${p.each2} for each hour.`,
      'Find the number of hours at which they cost the same.',
    ];
  }
  if (p.kind === 'mix') {
    return [
      `${p.tickets} tickets were sold for ${plan.event}.`,
      `Adult tickets cost $${p.price1}. Child tickets cost $${p.price2}.`,
      `The cash box has $${p.money}.`,
      'Work out how many adult tickets were sold.',
    ];
  }
  if (p.kind === 'earn') {
    return [
      plan.line(p.fee, p.each),
      `The town wants $${p.target} left over for ${plan.cause}.`,
      `Set the target: the fewest ${plan.unit[1]} that will do it.`,
    ];
  }
  return [
    p.fee > 0 ? plan.line(p.fee, p.each) : plan.line(p.each),
    `The budget is $${p.budget}.`,
    `Order as many ${plan.unit[1]} as the budget pays for.`,
  ];
}

/** What the number would mean for the town's money. Every line is simply true. */
function consequence(p, plan, answer) {
  if (p.kind === 'match') {
    const [first, second] = costs(p, answer);
    return [
      `At ${some(answer, plan.unit)}, ${plan.first} costs $${first}.`,
      `${plan.second} costs $${second}.`,
      first < second
        ? `${plan.first} is still $${second - first} cheaper.`
        : `${plan.second} is already $${first - second} cheaper.`,
    ];
  }
  if (p.kind === 'mix') {
    if (answer > p.tickets) {
      return [`You wrote ${answer} adult tickets.`, `Only ${p.tickets} tickets were sold in all.`, null];
    }
    const made = takings(p, answer);
    return [
      `With ${some(answer, plan.unit)}, there are ${p.tickets - answer} child tickets.`,
      `That makes $${p.price1 * answer} + $${p.price2 * (p.tickets - answer)} = $${made}.`,
      `The cash box has $${p.money}. That is $${Math.abs(made - p.money)} ${made > p.money ? 'too much' : 'too little'}.`,
    ];
  }
  const each = p.each * answer;
  if (p.kind === 'earn') {
    const left = each - p.fee;
    return [
      `You set a target of ${some(answer, plan.unit)}. At $${p.each} each, that brings in $${each}.`,
      left >= 0 ? `After the $${p.fee} cost, $${left} is left.` : `That does not cover the $${p.fee} cost.`,
      left < p.target
        ? `The town wants $${p.target}. That is $${p.target - Math.max(left, 0)} short.`
        : `The town wants $${p.target}. That is $${left - p.target} more than it needs, so a smaller target would do.`,
    ];
  }
  const cost = p.fee + each;
  return [
    p.fee > 0
      ? `You ordered ${some(answer, plan.unit)}. At $${p.each} each that is $${each}, plus the $${p.fee} charge.`
      : `You ordered ${some(answer, plan.unit)}, at $${p.each} each.`,
    `That costs $${cost}.`,
    cost > p.budget
      ? `The budget is $${p.budget}. That is $${cost - p.budget} over.`
      : `The budget is $${p.budget}. That leaves $${p.budget - cost}, enough for more.`,
  ];
}

/**
 * A strip diagram: two bars of the same length, showing how the money is
 * split. A narrow part is widened enough to hold its label.
 */
function stripsSvg(rows) {
  const left = 4;
  const width = 312;
  const body = rows
    .map((row, i) => {
      const y = i * 46 + 4;
      const total = row.reduce((sum, part) => sum + part.share, 0);
      const shares = row.map((part) => Math.max(part.share / total, row.length > 1 ? 0.3 : 1));
      const scale = shares.reduce((sum, s) => sum + s, 0);
      let x = left;
      return row
        .map((part, j) => {
          const w = (shares[j] / scale) * width;
          const out = `<rect x="${x}" y="${y}" width="${w}" height="34" class="strip strip-${part.kind}"/>
            <text x="${x + w / 2}" y="${y + 22}" text-anchor="middle" class="strip-label">${part.label}</text>`;
          x += w;
          return out;
        })
        .join('');
    })
    .join('');
  const label = rows.map((row) => row.map((part) => part.label).join(', then ')).join('. Below it: ');
  return `<svg class="strips" viewBox="0 0 320 ${rows.length * 46}" role="img" aria-label="${label}.">${body}</svg>`;
}

function strips(p, plan, tries) {
  const unit = plan.unit[1];
  if (p.kind === 'earn') {
    return [
      [{ share: 1, kind: 'ask', label: tries >= 2 ? `Sales must bring in $${p.target + p.fee}` : `Sales: ? ${unit} at $${p.each}` }],
      [
        { share: p.fee, kind: 'charge', label: `Cost $${p.fee}` },
        { share: p.target, kind: 'whole', label: `Left over $${p.target}` },
      ],
    ];
  }
  const rest = p.budget - p.fee;
  return [
    [{ share: 1, kind: 'whole', label: `Budget $${p.budget}` }],
    [
      ...(p.fee > 0 ? [{ share: p.fee, kind: 'charge', label: `Charge $${p.fee}` }] : []),
      { share: rest, kind: 'ask', label: tries >= 2 && p.fee > 0 ? `$${rest} for ${unit}` : `? ${unit} at $${p.each}` },
    ],
  ];
}

function answerLine(p, plan, right) {
  if (p.kind === 'match') {
    return `They start $${p.fee2 - p.fee1} apart, and the gap closes by $${p.each1 - p.each2} each hour. That takes ${some(right, plan.unit)}.`;
  }
  if (p.kind === 'mix') {
    const allChild = p.price2 * p.tickets;
    return `All child tickets would make $${allChild}. The cash box has $${p.money - allChild} more, at $${p.price1 - p.price2} extra for each adult ticket. That is ${some(right, plan.unit)}.`;
  }
  if (p.kind === 'earn') return `The sales must bring in $${p.target + p.fee}. That takes ${some(right, plan.unit)}.`;
  const rest = p.budget - p.fee;
  const over = rest - right * p.each;
  const start = p.fee > 0 ? `$${rest} is left after the charge. That` : `$${rest}`;
  return `${start} pays for ${some(right, plan.unit)}${over > 0 ? `, with $${over} left over` : ''}.`;
}

/** A table of the first few cases, to reason from. It grows on a second miss. */
function tableFor(p, plan, tries) {
  const columns = tries >= 2 ? [0, 1, 2] : [0, 1];
  if (p.kind === 'match') {
    const rows = [
      ['Hours', ...columns],
      [plan.first, ...columns.map((n) => `$${costs(p, n)[0]}`)],
      [plan.second, ...columns.map((n) => `$${costs(p, n)[1]}`)],
    ];
    if (tries >= 2) rows.push(['Apart', ...columns.map((n) => `$${costs(p, n)[1] - costs(p, n)[0]}`)]);
    return { caption: 'What each one costs:', rows, note: null };
  }
  return {
    caption: 'If only a few were adult tickets:',
    rows: [
      ['Adult tickets', ...columns],
      ['Child tickets', ...columns.map((n) => p.tickets - n)],
      ['Money', ...columns.map((n) => `$${takings(p, n)}`)],
    ],
    note: tries >= 2 ? `Each adult ticket in place of a child ticket adds $${p.price1 - p.price2}.` : null,
  };
}

/** The helping picture for a plan: a strip diagram, or a table of cases. */
function picture(p, plan, tries) {
  if (p.kind === 'match' || p.kind === 'mix') {
    const { caption, rows, note } = tableFor(p, plan, tries);
    return h(
      'figure',
      {},
      h('figcaption', {}, caption),
      h(
        'table',
        { class: 'trip-table' },
        rows.map(([heading, ...cells]) =>
          h('tr', {}, h('th', { scope: 'row' }, heading), cells.map((cell) => h('td', {}, String(cell)))),
        ),
      ),
      note && h('p', { class: 'mark-note' }, note),
    );
  }
  return h(
    'figure',
    {},
    h('figcaption', {}, 'How the money is split:'),
    h('div', { html: stripsSvg(strips(p, plan, tries)) }),
  );
}

/** The words before the blank on the order form. */
function formBefore(p) {
  if (p.kind === 'match') return 'They cost the same at';
  if (p.kind === 'mix') return 'There were';
  return p.kind === 'earn' ? 'Target:' : 'Order';
}

const PLANS = { earn: EARN, match: MATCH, mix: MIX };

export const officeView = {
  job: officeJob,
  boss: 'Ida',
  // Job titles, by the number of skills learned. Promotions are earned
  // only by learning; they cannot be bought and are never lost.
  ranks: [
    { at: 0, title: 'Intern' },
    { at: 1, title: 'Clerk' },
    { at: 2, title: 'Planner' },
    { at: 4, title: 'Budget Analyst' },
    { at: 6, title: 'Town Treasurer' },
  ],
  title: 'The town office',
  subject: 'Algebra',
  blurb: 'Make the town’s plans add up.',
  taskWord: 'Plan',
  trayClass: 'paper',
  labels: {
    tray: 'Town of Foothold: order form',
    submit: 'Sign it off',
    next: 'Next plan',
  },
  allLearnedLine: 'The town’s books have never been in better hands.',

  setUp(problem, rng) {
    const plans = PLANS[problem.kind] ?? (problem.fee > 0 ? CHARGE : EACH);
    return { plan: rng.pick(plans) };
  },

  scene(round) {
    const mood = round.done ? 'happy' : round.wrong.length > 0 ? 'puzzled' : 'neutral';
    const says = round.done ? 'That adds up.' : round.wrong.length > 0 ? 'Hmm. Let’s add it up.' : 'Here is the next plan.';
    const { plan } = round.extra;
    return [
      h('div', { class: 'customer' }, h('div', { html: customerSvg(IDA, mood) }), h('p', { class: 'bubble' }, says)),
      h(
        'div',
        { class: 'recipe' },
        h('h2', { class: 'recipe-name' }, plan.title),
        docketLines(round.problem, plan).map((line) => h('p', {}, line)),
      ),
    ];
  },

  control(round, api) {
    return numberPad(round, api, {
      max: ORDER_MAX,
      before: formBefore(round.problem),
      unit: round.extra.plan.unit,
    });
  },

  /** The picture a teacher can ask to be shown before the first try. */
  preview(round) {
    return picture(round.problem, round.extra.plan, 1);
  },

  check(round) {
    const { problem, result, hint } = round;
    const { plan } = round.extra;
    const tries = round.wrong.length;
    const [first, second, third] = consequence(problem, plan, result.answer);
    let note = hint;
    if (!note && result.slip) note = 'You are very close. It is off by just one.';
    return [
      h('p', {}, first),
      h('p', { class: 'equation' }, second),
      third && h('p', {}, third),
      note && h('p', { class: 'note' }, note),
      picture(problem, plan, tries),
      tries >= 3 && h('p', { class: 'answer' }, answerLine(problem, plan, result.expected)),
    ];
  },

  dayLine(day, tasks) {
    if (day.firstTry === tasks) return 'Every plan added up the first time.';
    if (day.firstTry >= tasks - 2) return 'A good day. We added up the tricky ones together.';
    return 'Some hard plans today. Adding them up is how you get better.';
  },
};
