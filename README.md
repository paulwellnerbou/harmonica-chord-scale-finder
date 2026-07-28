# Harmonica chord & scale finder

A single-page web app that shows where any chord or scale sits on a 10-hole diatonic (Richter-tuned) harmonica — which hole and technique (blow, draw, bend, overblow/overdraw) plays each note, for any key of harp.

Live at [harmonica.wbou.de](https://harmonica.wbou.de/).

## Features

- Type a chord (`C`, `Am7`, `E7`, `F#9`, `Cmaj7`, …) or a scale (`C Blues`, `Em Pentatonic`, `D Dorian`, …) — or a bare note list (`C E G`) — and every hole/technique that plays a target note lights up, labelled with its interval degree.
- **Type-ahead**: once you've typed a root note, the field offers the chords and scales that can follow it (`G` → `Gm7`, `G Blues`, `G Mixolydian`, …), filtered as you keep typing (`G pent` → the two pentatonics) and pickable with the arrow keys.
- The **root** is picked out; for a scale the **tonic-triad** notes (3rd & 5th) are marked more strongly than the remaining passing tones.
- The **tab strip** under the harp runs the selection low to high in standard tab (`1 -1' -1 -2'' -2 / 3 …`), the order you'd actually play it; a note the enabled techniques can't reach keeps its place as a dashed ✕ socket, so the gaps a setting leaves in a scale stay visible.
- Switch the **harp key** (G through F#) and the whole chart transposes.
- Toggle bends and overblows/overdraws on or off.
- Play the highlighted notes, or click any single note, to hear it (Web Audio).
- Copy or download the layout as a PNG — transparent background, title baked in — via the split image button.

## Using the images

Every layout you copy or download from the app is free to use however you like — lesson handouts,
songbooks, blog posts, videos, print, commercial work. No restrictions, no attribution needed.

## Harmonica model

Standard Richter tuning is encoded once as the key-of-C harp (as MIDI numbers); every other key is a straight transposition. Bends are the chromatic notes strictly between the blow and draw reed; overblows/overdraws sit a semitone above the higher reed. Draw bends live on holes 1–6, blow bends on 7–10. Everything you blow is drawn above the number bar and everything you draw below it, with deeper bends further from the bar.

## Run locally

Static files, no build step — but ES modules need a server (`file://` won't work):

    python3 -m http.server

then open `http://localhost:8000`.

## Code layout

- `index.html` — markup only
- `styles.css` — styles
- `src/theory.js` — note/chord/scale parsing → pitch-class sets, tonic-triad and highlight helpers (pure)
- `src/harmonica.js` — Richter note map and transposition (pure)
- `src/audio.js` — Web Audio playback
- `src/exporter.js` — native-canvas PNG export (copy / download)
- `src/app.js` — features, state and DOM wiring

## Hosting

Plain static files with no build step — serve the repo root with any web server.
Every path is relative, so a subdirectory works too. GitHub Pages works as-is;
`.nojekyll` just switches its Jekyll step off.
