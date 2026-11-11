// Mistake patterns for fuelling the van.
//
// The central one is additive reasoning: treating a proportional situation
// as "so many more" instead of "so many times as much". It is the most
// widely reported error in ratio and proportion problems.
//
// Each `predict` returns the gallons someone thinking this way would pump,
// or null when the pattern doesn't apply. The scaling patterns are only
// used when the tank starts empty, so that a wrong answer has one reading.

import { tripGallons, tripMiles } from './problems.js';

const scaled = (p) => p.gallons > 1 && p.tank === 0;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const PATTERNS = [
  {
    id: 'adds-the-difference',
    name: 'Adds instead of scaling',
    about:
      'Keeps the difference between miles and gallons the same. Example: 2 gallons go 30 miles, so 90 miles (60 more) needs 62 gallons.',
    predict: (p) => (scaled(p) ? tripMiles(p) - (p.miles - p.gallons) : null),
    hint: (p) =>
      `Going further does not add the extra miles as gallons. Every ${p.miles} miles needs another ${plural(p.gallons, 'gallon')}.`,
  },
  {
    id: 'known-trip-fuel',
    name: 'Pumps the fuel for the known trip',
    about: 'Uses the gallons from the van’s plate without scaling. Example: 2 gallons for a 90 mile trip.',
    predict: (p) => (scaled(p) ? p.gallons : null),
    hint: (p) =>
      `${plural(p.gallons, 'gallon')} only takes the van ${p.miles} miles. This trip is ${tripMiles(p)} miles.`,
  },
  {
    id: 'times-as-far',
    name: 'Stops at how many times as far',
    about:
      'Finds how many times as long the trip is, and pumps that number. Example: 90 miles is 3 times 30 miles, so 3 gallons.',
    predict: (p) => (scaled(p) && tripMiles(p) % p.miles === 0 ? tripMiles(p) / p.miles : null),
    hint: (p) => {
      const times = tripMiles(p) / p.miles;
      return `The trip is ${times} times as far as ${p.miles} miles. So it needs ${times} times as much fuel as ${plural(p.gallons, 'gallon')}.`;
    },
  },
  {
    id: 'divides-by-gallons',
    name: 'Divides the miles by the gallons',
    about: 'Divides the trip miles by the gallons on the plate. Example: 90 miles ÷ 2 gallons = 45.',
    predict: (p) => (scaled(p) && tripMiles(p) % p.gallons === 0 ? tripMiles(p) / p.gallons : null),
    hint: (p) =>
      `Dividing the trip miles by ${p.gallons} does not give gallons. Work out how far the van goes on 1 gallon first.`,
  },
  {
    id: 'one-way',
    name: 'Forgets the way back',
    about: 'Pumps enough fuel to get there but not to return.',
    predict: (p) => (p.roundTrip ? tripGallons(p) / 2 - p.tank : null),
    hint: () => 'That is enough fuel to get there. The van also has to come back.',
  },
  {
    id: 'ignores-tank',
    name: 'Ignores the fuel already in the tank',
    about: 'Pumps the fuel for the whole trip when the tank is not empty.',
    predict: (p) => (p.tank > 0 ? tripGallons(p) : null),
    hint: (p) =>
      `That is the fuel for the whole trip. The tank already has ${plural(p.tank, 'gallon')} in it, so pump only the rest.`,
  },
];
