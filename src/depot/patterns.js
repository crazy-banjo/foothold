// Mistake patterns for dispatching.
//
// The central one is additive reasoning: treating "in step with" as "so
// many more" instead of "so many times as much". It is the most widely
// reported error in ratio and proportion problems. The others are choosing
// the wrong operation, stopping a step early, and losing track of a head
// start or a remainder.
//
// Each `predict` returns the number someone thinking this way would enter,
// or null when the pattern doesn't apply. The scaling patterns are only
// used when there is no head start, so that a wrong answer has one reading.

import { forEach } from './problems.js';

const amount = (p) => p.ask === 'amount';
const count = (p) => p.ask === 'deliveries';
const chain = (p) => p.ask === 'chain';
const forOneGiven = (p) => p.known.deliveries === 1;
const scaled = (p) => amount(p) && !forOneGiven(p) && p.start === 0;
const exact = (p) => (p.have - p.start) % forEach(p) === 0;

const unit = (p) => (p.per === 'boxes' ? 'box' : 'minute');
/** "6 boxes", "1 minute" */
const some = (p, n) => `${n} ${p.per === 'boxes' ? (n === 1 ? 'box' : 'boxes') : n === 1 ? 'minute' : 'minutes'}`;
const deliveries = (n) => `${n} ${n === 1 ? 'delivery' : 'deliveries'}`;

export const PATTERNS = [
  {
    id: 'adds-the-numbers',
    name: 'Adds instead of multiplying',
    about: 'Adds the deliveries and the amount for each. Example: 7 deliveries of 6 boxes: 7 + 6 = 13.',
    predict: (p) => (amount(p) && forOneGiven(p) && p.start === 0 ? p.today + p.known.amount : null),
    hint: (p) =>
      `Every one of the ${p.today} deliveries needs its own ${some(p, p.known.amount)}. That is ${some(p, p.known.amount)}, ${p.today} times over.`,
  },
  {
    id: 'adds-the-difference',
    name: 'Adds instead of scaling',
    about:
      'Keeps the difference the same. Example: 4 deliveries took 60 minutes, so 10 deliveries (6 more) take 66 minutes.',
    predict: (p) => (scaled(p) ? p.today + (p.known.amount - p.known.deliveries) : null),
    hint: (p) =>
      `Each extra delivery adds more than 1 ${unit(p)}. Every delivery takes its own share of the ${some(p, p.known.amount)}.`,
  },
  {
    id: 'yesterdays-amount',
    name: 'Uses yesterday’s amount',
    about: 'Uses the known amount without scaling it. Example: 60 minutes again, for 10 deliveries.',
    predict: (p) => (scaled(p) ? p.known.amount : null),
    hint: (p) =>
      `${some(p, p.known.amount)} was for ${deliveries(p.known.deliveries)}. Today there are ${p.today}.`,
  },
  {
    id: 'times-as-many',
    name: 'Stops at how many times as many',
    about: 'Finds how many times as many deliveries there are, and enters that. Example: 12 is 3 times 4, so 3.',
    predict: (p) => (scaled(p) && p.today % p.known.deliveries === 0 ? p.today / p.known.deliveries : null),
    hint: (p) => {
      const times = p.today / p.known.deliveries;
      return `Today has ${times} times as many deliveries. So it needs ${times} times as much as ${some(p, p.known.amount)}.`;
    },
  },
  {
    id: 'ignores-head-start',
    name: 'Leaves out the head start',
    about:
      'Loads every box although some are already on the van, or books only the delivery time and forgets the loading.',
    predict: (p) => (amount(p) && p.start > 0 ? forEach(p) * p.today : null),
    hint: (p) =>
      p.per === 'boxes'
        ? `That is every box the deliveries need. ${some(p, p.start)} of them ${p.start === 1 ? 'is' : 'are'} already on the van.`
        : `That covers the deliveries. Loading the van takes another ${p.start} minutes first.`,
  },
  {
    id: 'subtracts-instead',
    name: 'Subtracts instead of dividing',
    about: 'Takes the amount for one delivery off the total. Example: 48 boxes at 6 each: 48 − 6 = 42.',
    predict: (p) => (count(p) && p.start === 0 ? p.have - p.known.amount : null),
    hint: (p) =>
      `Taking off ${some(p, p.known.amount)} covers just one delivery. Ask how many lots of ${p.known.amount} there are in ${p.have}.`,
  },
  {
    id: 'rounds-up',
    name: 'Counts a part delivery',
    about: 'Rounds up when the boxes or the time do not divide exactly.',
    predict: (p) => (count(p) && !exact(p) ? Math.floor((p.have - p.start) / forEach(p)) + 1 : null),
    hint: (p) =>
      p.per === 'boxes'
        ? 'The boxes left over are not enough for another full delivery.'
        : 'The minutes left over are not enough for another delivery.',
  },
  {
    id: 'ignores-loading',
    name: 'Forgets the loading time',
    about: 'Divides all the time by the time for a delivery, without taking off the loading first.',
    predict: (p) => (count(p) && p.start > 0 ? Math.floor(p.have / forEach(p)) : null),
    hint: (p) => `The first ${p.start} minutes go on loading the van. Only the rest is for deliveries.`,
  },
  {
    id: 'stops-at-deliveries',
    name: 'Stops at the number of deliveries',
    about: 'Works out the deliveries and enters that as the minutes. Example: 48 boxes at 6 each: 8.',
    predict: (p) => (chain(p) ? p.boxes / p.boxesEach : null),
    hint: (p) =>
      `${p.boxes / p.boxesEach} is the number of deliveries. Each of them takes ${p.minutesEach} minutes.`,
  },
  {
    id: 'multiplies-the-pair',
    name: 'Multiplies the two amounts for one delivery',
    about: 'Multiplies boxes for a delivery by minutes for a delivery. Example: 6 boxes × 15 minutes = 90.',
    predict: (p) => (chain(p) ? p.boxesEach * p.minutesEach : null),
    hint: (p) =>
      `${p.boxesEach} boxes and ${p.minutesEach} minutes both describe one delivery. First find how many deliveries ${p.boxes} boxes make.`,
  },
];
