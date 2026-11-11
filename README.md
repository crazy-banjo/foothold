# Foothold

A free math game where the math is the job, and where a wrong answer is
treated as information about *how* the player is thinking.

Nell has run her corner shop for forty years, and it is looking worn. She
hires you to work the counter. A customer buys something and pays. Nothing
asks "what is $5.00 − $2.40?" You open the till and hand back the change.
The coins you earn are your wages, and you spend them fixing up the shop.

![The shop counter after a wrong answer: the game checks the change by adding it back to the price, explains the likely mistake, and shows a number line to count up on.](docs/screenshot.png)

When the change is wrong, Foothold does three things:

1. **Checks it the way a shopkeeper would.** It adds the change back to the
   price and compares that with what the customer paid.
2. **Looks for the reason.** It compares the amount handed over with what a
   set of known mistake patterns would produce. Handing back $3.60 for a
   $2.40 item paid with $5.00 is the result of breaking a dollar into dimes
   and then still counting it as a dollar, and the game says so.
3. **Gives a way forward.** A number line shows how to count up from the
   price to what was paid. It gives more away with each further try.

It then chooses the next customers so that a suspected mistake pattern is
either confirmed or ruled out.

There are no accounts, no tracking, no ads and no server. Progress is kept
in the browser it is played in.

## Status

Early. One job exists: making change at the shop counter, in six steps from
whole dollars up to customers who add coins to get rounder change back. It
uses US currency. It has not yet been tried with children, so the difficulty
curve and the wording of the hints are untested guesses.

## Play it

Play in the browser at <https://crazy-banjo.github.io/foothold/>.

To run your own copy: Foothold is plain HTML, CSS and JavaScript with no build step and no
dependencies. Browsers will not load it straight from a file, so it needs
any static web server:

```bash
npm start
```

Then open <http://localhost:8000>. Once the game has been loaded from a web
address it keeps working without a connection.

Adding `?seed=7` to the address replays the same run of customers.

## How the diagnosis works

Each mistake pattern is a small function that answers one question: *if
someone thought this way, what would they hand back here?* Diagnosis asks
which patterns predict the amount that was actually handed over.

| Pattern | Example ($2.40 paid with $5.00, unless noted) |
|---|---|
| Breaks a dollar but still counts it | $3.60 |
| Takes the smaller digit from the larger | $3.40 |
| Regrouping across a zero | $2.73 for a $2.37 item |
| Hands back the price | $2.40 |
| Ignores the cents in the price | $3.00 |
| Leaves out the cents | $2.00 |
| Leaves out the dollars | 60¢ |

The first three follow the subtraction "bugs" catalogued by Brown and Burton
(1978) and VanLehn (1990). The rest are specific to making change.

One wrong answer is weak evidence, and sometimes more than one pattern
explains it. So the game keeps a running level of evidence for each pattern.
A hint about a pattern is given only when one pattern explains the answer,
or when the player has shown that pattern before. Getting a problem right
where a pattern would have gone wrong counts against it.

The check and the number line are true whatever the cause, so the player is
never told something false when the diagnosis is uncertain.

## Layout

```
index.html, styles.css   the page
sw.js                    offline support
src/engine/              the math: no browser code, fully tested
  change.js              the six skills and the situations for each
  patterns.js            the mistake patterns
  diagnose.js            matching an answer to patterns
  learner.js             mastery, evidence, choosing the next situation
  countup.js             the counting-up steps
  money.js, rng.js       cents and a seeded random number generator
src/game/                the shop counter screen
test/                    engine tests
```

## Tests

```bash
npm test
```

Needs Node.js 20 or later. Nothing to install.

## Where this is going

The counter is the first of several jobs, each one a real task that needs
the math of its level. In the story, each is a new part of Nell's business:

- **Kitchen** (fractions): scale recipes, split portions
- **Deliveries** (pre-algebra): routes, speeds, times
- **Running the business** (algebra): prices, break-even
- **Workshop** (geometry): measure, cut, fit

## Contributing

The most useful contributions are observations of real learners: an answer
the game failed to explain, a hint that did not help, or a mistake pattern
that is missing. Please open an issue with the price, what was paid, and
what was handed back.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
