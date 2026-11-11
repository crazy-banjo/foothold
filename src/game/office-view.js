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
  { title: 'Paint for the benches', unit: ['tin', 'tins'], line: (each) => `A tin of paint costs $${each}.` },
  { title: 'Flags for the parade', unit: ['flag', 'flags'], line: (each) => `A flag costs $${each}.` },
  { title: 'Bulbs for the street lamps', unit: ['bulb', 'bulbs'], line: (each) => `A new bulb costs $${each}.` },
  { title: 'Hanging baskets', unit: ['basket', 'baskets'], line: (each) => `A hanging basket costs $${each}.` },
  { title: 'Trophies for sports day', unit: ['trophy', 'trophies'], line: (each) => `A trophy costs $${each}.` },
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
    line: (fee, each) => `The marquee costs $${fee} to put up, plus $${each} for each table.`,
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

const some = (n, unit) => `${n} ${n === 1 ? unit[0] : unit[1]}`;

function docketLines(p, plan) {
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
  if (p.kind === 'earn') return `The sales must bring in $${p.target + p.fee}. That takes ${some(right, plan.unit)}.`;
  const rest = p.budget - p.fee;
  const over = rest - right * p.each;
  const start = p.fee > 0 ? `$${rest} is left after the charge. That` : `$${rest}`;
  return `${start} pays for ${some(right, plan.unit)}${over > 0 ? `, with $${over} left over` : ''}.`;
}

export const officeView = {
  job: officeJob,
  boss: 'Ida',
  // Job titles, by the number of skills learned. Promotions are earned
  // only by learning; they cannot be bought and are never lost.
  ranks: [
    { at: 0, title: 'Office Junior' },
    { at: 1, title: 'Clerk' },
    { at: 2, title: 'Planner' },
    { at: 3, title: 'Budget Officer' },
    { at: 4, title: 'Town Treasurer' },
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
    const plans = problem.kind === 'earn' ? EARN : problem.fee > 0 ? CHARGE : EACH;
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
      before: round.problem.kind === 'earn' ? 'Target:' : 'Order',
      unit: round.extra.plan.unit,
    });
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
      h('p', {}, third),
      note && h('p', { class: 'note' }, note),
      h(
        'figure',
        {},
        h('figcaption', {}, 'How the money is split:'),
        h('div', { html: stripsSvg(strips(problem, plan, tries)) }),
      ),
      tries >= 3 && h('p', { class: 'answer' }, answerLine(problem, plan, result.expected)),
    ];
  },

  dayLine(day, tasks) {
    if (day.firstTry === tasks) return 'Every plan added up the first time.';
    if (day.firstTry >= tasks - 2) return 'A good day. We added up the tricky ones together.';
    return 'Some hard plans today. Adding them up is how you get better.';
  },
};
