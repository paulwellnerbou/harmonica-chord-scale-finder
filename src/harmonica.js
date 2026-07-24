// The 10-hole Richter-tuned diatonic harmonica ("blues harp") and every note it
// can produce: blow, draw, draw bends, blow bends, overblows and overdraws.
//
// Base data is the key-of-C harp as MIDI numbers (C4 = 60). Any other key is a
// straight transposition. Bends are the chromatic notes strictly between the
// blow and draw reed; overblows/overdraws are one semitone above the higher
// of the two reeds. Draw bends live on holes 1-6, blow bends on holes 7-10.

import { PC_NAMES_FLAT } from './theory.js';

// Per hole: blow/draw reed MIDI, the reachable bend notes (deepest-bend-last),
// and the overblow (holes 1-6) / overdraw (holes 7-10) MIDI. Bend arrays are
// ordered by increasing bend depth: [half-step, whole-step, ...].
const C_HARP = {
  1:  { blow: 60, draw: 62, drawBends: [61],          overblow: 63 },
  2:  { blow: 64, draw: 67, drawBends: [66, 65],      overblow: 68 },
  3:  { blow: 67, draw: 71, drawBends: [70, 69, 68],  overblow: 72 },
  4:  { blow: 72, draw: 74, drawBends: [73],          overblow: 75 },
  5:  { blow: 76, draw: 77, drawBends: [],            overblow: 78 },
  6:  { blow: 79, draw: 81, drawBends: [80],          overblow: 82 },
  7:  { blow: 84, draw: 83, blowBends: [],            overdraw: 85 },
  8:  { blow: 88, draw: 86, blowBends: [87],          overdraw: 89 },
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
