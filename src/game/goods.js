// Things the shop sells, grouped by the price range they make sense in,
// and the looks customers can have.

const GOODS = [
  {
    upTo: 99,
    items: [
      { icon: '✏️', name: 'Pencil', ask: 'A pencil' },
      { icon: '🍭', name: 'Lollipop', ask: 'A lollipop' },
      { icon: '🍪', name: 'Cookie', ask: 'A cookie' },
      { icon: '🍌', name: 'Banana', ask: 'A banana' },
      { icon: '🍎', name: 'Apple', ask: 'An apple' },
      { icon: '🎈', name: 'Balloon', ask: 'A balloon' },
      { icon: '🍬', name: 'Candy', ask: 'A piece of candy' },
    ],
  },
  {
    upTo: 999,
    items: [
      { icon: '🍞', name: 'Bread', ask: 'A loaf of bread' },
      { icon: '🥛', name: 'Milk', ask: 'A carton of milk' },
      { icon: '🥚', name: 'Eggs', ask: 'A dozen eggs' },
      { icon: '🧀', name: 'Cheese', ask: 'Some cheese' },
      { icon: '🍯', name: 'Honey', ask: 'A jar of honey' },
      { icon: '🍓', name: 'Strawberries', ask: 'A box of strawberries' },
      { icon: '🥪', name: 'Sandwich', ask: 'A sandwich' },
      { icon: '📓', name: 'Notebook', ask: 'A notebook' },
    ],
  },
  {
    upTo: Infinity,
    items: [
      { icon: '🎂', name: 'Cake', ask: 'A cake' },
      { icon: '🧩', name: 'Puzzle', ask: 'A puzzle' },
      { icon: '📕', name: 'Book', ask: 'A book' },
      { icon: '🧸', name: 'Teddy bear', ask: 'A teddy bear' },
      { icon: '⚽', name: 'Ball', ask: 'A ball' },
      { icon: '🪁', name: 'Kite', ask: 'A kite' },
    ],
  },
];

export function pickItem(price, rng) {
  return rng.pick(GOODS.find((band) => price <= band.upTo).items);
}

// Things wages can be spent on, in the order they are offered.
export const UPGRADES = [
  { id: 'paint', name: 'Fresh paint', price: 40 },
  { id: 'flowers', name: 'Flower boxes', price: 50 },
  { id: 'sign', name: 'A new sign', price: 60 },
  { id: 'display', name: 'A window display', price: 70 },
  { id: 'awning', name: 'A striped awning', price: 80 },
  { id: 'lamp', name: 'A street lamp', price: 60 },
  { id: 'bench', name: 'A bench outside', price: 90 },
  { id: 'cat', name: 'A bed for the shop cat', price: 120 },
];

const SKIN = ['#f6d3b3', '#e8b48a', '#c98d5e', '#9a6340', '#6f4428'];
const HAIR = ['#2b1d16', '#5a3a22', '#a8672c', '#d9b25f', '#8d8f96', '#b5432e'];
const SHIRT = ['#2f7f6b', '#3d6fb0', '#c2553f', '#8a5aa8', '#d09a2a', '#4f8f3a'];

export function pickLook(rng) {
  return { skin: rng.pick(SKIN), hair: rng.pick(HAIR), shirt: rng.pick(SHIRT) };
}
