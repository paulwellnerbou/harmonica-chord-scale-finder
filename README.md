# Harmonica Chord & Scale Finder

**Live demo: <https://harmonica.wbou.dev/>**

A client-only web app that shows **where a chord or scale lives on a 10-hole
diatonic (Richter-tuned) harmonica** — including draw/blow notes, bends,
overblows and overdraws. The layout mirrors the
[harmonica.com bending tool](https://www.harmonica.com/bending-tool/).

## Features

- Type a **chord** (`C`, `Am7`, `E7`, `F#9`, `Cmaj7`, `Dm7b5`, `Gsus4`, …) or a
  **scale** (`C Blues`, `Em Pentatonic`, `D Dorian`, `A Mixolydian`,
  `F Harmonic Minor`, …). A bare note list (`C E G`) works too.
- Highlights every hole/technique that plays a target note, with the interval
  degree (`R`, `b3`, `5`, `b7`, …) and the **root** picked out.
- Switch the **harp key** (G through F#); the whole chart transposes.
- Toggle **bends** and **overblows/overdraws** on or off.
- Click any note to hear it (Web Audio, no samples).
- **Copy or download the layout as an image** — a split button (`⧉ Copy image`
  with a ▾ menu to switch to `⤓ Download image`). Rendered natively to a canvas
  with a **transparent background** (no page backdrop) and a descriptive title
  baked in (e.g. "C Blues Scale · Harp in C", "A Minor 7 · Harp in C"). Copy
  falls back to a download where the clipboard image API is unavailable.
- The current key + chord/scale also shows as the page heading and the browser
  tab title.

## Layout

Blow techniques sit **above** the number bar, draw techniques **below** it, and
deeper bends sit **further** from the bar:

```
                overblow (holes 1–6)  /  blow bends (holes 7–10, deeper = higher)
                ─────────────────  BLOW  ─────────────────
                ══════════════  hole numbers  ═════════════
                ─────────────────  DRAW  ─────────────────
                draw bends (holes 1–6, deeper = lower)  /  overdraw (holes 7–10)
```

## Music theory

`src/harmonica.js` encodes the key-of-C Richter harp as MIDI numbers; every
other key is a transposition. Bends are the chromatic notes strictly between the
blow and draw reeds; overblows/overdraws are a semitone above the higher reed.
`src/theory.js` turns chord/scale text into octave-independent pitch-class sets.

## Running

No build step. Serve the folder over HTTP (ES modules need `http://`, not
`file://`):

```bash
python3 -m http.server 5178
```

Then open <http://localhost:5178>.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `styles.css` | Layout & theme |
| `src/theory.js` | Note / chord / scale parsing → pitch classes |
| `src/harmonica.js` | Richter layout, transposition, full note map |
| `src/audio.js` | Web Audio note playback |
| `src/app.js` | Rendering & interaction |
