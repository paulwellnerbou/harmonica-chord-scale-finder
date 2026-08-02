// The 10-hole diatonic harmonica and every note it can produce: blow, draw,
// draw bends, blow bends, overblows and overdraws — in standard Richter tuning
// and in the alternate tunings makers sell beside it.
//
// A tuning is nothing but its twenty reeds, written out for the key of C —
// anchored at hole 1 blow, which is middle C on every tuning here, so the app's
// harp key always names that reed. (Makers don't all agree: some label their
// minor harps by the 2nd-position key instead, which each tuning's own note in
// the picker says.) Any other key is a straight transposition.
//
// Everything else follows from the reeds: you bend the higher reed of a hole
// down towards the lower one, so the bends are the chromatic notes strictly
// between the two, and the over-note (an overblow where the draw reed is the
// higher, an overdraw where the blow reed is) sits one semitone above it.

import { PC_NAMES_FLAT, noteToMidi, transposeFifths, scaleNameForIntervals } from './theory.js';

const reeds = (spec) => spec.split(/\s+/).map(noteToMidi);

// `desc` names the maker and what the tuning is for — enough to recognise the
// harp you own. `group` heads the picker's sections. `suggestions` is what gets
// played on it, most-played first, as offsets round the circle of fifths from
// the harp key (`fifths`) plus the chord/scale that follows the root; `note`
// names the thing where the position alone doesn't say it.
const LAYOUTS = {
  richter: {
    name: 'Richter',
    group: 'Richter & retunings',
    desc: 'The standard blues harp',
    blow: 'C4 E4 G4 C5 E5 G5 C6 E6 G6 C7',
    draw: 'D4 G4 B4 D5 F5 A5 B5 D6 F6 A6',
    suggestions: [
      { fifths: 0, suffix: ' Major' },
      { fifths: 1, suffix: ' Blues' },
      { fifths: 1, suffix: ' Minor Pentatonic' },
      { fifths: 2, suffix: ' Minor' },
      { fifths: 2, suffix: ' Blues' },
      { fifths: 0, suffix: '', note: 'the blow chord' },
      { fifths: 0, suffix: ' Major Pentatonic' },
      { fifths: 1, suffix: '7', note: 'the draw chord' },
      { fifths: 1, suffix: ' Mixolydian' },
      { fifths: 2, suffix: ' Dorian' },
      { fifths: 3, suffix: ' Minor' },
    ],
  },
  'paddy-richter': {
    name: 'Paddy Richter',
    group: 'Richter & retunings',
    desc: '3 blow up to the 6th — fiddle tunes and Irish airs without bending · Brendan Power; Seydel and most custom shops',
    blow: 'C4 E4 A4 C5 E5 G5 C6 E6 G6 C7',
    draw: 'D4 G4 B4 D5 F5 A5 B5 D6 F6 A6',
    suggestions: [
      { fifths: 0, suffix: ' Major' },
      { fifths: 2, suffix: ' Dorian' },
      { fifths: 3, suffix: ' Minor' },
      { fifths: 0, suffix: '6', note: 'the blow chord' },
      { fifths: 1, suffix: '7', note: 'the draw chord' },
      { fifths: 0, suffix: ' Major Pentatonic' },
      { fifths: 1, suffix: ' Mixolydian' },
    ],
  },
  country: {
    name: 'Country',
    group: 'Richter & retunings',
    desc: '5 draw up a semitone — the major 7th that 2nd position lacks, for country and swing · Seydel, Hohner and others',
    blow: 'C4 E4 G4 C5 E5 G5 C6 E6 G6 C7',
    draw: 'D4 G4 B4 D5 Gb5 A5 B5 D6 F6 A6',
    suggestions: [
      { fifths: 1, suffix: ' Major' },
      { fifths: 1, suffix: 'maj7' },
      { fifths: 1, suffix: '7', note: 'the draw chord' },
      { fifths: 0, suffix: ' Major' },
      { fifths: 0, suffix: '', note: 'the blow chord' },
      { fifths: 1, suffix: ' Blues' },
      { fifths: 2, suffix: ' Minor' },
    ],
  },
  'melody-maker': {
    name: 'Melody Maker',
    group: 'Richter & retunings',
    desc: 'Paddy’s 3 blow plus 5 and 9 draw up — the whole major scale in 2nd position, the key it is sold under · Lee Oskar, Seydel',
    blow: 'C4 E4 A4 C5 E5 G5 C6 E6 G6 C7',
    draw: 'D4 G4 B4 D5 Gb5 A5 B5 D6 Gb6 A6',
    suggestions: [
      { fifths: 1, suffix: ' Major' },
      { fifths: 1, suffix: ' Major Pentatonic' },
      { fifths: 1, suffix: '', note: 'the draw chord' },
      { fifths: 0, suffix: '6', note: 'the blow chord' },
      { fifths: 3, suffix: ' Dorian' },
      { fifths: 2, suffix: ' Mixolydian' },
      { fifths: 0, suffix: ' Lydian' },
    ],
  },
  'easy-third': {
    name: 'Easy Third',
    group: 'Richter & retunings',
    desc: '2 and 3 draw a tone lower — 3rd position without bending · Seydel',
    blow: 'C4 E4 G4 C5 E5 G5 C6 E6 G6 C7',
    draw: 'D4 F4 A4 D5 F5 A5 B5 D6 F6 A6',
    suggestions: [
      { fifths: 2, suffix: ' Minor Pentatonic' },
      { fifths: 2, suffix: 'm', note: 'the low draw chord' },
      { fifths: 2, suffix: ' Dorian' },
      { fifths: 2, suffix: ' Blues' },
      { fifths: 0, suffix: ' Major' },
      { fifths: 0, suffix: '', note: 'the blow chord' },
      { fifths: 1, suffix: ' Mixolydian' },
    ],
  },
  'chris-kramer': {
    name: 'Chris Kramer Signature',
    group: 'Richter & retunings',
    desc: 'Easy Third with 7 draw down a semitone as well — natural minor and its chords in 3rd position · Chris Kramer',
    blow: 'C4 E4 G4 C5 E5 G5 C6 E6 G6 C7',
    draw: 'D4 F4 A4 D5 F5 A5 Bb5 D6 F6 A6',
    suggestions: [
      { fifths: 2, suffix: ' Minor' },
      { fifths: 2, suffix: ' Minor Pentatonic' },
      { fifths: 2, suffix: 'm', note: 'the low draw chord' },
      { fifths: 2, suffix: ' Blues' },
      { fifths: -2, suffix: 'maj7', note: 'the 4–7 draw chord' },
      { fifths: 0, suffix: '', note: 'the blow chord' },
      { fifths: 0, suffix: ' Mixolydian' },
    ],
  },
  'natural-minor': {
    name: 'Natural Minor',
    group: 'Richter & retunings',
    desc: 'Richter with minor 3rds — minor in 2nd position, the key makers label it by · Suzuki, Seydel, Lee Oskar',
    blow: 'C4 Eb4 G4 C5 Eb5 G5 C6 Eb6 G6 C7',
    draw: 'D4 G4 Bb4 D5 F5 A5 Bb5 D6 F6 A6',
    suggestions: [
      { fifths: 1, suffix: ' Minor' },
      { fifths: 1, suffix: ' Minor Pentatonic' },
      { fifths: 1, suffix: ' Blues' },
      { fifths: 1, suffix: 'm', note: 'the draw chord' },
      { fifths: 0, suffix: 'm', note: 'the blow chord' },
      { fifths: 0, suffix: ' Dorian' },
      { fifths: 2, suffix: ' Minor Pentatonic' },
      { fifths: 2, suffix: ' Phrygian' },
    ],
  },
  'harmonic-minor': {
    name: 'Harmonic Minor',
    group: 'Richter & retunings',
    desc: 'Minor with a major 7th, for klezmer and Eastern melodies · Suzuki, Seydel, Hohner',
    blow: 'C4 Eb4 G4 C5 Eb5 G5 C6 Eb6 G6 C7',
    draw: 'D4 G4 B4 D5 F5 Ab5 B5 D6 F6 Ab6',
    suggestions: [
      { fifths: 0, suffix: ' Harmonic Minor' },
      { fifths: 0, suffix: 'm', note: 'the blow chord' },
      { fifths: 0, suffix: 'mmaj7' },
      { fifths: 1, suffix: ' Phrygian Dominant' },
      { fifths: 1, suffix: '7b9', note: 'the draw chord' },
    ],
  },
  dorian: {
    name: 'Dorian',
    group: 'Richter & retunings',
    desc: 'Richter with 3 and 7 draw a tone down — Dorian minor in 2nd position, major chord still on the blow · Seydel',
    blow: 'C4 E4 G4 C5 E5 G5 C6 E6 G6 C7',
    draw: 'D4 G4 Bb4 D5 F5 A5 Bb5 D6 F6 A6',
    suggestions: [
      { fifths: 1, suffix: ' Dorian' },
      { fifths: 1, suffix: ' Minor Pentatonic' },
      { fifths: 1, suffix: 'm', note: 'the draw chord' },
      { fifths: 1, suffix: ' Blues' },
      { fifths: 0, suffix: '', note: 'the blow chord' },
      { fifths: 0, suffix: ' Mixolydian' },
      { fifths: 2, suffix: ' Minor' },
    ],
  },
  wilde: {
    name: 'Wilde',
    group: 'Rebuilt layouts',
    desc: 'Holes 2–4 again up top — blues runs in 2nd position all the way up · Will Wilde, Seydel',
    blow: 'C4 E4 G4 C5 E5 E5 G5 C6 E6 A6',
    draw: 'D4 G4 B4 D5 F5 G5 B5 D6 G6 C7',
    suggestions: [
      { fifths: 1, suffix: ' Blues' },
      { fifths: 1, suffix: ' Minor Pentatonic' },
      { fifths: 1, suffix: '7', note: 'the draw chord' },
      { fifths: 1, suffix: ' Mixolydian' },
      { fifths: 0, suffix: ' Major' },
      { fifths: 0, suffix: '', note: 'the blow chord' },
      { fifths: 2, suffix: ' Dorian' },
    ],
  },
  'wilde-minor': {
    name: 'Wilde Minor',
    group: 'Rebuilt layouts',
    desc: 'Wilde with minor 3rds — minor blues in 2nd position, the key it is sold under · Seydel',
    blow: 'C4 Eb4 G4 C5 Eb5 Eb5 G5 C6 Eb6 A6',
    draw: 'D4 G4 Bb4 D5 F5 G5 Bb5 D6 G6 C7',
    suggestions: [
      { fifths: 1, suffix: ' Minor' },
      { fifths: 1, suffix: ' Minor Pentatonic' },
      { fifths: 1, suffix: ' Blues' },
      { fifths: 1, suffix: 'm7', note: 'the draw chord' },
      { fifths: 0, suffix: 'm', note: 'the blow chord' },
      { fifths: 0, suffix: ' Dorian' },
    ],
  },
  powerbender: {
    name: 'PowerBender',
    group: 'Rebuilt layouts',
    desc: 'Richter to hole 4, then that bending pattern carried up — every hole draw-bends, blues to the top · Brendan Power, Seydel',
    blow: 'C4 E4 G4 C5 D5 F5 A5 C6 E6 A6',
    draw: 'D4 G4 B4 D5 E5 G5 B5 D6 G6 C7',
    suggestions: [
      { fifths: 1, suffix: ' Blues' },
      { fifths: 1, suffix: ' Minor Pentatonic' },
      { fifths: 1, suffix: '7', note: 'the draw chord' },
      { fifths: 0, suffix: '', note: 'the blow chord' },
      { fifths: 1, suffix: ' Mixolydian' },
      { fifths: 0, suffix: ' Major' },
      { fifths: 2, suffix: ' Dorian' },
    ],
  },
  powerdraw: {
    name: 'PowerDraw',
    group: 'Rebuilt layouts',
    desc: 'Richter to hole 6, PowerBender above it — the low end you already know, draw bends up top · Brendan Power, Seydel',
    blow: 'C4 E4 G4 C5 E5 G5 A5 C6 E6 A6',
    draw: 'D4 G4 B4 D5 F5 A5 B5 D6 G6 C7',
    suggestions: [
      { fifths: 1, suffix: ' Blues' },
      { fifths: 1, suffix: ' Minor Pentatonic' },
      { fifths: 1, suffix: '7', note: 'the draw chord' },
      { fifths: 0, suffix: '', note: 'the blow chord' },
      { fifths: 1, suffix: ' Mixolydian' },
      { fifths: 0, suffix: ' Major' },
      { fifths: 2, suffix: ' Dorian' },
    ],
  },
  pentaharp: {
    name: 'Pentatonic/PentaHarp',
    group: 'Rebuilt layouts',
    desc: 'The blues scale straight up the harp, three times over, no bends · Hohner PentaHarp, Seydel Pentatonic',
    blow: 'C4 F4 G4 C5 F5 G5 C6 F6 G6 C7',
    draw: 'Eb4 Gb4 Bb4 Eb5 Gb5 Bb5 Eb6 Gb6 Bb6 Eb7',
    suggestions: [
      { fifths: 0, suffix: ' Blues' },
      { fifths: 0, suffix: ' Minor Pentatonic' },
      { fifths: 0, suffix: 'm7' },
      { fifths: 0, suffix: 'sus4', note: 'the blow chord' },
      { fifths: -3, suffix: ' Major Pentatonic' },
      { fifths: -3, suffix: 'm', note: 'the draw chord' },
      { fifths: -3, suffix: '' },
    ],
  },
  'major-cross': {
    name: 'Major Cross',
    group: 'Rebuilt layouts',
    desc: 'Rebuilt so the draw reeds spell a major scale in cross harp; Seydel label these a fifth down · Seydel',
    blow: 'C4 E4 G4 Bb4 D5 F5 Bb5 D6 F6 A6',
    draw: 'D4 F4 A4 C5 E5 G5 A5 C6 E6 G6',
    suggestions: [
      { fifths: -1, suffix: ' Major' },
      { fifths: 0, suffix: ' Mixolydian' },
      { fifths: 2, suffix: ' Minor' },
      { fifths: 0, suffix: '', note: 'the low blow chord' },
      { fifths: 2, suffix: 'm', note: 'the low draw chord' },
      { fifths: 1, suffix: ' Dorian' },
      { fifths: 0, suffix: ' Major Pentatonic' },
    ],
  },
  solo: {
    name: 'Solo',
    group: 'Rebuilt layouts',
    desc: 'The chromatic harmonica’s layout — C D E F G A B over and over, four holes to the octave · Seydel',
    blow: 'C4 E4 G4 C5 C5 E5 G5 C6 C6 E6',
    draw: 'D4 F4 A4 B4 D5 F5 A5 B5 D6 F6',
    suggestions: [
      { fifths: 0, suffix: ' Major' },
      { fifths: 0, suffix: '', note: 'the blow chord' },
      { fifths: 2, suffix: 'm6', note: 'the draw chord' },
      { fifths: 3, suffix: ' Minor' },
      { fifths: 2, suffix: ' Dorian' },
      { fifths: 1, suffix: ' Mixolydian' },
      { fifths: 0, suffix: ' Major Pentatonic' },
    ],
  },
  'circular-1st': {
    name: 'Circular (1st position)',
    group: 'Rebuilt layouts',
    desc: 'The major scale straight up, blow and draw alternating — no note twice, no gaps · Seydel',
    blow: 'C4 E4 G4 B4 D5 F5 A5 C6 E6 G6',
    draw: 'D4 F4 A4 C5 E5 G5 B5 D6 F6 A6',
    suggestions: [
      { fifths: 0, suffix: ' Major' },
      { fifths: 0, suffix: 'maj7', note: 'the blow chord' },
      { fifths: 2, suffix: 'm7', note: 'the draw chord' },
      { fifths: 3, suffix: ' Minor' },
      { fifths: 2, suffix: ' Dorian' },
      { fifths: 1, suffix: ' Mixolydian' },
      { fifths: 0, suffix: ' Major Pentatonic' },
    ],
  },
  circular: {
    name: 'Circular',
    group: 'Rebuilt layouts',
    desc: 'The same continuous scale with a flat 7th — one step further round the circle · Seydel',
    blow: 'C4 E4 G4 Bb4 D5 F5 A5 C6 E6 G6',
    draw: 'D4 F4 A4 C5 E5 G5 Bb5 D6 F6 A6',
    suggestions: [
      { fifths: -1, suffix: ' Major' },
      { fifths: 0, suffix: ' Mixolydian' },
      { fifths: 0, suffix: '7', note: 'the blow chord' },
      { fifths: 2, suffix: 'm7', note: 'the draw chord' },
      { fifths: 2, suffix: ' Minor' },
      { fifths: 1, suffix: ' Dorian' },
    ],
  },
  bebop: {
    name: 'Bebop',
    group: 'Rebuilt layouts',
    desc: 'Dominant 7 on the blow, the passing 7th on the draw — the bebop scale two notes at a time · Seydel',
    blow: 'C4 E4 G4 Bb4 C5 E5 G5 Bb5 C6 E6',
    draw: 'D4 F4 A4 B4 D5 F5 A5 B5 D6 F6',
    suggestions: [
      { fifths: 0, suffix: ' Bebop Dominant' },
      { fifths: 0, suffix: '7', note: 'the blow chord' },
      { fifths: 2, suffix: 'm6', note: 'the draw chord' },
      { fifths: 0, suffix: ' Mixolydian' },
      { fifths: 0, suffix: ' Major' },
      { fifths: 3, suffix: ' Minor' },
    ],
  },
  edharmonica: {
    name: 'EDHarmonica',
    group: 'Rebuilt layouts',
    desc: 'A minor triad on the blow against one D–F–B♭ draw pattern, four times over; Seydel label these a minor 3rd up · Seydel',
    blow: 'C4 Eb4 G4 C5 Eb5 G5 C6 Eb6 G6 C7',
    draw: 'D4 F4 Bb4 D5 F5 Bb5 D6 F6 Bb6 D7',
    suggestions: [
      { fifths: 0, suffix: ' Minor Pentatonic' },
      { fifths: 0, suffix: 'm', note: 'the blow chord' },
      { fifths: -2, suffix: '', note: 'the draw chord' },
      { fifths: 0, suffix: ' Minor' },
      { fifths: 0, suffix: ' Dorian' },
      { fifths: -2, suffix: ' Major Pentatonic' },
    ],
  },
  'orchestra-s': {
    name: 'Orchestra S',
    group: 'Rebuilt layouts',
    desc: 'An F major chord on the blow against a G minor 6 on the draw, four holes to the octave; Seydel label these a fifth down · Seydel',
    blow: 'C4 F4 F4 A4 C5 F5 F5 A5 C6 F6',
    draw: 'D4 E4 G4 Bb4 D5 E5 G5 Bb5 D6 E6',
    suggestions: [
      { fifths: -1, suffix: ' Major' },
      { fifths: -1, suffix: '', note: 'the blow chord' },
      { fifths: 1, suffix: 'm6', note: 'the draw chord' },
      { fifths: 2, suffix: ' Minor' },
      { fifths: 0, suffix: ' Mixolydian' },
      { fifths: -1, suffix: ' Major Pentatonic' },
    ],
  },
  diminished: {
    name: 'Diminished',
    group: 'Symmetrical',
    desc: 'A diminished 7 on the blow, another a tone up on the draw — the same shape in every key · Seydel',
    blow: 'C4 Eb4 Gb4 A4 C5 Eb5 Gb5 A5 C6 Eb6',
    draw: 'D4 F4 Ab4 B4 D5 F5 Ab5 B5 D6 F6',
    suggestions: [
      { fifths: 0, suffix: ' Diminished' },
      { fifths: 0, suffix: 'dim7', note: 'the blow chord' },
      { fifths: 2, suffix: 'dim7', note: 'the draw chord' },
    ],
  },
  augmented: {
    name: 'Augmented',
    group: 'Symmetrical',
    desc: 'Augmented triads a minor 3rd apart, blow and draw — whole-tone bends everywhere · Seydel',
    blow: 'C4 E4 Ab4 C5 E5 Ab5 C6 E6 Ab6 C7',
    draw: 'Eb4 G4 B4 Eb5 G5 B5 Eb6 G6 B6 Eb7',
    suggestions: [
      { fifths: 0, suffix: ' Augmented' },
      { fifths: 0, suffix: 'aug', note: 'the blow chord' },
      { fifths: -3, suffix: 'aug', note: 'the draw chord' },
      { fifths: 0, suffix: 'maj7' },
      { fifths: 4, suffix: 'm' },
    ],
  },
  'whole-tone': {
    name: 'Whole Tone',
    group: 'Symmetrical',
    desc: 'Two augmented triads a tone apart — every note a whole tone from the next · Seydel',
    blow: 'C4 E4 Ab4 C5 E5 Ab5 C6 E6 Ab6 C7',
    draw: 'D4 Gb4 Bb4 D5 Gb5 Bb5 D6 Gb6 Bb6 D7',
    suggestions: [
      { fifths: 0, suffix: ' Whole Tone' },
      { fifths: 0, suffix: 'aug', note: 'the blow chord' },
      { fifths: 2, suffix: 'aug', note: 'the draw chord' },
      { fifths: 0, suffix: '7#5' },
    ],
  },
  'four-key': {
    name: 'Four Key',
    group: 'Symmetrical',
    desc: 'Two major pentatonics a semitone apart, blow and draw — four keys off one harp · Seydel',
    blow: 'C4 D4 F4 G4 A4 C5 D5 F5 G5 A5',
    draw: 'Db4 E4 Gb4 Ab4 B4 Db5 E5 Gb5 Ab5 B5',
    suggestions: [
      { fifths: -1, suffix: ' Major Pentatonic' },
      { fifths: 4, suffix: ' Major Pentatonic' },
      { fifths: -1, suffix: '6', note: 'from the blow reeds' },
      { fifths: 4, suffix: '', note: 'from the draw reeds' },
    ],
  },
};

export const TUNINGS = Object.fromEntries(Object.entries(LAYOUTS)
  .map(([id, t]) => [id, { ...t, blow: reeds(t.blow), draw: reeds(t.draw) }]));

export const TUNING_ORDER = Object.keys(TUNINGS);
export const DEFAULT_TUNING = 'richter';
const tuningOf = (id) => TUNINGS[id] || TUNINGS[DEFAULT_TUNING];

// Semitone offset of each selectable harp key from C, chosen so the common
// harmonica range sits between low G and high F#.
export const KEY_OFFSETS = {
  G: -5, Ab: -4, A: -3, Bb: -2, B: -1, C: 0,
  Db: 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6,
};

export const KEY_ORDER = ['G', 'Ab', 'A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#'];

const mod12 = (n) => ((n % 12) + 12) % 12;

// Playing positions, each a perfect fifth further round the circle than the
// last, beginning at 1st position — the key printed on the harp. `nick` is the
// name players actually use for the position, shown beside the key.
const POSITIONS = [
  { fifths: 0 },
  { fifths: 1, nick: 'Cross harp' },
  { fifths: 2 },
];

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const ordinal = (fifths) => ORDINALS[mod12(fifths)];

// The pitch classes of the harp's plain reeds, as intervals from the tonic that
// many fifths above the harp key — the scale that position plays unbent.
function positionIntervals(t, fifths) {
  const shift = mod12(-7 * fifths);
  return [...new Set([...t.blow, ...t.draw].map((m) => mod12(m + shift)))].sort((a, b) => a - b);
}

// [{ fifths: 1, name: '2nd', label: 'G', nick: 'Cross harp', hint: 'G Mixolydian' }, …]:
// the tonics the harp serves, and what it plays from each. A position whose
// notes don't spell a scale we can name is left out rather than guessed at, and
// so is a 1st position that is the plain major the harp key already implies.
export function positionKeys(key, tuning) {
  const t = tuningOf(tuning);
  return POSITIONS.flatMap(({ fifths, nick }) => {
    const intervals = positionIntervals(t, fifths);
    const mode = scaleNameForIntervals(intervals);
    if (!mode || (fifths === 0 && mode === 'Major')) return [];
    const root = transposeFifths(key, fifths);
    if (!root) return [];
    const minor = intervals.includes(3) && !intervals.includes(4);
    // 1st position names the scale outright: its tonic is the harp key, already
    // in the title, so the mode is the only thing left to say.
    const label = fifths === 0 ? `${root} ${mode}` : root + (minor ? 'm' : '');
    return [{ fifths, name: ordinal(fifths), label, nick, hint: `${root} ${mode}` }];
  });
}

// [{ q: 'G Blues', hint: '2nd position · cross harp' }, …] for the given harp.
export function suggestions(key, tuning) {
  return tuningOf(tuning).suggestions.flatMap(({ fifths, suffix, note }) => {
    const root = transposeFifths(key, fifths);
    if (!root) return [];
    const nick = POSITIONS.find((p) => p.fifths === fifths)?.nick;
    const hint = [`${ordinal(fifths)} position`, nick?.toLowerCase(), note].filter(Boolean).join(' · ');
    return [{ q: root + suffix, hint }];
  });
}

export function pcOf(midi) {
  return mod12(midi);
}

export function noteName(midi) {
  return PC_NAMES_FLAT[pcOf(midi)];
}

// One playable note on the harp.
// type: 'blow' | 'draw' | 'draw-bend' | 'blow-bend' | 'overblow' | 'overdraw'
// depth: bend depth in semitones (1, 2, 3) for bend types, else 0.
function note(hole, type, midi, offset, depth = 0) {
  const m = midi + offset;
  return { hole, type, depth, midi: m, pc: pcOf(m), name: noteName(m) };
}

// Which of the grid's nine rows a note occupies — blow techniques above the
// number bar, draw techniques below it, deeper bends further from the centre.
// Shared with the PNG export so the two renderers can't drift apart. Three bend
// rows a side is as deep as the grid goes, which is as deep as a hole with
// reeds four semitones apart bends — no tuning here parts them further.
export const HOLE_ROWS = 9;
export function gridRowOf({ type, depth }) {
  switch (type) {
    case 'blow-bend': return 4 - depth; // 3, 2, 1
    case 'overblow': return 3;
    case 'blow': return 4;
    case 'draw': return 6;
    case 'draw-bend': return 6 + depth; // 7, 8, 9
    case 'overdraw': return 7;
  }
}

// Build the full note map for a harp in the given key and tuning.
// Returns { [hole]: { blow, draw, drawBends[], blowBends[], overblow, overdraw } }.
export function buildHarp(key, tuning) {
  const offset = KEY_OFFSETS[key] ?? 0;
  const { blow, draw } = tuningOf(tuning);
  const plain = new Set([...blow, ...draw]);
  const map = {};
  for (let h = 1; h <= 10; h++) {
    const b = blow[h - 1];
    const d = draw[h - 1];
    const drawHigher = d > b; // so this hole bends on the draw, and overblows
    const [lo, hi] = drawHigher ? [b, d] : [d, b];
    const bends = [];
    for (let m = hi - 1; m > lo; m--) bends.push(m);
    // An over-note a plain reed already sounds is no note of its own — as with
    // Richter's 3 overblow (hole 4's blow) and 8 overdraw (hole 9's draw).
    const over = plain.has(hi + 1) ? null : hi + 1;
    const bent = (type) => bends.map((m, i) => note(h, type, m, offset, i + 1));
    map[h] = {
      blow: note(h, 'blow', b, offset),
      draw: note(h, 'draw', d, offset),
      drawBends: drawHigher ? bent('draw-bend') : [],
      blowBends: drawHigher ? [] : bent('blow-bend'),
      overblow: drawHigher && over ? note(h, 'overblow', over, offset) : null,
      overdraw: !drawHigher && over ? note(h, 'overdraw', over, offset) : null,
    };
  }
  return map;
}

// Standard harp tab: blow holes are bare numbers, draw holes take a leading
// minus, every bent semitone adds an apostrophe and over-notes a degree sign.
const DRAW_TYPES = ['draw', 'draw-bend', 'overdraw'];
function tabNotation(n) {
  const base = `${DRAW_TYPES.includes(n.type) ? '-' : ''}${n.hole}`;
  if (n.depth) return base + "'".repeat(n.depth);
  if (n.type === 'overblow' || n.type === 'overdraw') return `${base}°`;
  return base;
}

// One tab key per distinct pitch, in playing order. Where two holes make the
// same note (2 draw and 3 blow) they share a key labelled "-2 / 3".
function tabKeys(notes) {
  const keys = [];
  for (const n of notes) {
    const prev = keys[keys.length - 1];
    if (prev && prev.midi === n.midi) {
      prev.notes.push(n);
      prev.text += ` / ${tabNotation(n)}`;
    } else {
      keys.push({ midi: n.midi, pc: n.pc, name: n.name, notes: [n], text: tabNotation(n) });
    }
  }
  return keys;
}

const MISS_TAB = '✕'; // same marker the info panel's unreachable chips carry

// The tab strip: the selected pitch classes across the harp's range, low to
// high. A pitch no enabled technique reaches keeps its place as a `missing`
// key, so the strip shows the gaps a setting leaves in a scale instead of
// silently closing over them. The range is the whole instrument's, not just the
// enabled techniques', so toggling one changes which keys are missing rather
// than how far the strip reaches.
export function tabStrip(harp, show, pcs) {
  if (!pcs.length) return [];
  const midis = allNotes(harp).map((n) => n.midi);
  const keys = new Map(tabKeys(playableNotes(harp, show).filter((n) => pcs.includes(n.pc)))
    .map((k) => [k.midi, k]));

  const strip = [];
  const hi = Math.max(...midis);
  for (let midi = Math.min(...midis); midi <= hi; midi++) {
    const pc = pcOf(midi);
    if (!pcs.includes(pc)) continue;
    strip.push(keys.get(midi)
      || { midi, pc, name: noteName(midi), notes: [], text: MISS_TAB, missing: true });
  }
  return strip;
}

// Every note reachable with the given techniques enabled, in the order a player
// would run them: ascending pitch, lower hole first where two holes share a
// pitch (2 draw before 3 blow) — so the same pitch can appear twice.
export function playableNotes(harp, { showDrawBends, showBlowBends, showOverblow, showOverdraw }) {
  const out = [];
  for (let h = 1; h <= 10; h++) {
    const c = harp[h];
    out.push(c.blow, c.draw);
    if (showDrawBends) out.push(...c.drawBends);
    if (showBlowBends) out.push(...c.blowBends);
    if (showOverblow && c.overblow) out.push(c.overblow);
    if (showOverdraw && c.overdraw) out.push(c.overdraw);
  }
  return out.sort((a, b) => a.midi - b.midi || a.hole - b.hole);
}

// Flatten a harp into a single list of notes (handy for lookups / audio).
export function allNotes(harp) {
  const out = [];
  for (let h = 1; h <= 10; h++) {
    const c = harp[h];
    out.push(c.blow, c.draw, ...c.drawBends, ...c.blowBends);
    if (c.overblow) out.push(c.overblow);
    if (c.overdraw) out.push(c.overdraw);
  }
  return out;
}
