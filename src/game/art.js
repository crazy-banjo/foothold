// All pictures are drawn in code as SVG, so the game needs no image files.

import { formatMoney } from '../counter/money.js';

// Coin sizes keep the real order: the dime is the smallest coin.
const COIN_SIZE = { quarter: 46, nickel: 40, penny: 36, dime: 32 };

export function pieceSvg(denomination) {
  const { id, label, kind } = denomination;
  if (kind === 'bill') {
    return `<svg class="bill" viewBox="0 0 96 44" width="96" height="44" aria-hidden="true">
      <rect x="1" y="1" width="94" height="42" rx="6" fill="#cfe6c4" stroke="#4f7d48" stroke-width="2"/>
      <rect x="8" y="8" width="80" height="28" rx="3" fill="none" stroke="#4f7d48" stroke-width="1.5" opacity=".6"/>
      <text x="48" y="30" text-anchor="middle" font-size="20" font-weight="700" fill="#28502a">${label}</text>
    </svg>`;
  }
  const size = COIN_SIZE[id];
  // Smaller coins get a larger label so that it stays readable.
  const fontSize = Math.min(20, Math.round((15 * 46) / size));
  const [fill, edge] = id === 'penny' ? ['#d9905a', '#93522a'] : ['#d5d9de', '#7b828b'];
  return `<svg class="coin" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="24" cy="24" r="22" fill="${fill}" stroke="${edge}" stroke-width="2"/>
    <circle cx="24" cy="24" r="17" fill="none" stroke="${edge}" stroke-width="1" opacity=".6"/>
    <text x="24" y="${24 + fontSize * 0.36}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="#2b2622">${label}</text>
  </svg>`;
}

const MOUTH = {
  neutral: 'M33 43h14',
  happy: 'M31 40q9 9 18 0',
  puzzled: 'M34 44q6-2 12 1',
};

export function customerSvg(look, mood) {
  const brow =
    mood === 'puzzled'
      ? '<path d="M29 28q4-3 8 0M43 26q4-3 8 0" fill="none" stroke="#2b2622" stroke-width="2" stroke-linecap="round"/>'
      : '';
  return `<svg viewBox="0 0 80 84" width="96" height="100" aria-hidden="true">
    <path d="M8 84c0-18 14-26 32-26s32 8 32 26z" fill="${look.shirt}"/>
    <circle cx="40" cy="36" r="21" fill="${look.skin}"/>
    <path d="M19 33a21 21 0 0 1 42 0c-5-9-13-11-21-11s-16 2-21 11z" fill="${look.hair}"/>
    <circle cx="33" cy="35" r="2.4" fill="#2b2622"/>
    <circle cx="47" cy="35" r="2.4" fill="#2b2622"/>
    ${brow}
    <path d="${MOUTH[mood]}" fill="none" stroke="#2b2622" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`;
}

const OUTFITS = ['a T-shirt', 'an apron', 'a collared shirt', 'a shirt and tie', 'a suit and tie'];

/**
 * The player's own character. The outfit follows the highest job title
 * reached anywhere on Main Street: 0 is a new hire, 4 is the top job.
 */
export function playerSvg(level) {
  const body = level >= 4 ? '#2f3a56' : level >= 2 ? '#e4eaf3' : '#4f8f3a';
  const apron =
    level === 1
      ? `<path d="M27 63h26v21H27z" fill="#f4ead2" stroke="#b9a77e" stroke-width="1.5"/>
         <path d="M28 63l5-6M52 63l-5-6" fill="none" stroke="#b9a77e" stroke-width="2"/>`
      : '';
  const jacket =
    level >= 4
      ? `<path d="M30 58l10 22 10-22z" fill="#ffffff"/>
         <path d="M30 58l10 22M50 58l-10 22" fill="none" stroke="#1c2338" stroke-width="2"/>`
      : '';
  const collar =
    level >= 2
      ? '<path d="M32 57l8 8-10 3zM48 57l-8 8 10 3z" fill="#ffffff" stroke="#aab4c4" stroke-width="1"/>'
      : '';
  const tie = level >= 3 ? '<path d="M38 64h4l2.5 12-4.5 5-4.5-5z" fill="#c2553f"/>' : '';
  return `<svg class="player" viewBox="0 0 80 84" width="96" height="100" role="img" aria-label="You, wearing ${OUTFITS[level]}.">
    <path d="M8 84c0-18 14-26 32-26s32 8 32 26z" fill="${body}"/>
    ${apron}${jacket}${collar}${tie}
    <circle cx="40" cy="36" r="21" fill="#c98d5e"/>
    <path d="M19 33a21 21 0 0 1 42 0c-5-9-13-11-21-11s-16 2-21 11z" fill="#3b2618"/>
    <circle cx="33" cy="35" r="2.4" fill="#2b2622"/>
    <circle cx="47" cy="35" r="2.4" fill="#2b2622"/>
    <path d="M31 40q9 9 18 0" fill="none" stroke="#2b2622" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`;
}

/** The shop front. It starts out worn and improves with each upgrade. */
export function shopSvg(owned, upgrades) {
  const has = (id) => owned.includes(id);
  const painted = has('paint');
  const wall = painted ? '#f3dfae' : '#b8b0a3';
  const trim = painted ? '#1f7a5c' : '#857c70';
  const names = upgrades.filter((u) => has(u.id)).map((u) => u.name.toLowerCase());
  const label = names.length
    ? `Nell’s shop, now with: ${names.join(', ')}.`
    : 'Nell’s shop. The paint is cracked and the sign is missing a letter.';
  const flowers = [0, 1, 2, 3, 4, 5, 6]
    .map((i) => `<circle cx="${69 + i * 15}" cy="149" r="5" fill="${i % 2 ? '#f2c14e' : '#e2607a'}"/>`)
    .join('');
  const stripes = [0, 1, 2, 3, 4]
    .map((i) => `<rect x="${72 + i * 44}" y="80" width="22" height="16" fill="#fff" opacity=".85"/>`)
    .join('');
  return `<svg class="shop" viewBox="0 0 320 200" role="img" aria-label="${label}">
    <rect x="0" y="178" width="320" height="22" fill="#9a9488"/>
    <rect x="40" y="46" width="240" height="134" fill="${wall}" stroke="${trim}" stroke-width="3"/>
    ${painted ? '' : '<path d="M70 58l8 14-5 10M262 112l-9 12 6 12M186 96l4 12-3 8" fill="none" stroke="#857c70" stroke-width="1.5"/>'}
    ${
      has('sign')
        ? `<rect x="76" y="52" width="168" height="26" rx="4" fill="#1f7a5c"/>
           <text x="160" y="71" text-anchor="middle" font-size="16" font-weight="700" letter-spacing="1" fill="#fff">NELL’S SHOP</text>`
        : `<g transform="rotate(-4 160 65)"><rect x="100" y="54" width="120" height="22" fill="#9b9285" stroke="#7a7266"/>
           <text x="160" y="70" text-anchor="middle" font-size="13" letter-spacing="3" fill="#6f675c">SH P</text></g>`
    }
    <rect x="58" y="92" width="112" height="60" fill="${has('display') ? '#cfeaf5' : '#aab6b8'}" stroke="${trim}" stroke-width="3"/>
    ${
      has('display')
        ? `<rect x="66" y="136" width="96" height="3" fill="#a87947"/>
           <ellipse cx="86" cy="128" rx="15" ry="8" fill="#d39b52"/>
           <circle cx="113" cy="129" r="7" fill="#d9483b"/><circle cx="127" cy="129" r="7" fill="#e5a93a"/>
           <rect x="141" y="116" width="13" height="20" rx="2" fill="#e8c05a"/><rect x="140" y="112" width="15" height="5" fill="#8a5a2b"/>`
        : '<path d="M66 100l20 20M148 100l14 14M70 142l12-12" stroke="#8f9a9c" stroke-width="2"/>'
    }
    <rect x="198" y="92" width="54" height="88" fill="${painted ? '#8a5a2b' : '#75695b'}" stroke="${trim}" stroke-width="3"/>
    <rect x="208" y="102" width="34" height="30" fill="#cfeaf5" opacity=".8"/>
    <circle cx="244" cy="142" r="3" fill="#e2b13c"/>
    ${has('awning') ? `<path d="M50 80h220l10 16H40z" fill="#c2553f"/>${stripes}` : ''}
    ${has('flowers') ? `<rect x="58" y="152" width="112" height="9" fill="#8a5a2b"/>${flowers}` : ''}
    ${
      has('bench')
        ? '<rect x="70" y="166" width="88" height="5" fill="#a87947"/><rect x="75" y="171" width="4" height="9" fill="#7a5632"/><rect x="149" y="171" width="4" height="9" fill="#7a5632"/>'
        : ''
    }
    ${
      has('lamp')
        ? '<rect x="297" y="92" width="4" height="88" fill="#3d3a36"/><circle cx="299" cy="84" r="9" fill="#ffd866" stroke="#3d3a36" stroke-width="2"/>'
        : ''
    }
    ${
      has('cat')
        ? `<path d="M263 176q-9-2-6-10" fill="none" stroke="#e07f33" stroke-width="3" stroke-linecap="round"/>
           <ellipse cx="271" cy="172" rx="9" ry="7" fill="#f08a3c"/><circle cx="278" cy="162" r="6" fill="#f08a3c"/>
           <path d="M273 158l1-6 4 4zM280 156l4-4 0 6z" fill="#f08a3c"/>
           <circle cx="276" cy="162" r="1" fill="#2b2622"/><circle cx="281" cy="162" r="1" fill="#2b2622"/>`
        : ''
    }
  </svg>`;
}

/**
 * A number line from the price up to what was paid, one hop per step.
 * The size of each hop is shown only when `showAmounts` is true.
 */
export function numberLineSvg(steps, showAmounts) {
  const stops = [steps[0].from, ...steps.map((s) => s.to)];
  const left = 34;
  const span = 272;
  const x = (i) => left + (span * i) / (stops.length - 1);
  const hops = steps
    .map((step, i) => {
      const a = x(i);
      const b = x(i + 1);
      const mid = (a + b) / 2;
      const label = showAmounts ? `+${formatMoney(step.add)}` : '+ ?';
      return `<path d="M${a} 56Q${mid} 12 ${b} 56" class="hop"/>
        <text x="${mid}" y="24" text-anchor="middle" class="hop-label">${label}</text>`;
    })
    .join('');
  const marks = stops
    .map((cents, i) => {
      const end = i === 0 || i === stops.length - 1;
      return `<circle cx="${x(i)}" cy="60" r="${end ? 5 : 4}" class="stop"/>
        <text x="${x(i)}" y="82" text-anchor="middle" class="stop-label${end ? ' end' : ''}">${formatMoney(cents)}</text>`;
    })
    .join('');
  return `<svg class="number-line" viewBox="0 0 340 92" role="img" aria-label="${numberLineText(steps, showAmounts)}">
    <line x1="${left - 16}" y1="60" x2="${left + span + 16}" y2="60" class="line"/>
    ${hops}${marks}
  </svg>`;
}

export function numberLineText(steps, showAmounts) {
  const parts = steps.map((s) =>
    showAmounts
      ? `${formatMoney(s.from)} plus ${formatMoney(s.add)} is ${formatMoney(s.to)}`
      : `from ${formatMoney(s.from)} to ${formatMoney(s.to)}`,
  );
  return `Counting up: ${parts.join(', then ')}.`;
}
