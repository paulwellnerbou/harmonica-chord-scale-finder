// The 10-hole Richter-tuned diatonic harmonica ("blues harp") and every note it
// can produce: blow, draw, draw bends, blow bends, overblows and overdraws.
//
// Base data is the key-of-C harp as MIDI numbers (C4 = 60). Any other key is a
// straight transposition. Bends are the chromatic notes strictly between the
// blow and draw reed; overblows/overdraws are one semitone above the higher
// of the two reeds. Draw bends live on holes 1-6, blow bends on holes 7-10.

import { PC_NAMES_FLAT, transposeFifths } from './theory.js';

// Per hole: blow/draw reed MIDI, the reachable bend notes (deepest-bend-last),
// and the overblow (holes 1-6) / overdraw (holes 7-10) MIDI. Bend arrays are
// ordered by increasing bend depth: [half-step, whole-step, ...].
const C_HARP = {
  1:  { blow: 60, draw: 62, drawBends: [61],          overblow: 63 },
  2:  { blow: 64, draw: 67, drawBends: [66, 65],      overblow: 68 },
  // Hole 3's overblow is C — already a blow reed elsewhere, so it's omitted as redundant.
  3:  { blow: 67, draw: 71, drawBends: [70, 69, 68] },
  4:  { blow: 72, draw: 74, drawBends: [73],          overblow: 75 },
  5:  { blow: 76, draw: 77, drawBends: [],            overblow: 78 },
  6:  { blow: 79, draw: 81, drawBends: [80],          overblow: 82 },
  7:  { blow: 84, draw: 83, blowBends: [],            overdraw: 85 },
  // Hole 8's overdraw is F — already a draw reed elsewhere, so it's omitted as redundant.
  8:  { blow: 88, draw: 86, blowBends: [87] },
  9:  { blow: 91, draw: 89, blowBends: [90],          overdraw: 92 },
  10: { blow: 96, draw: 93, blowBends: [95, 94],      overdraw: 97 },
};

// Semitone offset of each selectable harp key from C, chosen so the common
// harmonica range sits between low G and high F#.
export const KEY_OFFSETS = {
  G: -5, Ab: -4, A: -3, Bb: -2, B: -1, C: 0,
  Db: 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6,
};

export const KEY_ORDER = ['G', 'Ab', 'A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#'];

// Playing positions. Each one starts a perfect fifth further round the circle
// than the last, beginning at 1st position — the key printed on the harp. The
// count runs to 12, but 2nd (the blues position) and 3rd are the two a player
// wants next to the key: they say which tonic the same holes and bends serve.
// `nick` is the name players actually use for the position, shown beside the key.
const POSITIONS = [
  { name: '2nd', fifths: 1, minor: false, mode: 'Mixolydian', nick: 'Cross harp' },
  { name: '3rd', fifths: 2, minor: true, mode: 'Dorian' },
];

// [{ name: '2nd', label: 'G', nick: 'Cross harp', hint: 'G Mixolydian' }, …]
export function positionKeys(key) {
  return POSITIONS.map(({ name, fifths, minor, mode, nick }) => {
    const root = transposeFifths(key, fifths);
    return { name, label: root + (minor ? 'm' : ''), nick, hint: `${root} ${mode}` };
  });
}

export function pcOf(midi) {
  return ((midi % 12) + 12) % 12;
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

// Build the full note map for a harp in the given key.
// Returns { [hole]: { blow, draw, drawBends[], blowBends[], overblow, overdraw } }.
export function buildHarp(key) {
  const offset = KEY_OFFSETS[key] ?? 0;
  const map = {};
  for (let h = 1; h <= 10; h++) {
    const base = C_HARP[h];
    const cell = {
      blow: note(h, 'blow', base.blow, offset),
      draw: note(h, 'draw', base.draw, offset),
      drawBends: (base.drawBends || []).map((m, i) => note(h, 'draw-bend', m, offset, i + 1)),
      blowBends: (base.blowBends || []).map((m, i) => note(h, 'blow-bend', m, offset, i + 1)),
      overblow: base.overblow != null ? note(h, 'overblow', base.overblow, offset) : null,
      overdraw: base.overdraw != null ? note(h, 'overdraw', base.overdraw, offset) : null,
    };
    map[h] = cell;
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
