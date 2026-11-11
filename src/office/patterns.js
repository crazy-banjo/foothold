// Mistake patterns for planning with a charge and a price each.
//
// These are the common ways of going wrong with "b + a × n = c": undoing
// the steps in the wrong order, undoing one with the wrong operation,
// stopping after one step, and joining the charge and the price into one
// number (often called conjoining).
//
// Each `predict` returns the number someone thinking this way would order,
// or null when the pattern doesn't apply. A result that is not a whole
// number is dropped by the engine, because it cannot be ordered.

const withCharge = (p) => p.kind === 'buy' && p.fee > 0;
const earns = (p) => p.kind === 'earn';
const exact = (p) => (p.budget - p.fee) % p.each === 0;
const matches = (p) => p.kind === 'match';
const mixes = (p) => p.kind === 'mix';
/** How far apart two offers start, and how fast that gap closes. */
const gap = (p) => p.fee2 - p.fee1;
const closes = (p) => p.each1 - p.each2;

export const PATTERNS = [
  {
    id: 'ignores-charge',
    name: 'Leaves out the charge',
    about: 'Divides the whole budget by the price each. Example: $20 plus $6 each from $62: 62 ÷ 6.',
    predict: (p) => (withCharge(p) ? Math.floor(p.budget / p.each) : null),
    hint: (p) =>
      `The $${p.fee} charge has to be paid before anything else. Only what is left of the $${p.budget} pays for the rest.`,
  },
  {
    id: 'stops-after-charge',
    name: 'Stops after taking off the charge',
    about: 'Takes the charge off the budget and uses that as the number. Example: 62 − 20 = 42.',
    predict: (p) => (withCharge(p) ? p.budget - p.fee : null),
    hint: (p) =>
      `$${p.budget - p.fee} is the money left after the charge. Each one costs $${p.each}, so that money pays for fewer than ${p.budget - p.fee}.`,
  },
  {
    id: 'divides-first',
    name: 'Divides before taking off the charge',
    about: 'Undoes the steps in the wrong order. Example: $6 plus $2 each from $26: 26 ÷ 2 − 6 = 7.',
    predict: (p) => (withCharge(p) && exact(p) ? p.budget / p.each - p.fee : null),
    hint: (p) =>
      `The $${p.fee} charge is in dollars. Take it off the $${p.budget} first, then see how many the rest pays for.`,
  },
  {
    id: 'adds-charge',
    name: 'Adds the charge to the budget',
    about: 'Adds the charge instead of taking it off. Example: $6 plus $2 each from $26: (26 + 6) ÷ 2 = 16.',
    predict: (p) => (withCharge(p) && exact(p) ? (p.budget + p.fee) / p.each : null),
    hint: (p) => `The $${p.fee} charge uses up part of the budget. It comes off the $${p.budget}; it is not added to it.`,
  },
  {
    id: 'joins-charge-and-price',
    name: 'Joins the charge and the price',
    about: 'Adds the charge and the price each into one price. Example: $4 plus $2 each from $36: 36 ÷ 6.',
    predict: (p) => (withCharge(p) ? p.budget / (p.each + p.fee) : null),
    hint: (p) =>
      `The $${p.fee} is paid once. Only the $${p.each} is paid again for each one, so the two cannot be added into one price.`,
  },
  {
    id: 'rounds-up',
    name: 'Rounds up past the budget',
    about: 'Orders one more than the budget pays for when money is left over.',
    predict: (p) => (p.kind === 'buy' && !exact(p) ? Math.floor((p.budget - p.fee) / p.each) + 1 : null),
    hint: (p) =>
      `One more would cost another $${p.each}, and there is less than that left. Money left over stays left over.`,
  },
  {
    id: 'takes-cost-off-target',
    name: 'Takes the cost off the target',
    about:
      'Subtracts the set-up cost instead of adding it. Example: $2 each after $30 costs, to leave $50: (50 − 30) ÷ 2.',
    predict: (p) => (earns(p) ? (p.target - p.fee) / p.each : null),
    hint: (p) =>
      `The $${p.fee} cost has to be earned back as well. The sales must reach the $${p.target} and the $${p.fee} together.`,
  },
  {
    id: 'ignores-cost',
    name: 'Leaves out the cost',
    about: 'Divides the target by the price each. Example: $2 each after $30 costs, to leave $50: 50 ÷ 2.',
    predict: (p) => (earns(p) ? p.target / p.each : null),
    hint: (p) => `That brings in $${p.target}, but $${p.fee} of it goes on the cost of setting up.`,
  },
  {
    id: 'stops-at-sales-needed',
    name: 'Stops at the money needed',
    about: 'Adds the cost to the target and uses that as the number. Example: 50 + 30 = 80.',
    predict: (p) => (earns(p) ? p.target + p.fee : null),
    hint: (p) =>
      `$${p.target + p.fee} is the money the sales must bring in. Each one brings in $${p.each}, so it takes fewer than ${p.target + p.fee}.`,
  },
  {
    id: 'adds-the-prices',
    name: 'Adds the two prices each',
    about:
      'Divides the gap between two offers by the sum of their prices each, instead of the difference. Example: $30 apart at $3 and $1 an hour: 30 ÷ 4.',
    predict: (p) => (matches(p) ? gap(p) / (p.each1 + p.each2) : null),
    hint: (p) =>
      `Both offers go up every time. One goes up by $${p.each1} and the other by $${p.each2}, so the gap closes by only $${closes(p)} each time.`,
  },
  {
    id: 'one-price-only',
    name: 'Uses only one of the prices each',
    about: 'Divides the gap between two offers by one price each. Example: $30 apart at $3 and $1 an hour: 30 ÷ 3.',
    predict: (p) => (matches(p) ? gap(p) / p.each1 : null),
    hint: (p) =>
      `The other offer goes up too, by $${p.each2} each time. So the gap closes by only $${closes(p)} each time.`,
  },
  {
    id: 'stops-at-gap',
    name: 'Stops at the gap between the charges',
    about: 'Gives the difference between the two charges as the answer. Example: $50 − $20 = 30.',
    predict: (p) => (matches(p) ? gap(p) : null),
    hint: (p) => `$${gap(p)} is how far apart the two offers start. That gap closes by $${closes(p)} each time.`,
  },
  {
    id: 'adds-the-charges',
    name: 'Adds the two charges',
    about: 'Adds the charges instead of finding how far apart they are. Example: ($20 + $50) ÷ 2.',
    predict: (p) => (matches(p) ? (p.fee1 + p.fee2) / closes(p) : null),
    hint: (p) => `What matters is how far apart the two charges are: $${p.fee2} is $${gap(p)} more than $${p.fee1}.`,
  },
  {
    id: 'all-one-price',
    name: 'Treats every ticket as the higher price',
    about: 'Divides the money by the higher price alone. Example: $60 from $6 and $2 tickets: 60 ÷ 6 = 10.',
    predict: (p) => (mixes(p) ? p.money / p.price1 : null),
    hint: (p) =>
      `That would be right if only $${p.price1} tickets were sold. There were ${p.tickets} tickets in all, so the rest must fit too.`,
  },
  {
    id: 'pairs-the-prices',
    name: 'Adds the two ticket prices',
    about: 'Divides the money by the two prices added together, as if the same number of each were sold. Example: $88 ÷ ($5 + $3) = 11.',
    predict: (p) => (mixes(p) ? p.money / (p.price1 + p.price2) : null),
    hint: (p) =>
      `Adding the two prices works only if the same number of each was sold. Check it against the ${p.tickets} tickets in all.`,
  },
];
