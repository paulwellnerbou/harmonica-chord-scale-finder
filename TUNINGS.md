# Tunings — what went in, and what to check

Review notes for the alternate-tuning feature: 25 tunings, all 10-hole. The tables
below are printed from the running code, not transcribed by hand.

## How the model works

`src/harmonica.js` holds nothing per tuning but its **twenty reeds**, written out as
notes for the key of C and anchored at hole 1 blow — middle C on every tuning here,
so the app's harp key always names that reed. Every other key is the same
transposition as before.

Everything else falls out of those reeds, for every tuning alike:

- **Bends** — you bend the higher reed of a hole down towards the lower one, so the
  bends are the chromatic notes strictly between the two. The higher reed being the
  draw one makes them draw bends, the blow one blow bends.
- **Over-notes** — an overblow (where the draw reed is the higher) or overdraw (where
  the blow reed is) one semitone above the higher reed.
- **…except** an over-note whose exact pitch a plain reed already sounds, which is
  dropped as no note of its own. That is the rule that removes Richter's 3 overblow
  (hole 4's blow) and 8 overdraw (hole 9's draw), and it was checked to reproduce the
  old hand-written Richter table reed for reed before anything else was added.

So a tuning is added by adding its twenty reeds and nothing else — no bend tables to
keep in step. The grid grew from eight rows to nine to fit a third blow-bend row, and
any row the current tuning never reaches collapses away, so Easy Third and the
PentaHarp draw shorter than Richter and harmonic minor draws taller.

## Where the reeds come from

Every blow and draw row below matches **Seydel's own data**, from their tone tables
and the harp-configurator endpoint their shop calls
(`seydel1847.de/en/harp-configurator/stimmung-offsets/<id>`, which returns a tuning's
reed offsets in semitones from the tonic). The app's rows were written from the
descriptions each maker publishes first, then diffed against that data — zero
differences across all 24 of them. The 25th, Chris Kramer's Signature, is not a
Seydel tuning; it matches the chart Chris Kramer prints on the harp itself.

Two further checks run against the same code: every tuning's bends fit the grid's
three rows a side, and every suggestion pill parses and is playable on its own harp
(none of them even needs an overblow).

The picker groups them by how far the layout moves from Richter, which is measured
from the reeds rather than asserted: **Richter & retunings** move a few reeds a
semitone or two and leave every note in its own hole, so your Richter habits carry
over; **rebuilt layouts** move notes between holes; **symmetrical** ones repeat one
shape in every key. Nothing in the grouping claims what a tuning is *for* — Richter
plays blues, Wilde plays rock — and nothing claims what is standard; each row names
its maker instead.

## The tunings, as a C harp

Bends are marked ′ ″ ‴ by depth in semitones, over-notes with °. "Positions" is the
line under the title; "pills" are the suggestion buttons above the harp.
## Richter & retunings

### Richter  <sub>`richter`</sub>

The standard blues harp

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | G4 | C5 | E5 | G5 | C6 | E6 | G6 | C7 |
| **draw** | D4 | G4 | B4 | D5 | F5 | A5 | B5 | D6 | F6 | A6 |
| draw bend ′ | D♭ | G♭ | B♭ | D♭ | – | A♭ | – | – | – | – |
| draw bend ″ | – | F | A | – | – | – | – | – | – | – |
| draw bend ‴ | – | – | A♭ | – | – | – | – | – | – | – |
| blow bend ′ | – | – | – | – | – | – | – | E♭ | G♭ | B |
| blow bend ″ | – | – | – | – | – | – | – | – | – | B♭ |
| overblow ° | E♭ | A♭ | – | E♭ | G♭ | B♭ | – | – | – | – |
| overdraw ° | – | – | – | – | – | – | D♭ | – | A♭ | D♭ |

Positions: 2nd G (cross harp) · 3rd Dm

Pills: C Major · G Blues · G Minor Pentatonic · D Minor · D Blues · C · C Major Pentatonic · G7 · G Mixolydian · D Dorian · A Minor

### Paddy Richter  <sub>`paddy-richter`</sub>

3 blow up to the 6th — fiddle tunes and Irish airs without bending · Brendan Power; Seydel and most custom shops

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | A4 | C5 | E5 | G5 | C6 | E6 | G6 | C7 |
| **draw** | D4 | G4 | B4 | D5 | F5 | A5 | B5 | D6 | F6 | A6 |
| draw bend ′ | D♭ | G♭ | B♭ | D♭ | – | A♭ | – | – | – | – |
| draw bend ″ | – | F | – | – | – | – | – | – | – | – |
| blow bend ′ | – | – | – | – | – | – | – | E♭ | G♭ | B |
| blow bend ″ | – | – | – | – | – | – | – | – | – | B♭ |
| overblow ° | E♭ | A♭ | – | E♭ | G♭ | B♭ | – | – | – | – |
| overdraw ° | – | – | – | – | – | – | D♭ | – | A♭ | D♭ |

Positions: 2nd G (cross harp) · 3rd Dm

Pills: C Major · D Dorian · A Minor · C6 · G7 · C Major Pentatonic · G Mixolydian

### Country  <sub>`country`</sub>

5 draw up a semitone — the major 7th that 2nd position lacks, for country and swing · Seydel, Hohner and others

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | G4 | C5 | E5 | G5 | C6 | E6 | G6 | C7 |
| **draw** | D4 | G4 | B4 | D5 | G♭5 | A5 | B5 | D6 | F6 | A6 |
| draw bend ′ | D♭ | G♭ | B♭ | D♭ | F | A♭ | – | – | – | – |
| draw bend ″ | – | F | A | – | – | – | – | – | – | – |
| draw bend ‴ | – | – | A♭ | – | – | – | – | – | – | – |
| blow bend ′ | – | – | – | – | – | – | – | E♭ | G♭ | B |
| blow bend ″ | – | – | – | – | – | – | – | – | – | B♭ |
| overblow ° | E♭ | A♭ | – | E♭ | – | B♭ | – | – | – | – |
| overdraw ° | – | – | – | – | – | – | D♭ | – | A♭ | D♭ |

Positions: 2nd G (cross harp)

Pills: G Major · Gmaj7 · G7 · C Major · C · G Blues · D Minor

### Melody Maker  <sub>`melody-maker`</sub>

Paddy’s 3 blow plus 5 and 9 draw up — the whole major scale in 2nd position, the key it is sold under · Lee Oskar, Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | A4 | C5 | E5 | G5 | C6 | E6 | G6 | C7 |
| **draw** | D4 | G4 | B4 | D5 | G♭5 | A5 | B5 | D6 | G♭6 | A6 |
| draw bend ′ | D♭ | G♭ | B♭ | D♭ | F | A♭ | – | – | – | – |
| draw bend ″ | – | F | – | – | – | – | – | – | – | – |
| blow bend ′ | – | – | – | – | – | – | – | E♭ | – | B |
| blow bend ″ | – | – | – | – | – | – | – | – | – | B♭ |
| overblow ° | E♭ | A♭ | – | E♭ | – | B♭ | – | – | – | – |
| overdraw ° | – | – | – | – | – | – | D♭ | F | A♭ | D♭ |

Positions: 1st C Lydian · 2nd G (cross harp) · 3rd D

Pills: G Major · G Major Pentatonic · G · C6 · A Dorian · D Mixolydian · C Lydian

### Easy Third  <sub>`easy-third`</sub>

2 and 3 draw a tone lower — 3rd position without bending · Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | G4 | C5 | E5 | G5 | C6 | E6 | G6 | C7 |
| **draw** | D4 | F4 | A4 | D5 | F5 | A5 | B5 | D6 | F6 | A6 |
| draw bend ′ | D♭ | – | A♭ | D♭ | – | A♭ | – | – | – | – |
| blow bend ′ | – | – | – | – | – | – | – | E♭ | G♭ | B |
| blow bend ″ | – | – | – | – | – | – | – | – | – | B♭ |
| overblow ° | E♭ | G♭ | B♭ | E♭ | G♭ | B♭ | – | – | – | – |
| overdraw ° | – | – | – | – | – | – | D♭ | – | A♭ | D♭ |

Positions: 2nd G (cross harp) · 3rd Dm

Pills: D Minor Pentatonic · Dm · D Dorian · D Blues · C Major · C · G Mixolydian

### Chris Kramer Signature  <sub>`chris-kramer`</sub>

Easy Third with 7 draw down a semitone as well — natural minor and its chords in 3rd position · Chris Kramer

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | G4 | C5 | E5 | G5 | C6 | E6 | G6 | C7 |
| **draw** | D4 | F4 | A4 | D5 | F5 | A5 | B♭5 | D6 | F6 | A6 |
| draw bend ′ | D♭ | – | A♭ | D♭ | – | A♭ | – | – | – | – |
| blow bend ′ | – | – | – | – | – | – | B | E♭ | G♭ | B |
| blow bend ″ | – | – | – | – | – | – | – | – | – | B♭ |
| overblow ° | E♭ | G♭ | B♭ | E♭ | G♭ | – | – | – | – | – |
| overdraw ° | – | – | – | – | – | – | D♭ | – | A♭ | D♭ |

Positions: 1st C Mixolydian · 2nd Gm (cross harp) · 3rd Dm

Pills: D Minor · D Minor Pentatonic · Dm · D Blues · B♭maj7 · C · C Mixolydian

> **Confirmed against Chris Kramer's own chart** (the "C3.P" harp): blow unchanged,
> and the three reeds printed in red are 2 draw F, 3 draw A and 7 draw B♭ — Easy
> Third plus 7 draw down a semitone. That is what makes 3rd position natural minor
> rather than Dorian, and it puts a Dm under 1–4 draw and a B♭maj7 under 4–7 draw.
> The layout isn't published on his shop page; the same three changes are documented
> on harpforum as "Mojo-Stimmung".

### Natural Minor  <sub>`natural-minor`</sub>

Richter with minor 3rds — minor in 2nd position, the key makers label it by · Suzuki, Seydel, Lee Oskar

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E♭4 | G4 | C5 | E♭5 | G5 | C6 | E♭6 | G6 | C7 |
| **draw** | D4 | G4 | B♭4 | D5 | F5 | A5 | B♭5 | D6 | F6 | A6 |
| draw bend ′ | D♭ | G♭ | A | D♭ | E | A♭ | – | – | – | – |
| draw bend ″ | – | F | A♭ | – | – | – | – | – | – | – |
| draw bend ‴ | – | E | – | – | – | – | – | – | – | – |
| blow bend ′ | – | – | – | – | – | – | B | – | G♭ | B |
| blow bend ″ | – | – | – | – | – | – | – | – | – | B♭ |
| overblow ° | – | A♭ | B | – | G♭ | – | – | – | – | – |
| overdraw ° | – | – | – | – | – | – | D♭ | E | A♭ | D♭ |

Positions: 1st C Dorian · 2nd Gm (cross harp) · 3rd Dm

Pills: G Minor · G Minor Pentatonic · G Blues · Gm · Cm · C Dorian · D Minor Pentatonic · D Phrygian

### Harmonic Minor  <sub>`harmonic-minor`</sub>

Minor with a major 7th, for klezmer and Eastern melodies · Suzuki, Seydel, Hohner

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E♭4 | G4 | C5 | E♭5 | G5 | C6 | E♭6 | G6 | C7 |
| **draw** | D4 | G4 | B4 | D5 | F5 | A♭5 | B5 | D6 | F6 | A♭6 |
| draw bend ′ | D♭ | G♭ | B♭ | D♭ | E | – | – | – | – | – |
| draw bend ″ | – | F | A | – | – | – | – | – | – | – |
| draw bend ‴ | – | E | A♭ | – | – | – | – | – | – | – |
| blow bend ′ | – | – | – | – | – | – | – | – | G♭ | B |
| blow bend ″ | – | – | – | – | – | – | – | – | – | B♭ |
| blow bend ‴ | – | – | – | – | – | – | – | – | – | A |
| overblow ° | – | A♭ | – | – | G♭ | A | – | – | – | – |
| overdraw ° | – | – | – | – | – | – | D♭ | E | – | D♭ |

Positions: 1st C Harmonic Minor · 2nd G (cross harp)

Pills: C Harmonic Minor · Cm · Cmmaj7 · G Phrygian Dominant · G7♭9

### Dorian  <sub>`dorian`</sub>

Richter with 3 and 7 draw a tone down — Dorian minor in 2nd position, major chord still on the blow · Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | G4 | C5 | E5 | G5 | C6 | E6 | G6 | C7 |
| **draw** | D4 | G4 | B♭4 | D5 | F5 | A5 | B♭5 | D6 | F6 | A6 |
| draw bend ′ | D♭ | G♭ | A | D♭ | – | A♭ | – | – | – | – |
| draw bend ″ | – | F | A♭ | – | – | – | – | – | – | – |
| blow bend ′ | – | – | – | – | – | – | B | E♭ | G♭ | B |
| blow bend ″ | – | – | – | – | – | – | – | – | – | B♭ |
| overblow ° | E♭ | A♭ | B | E♭ | G♭ | – | – | – | – | – |
| overdraw ° | – | – | – | – | – | – | D♭ | – | A♭ | D♭ |

Positions: 1st C Mixolydian · 2nd Gm (cross harp) · 3rd Dm

Pills: G Dorian · G Minor Pentatonic · Gm · G Blues · C · C Mixolydian · D Minor

## Rebuilt layouts

### Wilde  <sub>`wilde`</sub>

Holes 2–4 again up top — blues runs in 2nd position all the way up · Will Wilde, Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | G4 | C5 | E5 | E5 | G5 | C6 | E6 | A6 |
| **draw** | D4 | G4 | B4 | D5 | F5 | G5 | B5 | D6 | G6 | C7 |
| draw bend ′ | D♭ | G♭ | B♭ | D♭ | – | G♭ | B♭ | D♭ | G♭ | B |
| draw bend ″ | – | F | A | – | – | F | A | – | F | B♭ |
| draw bend ‴ | – | – | A♭ | – | – | – | A♭ | – | – | – |
| overblow ° | E♭ | A♭ | – | E♭ | G♭ | A♭ | – | E♭ | A♭ | D♭ |

Positions: 2nd G (cross harp) · 3rd Dm

Pills: G Blues · G Minor Pentatonic · G7 · G Mixolydian · C Major · C · D Dorian

### Wilde Minor  <sub>`wilde-minor`</sub>

Wilde with minor 3rds — minor blues in 2nd position, the key it is sold under · Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E♭4 | G4 | C5 | E♭5 | E♭5 | G5 | C6 | E♭6 | A6 |
| **draw** | D4 | G4 | B♭4 | D5 | F5 | G5 | B♭5 | D6 | G6 | C7 |
| draw bend ′ | D♭ | G♭ | A | D♭ | E | G♭ | A | D♭ | G♭ | B |
| draw bend ″ | – | F | A♭ | – | – | F | A♭ | – | F | B♭ |
| draw bend ‴ | – | E | – | – | – | E | – | – | E | – |
| overblow ° | – | A♭ | B | – | G♭ | A♭ | B | – | A♭ | D♭ |

Positions: 1st C Dorian · 2nd Gm (cross harp) · 3rd Dm

Pills: G Minor · G Minor Pentatonic · G Blues · Gm7 · Cm · C Dorian

### PowerBender  <sub>`powerbender`</sub>

Richter to hole 4, then that bending pattern carried up — every hole draw-bends, blues to the top · Brendan Power, Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | G4 | C5 | D5 | F5 | A5 | C6 | E6 | A6 |
| **draw** | D4 | G4 | B4 | D5 | E5 | G5 | B5 | D6 | G6 | C7 |
| draw bend ′ | D♭ | G♭ | B♭ | D♭ | E♭ | G♭ | B♭ | D♭ | G♭ | B |
| draw bend ″ | – | F | A | – | – | – | – | – | F | B♭ |
| draw bend ‴ | – | – | A♭ | – | – | – | – | – | – | – |
| overblow ° | E♭ | A♭ | – | E♭ | – | A♭ | – | E♭ | A♭ | D♭ |

Positions: 2nd G (cross harp) · 3rd Dm

Pills: G Blues · G Minor Pentatonic · G7 · C · G Mixolydian · C Major · D Dorian

### PowerDraw  <sub>`powerdraw`</sub>

Richter to hole 6, PowerBender above it — the low end you already know, draw bends up top · Brendan Power, Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | G4 | C5 | E5 | G5 | A5 | C6 | E6 | A6 |
| **draw** | D4 | G4 | B4 | D5 | F5 | A5 | B5 | D6 | G6 | C7 |
| draw bend ′ | D♭ | G♭ | B♭ | D♭ | – | A♭ | B♭ | D♭ | G♭ | B |
| draw bend ″ | – | F | A | – | – | – | – | – | F | B♭ |
| draw bend ‴ | – | – | A♭ | – | – | – | – | – | – | – |
| overblow ° | E♭ | A♭ | – | E♭ | G♭ | B♭ | – | E♭ | A♭ | D♭ |

Positions: 2nd G (cross harp) · 3rd Dm

Pills: G Blues · G Minor Pentatonic · G7 · C · G Mixolydian · C Major · D Dorian

### Pentatonic/PentaHarp  <sub>`pentaharp`</sub>

The blues scale straight up the harp, three times over, no bends · Hohner PentaHarp, Seydel Pentatonic

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | F4 | G4 | C5 | F5 | G5 | C6 | F6 | G6 | C7 |
| **draw** | E♭4 | G♭4 | B♭4 | E♭5 | G♭5 | B♭5 | E♭6 | G♭6 | B♭6 | E♭7 |
| draw bend ′ | D | – | A | D | – | A | D | – | A | D |
| draw bend ″ | D♭ | – | A♭ | D♭ | – | A♭ | D♭ | – | A♭ | D♭ |
| overblow ° | E | – | B | E | – | B | E | – | B | E |

Positions: 1st C Blues

Pills: C Blues · C Minor Pentatonic · Cm7 · Csus4 · E♭ Major Pentatonic · E♭m · E♭

### Major Cross  <sub>`major-cross`</sub>

Rebuilt so the draw reeds spell a major scale in cross harp; Seydel label these a fifth down · Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | G4 | B♭4 | D5 | F5 | B♭5 | D6 | F6 | A6 |
| **draw** | D4 | F4 | A4 | C5 | E5 | G5 | A5 | C6 | E6 | G6 |
| draw bend ′ | D♭ | – | A♭ | B | E♭ | G♭ | – | – | – | – |
| blow bend ′ | – | – | – | – | – | – | – | D♭ | – | A♭ |
| overblow ° | E♭ | G♭ | – | D♭ | – | A♭ | – | – | – | – |
| overdraw ° | – | – | – | – | – | – | B | E♭ | G♭ | B♭ |

Positions: 1st C Mixolydian · 2nd Gm (cross harp) · 3rd Dm

Pills: F Major · C Mixolydian · D Minor · C · Dm · G Dorian · C Major Pentatonic

### Solo  <sub>`solo`</sub>

The chromatic harmonica’s layout — C D E F G A B over and over, four holes to the octave · Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | G4 | C5 | C5 | E5 | G5 | C6 | C6 | E6 |
| **draw** | D4 | F4 | A4 | B4 | D5 | F5 | A5 | B5 | D6 | F6 |
| draw bend ′ | D♭ | – | A♭ | – | D♭ | – | A♭ | – | D♭ | – |
| overblow ° | E♭ | G♭ | B♭ | – | E♭ | G♭ | B♭ | – | E♭ | G♭ |
| overdraw ° | – | – | – | D♭ | – | – | – | D♭ | – | – |

Positions: 2nd G (cross harp) · 3rd Dm

Pills: C Major · C · Dm6 · A Minor · D Dorian · G Mixolydian · C Major Pentatonic

### Circular (1st position)  <sub>`circular-1st`</sub>

The major scale straight up, blow and draw alternating — no note twice, no gaps · Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | G4 | B4 | D5 | F5 | A5 | C6 | E6 | G6 |
| **draw** | D4 | F4 | A4 | C5 | E5 | G5 | B5 | D6 | F6 | A6 |
| draw bend ′ | D♭ | – | A♭ | – | E♭ | G♭ | B♭ | D♭ | – | A♭ |
| overblow ° | E♭ | G♭ | B♭ | D♭ | – | A♭ | – | E♭ | G♭ | B♭ |

Positions: 2nd G (cross harp) · 3rd Dm

Pills: C Major · Cmaj7 · Dm7 · A Minor · D Dorian · G Mixolydian · C Major Pentatonic

### Circular  <sub>`circular`</sub>

The same continuous scale with a flat 7th — one step further round the circle · Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | G4 | B♭4 | D5 | F5 | A5 | C6 | E6 | G6 |
| **draw** | D4 | F4 | A4 | C5 | E5 | G5 | B♭5 | D6 | F6 | A6 |
| draw bend ′ | D♭ | – | A♭ | B | E♭ | G♭ | – | D♭ | – | A♭ |
| overblow ° | E♭ | G♭ | – | D♭ | – | A♭ | B | E♭ | G♭ | B♭ |

Positions: 1st C Mixolydian · 2nd Gm (cross harp) · 3rd Dm

Pills: F Major · C Mixolydian · C7 · Dm7 · D Minor · G Dorian

### Bebop  <sub>`bebop`</sub>

Dominant 7 on the blow, the passing 7th on the draw — the bebop scale two notes at a time · Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | G4 | B♭4 | C5 | E5 | G5 | B♭5 | C6 | E6 |
| **draw** | D4 | F4 | A4 | B4 | D5 | F5 | A5 | B5 | D6 | F6 |
| draw bend ′ | D♭ | – | A♭ | – | D♭ | – | A♭ | – | D♭ | – |
| overblow ° | E♭ | G♭ | – | – | E♭ | G♭ | – | – | E♭ | G♭ |

Positions: 1st C Bebop Dominant

Pills: C Bebop Dominant · C7 · Dm6 · C Mixolydian · C Major · A Minor

### EDHarmonica  <sub>`edharmonica`</sub>

A minor triad on the blow against one D–F–B♭ draw pattern, four times over; Seydel label these a minor 3rd up · Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E♭4 | G4 | C5 | E♭5 | G5 | C6 | E♭6 | G6 | C7 |
| **draw** | D4 | F4 | B♭4 | D5 | F5 | B♭5 | D6 | F6 | B♭6 | D7 |
| draw bend ′ | D♭ | E | A | D♭ | E | A | D♭ | E | A | D♭ |
| draw bend ″ | – | – | A♭ | – | – | A♭ | – | – | A♭ | – |
| overblow ° | – | G♭ | B | – | G♭ | B | – | G♭ | B | E♭ |

Positions: — none its notes can name —

Pills: C Minor Pentatonic · Cm · B♭ · C Minor · C Dorian · B♭ Major Pentatonic

### Orchestra S  <sub>`orchestra-s`</sub>

An F major chord on the blow against a G minor 6 on the draw, four holes to the octave; Seydel label these a fifth down · Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | F4 | F4 | A4 | C5 | F5 | F5 | A5 | C6 | F6 |
| **draw** | D4 | E4 | G4 | B♭4 | D5 | E5 | G5 | B♭5 | D6 | E6 |
| draw bend ′ | D♭ | – | G♭ | – | D♭ | – | G♭ | – | D♭ | – |
| overblow ° | E♭ | – | A♭ | B | E♭ | – | A♭ | B | E♭ | – |
| overdraw ° | – | G♭ | – | – | – | G♭ | – | – | – | G♭ |

Positions: 1st C Mixolydian · 2nd Gm (cross harp) · 3rd Dm

Pills: F Major · F · Gm6 · D Minor · C Mixolydian · F Major Pentatonic

## Symmetrical

### Diminished  <sub>`diminished`</sub>

A diminished 7 on the blow, another a tone up on the draw — the same shape in every key · Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E♭4 | G♭4 | A4 | C5 | E♭5 | G♭5 | A5 | C6 | E♭6 |
| **draw** | D4 | F4 | A♭4 | B4 | D5 | F5 | A♭5 | B5 | D6 | F6 |
| draw bend ′ | D♭ | E | G | B♭ | D♭ | E | G | B♭ | D♭ | E |
| overblow ° | – | – | – | – | – | – | – | – | – | G♭ |

Positions: 1st C Diminished · 3rd D

Pills: C Diminished · Cdim7 · Ddim7

### Augmented  <sub>`augmented`</sub>

Augmented triads a minor 3rd apart, blow and draw — whole-tone bends everywhere · Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | A♭4 | C5 | E5 | A♭5 | C6 | E6 | A♭6 | C7 |
| **draw** | E♭4 | G4 | B4 | E♭5 | G5 | B5 | E♭6 | G6 | B6 | E♭7 |
| draw bend ′ | D | G♭ | B♭ | D | G♭ | B♭ | D | G♭ | B♭ | D |
| draw bend ″ | D♭ | F | A | D♭ | F | A | D♭ | F | A | D♭ |
| overblow ° | – | – | – | – | – | – | – | – | – | E |

Positions: 1st C Augmented

Pills: C Augmented · Caug · E♭aug · Cmaj7 · Em

### Whole Tone  <sub>`whole-tone`</sub>

Two augmented triads a tone apart — every note a whole tone from the next · Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | E4 | A♭4 | C5 | E5 | A♭5 | C6 | E6 | A♭6 | C7 |
| **draw** | D4 | G♭4 | B♭4 | D5 | G♭5 | B♭5 | D6 | G♭6 | B♭6 | D7 |
| draw bend ′ | D♭ | F | A | D♭ | F | A | D♭ | F | A | D♭ |
| overblow ° | E♭ | G | B | E♭ | G | B | E♭ | G | B | E♭ |

Positions: 1st C Whole Tone · 3rd D

Pills: C Whole Tone · Caug · Daug · C7♯5

### Four Key  <sub>`four-key`</sub>

Two major pentatonics a semitone apart, blow and draw — four keys off one harp · Seydel

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **blow** | C4 | D4 | F4 | G4 | A4 | C5 | D5 | F5 | G5 | A5 |
| **draw** | D♭4 | E4 | G♭4 | A♭4 | B4 | D♭5 | E5 | G♭5 | A♭5 | B5 |
| draw bend ′ | – | E♭ | – | – | B♭ | – | E♭ | – | – | B♭ |
| overblow ° | – | – | – | – | – | – | – | – | – | C |

Positions: — none its notes can name —

Pills: F Major Pentatonic · E Major Pentatonic · F6 · E

# Judgment calls — the bits worth your ear

1. **Deep bends are taken at face value.** Any gap between the two reeds of a hole
   becomes bends all the way down. That gives harmonic minor a **three-semitone 10
   blow bend** (B–B♭–A, new to this app; it needed a ninth grid row) and whole-tone
   draw bends right across the Augmented harp. Physically real, but the deepest are
   hard work — the app doesn't grade difficulty anywhere, so nothing marks them.
2. **Over-notes wherever the arithmetic allows**, including 10 overblow on the
   PentaHarp (E7) and Wilde (D♭7), and low overdraws on the minor tunings. Same
   convention Richter already used; how playable they are in practice is your call.
3. **Redundancy is judged by exact pitch, not pitch class.** Richter's 3 overblow is
   dropped because hole 4 blow is the *same* C5. The rule also drops natural minor's
   1 and 6 overblow, harmonic minor's 1, 3, 4 overblow and 9 overdraw, and nearly
   every over-note on Four Key and Solo, where the neighbouring hole already carries
   the pitch. If you'd rather see them listed anyway, it's one condition in
   `buildHarp`.
4. **Positions and mode names are derived, not typed in.** A position is listed only
   where the harp's plain reeds spell a scale the app can name from that root — which
   is why harmonic minor shows no 3rd position (Locrian ♮6 isn't in the scale table),
   Country shows only 2nd, and EDHarmonica and Four Key show none at all. 1st position
   is listed for every tuning except the plain-major ones, where the harp key says it.
   To name the symmetrical harps' own scales, `theory.js` gained the diminished,
   half–whole, augmented and bebop-dominant scales — which are now typeable as
   queries too (`C Diminished`, `C Bebop Dominant`, …).
5. **Suggestion pills are hand-picked per tuning** — the one thing that isn't derived.
   They're what each tuning is *for*, so they can't come out of the note map. A check
   confirms each one parses and is playable on its own harp, but whether they're the
   *right_ seven is a judgment call; they're a few lines each in `src/harmonica.js`.
6. **Keys are always the pitch of hole 1 blow.** Makers don't all agree, and Seydel's
   configurator states their own convention as an offset (`grundton`):

   | Labelled | Tunings | This app's C harp is their… |
   |---|---|---|
   | a fifth **up** | Natural Minor, Wilde Minor, Melody Maker | G |
   | a fifth **down** | Major Cross, Orchestra S | F |
   | a minor 3rd **up** | EDHarmonica | E♭ |
   | hole 1 blow | all the others | C |

   Each of those tunings says so in its own line in the picker. Tell me if you'd
   rather the key menu switched to the maker's labelling for them instead — it is a
   one-field change, but it would make the key mean different things per tuning.

# What is not here

The 24 are every 10-hole tuning Seydel's configurator offers. Hohner's and Suzuki's
catalogues overlap it almost entirely (the PentaHarp is Seydel's Pentatonic; the
minors and Country are common property), so what's missing is mostly one-off custom
layouts — Brendan Power's other tunings, half-valved setups, and anything you tune
yourself. Each is one `blow`/`draw` line pair plus a description and a few pills.
