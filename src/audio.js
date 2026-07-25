// Tiny Web Audio helper: play a harmonica-ish tone for a MIDI note on click.
// No samples, just a few detuned oscillators through a filter, a breath
// envelope and a touch of vibrato.

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

// A breath, not a pluck: swell in, settle back from the initial push, then hold
// while the note lasts. Decaying straight from the peak is what makes a tone
// read as a struck or plucked string.
const ATTACK = 0.05;
const DECAY = 0.09;
const SUSTAIN = 0.72;  // fraction of the peak held for the body of the note
const RELEASE = 0.14;
const PEAK = 0.3;

// A quiet detuned pair around the main reed. Symmetric detuning modulates the
// summed amplitude by twice their gain, so keep them faint: at equal gain the
// three would beat against each other loudly enough to sound like tremolo.
const HALO_DETUNE = 6;
const HALO_GAIN = 0.15;

// Free reeds are rich but not buzzy, so keep roughly the lower harmonics of the
// sawtooth. The ceiling stops high notes from turning shrill.
const HARMONICS = 8;
const MAX_CUTOFF = 7000;

// Hand vibrato, eased in so the onset itself stays steady.
const VIB_HZ = 5.2;
const VIB_CENTS = 7;
const VIB_ONSET = 0.3;

const NOTE_DUR = 0.62;

export function playNote(midi, duration = NOTE_DUR, at = 0) {
  const c = ac();
  if (c.state === 'suspended') c.resume();
  // A caller-supplied onset already carries the lead-in, and comes from a
  // single clock reading for the whole sequence — only guard it against
  // landing in the past, or the notes would drift apart by a render quantum.
  const start = at ? Math.max(at, c.currentTime) : c.currentTime + LEAD_IN;
  const freq = midiToFreq(midi);

  // Whatever is left of the note after the swell is held flat — but never at
  // the cost of the swell itself, however short the note is asked to be.
  const hold = Math.max(start + ATTACK + DECAY, start + duration - RELEASE);
  const end = hold + RELEASE;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(PEAK, start + ATTACK);
  gain.gain.exponentialRampToValueAtTime(PEAK * SUSTAIN, start + ATTACK + DECAY);
  gain.gain.setValueAtTime(PEAK * SUSTAIN, hold);
  gain.gain.exponentialRampToValueAtTime(0.0008, end);
  gain.connect(c.destination);

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(freq * HARMONICS, MAX_CUTOFF);
  filter.Q.value = 0.7;
  filter.connect(gain);

  const vib = c.createOscillator();
  vib.frequency.value = VIB_HZ;
  const vibDepth = c.createGain();
  vibDepth.gain.setValueAtTime(0, start);
  vibDepth.gain.linearRampToValueAtTime(VIB_CENTS, start + VIB_ONSET);
  vib.connect(vibDepth);
  vib.start(start);
  vib.stop(end + STOP_TAIL);

  const halo = c.createGain();
  halo.gain.value = HALO_GAIN;
  halo.connect(filter);

  const oscs = [0, -HALO_DETUNE, HALO_DETUNE].map((detune) => {
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    vibDepth.connect(osc.detune);
    osc.connect(detune ? halo : filter);
    osc.start(start);
    osc.stop(end + STOP_TAIL);
    return osc;
  });

  // The vibrato oscillator rides along so a stop silences it too.
  return { gain, oscs: [...oscs, vib], start, end };
}

const SEQ_GAP = 0.32;      // seconds between successive note onsets
// Each sequenced note is releasing by the time the next starts, so they run
// together the way tongued notes on one breath do.
const SEQ_NOTE_DUR = 0.42;
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
  const last = scheduled[scheduled.length - 1];
  return (last.end + STOP_TAIL - c.currentTime) * 1000;
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
