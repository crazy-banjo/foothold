// Fuelling the delivery van: the skills, in teaching order, and the
// situations for each. A situation is
//
//   { skill, gallons, miles, distance, roundTrip, tank }
//
// meaning: the van goes `miles` miles on `gallons` gallons; the delivery is
// `distance` miles away; the van may have to come back; and `tank` gallons
// are already in the tank. The answer is the gallons to pump.
//
// Miles for one gallon is always a whole number, so any whole number of
// gallons takes the van a whole number of miles.

export const SKILLS = [
  {
    id: 'per-gallon',
    name: 'Miles for each gallon',
    about: 'The miles for one gallon are known, such as a 60 mile trip at 10 miles on 1 gallon.',
  },
  {
    id: 'longer-trip',
    name: 'A longer trip',
    about: 'A trip several times as long as a known one, such as 90 miles when 2 gallons go 30 miles.',
  },
  {
    id: 'there-and-back',
    name: 'There and back',
    about: 'The van has to return, so the trip is twice the distance.',
  },
  {
    id: 'in-between',
    name: 'In-between trips',
    about: 'A trip that is not a whole number of known trips, such as 90 miles when 4 gallons go 60 miles.',
  },
  {
    id: 'part-full',
    name: 'A tank that is not empty',
    about: 'Some fuel is already in the tank, so only the rest is pumped.',
  },
];

const base = { roundTrip: false, tank: 0 };

function perGallon(rng) {
  const rate = rng.pick([5, 10, 20, 25]);
  const gallons = rng.int(2, rate === 25 ? 6 : 9);
  return { ...base, gallons: 1, miles: rate, distance: gallons * rate };
}

function longerTrip(rng) {
  const gallons = rng.pick([2, 3, 4, 5]);
  const rate = rng.pick([5, 10, 15]);
  const times = rng.int(2, 4);
  return { ...base, gallons, miles: gallons * rate, distance: times * gallons * rate };
}

function inBetween(rng) {
  const gallons = rng.pick([2, 3, 4, 6]);
  const rate = rng.pick([5, 10, 15, 20]);
  let needed;
  do needed = rng.int(gallons + 1, 3 * gallons);
  while (needed % gallons === 0);
  return { ...base, gallons, miles: gallons * rate, distance: needed * rate };
}

const GENERATORS = {
  'per-gallon': perGallon,
  'longer-trip': longerTrip,
  'there-and-back': (rng) => ({ ...rng.pick([perGallon, longerTrip])(rng), roundTrip: true }),
  'in-between': inBetween,
  'part-full': (rng) => {
    const problem = rng.pick([perGallon, longerTrip, inBetween])(rng);
    const total = (problem.distance * problem.gallons) / problem.miles;
    return { ...problem, tank: rng.int(1, Math.min(5, total - 1)) };
  },
};

export function generate(skillId, rng) {
  const make = GENERATORS[skillId];
  if (!make) throw new Error(`Unknown skill: ${skillId}`);
  return { skill: skillId, ...make(rng) };
}

/** Miles the van must cover in all. */
export function tripMiles({ distance, roundTrip }) {
  return roundTrip ? distance * 2 : distance;
}

/** Gallons the whole trip uses. */
export function tripGallons(problem) {
  return (tripMiles(problem) * problem.gallons) / problem.miles;
}

/** Gallons to pump. */
export function expected(problem) {
  return tripGallons(problem) - problem.tank;
}

export function problemKey({ skill, gallons, miles, distance, roundTrip, tank }) {
  return [skill, gallons, miles, distance, roundTrip ? 'back' : '', tank].join(':');
}
