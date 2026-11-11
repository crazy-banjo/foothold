// Mistake patterns for making change.
//
// Each pattern is a small model of one wrong way of thinking. Given a
// situation, `predict` returns the amount a person would hand back if they
// were thinking that way, or null when the pattern doesn't apply.
//
// The column patterns follow the subtraction "bugs" catalogued by Brown and
// Burton (1978) and VanLehn (1990), applied to dollars, dimes and pennies.

import { formatMoney } from './money.js';

// Amounts as four columns: [tens of dollars, dollars, dimes, pennies].
const toColumns = (cents) => [
  Math.floor(cents / 1000) % 10,
  Math.floor(cents / 100) % 10,
  Math.floor(cents / 10) % 10,
  cents % 10,
];
const fromColumns = (c) => c[0] * 1000 + c[1] * 100 + c[2] * 10 + c[3];

const dollars = (cents) => Math.floor(cents / 100);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function smallerFromLarger({ price, paid }) {
  const t = toColumns(paid);
  const p = toColumns(price);
  return fromColumns(t.map((digit, i) => Math.abs(digit - p[i])));
}

function regroupWithoutReducing({ price, paid }) {
  const t = toColumns(paid);
  const p = toColumns(price);
  // Adds ten whenever a column is short, but never takes one from the
  // column it was borrowed from.
  return fromColumns(t.map((digit, i) => (digit - p[i] + 10) % 10));
}

function zeroStaysTen({ price, paid }) {
  const t = toColumns(paid);
  const p = toColumns(price);
  const out = [0, 0, 0, 0];
  let borrow = 0;
  for (let i = 3; i >= 0; i--) {
    let digit;
    if (borrow && t[i] === 0) {
      // A zero that was regrouped through should be worth 9. Here it is
      // treated as a full 10.
      digit = 10 - p[i];
      if (digit === 10) return null;
      borrow = 1;
    } else {
      digit = t[i] - borrow - p[i];
      borrow = 0;
      if (digit < 0) {
        digit += 10;
        borrow = 1;
      }
    }
    out[i] = digit;
  }
  return borrow ? null : fromColumns(out);
}

export const PATTERNS = [
  {
    id: 'regroup-without-reducing',
    name: 'Breaks a dollar but still counts it',
    about:
      'Breaks a dollar (or a dime) into smaller coins to subtract, but does not reduce the place it came from. Example: $5.00 − $2.40 = $3.60.',
    predict: regroupWithoutReducing,
    hint: ({ price, paid }) => {
      const cents = price % 100;
      const have = dollars(paid);
      if (paid % 100 !== 0) {
        return 'When a dollar is broken into coins, it is used up. It can’t be counted again as a whole dollar.';
      }
      if (cents === 0) {
        return 'A ten-dollar bill has to be broken into ones here. Once it is broken, it can’t be counted again as a ten.';
      }
      if (have === 1) {
        return `To take out the ${formatMoney(cents)}, the dollar has to be broken into coins. Once it is broken, there is no whole dollar left.`;
      }
      return `To take out the ${formatMoney(cents)}, one of the ${have} dollars has to be broken into coins. That leaves ${plural(have - 1, 'whole dollar')}, not ${have}.`;
    },
  },
  {
    id: 'zero-stays-ten',
    name: 'Regrouping across a zero',
    about:
      'When regrouping through a zero, treats that place as 10 instead of 9. Example: $5.00 − $2.37 = $2.73.',
    predict: zeroStaysTen,
    hint: () =>
      'A dollar breaks into 10 dimes. Then one of those dimes gets broken into 10 pennies, so only 9 dimes are left.',
  },
  {
    id: 'smaller-from-larger',
    name: 'Takes the smaller digit from the larger',
    about:
      'In each place, subtracts the smaller digit from the larger one, whichever amount it belongs to. Example: $5.00 − $2.40 = $3.40.',
    predict: smallerFromLarger,
    hint: ({ price, paid }) => {
      const cents = price % 100;
      if (paid % 100 === 0 && cents !== 0) {
        return `The price has ${formatMoney(cents)} in it, and ${formatMoney(paid)} has no loose cents. The ${formatMoney(cents)} still has to come out of the customer’s money, so a dollar must be broken into coins first.`;
      }
      return 'Every part of the price has to come out of the customer’s money. When one place doesn’t have enough, break a bigger bill or coin first.';
    },
  },
  {
    id: 'price-back',
    name: 'Hands back the price',
    about: 'Gives the price of the item as the change. Example: $2.40 back from $5.00 for a $2.40 item.',
    predict: ({ price }) => price,
    hint: ({ price, paid }) =>
      `${formatMoney(price)} is what the customer is buying. The change is what is left of their ${formatMoney(paid)} after the price comes out.`,
  },
  {
    id: 'ignores-price-cents',
    name: 'Ignores the cents in the price',
    about: 'Subtracts only the whole dollars of the price. Example: $5.00 − $2.40 = $3.00.',
    predict: ({ price, paid }) =>
      paid % 100 === 0 && price % 100 !== 0 && price >= 100 ? paid - dollars(price) * 100 : null,
    hint: ({ price }) =>
      `That would be right if the price were ${formatMoney(dollars(price) * 100)}. The other ${formatMoney(price % 100)} has to come out too.`,
  },
  {
    id: 'stops-at-dollars',
    name: 'Leaves out the cents',
    about: 'Gives the whole dollars of the change but not the cents. Example: $2.00 instead of $2.60.',
    predict: ({ price, paid }) => {
      const change = paid - price;
      return change % 100 !== 0 ? dollars(change) * 100 : null;
    },
    hint: ({ price }) =>
      `The dollars are right. There are also some cents between ${formatMoney(price)} and the next whole dollar.`,
  },
  {
    id: 'stops-at-next-dollar',
    name: 'Leaves out the dollars',
    about: 'Gives the cents up to the next dollar but not the dollars. Example: 60¢ instead of $2.60.',
    predict: ({ price, paid }) => {
      const change = paid - price;
      return change >= 100 ? change % 100 : null;
    },
    hint: ({ price, paid }, answer) =>
      `${formatMoney(answer)} gets the customer up to ${formatMoney(price + answer)}. They paid ${formatMoney(paid)}, so there is more to hand back.`,
  },
];
