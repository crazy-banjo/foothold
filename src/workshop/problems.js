// Measuring up in the workshop: the skills, in teaching order, and the
// situations for each. A situation is a shape and what it needs:
//
//   { skill, need: 'around' | 'inside', shape }
//
// 'around' is the length of edging to go all the way round (perimeter).
// 'inside' is the number of unit squares to cover it (area).
//
// Shapes, with every length a whole number of feet:
//   { type: 'rect', w, h }
//   { type: 'L', w, h, cw, ch }   a w × h rectangle with a cw × ch corner
//                                 cut away from the top right
//   { type: 'tri', w, h }         a right triangle, w along the bottom and
//                                 h high; w × h is always even

export const SKILLS = [
  {
    id: 'edging-rectangle',
    name: 'Edging a rectangle',
    about: 'The distance all the way round a rectangle, such as 4 feet by 3 feet.',
  },
  {
    id: 'tiling-rectangle',
    name: 'Tiling a rectangle',
    about: 'The number of square tiles that cover a rectangle, such as 4 feet by 3 feet.',
  },
  {
    id: 'edging-l-shape',
    name: 'Edging an L shape',
    about: 'The distance round an L shape, where two of the sides have no measurement written on them.',
  },
  {
    id: 'tiling-l-shape',
    name: 'Tiling an L shape',
    about: 'The number of square tiles that cover an L shape.',
  },
  {
    id: 'covering-triangle',
    name: 'Covering a triangle',
    about: 'The square feet inside a triangle with a square corner, such as 6 feet by 4 feet.',
  },
];

/** The most the cutting list accepts. */
export const CUT_MAX = 200;

function rectangle(rng) {
  const w = rng.int(3, 9);
  let h;
  do h = rng.int(2, 8);
  while (h === w);
  return { type: 'rect', w, h };
}

function lShape(rng) {
  const w = rng.int(4, 9);
  const h = rng.int(4, 8);
  return { type: 'L', w, h, cw: rng.int(1, w - 2), ch: rng.int(1, h - 2) };
}

function triangle(rng) {
  for (;;) {
    const w = rng.int(3, 10);
    const h = rng.int(2, 8);
    if ((w * h) % 2 === 0 && w !== h) return { type: 'tri', w, h };
  }
}

const GENERATORS = {
  'edging-rectangle': (rng) => ({ need: 'around', shape: rectangle(rng) }),
  'tiling-rectangle': (rng) => ({ need: 'inside', shape: rectangle(rng) }),
  'edging-l-shape': (rng) => ({ need: 'around', shape: lShape(rng) }),
  'tiling-l-shape': (rng) => ({ need: 'inside', shape: lShape(rng) }),
  'covering-triangle': (rng) => ({ need: 'inside', shape: triangle(rng) }),
};

export function generate(skillId, rng) {
  const make = GENERATORS[skillId];
  if (!make) throw new Error(`Unknown skill: ${skillId}`);
  return { skill: skillId, ...make(rng) };
}

/** The distance all the way round, in feet. Only for shapes with straight, square-cornered sides. */
export function around(shape) {
  // Cutting a corner out of a rectangle moves two sides inward without
  // changing the distance round.
  return 2 * (shape.w + shape.h);
}

/** The space inside, in square feet. */
export function inside(shape) {
  if (shape.type === 'L') return shape.w * shape.h - shape.cw * shape.ch;
  if (shape.type === 'tri') return (shape.w * shape.h) / 2;
  return shape.w * shape.h;
}

export function expected(problem) {
  return problem.need === 'around' ? around(problem.shape) : inside(problem.shape);
}

export function problemKey({ skill, shape }) {
  return [skill, shape.w, shape.h, shape.cw ?? '', shape.ch ?? ''].join(':');
}
