// The shop counter. A customer buys something and pays; the player hands
// back change from the till. Nothing ever asks "what is 5.00 − 2.40?".

import { SKILLS } from '../engine/change.js';
import { countUp } from '../engine/countup.js';
import { diagnose } from '../engine/diagnose.js';
import {
  CONFIRMED,
  MASTERY_STREAK,
  SUSPECTED,
  currentSkill,
  isMastered,
  nextProblem,
  recordResult,
} from '../engine/learner.js';
import { TILL, breakdown, formatMoney, total } from '../engine/money.js';
import { PATTERNS, getPattern } from '../engine/patterns.js';
import { createRng } from '../engine/rng.js';
import { customerSvg, numberLineSvg, pieceSvg, shopSvg } from './art.js';
import { UPGRADES, pickItem, pickLook } from './goods.js';
import { clearLearner, freshSave, loadLearner, saveLearner } from './storage.js';

const CUSTOMERS_PER_DAY = 6;
/** Coins earned by the number of wrong tries before the right one. */
const PAY = [10, 6, 3, 1];
const MAX_TRAY = 40;

// "?seed=7" in the address replays the same run of customers.
const seed = Number(new URLSearchParams(location.search).get('seed')) || Date.now();
const rng = createRng(seed);

const app = document.getElementById('app');
const whereEl = document.getElementById('where');
const purseEl = document.getElementById('purse');
const progressDialog = document.getElementById('progress');

let learner = loadLearner();
let today = newDay();
let round = null;
let view = {};
let summary = null;

function newDay() {
  return { served: 0, firstTry: 0, earned: 0, learned: [] };
}

/** Tiny DOM builder: h('p', { class: 'x' }, 'text', child). */
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === false || value == null) continue;
    if (key === 'class') el.className = value;
    else if (key === 'html') el.innerHTML = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

// ---------------------------------------------------------------- rounds

function startRound() {
  const problem = nextProblem(learner, rng);
  round = {
    problem,
    item: pickItem(problem.price, rng),
    look: pickLook(rng),
    tray: [],
    wrong: [],
    result: null,
    hint: null,
    done: false,
    pay: 0,
    learned: null,
  };
  view = {
    scene: h('section', { class: 'scene card' }),
    feedback: h('section', { class: 'feedback', role: 'status', 'aria-live': 'polite', tabindex: '-1' }),
    tray: h('section', { class: 'tray card', 'aria-label': 'Change you are handing back' }),
    till: h('section', { class: 'till', 'aria-label': 'Your till' }),
    actions: h('div', { class: 'actions' }),
  };
  app.replaceChildren(view.scene, view.feedback, view.tray, view.till, view.actions);
  renderAll();
}

function renderAll() {
  renderHeader();
  renderScene();
  renderFeedback();
  renderTray();
  renderTill();
}

function renderHeader() {
  const customer = round && !round.done ? today.served + 1 : today.served;
  whereEl.textContent = `Day ${learner.day} · Customer ${Math.max(customer, 1)} of ${CUSTOMERS_PER_DAY}`;
  purseEl.textContent = `${learner.coins} coins`;
}

function renderScene() {
  const { problem, item, look } = round;
  const mood = round.done ? 'happy' : round.wrong.length > 0 ? 'puzzled' : 'neutral';
  const says = round.done
    ? 'Thank you!'
    : round.wrong.length > 0
      ? 'Hmm, is that right?'
      : `${item.ask}, please.`;
  view.scene.replaceChildren(
    h('div', { class: 'customer' }, h('div', { html: customerSvg(look, mood) }), h('p', { class: 'bubble' }, says)),
    h(
      'div',
      { class: 'sale' },
      h(
        'div',
        { class: 'item' },
        h('span', { class: 'item-icon', 'aria-hidden': 'true' }, item.icon),
        h('p', { class: 'tag' }, h('span', { class: 'tag-name' }, item.name), ' ', h('strong', {}, formatMoney(problem.price))),
      ),
      h(
        'div',
        { class: 'paid' },
        h('p', { class: 'label' }, 'They hand you ', h('strong', {}, formatMoney(problem.paid))),
        h('div', { class: 'pieces', html: breakdown(problem.paid).map(pieceSvg).join('') }),
      ),
    ),
  );
}

function renderTray() {
  const sum = total(round.tray);
  const pieces = [...round.tray].sort((a, b) => b.cents - a.cents);
  view.tray.replaceChildren(
    h('h2', { class: 'label' }, 'Change you are handing back'),
    pieces.length === 0
      ? h('p', { class: 'empty' }, round.done ? 'Handed over.' : 'Pick bills and coins from your till.')
      : h(
          'div',
          { class: 'pieces' },
          pieces.map((piece) =>
            h('button', {
              class: 'piece',
              type: 'button',
              disabled: round.done,
              'aria-label': `Take back a ${piece.name}`,
              html: pieceSvg(piece),
              onclick: () => removePiece(piece),
            }),
          ),
        ),
    h('p', { class: 'sum' }, 'Total: ', h('strong', {}, formatMoney(sum))),
  );
  view.actions.replaceChildren(
    h(
      'button',
      { class: 'quiet', type: 'button', disabled: round.done || pieces.length === 0, onclick: clearTray },
      'Start over',
    ),
    h(
      'button',
      { class: 'primary', type: 'button', id: 'hand-over', disabled: round.done || pieces.length === 0, onclick: handOver },
      'Hand over the change',
    ),
  );
}

function renderTill() {
  view.till.replaceChildren(
    h('h2', { class: 'label' }, 'Your till'),
    h(
      'div',
      { class: 'pieces' },
      TILL.map((piece) =>
        h('button', {
          class: 'piece',
          type: 'button',
          disabled: round.done,
          'aria-label': `Add a ${piece.name}`,
          html: pieceSvg(piece),
          onclick: () => addPiece(piece),
        }),
      ),
    ),
  );
}

function addPiece(piece) {
  if (round.done || round.tray.length >= MAX_TRAY) return;
  round.tray.push(piece);
  renderTray();
}

function removePiece(piece) {
  const index = round.tray.indexOf(piece);
  if (index >= 0) round.tray.splice(index, 1);
  renderTray();
}

function clearTray() {
  round.tray = [];
  renderTray();
}

// A hint about a mistake pattern is only given when the evidence points to
// one pattern: either it is the only one that explains this answer, or it
// is one this player has already shown before.
function chooseHint(result) {
  if (result.patterns.length === 1) return result.patterns[0];
  const known = result.patterns
    .map((id) => ({ id, evidence: learner.patterns[id]?.evidence ?? 0 }))
    .filter((p) => p.evidence >= SUSPECTED)
    .sort((a, b) => b.evidence - a.evidence);
  return known[0]?.id ?? null;
}

function handOver() {
  if (round.done || round.tray.length === 0) return;
  const answer = total(round.tray);
  const result = diagnose(round.problem, answer);
  if (result.correct) {
    const wasMastered = isMastered(learner, round.problem.skill);
    recordResult(learner, round.problem, round.wrong);
    round.done = true;
    round.pay = PAY[Math.min(round.wrong.length, PAY.length - 1)];
    learner.coins += round.pay;
    today.served += 1;
    today.earned += round.pay;
    if (round.wrong.length === 0) today.firstTry += 1;
    if (!wasMastered && isMastered(learner, round.problem.skill)) {
      round.learned = SKILLS.find((s) => s.id === round.problem.skill);
      today.learned.push(round.learned.name);
    }
    saveLearner(learner);
    renderAll();
    document.getElementById('next')?.focus();
  } else {
    round.result = result;
    round.hint = chooseHint(result);
    round.wrong.push(answer);
    round.tray = [];
    renderAll();
    view.feedback.focus();
  }
}

function renderFeedback() {
  if (round.done) {
    const last = today.served >= CUSTOMERS_PER_DAY;
    view.feedback.replaceChildren(
      h(
        'div',
        { class: 'card thanks' },
        h('h2', {}, round.wrong.length === 0 ? 'Right the first time!' : 'That’s it!'),
        h('p', {}, `You earned ${round.pay} ${round.pay === 1 ? 'coin' : 'coins'}.`),
        round.learned && h('p', { class: 'learned' }, `You have learned: ${round.learned.name}.`),
        h(
          'button',
          { class: 'primary', type: 'button', id: 'next', onclick: last ? closeDay : startRound },
          last ? 'Close the shop' : 'Next customer',
        ),
      ),
    );
    return;
  }
  if (round.wrong.length === 0) {
    view.feedback.replaceChildren();
    return;
  }

  const { problem, result, hint } = round;
  const tries = round.wrong.length;
  const steps = countUp(problem.price, problem.paid);
  const tooMuch = result.diff > 0;
  let note = null;
  if (hint) {
    note = getPattern(hint).hint(problem, result.answer);
  } else if (result.slip) {
    note = `You are very close. It is off by just one ${Math.abs(result.diff) >= 100 ? 'bill' : 'coin'}.`;
  }

  view.feedback.replaceChildren(
    h(
      'div',
      { class: 'card check' },
      h('h2', {}, 'Nell: “Let’s check that.”'),
      h('p', {}, `The price is ${formatMoney(problem.price)}. You handed back ${formatMoney(result.answer)}.`),
      h(
        'p',
        { class: 'equation' },
        `${formatMoney(problem.price)} + ${formatMoney(result.answer)} = ${formatMoney(problem.price + result.answer)}`,
      ),
      h(
        'p',
        {},
        `The customer gave you ${formatMoney(problem.paid)}, so that is ${tooMuch ? 'too much' : 'not enough'} change.`,
      ),
      note && h('p', { class: 'note' }, note),
      h(
        'figure',
        {},
        h('figcaption', {}, 'Count up from the price to what they paid:'),
        h('div', { html: numberLineSvg(steps, tries >= 2) }),
      ),
      tries >= 3 && h('p', { class: 'answer' }, `The change is ${formatMoney(result.expected)}.`),
      h('p', { class: 'again' }, 'Try again.'),
    ),
  );
}

// ----------------------------------------------------------------- story

function showIntro() {
  round = null;
  const start = h(
    'button',
    {
      class: 'primary',
      type: 'button',
      onclick: () => {
        learner.intro = true;
        saveLearner(learner);
        startRound();
      },
    },
    'Open the shop',
  );
  app.replaceChildren(
    h(
      'section',
      { class: 'card story' },
      h('h2', {}, 'Nell’s Corner Shop'),
      h('div', { html: shopSvg(learner.shop, UPGRADES) }),
      h('p', {}, 'Nell has run this corner shop for forty years.'),
      h('p', {}, 'These days the small numbers on the coins are hard for her to read, and the shop is looking worn.'),
      h('p', {}, 'She has hired you to work the counter. Give every customer the right change.'),
      h('p', {}, 'You earn coins for your work. Spend them to fix up the shop.'),
      start,
    ),
  );
  whereEl.textContent = `Day ${learner.day}`;
  purseEl.textContent = `${learner.coins} coins`;
}

function nellLine(day, firstTimeAllLearned) {
  if (firstTimeAllLearned) {
    return 'You can run the counter on your own now. I have been thinking about opening the old kitchen again.';
  }
  if (day.learned.length > 0) return 'You are learning fast. I can see it.';
  if (day.firstTry === CUSTOMERS_PER_DAY) {
    return 'Every customer got the right change, first time. The till adds up to the penny.';
  }
  if (day.firstTry >= CUSTOMERS_PER_DAY - 2) {
    return 'A good day. We checked the tricky ones together, and the till adds up.';
  }
  return 'Some hard ones today. Checking them is how you get better. And the till adds up.';
}

// --------------------------------------------------------------- day end

function closeDay() {
  const firstTimeAllLearned = !currentSkill(learner) && !learner.toldAllLearned;
  summary = { number: learner.day, ...today, line: nellLine(today, firstTimeAllLearned) };
  if (firstTimeAllLearned) learner.toldAllLearned = true;
  learner.day += 1;
  saveLearner(learner);
  today = newDay();
  round = null;
  renderDayEnd();
  document.getElementById('open-shop').focus();
}

function buy(upgrade) {
  if (learner.coins < upgrade.price || learner.shop.includes(upgrade.id)) return;
  learner.coins -= upgrade.price;
  learner.shop.push(upgrade.id);
  saveLearner(learner);
  renderDayEnd();
  (app.querySelector('.upgrades button:not(:disabled)') ?? document.getElementById('open-shop')).focus();
}

function renderDayEnd() {
  const working = currentSkill(learner);
  const record = working && learner.skills[working.id];
  const forSale = UPGRADES.filter((u) => !learner.shop.includes(u.id));
  app.replaceChildren(
    h(
      'section',
      { class: 'card day-end' },
      h('h2', {}, `Day ${summary.number} is done`),
      h('p', { class: 'nell' }, h('strong', {}, 'Nell: '), `“${summary.line}”`),
      h(
        'ul',
        { class: 'stats' },
        h('li', {}, h('strong', {}, String(summary.served)), ' customers served'),
        h('li', {}, h('strong', {}, String(summary.firstTry)), ' right the first time'),
        h('li', {}, h('strong', {}, String(summary.earned)), ' coins earned'),
      ),
      summary.learned.length > 0 && h('p', { class: 'learned' }, `Learned today: ${summary.learned.join(', ')}.`),
      working
        ? h(
            'p',
            {},
            `Working on: ${working.name}`,
            record?.streak ? ` (${record.streak} of ${MASTERY_STREAK} in a row).` : '.',
          )
        : h('p', {}, 'You have learned every skill at the counter.'),
    ),
    h(
      'section',
      { class: 'card fix-up' },
      h('h2', {}, 'Fix up the shop'),
      h('div', { html: shopSvg(learner.shop, UPGRADES) }),
      h('p', { role: 'status' }, 'You have ', h('strong', {}, `${learner.coins} coins`), ' to spend.'),
      forSale.length === 0
        ? h('p', {}, 'The shop has everything now. It has never looked better.')
        : h(
            'ul',
            { class: 'upgrades' },
            forSale.map((upgrade) =>
              h(
                'li',
                {},
                h('span', { class: 'upgrade-name' }, upgrade.name),
                h('span', { class: 'upgrade-price' }, `${upgrade.price} coins`),
                h(
                  'button',
                  {
                    class: 'quiet',
                    type: 'button',
                    disabled: learner.coins < upgrade.price,
                    'aria-label': `Buy ${upgrade.name.toLowerCase()} for ${upgrade.price} coins`,
                    onclick: () => buy(upgrade),
                  },
                  'Buy',
                ),
              ),
            ),
          ),
    ),
    h(
      'div',
      { class: 'actions' },
      h('button', { class: 'primary', type: 'button', id: 'open-shop', onclick: startRound }, `Open the shop for day ${learner.day}`),
    ),
  );
  whereEl.textContent = `Day ${summary.number} · Shop closed`;
  purseEl.textContent = `${learner.coins} coins`;
}

// -------------------------------------------------------------- progress

function skillStatus(skill) {
  const record = learner.skills[skill.id];
  if (record?.mastered) return 'Learned';
  if (record?.attempts) return `${record.streak} of ${MASTERY_STREAK} in a row`;
  return currentSkill(learner)?.id === skill.id ? 'Up next' : 'Not started';
}

function patternStatus(record) {
  const times = `Seen ${record.seen} ${record.seen === 1 ? 'time' : 'times'}`;
  if (record.evidence >= CONFIRMED) return `${times}. Showing up repeatedly.`;
  if (record.evidence >= SUSPECTED) return `${times}. Seen recently.`;
  return `${times}. Not seen lately.`;
}

function openProgress() {
  const noticed = PATTERNS.filter((p) => learner.patterns[p.id]?.seen > 0);
  progressDialog.replaceChildren(
    h('h2', { id: 'progress-title', tabindex: '-1', autofocus: true }, 'Progress'),
    h('h3', {}, 'Skills at the counter'),
    h(
      'ol',
      { class: 'skills' },
      SKILLS.map((skill) =>
        h(
          'li',
          { class: isMastered(learner, skill.id) ? 'mastered' : '' },
          h('strong', {}, skill.name),
          h('span', { class: 'status' }, skillStatus(skill)),
          h('span', { class: 'about' }, skill.about),
        ),
      ),
    ),
    h('h3', {}, 'Mistake patterns noticed'),
    noticed.length === 0
      ? h('p', { class: 'about' }, 'None so far.')
      : h(
          'ul',
          { class: 'noticed' },
          noticed.map((pattern) =>
            h(
              'li',
              {},
              h('strong', {}, pattern.name),
              h('span', { class: 'status' }, patternStatus(learner.patterns[pattern.id])),
              h('span', { class: 'about' }, pattern.about),
            ),
          ),
        ),
    h('p', { class: 'about' }, 'Progress is kept in this browser only. Nothing is sent anywhere.'),
    h(
      'div',
      { class: 'actions' },
      h('button', { class: 'quiet', type: 'button', onclick: resetProgress }, 'Reset progress'),
      h('button', { class: 'primary', type: 'button', onclick: () => progressDialog.close() }, 'Close'),
    ),
  );
  progressDialog.showModal();
  progressDialog.scrollTop = 0;
}

function resetProgress() {
  if (!confirm('Erase all progress and start again from day 1?')) return;
  clearLearner();
  learner = freshSave();
  today = newDay();
  progressDialog.close();
  showIntro();
}

document.getElementById('open-progress').addEventListener('click', openProgress);

if (learner.intro) startRound();
else showIntro();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {
    // The game still works online without offline support.
  });
}
