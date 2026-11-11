// Counting up: the way change is counted back at a real till. Start at the
// price and step to the next dime, the next dollar, the next ten dollars
// when there is a long way to go, and on to what was paid.

/** @returns {{ from: number, to: number, add: number }[]} */
export function countUp(price, paid) {
  const steps = [];
  let at = price;
  const stepTo = (to) => {
    if (to > at && to <= paid) {
      steps.push({ from: at, to, add: to - at });
      at = to;
    }
  };
  stepTo(Math.ceil(at / 10) * 10);
  stepTo(Math.ceil(at / 100) * 100);
  if (paid - at > 1000) stepTo(Math.ceil(at / 1000) * 1000);
  stepTo(Math.floor(paid / 100) * 100);
  stepTo(paid);
  return steps;
}
