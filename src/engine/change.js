// Making change: the skills, in teaching order, and a generator of
// situations for each one. A situation is just { skill, price, paid }.

export const SKILLS = [
  {
    id: 'whole-dollars',
    name: 'Whole dollars',
    about: 'Both amounts are whole dollars, such as $3.00 out of $5.00.',
  },
  {
    id: 'dimes-from-dollar',
    name: 'Dimes out of a dollar',
    about: 'A price in tens of cents paid with one dollar, such as 40¢ out of $1.00.',
  },
  {
    id: 'dollars-and-dimes',
    name: 'Breaking a dollar',
    about: 'A dollar has to be broken into coins, such as $2.40 out of $5.00.',
  },
  {
    id: 'cents-from-dollar',
    name: 'Pennies out of a dollar',
    about: 'Any price under a dollar paid with one dollar, such as 37¢ out of $1.00.',
  },
  {
    id: 'any-price',
    name: 'Any price',
    about: 'Any price paid with a single bill, such as $2.37 out of $5.00.',
  },
  {
    id: 'extra-coins',
    name: 'Customer adds coins',
    about: 'The customer adds coins to the bill, such as $3.65 out of $5.15.',
  },
];

// Fives and tens come up more often than twenties.
const BILLS = [500, 500, 1000, 1000, 2000];

const GENERATORS = {
  'whole-dollars': (rng) => {
    const paid = rng.pick(BILLS);
    return { price: rng.int(1, paid / 100 - 1) * 100, paid };
  },

  'dimes-from-dollar': (rng) => ({ price: rng.int(1, 9) * 10, paid: 100 }),

  'dollars-and-dimes': (rng) => {
    const paid = rng.pick(BILLS);
    return { price: rng.int(1, paid / 100 - 1) * 100 + rng.int(1, 9) * 10, paid };
  },

  'cents-from-dollar': (rng) => ({ price: rng.int(0, 9) * 10 + rng.int(1, 9), paid: 100 }),

  'any-price': (rng) => {
    const paid = rng.pick(BILLS);
    return {
      price: rng.int(1, paid / 100 - 1) * 100 + rng.int(0, 9) * 10 + rng.int(1, 9),
      paid,
    };
  },

  // The customer hands over a bill plus a few coins so that the change
  // comes out rounder: $3.65 paid with $5.15 gives $1.50 back.
  'extra-coins': (rng) => {
    for (;;) {
      const bill = rng.pick(BILLS);
      const price = rng.int(1, bill / 100 - 1) * 100 + rng.int(1, 99);
      const cents = price % 100;
      const options = [...new Set([cents % 25, cents % 10, cents % 5])].filter((e) => e > 0);
      if (options.length > 0) return { price, paid: bill + rng.pick(options) };
    }
  },
};

export function generate(skillId, rng) {
  const make = GENERATORS[skillId];
  if (!make) throw new Error(`Unknown skill: ${skillId}`);
  return { skill: skillId, ...make(rng) };
}

export function correctChange(problem) {
  return problem.paid - problem.price;
}

export function problemKey(problem) {
  return `${problem.price}/${problem.paid}`;
}
