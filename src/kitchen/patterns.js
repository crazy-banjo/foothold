// Mistake patterns for measuring with fractions.
//
// Each `predict` returns the amount (in twenty-fourths of a cup) that
// someone thinking this way would scoop, or null when the pattern doesn't
// apply. Most of these come from treating the top and bottom of a fraction
// as two separate whole numbers, which is the best-documented source of
// fraction errors (often called whole-number bias).

import { CUP, show, showCups, toUnits } from './fractions.js';

const oneScoop = (p) => p.scoops.length === 1;
const scoopBottom = (p) => CUP / p.scoops[0];
const isCount = (p) => p.skill === 'count-scoops';
const isOther = (p) => p.skill === 'other-scoop';
const isTopUp = (p) => p.have !== null;
const isMore = (p) => p.batches !== null && p.batches >= 2;
const isHalf = (p) => p.batches === 0.5;

export const PATTERNS = [
  {
    id: 'counts-bottom',
    name: 'Counts the bottom number',
    about:
      'Uses as many scoops as the bottom number, which always fills exactly one cup. Example: four quarter-cup scoops for 3/4 cup.',
    predict: (p) => (oneScoop(p) && (isCount(p) || isOther(p)) ? CUP : null),
    hint: (p) => {
      const d = scoopBottom(p);
      const side = toUnits(p.need) < CUP ? 'less' : 'more';
      return `${d} of the {1/${d}} cup scoops fill one whole cup. The recipe needs ${showCups(p.need)}, which is ${side} than that.`;
    },
  },
  {
    id: 'one-scoop',
    name: 'Uses a single scoop',
    about:
      'Treats the fraction as the name of the scoop and uses it once. Example: one quarter-cup scoop for 3/4 cup.',
    predict: (p) => (isCount(p) && p.need.n < p.need.d ? p.scoops[0] : null),
    hint: (p) =>
      `One scoop is {1/${p.need.d}} cup. The top number in ${show(p.need)} says how many of those scoops are needed.`,
  },
  {
    id: 'keeps-top-number',
    name: 'Keeps the top number when the scoop changes',
    about:
      'Uses the top number of the amount as the count of scoops, whatever size the scoop is. Example: one eighth-cup scoop for 1/4 cup.',
    predict: (p) => (isOther(p) ? p.need.n * p.scoops[0] : null),
    hint: (p) => {
      const d = scoopBottom(p);
      if (p.need.d === 1) {
        return `This scoop holds only {1/${d}} cup. It takes several of them to fill a whole cup.`;
      }
      return `This scoop holds {1/${d}} cup. That is smaller than {1/${p.need.d}} cup, so it takes more scoops than the top number says.`;
    },
  },
  {
    id: 'adds-to-top-and-bottom',
    name: 'Adds the same number to top and bottom',
    about:
      'Changes a fraction to a new bottom number by adding to both parts. Example: 1/2 becomes 3/4, so three quarter-cup scoops for 1/2 cup.',
    predict: (p) => (isOther(p) && p.need.d > 1 ? (p.need.n + scoopBottom(p) - p.need.d) * p.scoops[0] : null),
    hint: (p) =>
      `Adding the same number to the top and the bottom changes the amount. Ask how many {1/${scoopBottom(p)}} cup scoops fit into {1/${p.need.d}} cup.`,
  },
  {
    id: 'ignores-what-is-there',
    name: 'Ignores what is already in the bowl',
    about: 'Adds the full amount instead of the rest. Example: adds 3/4 cup when 1/4 cup is already there.',
    predict: (p) => (isTopUp(p) ? toUnits(p.need) : null),
    hint: (p) =>
      `The recipe needs ${showCups(p.need)} in total. The bowl already had ${showCups(p.have)} in it, so only the rest is needed.`,
  },
  {
    id: 'subtracts-top-and-bottom',
    name: 'Subtracts tops and bottoms separately',
    about: 'Subtracts the top numbers and the bottom numbers. Example: 3/4 − 1/2 = 2/2.',
    predict: ({ need, have }) =>
      have && need.d > have.d && need.n > have.n ? ((need.n - have.n) * CUP) / (need.d - have.d) : null,
    hint: ({ need, have }) =>
      `Taking the tops apart and the bottoms apart does not work here, because {1/${need.d}} cup and {1/${have.d}} cup are different sizes. Think of both amounts in the same size of scoop first.`,
  },
  {
    id: 'subtracts-tops-only',
    name: 'Subtracts the tops across different sizes',
    about: 'Subtracts the top numbers without making the bottom numbers the same. Example: 3/4 − 1/2 = 2/4.',
    predict: ({ need, have }) =>
      have && need.d !== have.d && need.n > have.n
        ? ((need.n - have.n) * CUP) / Math.max(need.d, have.d)
        : null,
    hint: ({ need, have }) =>
      `The ${need.n} in ${show(need)} counts {1/${need.d}} cups, and the ${have.n} in ${show(have)} counts {1/${have.d}} cups. Those are different sizes, so think of both amounts in the same size of scoop first.`,
  },
  {
    id: 'amount-unchanged',
    name: 'Leaves the amount as it is',
    about:
      'Measures the amount for one batch, or multiplies top and bottom by the same number, which gives the same amount. Example: 6/8 cup for two batches of 3/4 cup.',
    predict: (p) => (isMore(p) || isHalf(p) ? toUnits(p.need) : null),
    hint: (p) =>
      isHalf(p)
        ? 'That is the amount for a whole batch. Half a batch needs half as much.'
        : `That is the amount for one batch. ${p.batches} batches need ${p.batches} times as much.`,
  },
  {
    id: 'multiplies-bottom',
    name: 'Multiplies the bottom number',
    about: 'Multiplies the bottom number by the number of batches. Example: two batches of 1/2 cup = 1/4 cup.',
    predict: (p) => (isMore(p) ? (p.need.n * CUP) / (p.need.d * p.batches) : null),
    hint: (p) =>
      `A bigger bottom number means smaller pieces, so that is less than one batch. ${p.batches} batches need more than one batch.`,
  },
  {
    id: 'adds-batches',
    name: 'Adds instead of multiplying',
    about: 'Adds the number of batches to the top number. Example: two batches of 3/8 cup = 5/8 cup.',
    predict: (p) => (isMore(p) ? ((p.need.n + p.batches) * CUP) / p.need.d : null),
    hint: (p) =>
      `Each batch needs ${showCups(p.need)}. ${p.batches} batches means that amount ${p.batches} times over.`,
  },
  {
    id: 'halves-bottom',
    name: 'Halves the bottom number',
    about: 'Halves the bottom number to find half of an amount. Example: half of 1/4 cup = 1/2 cup.',
    predict: (p) => (isHalf(p) && p.need.d % 2 === 0 ? (p.need.n * CUP) / (p.need.d / 2) : null),
    hint: () =>
      'Halving the bottom number makes each piece bigger, so that is more than a whole batch. Half a batch must be less.',
  },
];
