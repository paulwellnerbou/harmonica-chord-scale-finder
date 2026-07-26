# AGENTS.md

- Static ES-module app, no build step and no dependencies: `index.html` (markup) + `styles.css` + `src/` modules. There is no `package.json`, `node_modules`, or bundler — don't add any.
- Module boundaries: `src/theory.js` (note/chord/scale parsing → pitch classes, tonic-triad and highlight helpers) and `src/harmonica.js` (Richter note map + transposition) are pure — keep them free of DOM access. `src/audio.js` is Web Audio playback. `src/exporter.js` renders the layout to a canvas for PNG copy/download and must stay a faithful mirror of the on-screen harp — it shares `highlightFor`/note data rather than duplicating the highlight rules. `src/app.js` is feature logic and DOM wiring.
- No test suite: verify changes in a served browser (`python3 -m http.server` — ES modules don't load from `file://`). When you touch note/highlight logic in `theory.js`/`harmonica.js`, also check the exported image, since it re-renders the same data independently.
- The harmonica note map is authoritative: `src/harmonica.js` encodes the key-of-C Richter layout as MIDI and derives every other key by transposition. Keep bends, overblows and overdraws consistent with that model instead of special-casing holes.
- Match existing style: 2-space indent, semicolons, minimal comments (only the non-obvious "why").
- This repo is public and holds only the app: plain static files that any web server can serve (GitHub Pages included). Never document or add deployment specifics here — no deploy scripts, no server or infrastructure configuration, and nothing about where or how the app is hosted.
- Keep `index.html`'s absolute `og:`/`twitter:` URLs on `harmonica.wbou.de` — scrapers don't run the app, so those tags can't be relative.
