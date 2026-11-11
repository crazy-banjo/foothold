// Money is always held as a whole number of cents, so there is no
// floating-point rounding anywhere in the game.

export const DENOMINATIONS = [
  { id: 'twenty', cents: 2000, label: '$20', kind: 'bill', name: '20 dollar bill', inTill: false },
  { id: 'ten', cents: 1000, label: '$10', kind: 'bill', name: '10 dollar bill', inTill: true },
  { id: 'five', cents: 500, label: '$5', kind: 'bill', name: '5 dollar bill', inTill: true },
  { id: 'one', cents: 100, label: '$1', kind: 'bill', name: '1 dollar bill', inTill: true },
  { id: 'quarter', cents: 25, label: '25¢', kind: 'coin', name: 'quarter', inTill: true },
  { id: 'dime', cents: 10, label: '10¢', kind: 'coin', name: 'dime', inTill: true },
  { id: 'nickel', cents: 5, label: '5¢', kind: 'coin', name: 'nickel', inTill: true },
  { id: 'penny', cents: 1, label: '1¢', kind: 'coin', name: 'penny', inTill: true },
];

export const TILL = DENOMINATIONS.filter((d) => d.inTill);

/** 240 -> "$2.40", 40 -> "40¢". */
export function formatMoney(cents) {
  if (cents < 0) return `-${formatMoney(-cents)}`;
  if (cents < 100) return `${cents}¢`;
  return `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

/** The fewest bills and coins that make up an amount, largest first. */
export function breakdown(cents) {
  const pieces = [];
  let left = cents;
  for (const d of DENOMINATIONS) {
    while (left >= d.cents) {
      pieces.push(d);
      left -= d.cents;
    }
  }
  return pieces;
}

export function total(pieces) {
  return pieces.reduce((sum, p) => sum + p.cents, 0);
}
