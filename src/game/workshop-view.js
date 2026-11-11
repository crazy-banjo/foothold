// The workshop screen. Bea shows a drawing of something that needs edging
// or covering; the player writes the amount on the cutting list. Nothing
// ever asks "find the perimeter".

import { workshopJob } from '../workshop/job.js';
import { CUT_MAX, around, inside } from '../workshop/problems.js';
import { customerSvg } from './art.js';
import { h } from './dom.js';
import { numberPad } from './number-pad.js';

const BEA = { skin: '#6f4428', hair: '#2b1d16', shirt: '#c2553f' };

const THINGS = {
  'around-rect': ['A table top', 'A bulletin board', 'A garden bed', 'A sandbox'],
  'inside-rect': ['A porch floor', 'A shed floor', 'A hallway floor', 'A bathroom floor'],
  'around-L': ['An L-shaped countertop', 'An L-shaped garden bed'],
  'inside-L': ['An L-shaped kitchen floor', 'An L-shaped porch floor'],
  'inside-tri': ['The end of a shed roof', 'The side of a ramp'],
};

// ---------------------------------------------------------------- drawing

function describe(shape) {
  if (shape.type === 'rect') return `A rectangle ${shape.w} feet wide and ${shape.h} feet deep.`;
  if (shape.type === 'tri') {
    return `A triangle with a square corner, ${shape.w} feet along the bottom and ${shape.h} feet high.`;
  }
  const { w, h: high, cw, ch } = shape;
  return `An L shape: ${w} feet along the bottom, ${high} feet up the left side, ${w - cw} feet along the top, and ${high - ch} feet up the right side. A corner is cut away at the top right.`;
}

/**
 * Draw a shape to scale with its measurements.
 *   edge   draw the outline heavily (for the distance round)
 *   fill   tint the inside (for the space inside)
 *   grid   show the one-foot squares
 *   all    label every side, including those with no measurement written
 *   ghost  for a triangle, show the rectangle it is half of
 */
function shapeSvg(shape, { edge = false, fill = false, grid = false, all = false, ghost = false } = {}) {
  const { w, h: high } = shape;
  const unit = Math.min(210 / w, 132 / high, 30);
  const ox = (320 - w * unit) / 2;
  const oy = 24;
  const px = (x) => ox + x * unit;
  const py = (y) => oy + y * unit;
  const height = oy + high * unit + 30;

  let corners;
  if (shape.type === 'rect') corners = [[0, 0], [w, 0], [w, high], [0, high]];
  else if (shape.type === 'tri') corners = [[0, 0], [0, high], [w, high]];
  else {
    const { cw, ch } = shape;
    corners = [[0, 0], [w - cw, 0], [w - cw, ch], [w, ch], [w, high], [0, high]];
  }
  const outline = corners.map(([x, y]) => `${px(x)},${py(y)}`).join(' ');

  const label = (x, y, text, anchor = 'middle', found = false) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" class="shape-label${found ? ' found' : ''}">${text}</text>`;
  const labels = [
    label(px(w / 2), py(high) + 18, `${w} ft`),
    label(px(0) - 8, py(high / 2) + 4, `${high} ft`, 'end'),
  ];
  if (shape.type === 'rect' && all) {
    labels.push(label(px(w / 2), py(0) - 7, `${w} ft`, 'middle', true));
    labels.push(label(px(w) + 8, py(high / 2) + 4, `${high} ft`, 'start', true));
  }
  if (shape.type === 'L') {
    const { cw, ch } = shape;
    labels.push(label(px((w - cw) / 2), py(0) - 7, `${w - cw} ft`));
    labels.push(label(px(w) + 8, py(ch + (high - ch) / 2) + 4, `${high - ch} ft`, 'start'));
    if (all) {
      // The two sides of the cut-away corner, worked out from the others.
      // Both labels sit inside the shape, so they cannot run into each
      // other however small the corner is.
      labels.push(label(px(w - cw) - 8, py(ch / 2) + 4, `${ch} ft`, 'end', true));
      labels.push(label(px(w - cw / 2), py(ch) + 16, `${cw} ft`, 'middle', true));
    }
  }

  let lines = '';
  if (grid) {
    for (let x = 1; x < w; x++) lines += `<line x1="${px(x)}" y1="${py(0)}" x2="${px(x)}" y2="${py(high)}"/>`;
    for (let y = 1; y < high; y++) lines += `<line x1="${px(0)}" y1="${py(y)}" x2="${px(w)}" y2="${py(y)}"/>`;
  }
  const id = `shape-${shape.type}-${w}-${high}-${grid ? 'g' : 'p'}`;
  return `<svg class="shape" viewBox="0 0 320 ${height}" role="img" aria-label="${describe(shape)}">
    <defs><clipPath id="${id}"><polygon points="${outline}"/></clipPath></defs>
    ${ghost ? `<rect x="${px(0)}" y="${py(0)}" width="${w * unit}" height="${high * unit}" class="shape-ghost"/>` : ''}
    <polygon points="${outline}" class="shape-body${fill ? ' filled' : ''}"/>
    ${ghost && grid ? `<g class="shape-grid faint">${lines}</g>` : ''}
    <g class="shape-grid" clip-path="url(#${id})">${lines}</g>
    <polygon points="${outline}" class="shape-outline${edge ? ' heavy' : ''}"/>
    ${shape.type === 'tri' ? `<path d="M${px(0)} ${py(high) - 10}h10v10" class="shape-corner"/>` : ''}
    ${labels.join('')}
  </svg>`;
}

// ------------------------------------------------------------------ words

const kindOf = (p) => `${p.need}-${p.shape.type}`;

function taskLines(p) {
  if (p.need === 'around') return ['It needs edging all the way round.'];
  if (p.shape.type === 'tri') return ['One corner is square.', 'It will be covered in felt, sold by the square foot.'];
  return ['It needs tiles. Each tile is 1 foot square.'];
}

function formLine(p) {
  if (p.need === 'around') return { before: 'Cut', unit: ['foot of edging', 'feet of edging'] };
  if (p.shape.type === 'tri') return { before: 'Order', unit: ['square foot of felt', 'square feet of felt'] };
  return { before: 'Lay out', unit: ['tile', 'tiles'] };
}

/** What the number would mean in the workshop. Every line is simply true. */
function consequence(p, answer) {
  const { shape } = p;
  if (p.need === 'around') {
    return [
      `You cut ${answer} ${answer === 1 ? 'foot' : 'feet'} of edging.`,
      answer < around(shape) ? 'That is not enough to go all the way round.' : 'That goes all the way round, with some left over.',
    ];
  }
  const needed = inside(shape);
  if (shape.type === 'tri') {
    return [
      `You ordered ${answer} square ${answer === 1 ? 'foot' : 'feet'} of felt.`,
      answer < needed ? 'That is not enough to cover it.' : 'That is more than it takes to cover it.',
    ];
  }
  if (shape.type === 'L') {
    return [
      `You laid out ${answer} ${answer === 1 ? 'tile' : 'tiles'}.`,
      answer < needed ? 'That is not enough to cover the floor.' : 'That is more than the floor needs.',
    ];
  }
  const rows = Math.floor(answer / shape.w);
  const over = answer % shape.w;
  return [
    `You laid out ${answer} ${answer === 1 ? 'tile' : 'tiles'}.`,
    `In rows of ${shape.w}, that makes ${rows} full ${rows === 1 ? 'row' : 'rows'}${over ? `, with ${over} over` : ''}.`,
    `The floor is ${shape.h} feet from front to back. ${answer < needed ? 'Some of it would be bare.' : 'Some tiles would be left over.'}`,
  ];
}

function answerLine(p, right) {
  const { w, h: high, cw, ch } = p.shape;
  if (p.need === 'around') {
    return p.shape.type === 'L'
      ? `Going round: ${w} + ${high - ch} + ${cw} + ${ch} + ${w - cw} + ${high} = ${right} feet.`
      : `Going round: ${w} + ${high} + ${w} + ${high} = ${right} feet.`;
  }
  if (p.shape.type === 'tri') return `Half of ${w} × ${high} is ${right} square feet.`;
  if (p.shape.type === 'L') {
    const lower = w * (high - ch);
    const upper = (w - cw) * ch;
    return `The lower part is ${w} × ${high - ch} = ${lower}. The upper part is ${w - cw} × ${ch} = ${upper}. Together that is ${right} tiles.`;
  }
  return `${high} rows of ${w} is ${right} tiles.`;
}

// ------------------------------------------------------------------- view

export const workshopView = {
  job: workshopJob,
  boss: 'Bea',
  // Job titles, by the number of skills learned. Promotions are earned
  // only by learning; they cannot be bought and are never lost.
  ranks: [
    { at: 0, title: 'Workshop Helper' },
    { at: 1, title: 'Apprentice' },
    { at: 2, title: 'Carpenter' },
    { at: 4, title: 'Lead Carpenter' },
    { at: 5, title: 'Master Carpenter' },
  ],
  title: 'The workshop',
  subject: 'Geometry',
  blurb: 'Measure up, then cut and cover.',
  taskWord: 'Job',
  trayClass: 'paper',
  labels: {
    tray: 'Cutting list',
    submit: 'Hand it to Bea',
    next: 'Next job',
  },
  allLearnedLine: 'Measure twice, cut once. You have that down now.',

  setUp(problem, rng) {
    return { thing: rng.pick(THINGS[kindOf(problem)]) };
  },

  scene(round) {
    const { problem } = round;
    const mood = round.done ? 'happy' : round.wrong.length > 0 ? 'puzzled' : 'neutral';
    const says = round.done ? 'A good fit.' : round.wrong.length > 0 ? 'Let’s measure again.' : 'Here is the drawing.';
    return [
      h('div', { class: 'customer' }, h('div', { html: customerSvg(BEA, mood) }), h('p', { class: 'bubble' }, says)),
      h(
        'div',
        { class: 'recipe' },
        h('h2', { class: 'recipe-name' }, round.extra.thing),
        h('div', { html: shapeSvg(problem.shape) }),
        taskLines(problem).map((line) => h('p', {}, line)),
      ),
    ];
  },

  control(round, api) {
    return numberPad(round, api, { max: CUT_MAX, ...formLine(round.problem) });
  },

  check(round) {
    const { problem, result, hint } = round;
    const tries = round.wrong.length;
    const lines = consequence(problem, result.answer);
    const isAround = problem.need === 'around';
    let note = hint;
    if (!note && result.slip) note = 'You are very close. It is off by just one.';
    // The drawing gives more away with each further try.
    const drawing = isAround
      ? shapeSvg(problem.shape, { edge: true, all: tries >= 2 })
      : shapeSvg(problem.shape, { fill: true, grid: tries >= 2, ghost: tries >= 2 && problem.shape.type === 'tri' });
    const caption = isAround
      ? tries >= 2
        ? 'Every edge, with its length:'
        : 'The edging runs along every edge:'
      : tries >= 2
        ? 'Each small square is 1 foot by 1 foot:'
        : 'What has to be covered:';
    return [
      h('p', {}, lines[0]),
      h('p', { class: 'equation' }, lines[1]),
      lines[2] && h('p', {}, lines[2]),
      note && h('p', { class: 'note' }, note),
      h('figure', {}, h('figcaption', {}, caption), h('div', { html: drawing })),
      tries >= 3 && h('p', { class: 'answer' }, answerLine(problem, result.expected)),
    ];
  },

  dayLine(day, tasks) {
    if (day.firstTry === tasks) return 'Every piece fitted the first time. Nothing wasted.';
    if (day.firstTry >= tasks - 2) return 'A good day. We measured the tricky ones again together.';
    return 'Some hard shapes today. Measuring again is how you get better.';
  },
};
