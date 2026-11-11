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
import { workshopView } from './workshop-view.js';

const VIEWS = [counterView, kitchenView, depotView, officeView, workshopView];
/** Places on the street that have no job yet. */
const COMING_LATER = [];

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

/** A round is laid out in two columns when the screen is wide enough. */
function setPlaying(playing) {
  document.body.classList.toggle('playing', playing);
}

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

// ------------------------------------------------------- teacher's tasks
//
// A teacher can set a task with a link. Everything about the task is in
// the address, so nothing has to be stored or sent anywhere:
//
//   ?task=kitchen&coins=60&skill=top-up-mixed&pictures=1
//
//   task      the job to work at
//   coins     how many coins to earn there
//   skill     optional: practise this one skill only
//   pictures  optional: show the helping picture before the first try

function readTask() {
  const query = new URLSearchParams(location.search);
  const chosen = VIEWS.find((v) => v.job.id === query.get('task'));
  const coins = Math.round(Number(query.get('coins')));
  if (!chosen || !(coins >= 10 && coins <= 1000)) return null;
  const skill = chosen.job.skills.find((s) => s.id === query.get('skill')) ?? null;
  const pictures = query.get('pictures') === '1';
  return {
    view: chosen,
    skill,
    coins,
    pictures,
    key: [chosen.job.id, skill?.id ?? '', coins, pictures ? 1 : 0].join('/'),
  };
}

const task = readTask();
// True while the player is working on the task, as opposed to an ordinary day.
let inTask = false;

function freshTaskRecord() {
  return { key: task.key, earned: 0, served: 0, firstTry: 0, noticed: {}, done: false, finishedAt: null };
}

function taskSentence() {
  return `Earn ${task.coins} coins at ${task.view.title}.`;
}

function showTask() {
  setPlaying(false);
  inTask = false;
  round = null;
  const record = learner.task;
  if (record.done) {
    showTaskDone();
    return;
  }
  const start = h(
    'button',
    { class: 'primary', type: 'button', id: 'start-task', onclick: startTask },
    record.served > 0 ? 'Carry on' : 'Start',
  );
  app.replaceChildren(
    h(
      'section',
      { class: 'card task-card' },
      h('h2', {}, 'Your task'),
      h('p', { class: 'task-goal' }, taskSentence()),
      task.skill && h('p', {}, `The work is all one kind: ${task.skill.name.toLowerCase()}.`),
      h('p', { class: 'about' }, 'A right answer on the first try earns 10 coins. A second try earns 6.'),
      record.served > 0 && h('p', {}, `You have ${record.earned} of ${task.coins} coins so far.`),
      start,
    ),
  );
  setHeader('Your task');
  start.focus();
}

function startTask() {
  inTask = true;
  startDay(task.view);
}

/** A situation for the one skill the task names, not repeating the last one. */
function focusedProblem() {
  const { job } = task.view;
  const lastKey = learner.jobs[job.id]?.lastKey ?? null;
  let problem = job.generate(task.skill.id, rng);
  for (let i = 0; i < 12 && job.key(problem) === lastKey; i++) problem = job.generate(task.skill.id, rng);
  return problem;
}

function finishTask() {
  learner.task.done = true;
  learner.task.finishedAt = new Date().toLocaleString();
  learner.day += 1;
  saveLearner(learner);
  showTaskDone();
}

function showTaskDone() {
  setPlaying(false);
  inTask = false;
  round = null;
  const record = learner.task;
  const noticed = task.view.job.patterns.filter((p) => record.noticed[p.id] > 0);
  app.replaceChildren(
    h(
      'section',
      { class: 'card task-card task-done' },
      h('h2', {}, 'Task done!'),
      h('p', {}, 'Show this screen to your teacher.'),
      h(
        'ul',
        { class: 'stats' },
        h('li', {}, h('strong', {}, String(record.earned)), ` coins earned (the task was ${task.coins})`),
        h('li', {}, h('strong', {}, String(record.served)), ' jobs done'),
        h('li', {}, h('strong', {}, String(record.firstTry)), ' right the first time'),
      ),
      h('p', {}, `${task.view.title}${task.skill ? `: ${task.skill.name.toLowerCase()}` : ''}. Finished ${record.finishedAt}.`),
      h('h3', {}, 'Mistake patterns noticed during the task'),
      noticed.length === 0
        ? h('p', { class: 'about' }, 'None.')
        : h(
            'ul',
            { class: 'noticed' },
            noticed.map((pattern) =>
              h(
                'li',
                {},
                h('strong', {}, pattern.name),
                h('span', { class: 'status' }, `${record.noticed[pattern.id]} ${record.noticed[pattern.id] === 1 ? 'time' : 'times'}`),
                h('span', { class: 'about' }, rich(pattern.about)),
              ),
            ),
          ),
    ),
    h(
      'div',
      { class: 'actions' },
      h(
        'button',
        {
          class: 'quiet',
          type: 'button',
          onclick: () => {
            learner.task = freshTaskRecord();
            saveLearner(learner);
            showTask();
          },
        },
        'Do the task again',
      ),
      h('button', { class: 'primary', type: 'button', id: 'to-street', onclick: showStreet }, 'Back to Main Street'),
    ),
  );
  setHeader('Task done');
}

/** Where a teacher builds the link for a task. */
function showTaskBuilder() {
  setPlaying(false);
  inTask = false;
  round = null;
  const jobSelect = h('select', { id: 'tb-job' }, VIEWS.map((v) => h('option', { value: v.job.id }, `${v.title} (${v.subject.toLowerCase()})`)));
  const skillSelect = h('select', { id: 'tb-skill' });
  const coinsInput = h('input', { id: 'tb-coins', type: 'number', min: '10', max: '1000', step: '10', value: '60', inputmode: 'numeric' });
  const picturesBox = h('input', { id: 'tb-pictures', type: 'checkbox' });
  const linkBox = h('input', { id: 'tb-link', type: 'text', readonly: true, 'aria-label': 'Link for the student' });
  const status = h('p', { class: 'about', role: 'status' });
  const exampleNote = h('p', { class: 'about' });
  const exampleBox = h('div', { class: 'example' });

  // A live example of what the student will be given, drawn with the same
  // code the game uses, so the teacher sees exactly what they are setting.
  const drawExample = () => {
    const chosen = VIEWS.find((v) => v.job.id === jobSelect.value);
    const skill = chosen.job.skills.find((sk) => sk.id === skillSelect.value) ?? chosen.job.skills[0];
    const problem = chosen.job.generate(skill.id, rng);
    const sample = { problem, extra: chosen.setUp(problem, rng), tray: [], wrong: [], done: false };
    exampleNote.textContent = skillSelect.value
      ? `Every job in this task is like this one (${skill.name.toLowerCase()}):`
      : `The student starts where they are up to. For a new student that is ${skill.name.toLowerCase()}, like this:`;
    exampleBox.replaceChildren(
      h('div', { class: 'scene card' }, ...chosen.scene(sample)),
      ...(picturesBox.checked && chosen.preview ? [h('div', { class: 'card preview' }, chosen.preview(sample))] : []),
    );
  };

  const fillSkills = () => {
    const chosen = VIEWS.find((v) => v.job.id === jobSelect.value);
    skillSelect.replaceChildren(
      h('option', { value: '' }, 'Whatever the student is ready for next'),
      ...chosen.job.skills.map((s) => h('option', { value: s.id }, s.name)),
    );
  };
  const update = () => {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    const coins = Math.min(1000, Math.max(10, Math.round(Number(coinsInput.value) || 60)));
    url.searchParams.set('task', jobSelect.value);
    url.searchParams.set('coins', String(coins));
    if (skillSelect.value) url.searchParams.set('skill', skillSelect.value);
    if (picturesBox.checked) url.searchParams.set('pictures', '1');
    linkBox.value = url.href;
    status.textContent = '';
    drawExample();
  };
  jobSelect.addEventListener('change', () => {
    fillSkills();
    update();
  });
  for (const field of [skillSelect, coinsInput, picturesBox]) field.addEventListener('input', update);
  fillSkills();
  update();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(linkBox.value);
      status.textContent = 'Copied.';
    } catch {
      linkBox.select();
      status.textContent = 'Select the link above and copy it.';
    }
  };

  app.replaceChildren(
    h(
      'section',
      { class: 'card task-builder' },
      h('h2', {}, 'Set a task'),
      h('p', {}, 'Choose what a student should do, then hand out the link. The task is written into the link itself, so nothing is stored or sent anywhere.'),
      h('label', { class: 'field' }, h('span', {}, 'Job'), jobSelect),
      h('label', { class: 'field' }, h('span', {}, 'Kind of work'), skillSelect),
      h(
        'label',
        { class: 'field' },
        h('span', {}, 'Coins to earn'),
        coinsInput,
        h('span', { class: 'about' }, 'A right answer on the first try earns 10 coins, a second try 6, a third 3. So 60 coins is at least six jobs.'),
      ),
      h('label', { class: 'field check-field' }, picturesBox, h('span', {}, 'Show the helping picture before the first try')),
      h('h3', {}, 'What the student will see'),
      exampleNote,
      exampleBox,
      h('button', { class: 'quiet', type: 'button', id: 'tb-another', onclick: drawExample }, 'Show another example'),
      h('label', { class: 'field' }, h('span', {}, 'Link for the student'), linkBox),
      status,
      h(
        'div',
        { class: 'actions' },
        h('button', { class: 'quiet', type: 'button', onclick: showStreet }, 'Back to Main Street'),
        h('button', { class: 'quiet', type: 'button', id: 'tb-copy', onclick: copy }, 'Copy the link'),
        h('button', { class: 'primary', type: 'button', id: 'tb-start', onclick: () => location.assign(linkBox.value) }, 'Start it on this device'),
      ),
    ),
  );
  setHeader('Set a task');
}

// ----------------------------------------------------------------- story

function showIntro() {
  setPlaying(false);
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
      h('p', {}, 'Nell needs help in her store and its kitchen. So do Sam at the delivery depot, Ida at the town office, and Bea in the workshop.'),
      h('p', {}, 'Every job here is real work. Do it well and you earn coins.'),
      h('p', {}, 'Spend your coins to fix up the street, starting with Nell’s store.'),
      start,
    ),
  );
  setHeader('Foothold');
}

// ----------------------------------------------------------- main street

function showStreet() {
  view = null;
  round = null;
  inTask = false;
  setPlaying(false);
  app.replaceChildren(
    ...(task
      ? [
          h(
            'section',
            { class: 'card task-card' },
            h('h3', {}, 'Your task'),
            h(
              'p',
              {},
              taskSentence(),
              learner.task.done ? ' Done!' : ` You have ${learner.task.earned} so far.`,
            ),
            h(
              'button',
              { class: 'primary', type: 'button', id: 'to-task', onclick: showTask },
              learner.task.done ? 'See the result' : 'Go to the task',
            ),
          ),
        ]
      : []),
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
      h(
        'button',
        { class: 'quiet', type: 'button', id: 'fix-up', onclick: showFixUp },
        `Fix up the store (you have ${learner.coins} coins)`,
      ),
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
      { class: 'card for-teachers' },
      h('div', {}, h('h3', {}, 'For teachers'), h('p', { class: 'about' }, 'Give a student a job, a goal and a link.')),
      h('button', { class: 'quiet', type: 'button', id: 'set-task', onclick: showTaskBuilder }, 'Set a task'),
    ),
    ...(COMING_LATER.length > 0
      ? [
          h(
            'section',
            { class: 'card later' },
            h('h3', {}, 'Not open yet'),
            h('ul', {}, COMING_LATER.map((place) => h('li', {}, `${place.title} (${place.subject})`))),
          ),
        ]
      : []),
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
  setPlaying(true);
  const problem = inTask && task.skill ? focusedProblem() : nextProblem(learner, view.job, rng);
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
    tray: h('section', { class: `tray card ${view.trayClass ?? ''}`, 'aria-label': view.labels.tray }),
    till: h('section', { class: 'till', 'aria-label': view.labels.pieces }),
    actions: h('div', { class: 'actions' }),
  };
  // The till sits above the tray so that it never moves as the tray fills.
  app.replaceChildren(
    h('div', { class: 'play-side' }, parts.scene, parts.feedback),
    h('div', { class: 'play-side' }, parts.till, parts.tray, parts.actions),
  );
  renderAll();
}

function renderAll() {
  const number = round.done ? today.served : today.served + 1;
  setHeader(
    inTask
      ? `${view.taskWord} ${number} · ${learner.task.earned} of ${task.coins} coins`
      : `${view.taskWord} ${number} of ${TASKS_PER_DAY}`,
  );
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
  const buttons = [
    h(
      'button',
      { class: 'primary', type: 'button', id: 'hand-over', disabled: nothing, onclick: handOver },
      view.labels.submit,
    ),
  ];
  // A job with its own way of clearing (the number pad) has no label here.
  if (view.labels.clear) {
    buttons.unshift(
      h('button', { class: 'quiet', type: 'button', disabled: nothing, onclick: clearTray }, view.labels.clear),
    );
  }
  parts.actions.replaceChildren(...buttons);
}

// A job either hands over pieces from a till (bills, scoops) or has its
// own control for setting an amount (a form with a number pad).
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
    if (inTask) {
      learner.task.earned += round.pay;
      learner.task.served += 1;
      if (round.wrong.length === 0) learner.task.firstTry += 1;
    }
    saveLearner(learner);
    renderAll();
    document.getElementById('next')?.focus();
  } else {
    const patternId = chooseHint(result);
    const pattern = job.patterns.find((p) => p.id === patternId);
    round.result = result;
    round.hint = pattern ? pattern.hint(round.problem, answer) : null;
    if (inTask && round.wrong.length === 0) {
      // For the teacher: which mistake patterns the first wrong answer fits.
      for (const id of result.patterns) learner.task.noticed[id] = (learner.task.noticed[id] ?? 0) + 1;
      saveLearner(learner);
    }
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
    const last = inTask ? learner.task.earned >= task.coins : today.served >= TASKS_PER_DAY;
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
          {
            class: 'primary',
            type: 'button',
            id: 'next',
            onclick: last ? (inTask ? finishTask : closeDay) : startRound,
          },
          last ? (inTask ? 'Finish the task' : 'Finish for the day') : view.labels.next,
        ),
      ),
    );
    return;
  }
  if (round.wrong.length === 0) {
    // A teacher can ask for the helping picture to be shown from the start.
    const preview = inTask && task.pictures && view.preview ? view.preview(round) : null;
    parts.feedback.replaceChildren(...(preview ? [h('div', { class: 'card preview' }, preview)] : []));
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

function buy(upgrade, redraw) {
  if (learner.coins < upgrade.price || learner.shop.includes(upgrade.id)) return;
  learner.coins -= upgrade.price;
  learner.shop.push(upgrade.id);
  saveLearner(learner);
  redraw();
  (app.querySelector('.upgrades button:not(:disabled)') ?? document.getElementById('to-street')).focus();
}

/** The shop picture and what coins can buy for it. `redraw` repaints the screen after a purchase. */
function fixUpCard(redraw) {
  const forSale = UPGRADES.filter((u) => !learner.shop.includes(u.id));
  return h(
    'section',
    { class: 'card fix-up' },
    h('h2', {}, 'Fix up the store'),
    h('div', { html: shopSvg(learner.shop, UPGRADES) }),
    h('p', { role: 'status' }, 'You have ', h('strong', {}, `${learner.coins} coins`), ' to spend.'),
    forSale.length === 0
      ? h('p', {}, 'The store has everything now. It has never looked better.')
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
                  onclick: () => buy(upgrade, redraw),
                },
                'Buy',
              ),
            ),
          ),
        ),
  );
}

/** Spending coins, reached from Main Street at any time. */
function showFixUp() {
  setPlaying(false);
  app.replaceChildren(
    fixUpCard(showFixUp),
    h(
      'div',
      { class: 'actions' },
      h('button', { class: 'primary', type: 'button', id: 'to-street', onclick: showStreet }, 'Back to Main Street'),
    ),
  );
  setHeader('Nell’s store');
}

function renderDayEnd() {
  setPlaying(false);
  const { job } = summary.view;
  const working = currentSkill(learner, job);
  const record = working && learner.jobs[job.id]?.skills[working.id];
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
    fixUpCard(renderDayEnd),
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
    h(
      'div',
      { class: 'dialog-top' },
      h('h2', { id: 'progress-title', tabindex: '-1', autofocus: true }, 'Progress'),
      h('button', { class: 'quiet', type: 'button', onclick: () => progressDialog.close() }, 'Close'),
    ),
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
// A click on the dimmed area around the panel closes it.
progressDialog.addEventListener('click', (event) => {
  if (event.target === progressDialog) progressDialog.close();
});

// The title is the way home: back to Main Street from anywhere. Everything
// earned so far is already saved; only the rest of today's jobs is dropped.
document.getElementById('home').addEventListener('click', (event) => {
  event.preventDefault();
  if (learner.intro) showStreet();
  else showIntro();
  window.scrollTo(0, 0);
});

if (task) {
  // Progress on a task is kept, so a reload carries on where it stopped.
  if (learner.task?.key !== task.key) learner.task = freshTaskRecord();
  learner.intro = true;
  saveLearner(learner);
  showTask();
} else if (learner.intro) showStreet();
else showIntro();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {
    // The game still works online without offline support.
  });
}
