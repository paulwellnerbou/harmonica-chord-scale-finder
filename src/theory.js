// Music-theory core: parse note names, chords and scales into pitch-class sets.
// A "pitch class" is a note reduced to 0-11 (C=0 .. B=11), octave-independent,
// which is all the harmonica highlighter needs to match against.

// Harmonica charts spell accidentals as flats, so we do too.
export const PC_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Normalize the various unicode/ascii accidental glyphs a user might type.
function normalizeAccidentals(s) {
  return s.replace(/♯/g, '#').replace(/♭/g, 'b').replace(/𝄪/g, '##');
}

// Parse a note name at the START of `str`. Returns {pc, len} or null.
// `len` is how many characters were consumed (letter + accidentals).
function parseNoteHead(str) {
  const s = normalizeAccidentals(str);
  const letter = s[0]?.toUpperCase();
  if (!(letter in LETTER_PC)) return null;
  let pc = LETTER_PC[letter];
  let len = 1;
  while (len < s.length && (s[len] === '#' || s[len] === 'b')) {
    pc += s[len] === '#' ? 1 : -1;
    len++;
  }
  return { pc: ((pc % 12) + 12) % 12, len };
}

export function parseNote(str) {
  const trimmed = str.trim();
  const head = parseNoteHead(trimmed);
  if (!head || head.len !== normalizeAccidentals(trimmed).length) return null;
  return head.pc;
}

// Transpose a note name by `n` perfect fifths (negative goes down), spelled the
// way a musician would: the letter moves four steps per fifth and the accidental
// follows it, so the fifth above B reads F# rather than the enharmonic Gb the
// flat-only PC_NAMES_FLAT would give. Null for an unreadable name, or for one
// whose fifth needs an accidental past the double — beyond what a name can say.
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ACCIDENTAL_FOR = { 0: '', 1: '#', 2: '##', 10: 'bb', 11: 'b' };
const mod = (a, n) => ((a % n) + n) % n;
export function transposeFifths(name, n) {
  const s = name.trim();
  const head = parseNoteHead(s);
  if (!head) return null;
  const letter = LETTERS[mod(LETTERS.indexOf(s[0].toUpperCase()) + 4 * n, 7)];
  const accidental = ACCIDENTAL_FOR[mod(head.pc + 7 * n - LETTER_PC[letter], 12)];
  return accidental == null ? null : letter + accidental;
}

// --- Chords -----------------------------------------------------------------
// Intervals in semitones from the root. Ordered aliases; the parser matches the
// quality string (everything after the root) case-sensitively where it matters
// (M7 vs m7), so keys are the exact quality text.
const CHORD_QUALITIES = {
  '': [0, 4, 7], 'maj': [0, 4, 7], 'major': [0, 4, 7], 'M': [0, 4, 7],
  'm': [0, 3, 7], 'min': [0, 3, 7], '-': [0, 3, 7],
  'dim': [0, 3, 6], 'o': [0, 3, 6], '°': [0, 3, 6],
  'aug': [0, 4, 8], '+': [0, 4, 8],
  '5': [0, 7],
  '6': [0, 4, 7, 9], 'M6': [0, 4, 7, 9], 'maj6': [0, 4, 7, 9],
  'm6': [0, 3, 7, 9], 'min6': [0, 3, 7, 9], '-6': [0, 3, 7, 9],
  '69': [0, 4, 7, 9, 2], '6/9': [0, 4, 7, 9, 2],
  '7': [0, 4, 7, 10], 'dom7': [0, 4, 7, 10],
  'maj7': [0, 4, 7, 11], 'M7': [0, 4, 7, 11], 'Δ': [0, 4, 7, 11], 'Δ7': [0, 4, 7, 11], 'major7': [0, 4, 7, 11],
  'm7': [0, 3, 7, 10], 'min7': [0, 3, 7, 10], '-7': [0, 3, 7, 10],
  'mmaj7': [0, 3, 7, 11], 'mM7': [0, 3, 7, 11], 'minmaj7': [0, 3, 7, 11], '-Δ7': [0, 3, 7, 11],
  '7b5': [0, 4, 6, 10],
  '7#5': [0, 4, 8, 10], '7+5': [0, 4, 8, 10], 'aug7': [0, 4, 8, 10], '+7': [0, 4, 8, 10], '7+': [0, 4, 8, 10],
  '7b9': [0, 4, 7, 10, 1],
  '7#9': [0, 4, 7, 10, 3],
  '7#11': [0, 4, 7, 10, 6],
  '7b13': [0, 4, 7, 10, 8],
  'm7b5': [0, 3, 6, 10], 'ø': [0, 3, 6, 10], 'ø7': [0, 3, 6, 10], 'halfdim': [0, 3, 6, 10],
  'dim7': [0, 3, 6, 9], 'o7': [0, 3, 6, 9], '°7': [0, 3, 6, 9],
  '9': [0, 4, 7, 10, 2],
  'maj9': [0, 4, 7, 11, 2], 'M9': [0, 4, 7, 11, 2],
  'm9': [0, 3, 7, 10, 2], 'min9': [0, 3, 7, 10, 2], '-9': [0, 3, 7, 10, 2],
  '11': [0, 7, 10, 2, 5], // dominant 11 usually omits the 3rd
  'm11': [0, 3, 7, 10, 2, 5], 'min11': [0, 3, 7, 10, 2, 5],
  '13': [0, 4, 7, 10, 2, 9], // usually omits the 11
  'maj13': [0, 4, 7, 11, 2, 9], 'M13': [0, 4, 7, 11, 2, 9],
  'm13': [0, 3, 7, 10, 2, 9], 'min13': [0, 3, 7, 10, 2, 9],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7], 'sus': [0, 5, 7],
  '7sus4': [0, 5, 7, 10], '7sus': [0, 5, 7, 10], '9sus4': [0, 5, 7, 10, 2],
  'add9': [0, 4, 7, 2], 'add2': [0, 4, 7, 2],
  'madd9': [0, 3, 7, 2], 'madd2': [0, 3, 7, 2],
};

export function parseChord(str) {
  const trimmed = normalizeAccidentals(str.trim());
  const head = parseNoteHead(trimmed);
  if (!head) return null;
  const quality = trimmed.slice(head.len);
  if (!(quality in CHORD_QUALITIES)) return null;
  const pcs = CHORD_QUALITIES[quality].map((iv) => (head.pc + iv) % 12);
  return { kind: 'chord', root: head.pc, quality, pcs: [...new Set(pcs)] };
}

// --- Scales -----------------------------------------------------------------
const SCALE_TYPES = {
  'major': [0, 2, 4, 5, 7, 9, 11], 'ionian': [0, 2, 4, 5, 7, 9, 11],
  'minor': [0, 2, 3, 5, 7, 8, 10], 'natural minor': [0, 2, 3, 5, 7, 8, 10],
  'natural': [0, 2, 3, 5, 7, 8, 10], 'aeolian': [0, 2, 3, 5, 7, 8, 10],
  'm': [0, 2, 3, 5, 7, 8, 10], // "E m" style, rarely typed but harmless
  'harmonic minor': [0, 2, 3, 5, 7, 8, 11],
  'melodic minor': [0, 2, 3, 5, 7, 9, 11],
  'harmonic major': [0, 2, 4, 5, 7, 8, 11],
  'major pentatonic': [0, 2, 4, 7, 9], 'pentatonic major': [0, 2, 4, 7, 9], 'maj pentatonic': [0, 2, 4, 7, 9],
  'minor pentatonic': [0, 3, 5, 7, 10], 'pentatonic minor': [0, 3, 5, 7, 10],
  'pentatonic': [0, 3, 5, 7, 10], 'm pentatonic': [0, 3, 5, 7, 10], 'min pentatonic': [0, 3, 5, 7, 10],
  'blues': [0, 3, 5, 6, 7, 10], 'minor blues': [0, 3, 5, 6, 7, 10], 'm blues': [0, 3, 5, 6, 7, 10],
  'major blues': [0, 2, 3, 4, 7, 9],
  'dorian': [0, 2, 3, 5, 7, 9, 10],
  'phrygian': [0, 1, 3, 5, 7, 8, 10],
  'phrygian dominant': [0, 1, 4, 5, 7, 8, 10],
  'lydian': [0, 2, 4, 6, 7, 9, 11],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'locrian': [0, 1, 3, 5, 6, 8, 10],
  'whole tone': [0, 2, 4, 6, 8, 10], 'wholetone': [0, 2, 4, 6, 8, 10],
  'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

// A "scale word" appears somewhere in the input string.
const SCALE_KEYWORDS = ['ionian', 'aeolian', 'dorian', 'phrygian', 'lydian', 'mixolydian',
  'locrian', 'pentatonic', 'blues', 'harmonic', 'melodic', 'natural', 'chromatic',
  'whole tone', 'wholetone', 'major', 'minor', 'scale'];

function looksLikeScale(str) {
  const s = str.toLowerCase();
  return SCALE_KEYWORDS.some((kw) => s.includes(kw));
}

function makeScale(root, type, hadRoot) {
  return { kind: 'scale', root, type, hadRoot, pcs: SCALE_TYPES[type].map((iv) => (root + iv) % 12) };
}

export function parseScale(str) {
  const trimmed = normalizeAccidentals(str.trim()).replace(/\s+scale\s*$/i, '');

  // Prefer "<root> <type>" (e.g. "C Blues"). Fall back to the whole string as a
  // type with a default C root, so mode names whose first letter is itself a
  // note ("Dorian" → D, "Aeolian" → A) aren't mis-read as the root.
  const head = parseNoteHead(trimmed);
  if (head) {
    const rest = trimmed.slice(head.len).trim().toLowerCase();
    const type = rest === '' ? 'major' : rest;
    if (type in SCALE_TYPES) return makeScale(head.pc, type, true);
  }
  const whole = trimmed.toLowerCase();
  if (whole in SCALE_TYPES) return makeScale(0, whole, false);
  return null;
}

// --- Note list ("C E G", "C, Eb, G") ---------------------------------------
function parseNoteList(str) {
  const tokens = str.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length < 2) return null; // a single token is treated as a chord
  const pcs = [];
  for (const t of tokens) {
    const pc = parseNote(t);
    if (pc === null) return null;
    pcs.push(pc);
  }
  return { kind: 'notes', root: pcs[0], pcs: [...new Set(pcs)] };
}

// --- Top-level dispatch -----------------------------------------------------
// Decides whether the input is a scale, a chord, or a bare note list.
// Convention: a spelled-out quality word ("C minor", "C major") reads as a
// scale; a chord symbol ("Cm", "Cmaj7") reads as a chord.
export function parseInput(str) {
  if (!str || !str.trim()) return null;
  if (looksLikeScale(str)) {
    const scale = parseScale(str);
    if (scale) return scale;
  }
  const chord = parseChord(str);
  if (chord) return chord;
  const notes = parseNoteList(str);
  if (notes) return notes;
  // Last resort: maybe it's a scale keyword we didn't flag, or a lone accidental note.
  return parseScale(str) || null;
}

// Spelled-out chord-quality suffix for titles, so "Am7" reads "A Minor 7" like
// "Am" reads "A Minor". Complex altered dominants keep their compact symbol.
const CHORD_SUFFIX = {
  '': ' Major', 'maj': ' Major', 'M': ' Major', 'major': ' Major',
  'm': ' Minor', 'min': ' Minor', '-': ' Minor', 'minor': ' Minor',
  'dim': ' Diminished', 'o': ' Diminished', '°': ' Diminished',
  'aug': ' Augmented', '+': ' Augmented',
  '6': ' Major 6', 'M6': ' Major 6', 'maj6': ' Major 6',
  'm6': ' Minor 6', 'min6': ' Minor 6', '-6': ' Minor 6',
  '69': ' 6/9', '6/9': ' 6/9',
  '7': ' Dominant 7', 'dom7': ' Dominant 7',
  'maj7': ' Major 7', 'M7': ' Major 7', 'Δ': ' Major 7', 'Δ7': ' Major 7', 'major7': ' Major 7',
  'm7': ' Minor 7', 'min7': ' Minor 7', '-7': ' Minor 7',
  'mmaj7': ' Minor/Major 7', 'mM7': ' Minor/Major 7', 'minmaj7': ' Minor/Major 7', '-Δ7': ' Minor/Major 7',
  'm7b5': ' Half-Diminished 7', 'ø': ' Half-Diminished 7', 'ø7': ' Half-Diminished 7', 'halfdim': ' Half-Diminished 7',
  'dim7': ' Diminished 7', 'o7': ' Diminished 7', '°7': ' Diminished 7',
  '9': ' Dominant 9', 'maj9': ' Major 9', 'M9': ' Major 9',
  'm9': ' Minor 9', 'min9': ' Minor 9', '-9': ' Minor 9',
  '11': ' Dominant 11', 'm11': ' Minor 11', 'min11': ' Minor 11',
  '13': ' Dominant 13', 'maj13': ' Major 13', 'M13': ' Major 13', 'm13': ' Minor 13', 'min13': ' Minor 13',
  'sus2': ' Suspended 2', 'sus4': ' Suspended 4', 'sus': ' Suspended 4',
  '7sus4': ' Dominant 7 Suspended 4', '7sus': ' Dominant 7 Suspended 4', '9sus4': ' Dominant 9 Suspended 4',
  'add9': ' Add 9', 'add2': ' Add 9', 'madd9': ' Minor Add 9', 'madd2': ' Minor Add 9',
};
export function chordQualitySuffix(quality) {
  return quality in CHORD_SUFFIX ? CHORD_SUFFIX[quality] : quality;
}

// Nicely capitalized display name for a scale type (aliases collapse to one).
const SCALE_LABELS = {
  natural: 'Natural Minor', 'natural minor': 'Natural Minor', m: 'Minor',
  aeolian: 'Aeolian', ionian: 'Ionian', major: 'Major', minor: 'Minor',
  'harmonic minor': 'Harmonic Minor', 'melodic minor': 'Melodic Minor', 'harmonic major': 'Harmonic Major',
  'major pentatonic': 'Major Pentatonic', 'pentatonic major': 'Major Pentatonic', 'maj pentatonic': 'Major Pentatonic',
  'minor pentatonic': 'Minor Pentatonic', 'pentatonic minor': 'Minor Pentatonic',
  pentatonic: 'Minor Pentatonic', 'm pentatonic': 'Minor Pentatonic', 'min pentatonic': 'Minor Pentatonic',
  blues: 'Blues', 'minor blues': 'Blues', 'm blues': 'Blues', 'major blues': 'Major Blues',
  'phrygian dominant': 'Phrygian Dominant', 'whole tone': 'Whole Tone', wholetone: 'Whole Tone',
};
export function scaleDisplayName(type) {
  return SCALE_LABELS[type] || type.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Human-readable interval label for a pitch class relative to a root.
const DEGREE_LABEL = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
export function degreeOf(pc, root) {
  return DEGREE_LABEL[(((pc - root) % 12) + 12) % 12];
}

// Swap ascii accidentals for their proper music-notation glyphs, for DISPLAY
// only (parsing still accepts plain b/#). A flat is either a note-name accidental
// (an uppercase note letter + "b", e.g. "Bb") or an alteration before a digit
// (e.g. "b3", "7b5") — so scale words like "Blues" are left untouched.
export function withMusicAccidentals(str) {
  return String(str)
    .replace(/([A-G])b/g, '$1♭')
    .replace(/([A-G])#/g, '$1♯')
    .replace(/b(?=\d)/g, '♭')
    .replace(/#(?=\d)/g, '♯');
}

// The tonic triad of a scale — root, third and fifth stacked from the root —
// as pitch classes, or null if the scale has no clear third or fifth. Prefers
// the major third and perfect fifth; falls back to what the scale contains
// (e.g. Locrian → diminished 3+6, Phrygian → minor 3+7).
export function tonicTriadPcs(pcs, root) {
  const has = (iv) => pcs.includes((root + iv) % 12);
  const third = has(4) ? 4 : has(3) ? 3 : null;
  const fifth = has(7) ? 7 : has(6) ? 6 : has(8) ? 8 : null;
  if (third === null || fifth === null) return null;
  return [root, (root + third) % 12, (root + fifth) % 12];
}

// Highlight bucket for a pitch class against the active selection:
// 'root' | 'match' (chord tone / scale triad 3rd·5th) | 'tone' (other scale
// tone) | 'dim' (not in the selection) | null (nothing selected).
export function highlightFor(pc, parsed, triad) {
  if (!parsed) return null;
  if (!parsed.pcs.includes(pc)) return 'dim';
  if (pc === parsed.root) return 'root';
  if (triad && !triad.includes(pc)) return 'tone';
  return 'match';
}
