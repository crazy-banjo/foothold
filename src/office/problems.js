// Planning at the town office: the skills, in teaching order, and the
// situations for each. Every situation is a linear equation in one unknown,
// met as a plan that has to add up. A situation is one of
//
//   { skill, kind: 'buy',  each, fee, budget }
//     Each one costs `each`, after a `fee` paid once (0 if none). Order as
//     many as `budget` pays for:  fee + each × n ≤ budget.
//
//   { skill, kind: 'earn', each, fee, target }
//     Each one sold brings in `each`. `fee` is the cost of setting up. The
//     town wants `target` left over:  each × n − fee = target.
//
// All amounts are whole dollars. The answer is the number n.

export const SKILLS = [
  {
    id: 'so-much-each',
    name: 'So much each',
    about: 'How many a budget pays for at a price each, such as $8 each from $56.',
  },
  {
    id: 'charge-plus-each',
    name: 'A charge, then so much each',
    about: 'A charge paid once and a price each, such as $20 plus $6 an hour from $62.',
  },
  {
    id: 'money-left-over',
    name: 'When it doesn’t come out even',
    about: 'The budget does not divide exactly, so some money is left over.',
  },
  {
    id: 'earn-a-target',
    name: 'Earning a target',
    about: 'Sales must cover a cost and leave a set amount, such as $2 a ticket after $30 costs, to leave $50.',
  },
];

/** The most the order form accepts. */
export const ORDER_MAX = 99;

// A charge that is a multiple of the price lets more of the well-known
// wrong methods come out as whole numbers, so they can be recognised.
function pickFee(rng, each) {
  return rng.next() < 0.5 ? each * rng.int(1, 4) : rng.int(5, 30);
}

const GENERATORS = {
  'so-much-each': (rng) => {
    const each = rng.int(3, 12);
    return { kind: 'buy', each, fee: 0, budget: each * rng.int(3, 12) };
  },

  'charge-plus-each': (rng) => {
    const each = rng.int(2, 9);
    const fee = pickFee(rng, each);
    return { kind: 'buy', each, fee, budget: fee + each * rng.int(3, 15) };
  },

  'money-left-over': (rng) => {
    const each = rng.int(3, 9);
    const fee = rng.next() < 0.3 ? 0 : pickFee(rng, each);
    return { kind: 'buy', each, fee, budget: fee + each * rng.int(3, 15) + rng.int(1, each - 1) };
  },

  'earn-a-target': (rng) => {
    for (;;) {
      const each = rng.int(2, 6);
      const fee = pickFee(rng, each);
      const target = each * rng.int(5, 30) - fee;
      if (target >= 10) return { kind: 'earn', each, fee, target };
    }
  },
};

export function generate(skillId, rng) {
  const make = GENERATORS[skillId];
  if (!make) throw new Error(`Unknown skill: ${skillId}`);
  return { skill: skillId, ...make(rng) };
}

export function expected(problem) {
  const { kind, each, fee } = problem;
  return kind === 'buy' ? Math.floor((problem.budget - fee) / each) : (problem.target + fee) / each;
}

export function problemKey({ skill, kind, each, fee, budget, target }) {
  return [skill, kind, each, fee, budget ?? target].join(':');
}
