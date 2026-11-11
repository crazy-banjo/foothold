// The game shell: the story, Main Street, a day of work at one job, the
// end of the day, and the progress panel. Each job supplies its own screen
// (see counter-view.js and kitchen-view.js); everything here is shared.

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
import { createRng } from '../engine/rng.js';
import { playerSvg, shopSvg } from './art.js';
import { counterView } from './counter-view.js';
import { depotView } from './depot-view.js';
import { h, rich } from './dom.js';
import { UPGRADES } from './goods.js';
import { kitchenView } from './kitchen-view.js';
import { officeView } from './office-view.js';
import { clearLearner, freshSave, loadLearner, saveLearner } from './storage.js';

const VIEWS = [counterView, kitchenView, depotView, officeView];
const COMING_LATER = [
  { title: 'Workshop', subject: 'Geometry' },
];

const TASKS_PER_DAY = 6;
/** Coins earned by the number of wrong tries before the right one. */
const PAY = [10, 6, 3, 1];
const MAX_TRAY = 40;

// "?seed=7" in the address replays the same run of situations.
const seed = Number(new URLSearchParams(location.search).get('seed')) || Date.now();
const rng = createRng(seed);

const app = document.getElementById('app');
const whereEl = document.getElementById('where');
const purseEl = document.getElementById('purse');
const progressDialog = document.getElementById('progress');

let learner = loadLearner();
let view = null; // the job being worked today
let today = null;
let round = null;
let parts = {};
let summary = null;

function setHeader(where) {
  whereEl.textContent = `Day ${learner.day} · ${where}`;
  purseEl.textContent = `${learner.coins} coins`;
}

/** The player's job title at a business, and what the next one takes. */
function rankOf(v) {
  const learned = v.job.skills.filter((s) => isMastered(learner, v.job, s.id)).length;
  let index = 0;
  v.ranks.forEach((rank, i) => {
    if (learned >= rank.at) index = i;
  });
  const next = v.ranks[index + 1];
  return {
    index,
    title: v.ranks[index].title,
    next: next ? { title: next.title, need: next.at - learned } : null,
  };
}

const trayTotal = () => round.tray.reduce((sum, piece) => sum + piece.value, 0);
/** The amount that would be handed over right now. */
const answerNow = () => (view.control ? round.amount : trayTotal());

// ----------------------------------------------------------------- story

function showIntro() {
  const start = h(
    'button',
    {
      class: 'primary',
      type: 'button',
      onclick: () => {
        learner.intro = true;
        saveLearner(learner);
        showStreet();
      },
    },
    'Go to Main Street',
  );
  app.replaceChildren(
    h(
      'section',
      { class: 'card story' },
      h('h2', {}, 'Welcome to Foothold'),
      h('div', { html: shopSvg(learner.shop, UPGRADES) }),
      h('p', {}, 'Foothold is a small town at the foot of the hills. Its main street has seen better days.'),
      h('p', {}, 'Nell needs help in her shop and its kitchen. Sam needs help at the delivery depot, and Ida at the town office.'),
      h('p', {}, 'Every job here is real work. Do it well and you earn coins.'),
      h('p', {}, 'Spend your coins to fix up the street, starting with Nell’s shop.'),
      start,
    ),
  );
  setHeader('Foothold');
}

// ----------------------------------------------------------- main street

function showStreet() {
  view = null;
  round = null;
  app.replaceChildren(
    h(
      'section',
      { class: 'card street' },
      h(
        'div',
        { class: 'you' },
        // The outfit follows the highest job title reached anywhere.
        h('div', { html: playerSvg(Math.max(...VIEWS.map((v) => rankOf(v).index))) }),
        h('div', {}, h('h2', {}, 'Main Street'), h('p', {}, 'Where will you work today?')),
      ),
      h('div', { html: shopSvg(learner.shop, UPGRADES) }),
    ),
    ...VIEWS.map((v) => {
      const rank = rankOf(v);
      return h(
        'section',
        { class: 'card job' },
        h('div', {}, h('h3', {}, v.title), h('p', { class: 'about' }, `${v.subject}. ${v.blurb}`)),
        h(
          'p',
          { class: 'rank' },
          'Your job: ',
          h('span', { class: 'badge' }, rank.title),
          h(
            'span',
            { class: 'about' },
            rank.next
              ? `Next: ${rank.next.title}, after ${rank.next.need} more ${rank.next.need === 1 ? 'skill' : 'skills'}.`
              : 'The top job here.',
          ),
        ),
        h(
          'button',
          { class: 'primary', type: 'button', 'aria-label': `Work at ${v.title} today`, onclick: () => startDay(v) },
          'Work here',
        ),
      );
    }),
    h(
      'section',
      { class: 'card later' },
      h('h3', {}, 'Not open yet'),
      h('ul', {}, COMING_LATER.map((place) => h('li', {}, `${place.title} (${place.subject})`))),
    ),
  );
  setHeader('Main Street');
}

// ---------------------------------------------------------------- a day

function startDay(chosen) {
  view = chosen;
  today = { served: 0, firstTry: 0, earned: 0, learned: [], promoted: null };
  startRound();
}

function startRound() {
  const problem = nextProblem(learner, view.job, rng);
  round = {
    problem,
    extra: view.setUp(problem, rng),
    tray: [],
    amount: 0,
    lastTray: [],
    wrong: [],
    result: null,
    hint: null,
    done: false,
    pay: 0,
    learned: null,
    promoted: null,
  };
  parts = {
    scene: h('section', { class: 'scene card' }),
    feedback: h('section', { class: 'feedback', role: 'status', 'aria-live': 'polite', tabindex: '-1' }),
    tray: h('section', { class: 'tray card', 'aria-label': view.labels.tray }),
    till: h('section', { class: 'till', 'aria-label': view.labels.pieces }),
    actions: h('div', { class: 'actions' }),
  };
  // The till sits above the tray so that it never moves as the tray fills.
  app.replaceChildren(parts.scene, parts.feedback, parts.till, parts.tray, parts.actions);
  renderAll();
}

function renderAll() {
  const task = round.done ? today.served : today.served + 1;
  setHeader(`${view.taskWord} ${task} of ${TASKS_PER_DAY}`);
  parts.scene.replaceChildren(...view.scene(round));
  renderFeedback();
  renderInput();
}

function renderTray() {
  const pieces = [...round.tray].sort((a, b) => b.value - a.value);
  parts.tray.replaceChildren(
    h('h2', { class: 'label' }, view.labels.tray),
    view.trayExtra(round, trayTotal()),
    // This area keeps its height when empty, so nothing jumps when the
    // first piece goes in.
    h(
      'div',
      { class: 'pieces tray-pieces' },
      pieces.map((piece) =>
        h('button', {
          class: 'piece',
          type: 'button',
          disabled: round.done,
          'aria-label': `Take back a ${piece.name}`,
          html: view.pieceSvg(piece),
          onclick: () => removePiece(piece),
        }),
      ),
    ),
    h(
      'p',
      { class: 'empty' },
      round.done ? view.labels.given : pieces.length === 0 ? view.labels.empty : view.labels.undo,
    ),
  );
  renderActions();
}

function renderActions() {
  const nothing = round.done || answerNow() <= 0;
  parts.actions.replaceChildren(
    h('button', { class: 'quiet', type: 'button', disabled: nothing, onclick: clearTray }, view.labels.clear),
    h(
      'button',
      { class: 'primary', type: 'button', id: 'hand-over', disabled: nothing, onclick: handOver },
      view.labels.submit,
    ),
  );
}

// A job either hands over pieces from a till (bills, scoops) or has its
// own control for setting an amount (the depot's planning board).
function renderInput() {
  parts.till.hidden = Boolean(view.control);
  if (view.control) {
    parts.tray.replaceChildren(
      h('h2', { class: 'label' }, view.labels.tray),
      view.control(round, {
        amount: round.amount,
        set: (amount) => {
          round.amount = amount;
          renderActions();
        },
      }),
    );
    renderActions();
  } else {
    renderTray();
    renderTill();
  }
}

function renderTill() {
  parts.till.replaceChildren(
    h('h2', { class: 'label' }, view.labels.pieces),
    h(
      'div',
      { class: 'pieces' },
      view.pieces(round).map((piece) =>
        h('button', {
          class: 'piece',
          type: 'button',
          disabled: round.done,
          'aria-label': `Add a ${piece.name}`,
          html: view.pieceSvg(piece),
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
  round.amount = 0;
  renderInput();
}

// A hint about a mistake pattern is only given when the evidence points to
// one pattern: either it is the only one that explains this answer, or it
// is one this player has already shown before.
function chooseHint(result) {
  if (result.patterns.length === 1) return result.patterns[0];
  const seen = learner.jobs[view.job.id]?.patterns ?? {};
  const known = result.patterns
    .map((id) => ({ id, evidence: seen[id]?.evidence ?? 0 }))
    .filter((p) => p.evidence >= SUSPECTED)
    .sort((a, b) => b.evidence - a.evidence);
  return known[0]?.id ?? null;
}

function handOver() {
  if (round.done || answerNow() <= 0) return;
  const { job } = view;
  const answer = answerNow();
  const result = diagnose(job, round.problem, answer);
  if (result.correct) {
    const wasMastered = isMastered(learner, job, round.problem.skill);
    const titleBefore = rankOf(view).title;
    recordResult(learner, job, round.problem, round.wrong);
    round.done = true;
    round.pay = PAY[Math.min(round.wrong.length, PAY.length - 1)];
    learner.coins += round.pay;
    today.served += 1;
    today.earned += round.pay;
    if (round.wrong.length === 0) today.firstTry += 1;
    if (!wasMastered && isMastered(learner, job, round.problem.skill)) {
      round.learned = job.skills.find((s) => s.id === round.problem.skill);
      today.learned.push(round.learned.name);
    }
    const titleNow = rankOf(view).title;
    if (titleNow !== titleBefore) {
      round.promoted = titleNow;
      today.promoted = titleNow;
    }
    saveLearner(learner);
    renderAll();
    document.getElementById('next')?.focus();
  } else {
    const patternId = chooseHint(result);
    const pattern = job.patterns.find((p) => p.id === patternId);
    round.result = result;
    round.hint = pattern ? pattern.hint(round.problem, answer) : null;
    round.wrong.push(answer);
    round.lastTray = round.tray;
    round.tray = [];
    round.amount = 0;
    renderAll();
    parts.feedback.focus();
  }
}

function renderFeedback() {
  if (round.done) {
    const last = today.served >= TASKS_PER_DAY;
    parts.feedback.replaceChildren(
      h(
        'div',
        { class: 'card thanks' },
        h('h2', {}, round.wrong.length === 0 ? 'Right the first time!' : 'That’s it!'),
        h('p', {}, `You earned ${round.pay} ${round.pay === 1 ? 'coin' : 'coins'}.`),
        round.learned && h('p', { class: 'learned' }, `You have learned: ${round.learned.name}.`),
        round.promoted && h('p', { class: 'promoted' }, `Promoted to ${round.promoted}!`),
        h(
          'button',
          { class: 'primary', type: 'button', id: 'next', onclick: last ? closeDay : startRound },
          last ? 'Finish for the day' : view.labels.next,
        ),
      ),
    );
    return;
  }
  if (round.wrong.length === 0) {
    parts.feedback.replaceChildren();
    return;
  }
  parts.feedback.replaceChildren(
    h(
      'div',
      { class: 'card check' },
      h('h2', {}, `${view.boss}: “Let’s check that.”`),
      view.check(round),
      h('p', { class: 'again' }, 'Try again.'),
    ),
  );
}

// --------------------------------------------------------------- day end

function closeDay() {
  const { job } = view;
  const firstTimeAllLearned = !currentSkill(learner, job) && !learner.told[job.id];
  if (firstTimeAllLearned) learner.told[job.id] = true;
  summary = {
    number: learner.day,
    ...today,
    view,
    line: firstTimeAllLearned
      ? view.allLearnedLine
      : today.learned.length > 0
        ? 'You are learning fast. I can see it.'
        : view.dayLine(today, TASKS_PER_DAY),
  };
  learner.day += 1;
  saveLearner(learner);
  round = null;
  renderDayEnd();
  document.getElementById('to-street').focus();
}

function buy(upgrade) {
  if (learner.coins < upgrade.price || learner.shop.includes(upgrade.id)) return;
  learner.coins -= upgrade.price;
  learner.shop.push(upgrade.id);
  saveLearner(learner);
  renderDayEnd();
  (app.querySelector('.upgrades button:not(:disabled)') ?? document.getElementById('to-street')).focus();
}

function renderDayEnd() {
  const { job } = summary.view;
  const working = currentSkill(learner, job);
  const record = working && learner.jobs[job.id]?.skills[working.id];
  const forSale = UPGRADES.filter((u) => !learner.shop.includes(u.id));
  app.replaceChildren(
    h(
      'section',
      { class: 'card day-end' },
      h('h2', {}, `Day ${summary.number} is done`),
      h('p', { class: 'nell' }, h('strong', {}, `${summary.view.boss}: `), `“${summary.line}”`),
      summary.promoted && h('p', { class: 'promoted' }, `Promoted to ${summary.promoted}!`),
      h(
        'ul',
        { class: 'stats' },
        h('li', {}, h('strong', {}, String(summary.served)), ' jobs done'),
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
        : h('p', {}, 'You have learned every skill here.'),
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
      h('button', { class: 'primary', type: 'button', id: 'to-street', onclick: showStreet }, 'Back to Main Street'),
    ),
  );
  whereEl.textContent = `Day ${summary.number} · Finished`;
  purseEl.textContent = `${learner.coins} coins`;
}

// -------------------------------------------------------------- progress

function skillStatus(job, skill) {
  const record = learner.jobs[job.id]?.skills[skill.id];
  if (record?.mastered) return 'Learned';
  if (record?.attempts) return `${record.streak} of ${MASTERY_STREAK} in a row`;
  return currentSkill(learner, job)?.id === skill.id ? 'Up next' : 'Not started';
}

function patternStatus(record) {
  const times = `Seen ${record.seen} ${record.seen === 1 ? 'time' : 'times'}`;
  if (record.evidence >= CONFIRMED) return `${times}. Showing up repeatedly.`;
  if (record.evidence >= SUSPECTED) return `${times}. Seen recently.`;
  return `${times}. Not seen lately.`;
}

function openProgress() {
  progressDialog.replaceChildren(
    h('h2', { id: 'progress-title', tabindex: '-1', autofocus: true }, 'Progress'),
    ...VIEWS.flatMap((v) => {
      const seen = learner.jobs[v.job.id]?.patterns ?? {};
      const noticed = v.job.patterns.filter((p) => seen[p.id]?.seen > 0);
      return [
        h('h3', {}, `${v.title}: ${v.subject.toLowerCase()}`),
        h('p', { class: 'rank' }, 'Job title: ', h('span', { class: 'badge' }, rankOf(v).title)),
        h(
          'ol',
          { class: 'skills' },
          v.job.skills.map((skill) =>
            h(
              'li',
              {},
              h('strong', {}, skill.name),
              h('span', { class: 'status' }, skillStatus(v.job, skill)),
              h('span', { class: 'about' }, skill.about),
            ),
          ),
        ),
        h('h4', {}, 'Mistake patterns noticed'),
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
                  h('span', { class: 'status' }, patternStatus(seen[pattern.id])),
                  h('span', { class: 'about' }, rich(pattern.about)),
                ),
              ),
            ),
      ];
    }),
    h('p', { class: 'about privacy' }, 'Progress is kept in this browser only. Nothing is sent anywhere.'),
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
  progressDialog.close();
  showIntro();
}

document.getElementById('open-progress').addEventListener('click', openProgress);

// The title is the way home: back to Main Street from anywhere. Everything
// earned so far is already saved; only the rest of today's jobs is dropped.
document.getElementById('home').addEventListener('click', (event) => {
  event.preventDefault();
  if (learner.intro) showStreet();
  else showIntro();
  window.scrollTo(0, 0);
});

if (learner.intro) showStreet();
else showIntro();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {
    // The game still works online without offline support.
  });
}
