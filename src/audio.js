// Tiny Web Audio helper: play a harmonica-ish tone for a MIDI note on click.
// No samples, just a couple of detuned oscillators through a short envelope.

let ctx = null;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Extra time the oscillators keep running past the gain envelope, so the tail
// doesn't cut off abruptly.
const STOP_TAIL = 0.05;

// Onsets are scheduled this far ahead of "now" so the audio thread already has
// the events when it needs them.
const LEAD_IN = 0.06;

// Start the context before the first note is wanted: a fresh or suspended
// context needs a moment to get its clock running, and that delay would land
// entirely on the first note.
export function primeAudio() {
  const c = ac();
  if (c.state === 'suspended') c.resume();
}

export function playNote(midi, duration = 0.7, at = 0) {
  const c = ac();
  if (c.state === 'suspended') c.resume();
  // A caller-supplied onset already carries the lead-in, and comes from a
  // single clock reading for the whole sequence — only guard it against
  // landing in the past, or the notes would drift apart by a render quantum.
  const start = at ? Math.max(at, c.currentTime) : c.currentTime + LEAD_IN;
  const freq = midiToFreq(midi);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0008, start + duration);
  gain.connect(c.destination);

  // Two slightly detuned reeds give the tone a hint of the free-reed beating.
  const oscs = [-6, 6].map((detune) => {
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(gain);
    osc.start(start);
    osc.stop(start + duration + STOP_TAIL);
    return osc;
  });

  return { gain, oscs, start };
}

const SEQ_GAP = 0.32;      // seconds between successive note onsets
const SEQ_NOTE_DUR = 0.5;  // seconds each sequenced note rings
const FADE_OUT = 0.03;     // seconds to duck a stopped note, so it doesn't click

// Nodes of the sequence currently scheduled, kept so it can be silenced.
let scheduled = [];

// Play a set of MIDI notes in sequence (used for "play scale/chord").
// Every onset is scheduled up front on the audio clock rather than by a chain
// of timers, so the spacing stays even no matter how long the context takes to
// start or how busy the main thread is.
// Returns the total time in ms until the last note has finished ringing, so
// callers can time UI feedback without duplicating these constants.
export function playSequence(midis, gap = SEQ_GAP) {
  stopSequence();
  if (!midis.length) return 0;
  const c = ac();
  if (c.state === 'suspended') c.resume();
  const start = c.currentTime + LEAD_IN;
  scheduled = midis.map((m, i) => playNote(m, SEQ_NOTE_DUR, start + i * gap));
  return ((midis.length - 1) * gap + LEAD_IN + SEQ_NOTE_DUR + STOP_TAIL) * 1000;
}

// Silence a running sequence: duck whatever is sounding right now and drop
// everything still pending.
export function stopSequence() {
  if (!scheduled.length) return;
  const now = ac().currentTime;
  const end = now + FADE_OUT;
  for (const { gain, oscs, start } of scheduled) {
    // Stopping an oscillator at or before its onset means it never sounds.
    if (start >= now) { oscs.forEach((osc) => osc.stop(now)); continue; }
    if (gain.gain.cancelAndHoldAtTime) gain.gain.cancelAndHoldAtTime(now);
    else gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, end);
    oscs.forEach((osc) => osc.stop(end));
  }
  scheduled = [];
}
