# Foothold

A free math game where the math is the job, and where a wrong answer is
treated as information about *how* the player is thinking.

Foothold is a small town whose main street has seen better days. You take
jobs there. Each job is real work that needs the math of its level, and no
job ever poses a question like "what is $5.00 − $2.40?" or "what is
3/4 − 1/2?".

Two things reward the work, and they are kept apart on purpose:

- **Coins** are wages. They buy decoration for the street and nothing else.
  No purchase makes the math easier, and no subject is locked behind saving
  up.
- **Promotions** are earned only by learning. Each business has a ladder of
  job titles, such as Trainee to Shop Manager at the counter. They cannot be
  bought and are never lost. Your character's outfit follows your highest
  title, from a T-shirt to a suit and tie.

| Job | Math | What you do |
|---|---|---|
| Nell's shop counter | Money, subtraction | Hand customers their change from the till, up to change from $100.00 |
| Nell's kitchen | Fractions | Measure ingredients with whichever scoops are clean |
| The delivery depot | Ratio and rate (pre-algebra) | Load boxes, book minutes, and plan how many deliveries fit |
| The town office | Linear equations (algebra) | Fill in the one number that makes a plan add up |

![The shop counter after a wrong answer: the game checks the change by adding it back to the price, explains the likely mistake, and shows a number line to count up on.](docs/screenshot.png)

![The kitchen after a wrong answer: the game compares what the recipe needs with what is in the bowl, using bars drawn to scale.](docs/kitchen.png)

![The depot after a wrong answer: the game says how many deliveries the booked time allows, and shows a table of deliveries against minutes.](docs/depot.png)

![The town office after a wrong answer: the game adds up what the order would cost, and shows how the budget is split between the charge and the rest.](docs/office.png)

When an answer is wrong, Foothold does three things:

1. **Checks it in the terms of the job.** At the counter it adds the change
   back to the price. In the kitchen it draws what is needed and what is in
   the bowl as bars, to scale. At the depot it says how many deliveries
   that load or that time would cover. At the town office it adds up what
   the plan would cost.
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

Early. Four jobs exist, with four to eight skills each. Money is US currency
and measures are US cups. It has not yet been tried with children, so the
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

At the depot, where deliveries, boxes and minutes are linked:

| Pattern | Example |
|---|---|
| Adds instead of multiplying | 7 deliveries of 6 boxes: 7 + 6 = 13 |
| Adds instead of scaling | 4 deliveries took 60 minutes, so 10 take 66 |
| Uses yesterday's amount | 60 minutes again, for 10 deliveries |
| Stops at how many times as many | 12 deliveries is 3 times 4, so 3 |
| Leaves out the head start | loads every box when 12 are already on the van |
| Subtracts instead of dividing | 48 boxes at 6 each: 48 − 6 = 42 deliveries |
| Counts a part delivery | 50 boxes at 6 each: 9 deliveries |
| Forgets the loading time | divides all the time by the time for a delivery |
| Stops at the number of deliveries | enters 8 deliveries as the minutes |
| Multiplies the two amounts for one delivery | 6 boxes × 15 minutes = 90 |

At the town office ($6 charge plus $2 each from a $26 budget; the answer
is 10, from 6 + 2n = 26):

| Pattern | Orders |
|---|---|
| Leaves out the charge | 13 (26 ÷ 2) |
| Stops after taking off the charge | 20 (26 − 6) |
| Divides before taking off the charge | 7 (26 ÷ 2 − 6) |
| Adds the charge to the budget | 16 ((26 + 6) ÷ 2) |
| Joins the charge and the price | 26 ÷ 8, when that is a whole number |
| Rounds up past the budget | one more than the budget pays for |
| Takes the cost off the target | when raising money: subtracts the cost instead of adding it |
| Leaves out the cost | when raising money: target ÷ price |
| Stops at the money needed | when raising money: target + cost |

The counter's column patterns follow the subtraction "bugs" catalogued by
Brown and Burton (1978) and VanLehn (1990). Most of the kitchen's patterns
come from treating the top and bottom of a fraction as two separate whole
numbers, often called whole-number bias. The depot's scaling pattern is
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
hands over pieces (bills, scoops) or fills in a number on a form with a
number pad.

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
src/depot/               the delivery depot: situations, patterns
src/office/              the town office: plans, situations, patterns
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

- **Town office, further on** (algebra): two offers that cost the same at
  some point, which puts the unknown on both sides
- **Workshop** (geometry): measure, cut, fit

## Contributing

The most useful contributions are observations of real learners: an answer
the game failed to explain, a hint that did not help, or a mistake pattern
that is missing. Please open an issue with the situation and what was
handed over.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
