// Dispatching at the delivery depot: the skills, in teaching order, and
// the situations for each.
//
// Three quantities are linked: deliveries, boxes and minutes. Boxes and
// minutes each go up in step with the number of deliveries. A situation
// gives some of these and asks for another. There are three shapes:
//
//   ask: 'amount'      How many boxes to load, or minutes to book, for
//                      `today` deliveries.
//   ask: 'deliveries'  How many deliveries `have` boxes (or minutes) allow.
//   ask: 'chain'       Minutes to book for `boxes` boxes, going through
//                      the number of deliveries.
//
// For the first two:
//   per    'boxes' or 'minutes': which quantity is involved
//   known  { deliveries, amount }: a known pair, such as 4 deliveries took
//          60 minutes. `deliveries` is 1 when the amount for one is given.
//   start  a head start: boxes already on the van, or minutes of loading
//          before the first delivery. 0 if none.
//
// The amount for one delivery is always a whole number.

export const SKILLS = [
  {
    id: 'each-delivery',
    name: 'So many for each delivery',
    about: 'Boxes or minutes for a number of deliveries, such as 7 deliveries of 6 boxes.',
  },
  {
    id: 'how-many-go-out',
    name: 'How many deliveries',
    about: 'How many deliveries a pile of boxes or a stretch of time allows, such as 48 boxes at 6 each.',
  },
  {
    id: 'from-yesterday',
    name: 'Going by yesterday',
    about: 'Scaling from a known day, such as 10 deliveries when 4 deliveries took 60 minutes.',
  },
  {
    id: 'head-start',
    name: 'A head start',
    about: 'Some boxes are already on the van, or loading takes time before the first delivery.',
  },
  {
    id: 'what-fits',
    name: 'What fits',
    about: 'The boxes or the time do not divide exactly, so only whole deliveries count.',
  },
  {
    id: 'boxes-then-minutes',
    name: 'Two steps',
    about: 'From boxes to deliveries to minutes, such as 48 boxes at 6 boxes and 15 minutes a delivery.',
  },
];

/** The most the planning board accepts. */
export const PLAN_MAX = 240;

const pickPer = (rng) => rng.pick(['boxes', 'minutes']);
const forOne = (per, rng) => (per === 'boxes' ? rng.int(3, 12) : rng.pick([5, 10, 15, 20]));

const GENERATORS = {
  'each-delivery': (rng) => {
    const per = pickPer(rng);
    const rate = forOne(per, rng);
    return { ask: 'amount', per, known: { deliveries: 1, amount: rate }, today: rng.int(3, 9), start: 0 };
  },

  'how-many-go-out': (rng) => {
    const per = pickPer(rng);
    const rate = per === 'boxes' ? rng.int(3, 12) : rng.pick([5, 10, 15, 20, 30]);
    const fits = rng.int(3, per === 'boxes' ? 12 : 7);
    return { ask: 'deliveries', per, known: { deliveries: 1, amount: rate }, have: rate * fits, start: 0 };
  },

  'from-yesterday': (rng) => {
    const per = pickPer(rng);
    const rate = forOne(per, rng);
    const before = rng.int(2, 5);
    let today;
    do today = rng.int(3, 12);
    while (today === before);
    return { ask: 'amount', per, known: { deliveries: before, amount: before * rate }, today, start: 0 };
  },

  'head-start': (rng) => {
    const per = pickPer(rng);
    const rate = forOne(per, rng);
    const before = rng.pick([1, 1, 2, 3]);
    let today;
    do today = rng.int(3, 9);
    while (today === before);
    const start = per === 'boxes' ? rng.int(2, Math.min(15, rate * today - 1)) : rng.pick([10, 15, 20, 30]);
    return { ask: 'amount', per, known: { deliveries: before, amount: before * rate }, today, start };
  },

  'what-fits': (rng) => {
    const per = pickPer(rng);
    const rate = per === 'boxes' ? rng.int(4, 12) : rng.pick([10, 15, 20, 30]);
    const start = per === 'minutes' && rng.next() < 0.5 ? rng.pick([10, 20, 30]) : 0;
    const fits = rng.int(3, per === 'boxes' ? 9 : 6);
    return {
      ask: 'deliveries',
      per,
      known: { deliveries: 1, amount: rate },
      have: start + rate * fits + rng.int(1, rate - 1),
      start,
    };
  },

  'boxes-then-minutes': (rng) => {
    const boxesEach = rng.int(3, 9);
    const minutesEach = rng.pick([5, 10, 15, 20]);
    return { ask: 'chain', boxesEach, minutesEach, boxes: boxesEach * rng.int(3, 9) };
  },
};

export function generate(skillId, rng) {
  const make = GENERATORS[skillId];
  if (!make) throw new Error(`Unknown skill: ${skillId}`);
  return { skill: skillId, ...make(rng) };
}

/** Boxes or minutes for one delivery. */
export function forEach(problem) {
  return problem.known.amount / problem.known.deliveries;
}

export function expected(problem) {
  if (problem.ask === 'chain') return (problem.boxes / problem.boxesEach) * problem.minutesEach;
  const rate = forEach(problem);
  if (problem.ask === 'amount') {
    // Boxes already on the van are not loaded again; loading time is added.
    return problem.per === 'boxes' ? rate * problem.today - problem.start : rate * problem.today + problem.start;
  }
  return Math.floor((problem.have - problem.start) / rate);
}

export function problemKey(problem) {
  if (problem.ask === 'chain') {
    return [problem.skill, problem.boxesEach, problem.minutesEach, problem.boxes].join(':');
  }
  const { skill, ask, per, known, today, have, start } = problem;
  return [skill, ask, per, known.deliveries, known.amount, today ?? have, start].join(':');
}
