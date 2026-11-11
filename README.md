# Foothold

A free math game where the math is the job, and where a wrong answer is
treated as information about *how* the player is thinking.

Foothold is a small town whose main street has seen better days. You take
jobs there. Each job is real work that needs the math of its level, and no
job ever poses a question like "what is $5.00 − $2.40?" or "what is
3/4 − 1/2?". The coins you earn are wages, and you spend them fixing up the
street.

| Job | Math | What you do |
|---|---|---|
| Nell's shop counter | Money, subtraction | Hand customers their change from the till |
| Nell's kitchen | Fractions | Measure ingredients with whichever scoops are clean |
| The delivery depot | Ratio and rate (pre-algebra) | Pump just enough fuel for the van's trip |

![The shop counter after a wrong answer: the game checks the change by adding it back to the price, explains the likely mistake, and shows a number line to count up on.](docs/screenshot.png)

![The kitchen after a wrong answer: the game compares what the recipe needs with what is in the bowl, using bars drawn to scale.](docs/kitchen.png)

![The depot after a wrong answer: the game says how far the pumped fuel would take the van, and shows the van's trip table.](docs/depot.png)

When an answer is wrong, Foothold does three things:

1. **Checks it in the terms of the job.** At the counter it adds the change
   back to the price. In the kitchen it draws what is needed and what is in
   the bowl as bars, to scale. At the depot it says how far that much fuel
   would take the van.
2. **Looks for the reason.** It compares what was handed over with what a
   set of known mistake patterns would produce. Handing back $3.60 for a
   $2.40 item paid with $5.00 is the result of breaking a dollar into dimes
   and then still counting it as a dollar, and the game says so.
3. **Gives a way forward.** A picture to reason with, which gives more away
   with each further try.

It then chooses the next situations so that a suspected mistake pattern is
either confirmed or ruled out.

There are no accounts, no tracking, no ads and no server. Progress is kept
in the browser it is played in.

## Status

Early. Three jobs exist, with five or six skills each. Money is US currency
and measures are US cups, gallons and miles. It has not yet been tried with children, so the
difficulty curve and the wording of the hints are untested guesses.

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
someone thought this way, what would they hand over here?* Diagnosis asks
which patterns predict what was actually handed over.

At the counter ($2.40 paid with $5.00, unless noted):

| Pattern | Hands back |
|---|---|
| Breaks a dollar but still counts it | $3.60 |
| Takes the smaller digit from the larger | $3.40 |
| Regrouping across a zero | $2.73 for a $2.37 item |
| Hands back the price | $2.40 |
| Ignores the cents in the price | $3.00 |
| Leaves out the cents | $2.00 |
| Leaves out the dollars | 60¢ |

In the kitchen:

| Pattern | Example |
|---|---|
| Counts the bottom number | 4 quarter-cup scoops for 3/4 cup |
| Uses a single scoop | 1 quarter-cup scoop for 3/4 cup |
| Keeps the top number when the scoop changes | 1 eighth-cup scoop for 1/4 cup |
| Adds the same number to top and bottom | 1/2 "becomes" 3/4 |
| Ignores what is already in the bowl | adds 3/4 cup when 1/2 cup is there |
| Subtracts tops and bottoms separately | 3/4 − 1/2 = 2/2 |
| Subtracts the tops across different sizes | 3/4 − 1/2 = 2/4 |
| Leaves the amount as it is | 3/8 cup for two batches of 3/8 cup |
| Multiplies the bottom number | two batches of 1/2 cup = 1/4 cup |
| Adds instead of multiplying | two batches of 3/8 cup = 5/8 cup |
| Halves the bottom number | half of 1/4 cup = 1/2 cup |

At the depot (2 gallons go 30 miles; the trip is 90 miles; the answer is 6):

| Pattern | Pumps |
|---|---|
| Adds instead of scaling | 62 gallons (90 is 60 more than 30) |
| Pumps the fuel for the known trip | 2 gallons |
| Stops at how many times as far | 3 gallons |
| Divides the miles by the gallons | 45 gallons |
| Forgets the way back | half of what a return trip needs |
| Ignores the fuel already in the tank | the fuel for the whole trip |

The counter's column patterns follow the subtraction "bugs" catalogued by
Brown and Burton (1978) and VanLehn (1990). Most of the kitchen's patterns
come from treating the top and bottom of a fraction as two separate whole
numbers, often called whole-number bias. The depot's first pattern is
additive reasoning, the most widely reported error in ratio problems.

One wrong answer is weak evidence, and sometimes more than one pattern
explains it. So the game keeps a running level of evidence for each pattern.
A hint about a pattern is given only when one pattern explains the answer,
or when the player has shown that pattern before. Getting a situation right
where a pattern would have gone wrong counts against it.

The check and the picture are true whatever the cause, so the player is
never told something false when the diagnosis is uncertain.

A pattern can only be recognised if its wrong answer can actually be handed
over. In the kitchen, an answer such as 2/5 cup cannot be measured with the
scoops, so "adds tops and bottoms" does not appear there yet.

## Adding a job

A job is one object (see `src/engine/diagnose.js` for the full list of what
it provides): its skills in teaching order, a generator of situations, the
right answer for a situation, and its mistake patterns. Every answer is a
whole number of some small unit, such as cents or twenty-fourths of a cup.
The learner model, the diagnosis and the choice of the next situation are
shared by all jobs. A job also needs a screen in `src/game/`, which either
hands over pieces (bills, scoops) or has its own control (the fuel pump).

## Layout

```
index.html, styles.css   the page
sw.js                    offline support
src/engine/              shared by every job: no browser code
  diagnose.js            matching an answer to mistake patterns
  learner.js             mastery, evidence, choosing the next situation
  rng.js                 a seeded random number generator
src/counter/             the shop counter: money, situations, patterns
src/kitchen/             the kitchen: fractions, situations, patterns
src/depot/               the delivery depot: trips, situations, patterns
src/game/                the screens: Main Street, each job, the story
test/                    tests for the engine and every job
```

## Tests

```bash
npm test
```

Needs Node.js 20 or later. Nothing to install.

## Where this is going

More buildings on Main Street, each with its own way of playing:

- **Town office** (algebra): prices, break-even
- **Workshop** (geometry): measure, cut, fit

## Contributing

The most useful contributions are observations of real learners: an answer
the game failed to explain, a hint that did not help, or a mistake pattern
that is missing. Please open an issue with the situation and what was
handed over.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
