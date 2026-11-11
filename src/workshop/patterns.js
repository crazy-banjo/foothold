// Mistake patterns for measuring shapes.
//
// The best-documented one is mixing up the distance round a shape with the
// space inside it. The others are using only some of the sides, missing
// the sides with no measurement written on them, and mishandling shapes
// that are not plain rectangles.
//
// Each `predict` returns the number someone thinking this way would enter,
// or null when the pattern doesn't apply.

import { around, inside } from './problems.js';

const is = (p, type) => p.shape.type === type;
const wantsAround = (p) => p.need === 'around';
const wantsInside = (p) => p.need === 'inside';

export const PATTERNS = [
  {
    id: 'inside-for-around',
    name: 'Gives the space inside for the distance round',
    about: 'Works out the area when the edge is needed. Example: 12 feet of edging for a 4 by 3 table.',
    predict: (p) => (wantsAround(p) ? inside(p.shape) : null),
    hint: () => 'Edging goes round the outside. That number counts the squares inside instead.',
  },
  {
    id: 'around-for-inside',
    name: 'Gives the distance round for the space inside',
    about: 'Works out the perimeter when the area is needed. Example: 14 tiles for a 4 by 3 floor.',
    predict: (p) => (wantsInside(p) && !is(p, 'tri') ? around(p.shape) : null),
    hint: () => 'Tiles fill the inside. That number is the distance round the outside instead.',
  },
  {
    id: 'adds-two-sides',
    name: 'Adds just two sides',
    about: 'Adds the two measurements and stops. Example: 4 + 3 = 7 for a 4 by 3 rectangle.',
    predict: (p) => (is(p, 'L') ? null : p.shape.w + p.shape.h),
    hint: ({ need, shape }) => {
      if (need === 'around') {
        return `${shape.w} + ${shape.h} is only two of the edges. There is an edge opposite each of them too.`;
      }
      if (shape.type === 'tri') return 'Adding the two sides gives a length. The space inside is not a length.';
      return `Adding ${shape.w} and ${shape.h} gives a length. Tiles go in rows: ${shape.w} in each row, and ${shape.h} rows.`;
    },
  },
  {
    id: 'written-sides-only',
    name: 'Adds only the sides with a measurement',
    about: 'Leaves out the two sides of an L shape that have no measurement written on them.',
    predict: (p) => (wantsAround(p) && is(p, 'L') ? around(p.shape) - p.shape.cw - p.shape.ch : null),
    hint: () =>
      'Two of the edges have no number written on them. They still need edging. Work out how long they are from the sides opposite them.',
  },
  {
    id: 'whole-rectangle',
    name: 'Ignores the cut-away corner',
    about: 'Multiplies the two longest sides of an L shape, as if the corner were still there.',
    predict: (p) => (wantsInside(p) && is(p, 'L') ? p.shape.w * p.shape.h : null),
    hint: ({ shape }) =>
      `That would cover a full ${shape.w} by ${shape.h} rectangle. The corner that is cut away needs no tiles.`,
  },
  {
    id: 'counts-overlap-twice',
    name: 'Counts the overlap twice',
    about: 'Splits an L shape into two rectangles that overlap, and adds both.',
    predict: (p) =>
      wantsInside(p) && is(p, 'L')
        ? p.shape.w * (p.shape.h - p.shape.ch) + (p.shape.w - p.shape.cw) * p.shape.h
        : null,
    hint: () =>
      'Those two rectangles overlap, so part of the floor was counted twice. Split the shape into pieces that do not overlap.',
  },
  {
    id: 'forgets-half',
    name: 'Forgets to halve the triangle',
    about: 'Multiplies the two sides of a triangle without halving. Example: 6 × 4 = 24 instead of 12.',
    predict: (p) => (is(p, 'tri') ? p.shape.w * p.shape.h : null),
    hint: ({ shape }) =>
      `${shape.w} × ${shape.h} would cover a whole rectangle. The triangle is half of that rectangle.`,
  },
];
