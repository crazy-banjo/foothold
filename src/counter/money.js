// Money is always held as a whole number of cents, so there is no
// floating-point rounding anywhere in the game.

// `till` says where a piece is available: 'all' tills have it, 'big' tills
// have it only when customers pay with large bills, and 'none' means it is
// only ever handed over by a customer.
export const DENOMINATIONS = [
  { id: 'hundred', cents: 10000, label: '$100', kind: 'bill', name: '100 dollar bill', till: 'none' },
  { id: 'fifty', cents: 5000, label: '$50', kind: 'bill', name: '50 dollar bill', till: 'big' },
  { id: 'twenty', cents: 2000, label: '$20', kind: 'bill', name: '20 dollar bill', till: 'big' },
  { id: 'ten', cents: 1000, label: '$10', kind: 'bill', name: '10 dollar bill', till: 'all' },
  { id: 'five', cents: 500, label: '$5', kind: 'bill', name: '5 dollar bill', till: 'all' },
  { id: 'one', cents: 100, label: '$1', kind: 'bill', name: '1 dollar bill', till: 'all' },
  { id: 'quarter', cents: 25, label: '25¢', kind: 'coin', name: 'quarter', till: 'all' },
  { id: 'dime', cents: 10, label: '10¢', kind: 'coin', name: 'dime', till: 'all' },
  { id: 'nickel', cents: 5, label: '5¢', kind: 'coin', name: 'nickel', till: 'all' },
  { id: 'penny', cents: 1, label: '1¢', kind: 'coin', name: 'penny', till: 'all' },
];

/** The everyday till. */
export const TILL = DENOMINATIONS.filter((d) => d.till === 'all');
/** The till once customers pay with fifties and hundreds. */
export const BIG_TILL = DENOMINATIONS.filter((d) => d.till !== 'none');

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
