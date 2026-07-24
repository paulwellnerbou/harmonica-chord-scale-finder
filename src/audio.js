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

export function playNote(midi, duration = 0.7) {
  const c = ac();
  if (c.state === 'suspended') c.resume();
  const now = c.currentTime;
  const freq = midiToFreq(midi);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);
  gain.connect(c.destination);

  // Two slightly detuned reeds give the tone a hint of the free-reed beating.
  for (const detune of [-6, 6]) {
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }
}

const SEQ_GAP = 0.32;      // seconds between successive note onsets
const SEQ_NOTE_DUR = 0.5;  // seconds each sequenced note rings

// Play a set of MIDI notes in sequence (used for "play scale/chord").
// Returns the total time in ms until the last note has finished ringing, so
// callers can time UI feedback without duplicating these constants.
export function playSequence(midis, gap = SEQ_GAP) {
  midis.forEach((m, i) => setTimeout(() => playNote(m, SEQ_NOTE_DUR), i * gap * 1000));
  return midis.length ? (midis.length - 1) * gap * 1000 + SEQ_NOTE_DUR * 1000 : 0;
}
