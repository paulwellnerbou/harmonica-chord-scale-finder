import { parseInput, degreeOf, PC_NAMES_FLAT, chordQualitySuffix, scaleDisplayName, tonicTriadPcs, highlightFor, withMusicAccidentals, queryCompletions } from './theory.js';
import { buildHarp, allNotes, gridRowOf, KEY_ORDER, playableNotes, positionKeys, suggestions,
  tabStrip, pcOf, TUNINGS, TUNING_ORDER, DEFAULT_TUNING } from './harmonica.js';
import { playNote, playSequence, stopSequence, primeAudio, NOTE_MS } from './audio.js';
import { renderHarpImage, copyCanvas, downloadCanvas } from './exporter.js';

// Corner-control glyphs. The play button swaps to pulsing bars while sounding;
// the image button flashes a check on success.
const PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.79-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14Z"/></svg>';
const PLAYING_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="play-bars"><rect x="4" y="4" width="3" height="16" rx="1"/><rect x="10.5" y="4" width="3" height="16" rx="1"/><rect x="17" y="4" width="3" height="16" rx="1"/></svg>';
const IMG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="9" r="1.6"/><path d="m20 15-4.5-4.5L5 21"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';
const LINK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.71 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
const SHARE_LABEL = `${LINK_ICON}<span>Copy link</span>`;

const state = {
  key: 'C',
  tuning: DEFAULT_TUNING,
  query: '',
  parsed: null,
  triad: null, // tonic-triad pitch classes when a scale is selected, else null
  showDrawBends: true,
  showBlowBends: true,
  showOverblow: true,
  showOverdraw: true,
};

// State <-> URL. The query string always mirrors the current selection so it can
// be bookmarked or shared.
const TOGGLE_PARAM = {
  showDrawBends: 'drawbend',
  showBlowBends: 'blowbend',
  showOverblow: 'overblow',
  showOverdraw: 'overdraw',
};

// replaceState (not push) — the URL changes on every keystroke, so it must not
// pile up in the back/forward history.
function syncURL() {
  const params = new URLSearchParams();
  const q = state.query.trim();
  if (q) params.set('q', q);
  if (state.key !== 'C') params.set('key', state.key);
  if (state.tuning !== DEFAULT_TUNING) params.set('tuning', state.tuning);
  const hidden = Object.entries(TOGGLE_PARAM).filter(([k]) => !state[k]).map(([, v]) => v);
  if (hidden.length) params.set('hide', hidden.join(','));
  const qs = params.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

// Seed state from the URL on load; returns the query text to apply.
function applyURLState() {
  const params = new URLSearchParams(location.search);
  const key = params.get('key');
  if (key && KEY_ORDER.includes(key)) state.key = key;
  const tuning = params.get('tuning');
  if (tuning && TUNING_ORDER.includes(tuning)) state.tuning = tuning;
  const hidden = new Set((params.get('hide') || '').split(',').filter(Boolean));
  Object.entries(TOGGLE_PARAM).forEach(([k, v]) => { if (hidden.has(v)) state[k] = false; });
  return params.get('q') || '';
}

async function copyLink(btn) {
  try {
    await navigator.clipboard.writeText(location.href);
  } catch {
    return; // clipboard blocked / unavailable — leave the button unchanged
  }
  btn.classList.add('is-done');
  btn.innerHTML = `${CHECK_ICON}<span>Copied!</span>`;
  clearTimeout(btn._t);
  btn._t = setTimeout(() => { btn.innerHTML = SHARE_LABEL; btn.classList.remove('is-done'); }, 1500);
}

const TECH_TAG = { overblow: 'OB', overdraw: 'OD' };

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// HTML for a title/heading with proper accidentals. The ♭/♯ are wrapped so they
// can be rendered in the body font — the serif display font (Fraunces) lacks
// those glyphs and falls back to an oversized, ill-spaced substitute.
function accidentalsHtml(asciiStr) {
  return withMusicAccidentals(escapeHtml(asciiStr)).replace(/[♭♯]/g, (g) => `<span class="acc">${g}</span>`);
}

function classForType(type) {
  if (type === 'blow' || type === 'draw') return 'reed';
  if (type === 'overblow' || type === 'overdraw') return 'over';
  return 'bend';
}

// A key on the harp or in the tab strip is one specific pitch, so playing it
// rings that pitch alone (both holes, where two make the same note) plus its
// tab key — and the info panel's chip for it, that being the only place the
// pitch class is shown.
function soundNote(midi) {
  playNote(midi);
  ring(cardsOf(midi));
}

// A chip stands for a pitch class rather than one octave, so playing it rings
// every card carrying that note, wherever it sits on the harp.
function soundPitchClass(midi) {
  playNote(midi);
  ring(`[data-pc="${pcOf(midi)}"]`);
}

function cardsOf(midi) {
  return `.box[data-midi="${midi}"], .chip[data-pc="${pcOf(midi)}"]`;
}

// What lit the ring a card is wearing right now. Stopping a sequence puts out
// only its own rings: a note clicked while it played is still sounding, and
// keeps its ring until its own tone dies.
const BY_CLICK = 'click';
const BY_SEQUENCE = 'sequence';

// Every card rings on its own clock, for as long as its own tone lasts — a
// clicked note sounds longer than one played as part of a sequence. Notes are
// never cut short — clicking a second one leaves the first still sounding — so
// an earlier ring has to outlive the click that follows it.
function ring(selector, ms = NOTE_MS, by = BY_CLICK) {
  const cards = document.querySelectorAll(selector);
  const ends = performance.now() + ms;
  cards.forEach((el) => {
    // Two tones can sound on one card at once — a clicked note, and the scale
    // passing through the same pitch — but it has only one ring to show them
    // with, so the longer-running claim keeps it rather than the latest one.
    if (el.classList.contains('is-sounding') && el._ringEnds > ends) return;
    el._ringBy = by;
    el._ringEnds = ends;
    // Hand the audio timing to CSS so the animation runs exactly as long as the tone.
    el.style.setProperty('--ring-ms', `${ms}ms`);
    // Re-adding the class to a card that already has it is no change as far as
    // CSS is concerned, so its animation would carry on mid-flight. Rewind it
    // instead: same restart, without the forced layout that flushing the style
    // between a removal and an addition would cost.
    if (el.classList.contains('is-sounding')) {
      el.getAnimations({ subtree: true }).forEach((a) => { a.currentTime = 0; });
    } else {
      el.classList.add('is-sounding');
    }
    clearTimeout(el._ringTimer);
    el._ringTimer = setTimeout(() => el.classList.remove('is-sounding'), ms);
  });
  return cards;
}

function unring(el) {
  clearTimeout(el._ringTimer);
  el.classList.remove('is-sounding');
}

function makeBox(note) {
  const el = document.createElement('button');
  el.type = 'button';
  // Second class is the exact technique (draw-bend / overblow / …) so each can
  // be toggled independently; classForType gives the shared base style.
  el.className = `box ${classForType(note.type)} ${note.type}`;
  el.dataset.pc = String(note.pc);
  el.dataset.midi = String(note.midi);
  el.style.gridColumn = String(note.hole);
  el.style.gridRow = String(gridRowOf(note));
  el.title = `Hole ${note.hole} · ${labelForType(note)} · ${note.name}`;

  const name = document.createElement('span');
  name.className = 'note';
  name.textContent = withMusicAccidentals(note.name);
  el.appendChild(name);

  if (TECH_TAG[note.type]) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = TECH_TAG[note.type];
    el.appendChild(tag);
  }

  // Highlight against the active chord/scale.
  const p = state.parsed;
  const cls = highlightFor(note.pc, p, state.triad);
  if (cls) {
    el.classList.add(cls);
    if (cls !== 'dim') {
      const deg = document.createElement('span');
      deg.className = 'deg';
      deg.textContent = withMusicAccidentals(degreeOf(note.pc, p.root));
      el.appendChild(deg);
    }
  }

  el.addEventListener('click', () => soundNote(note.midi));
  return el;
}

function labelForType(note) {
  switch (note.type) {
    case 'blow': return 'blow';
    case 'draw': return 'draw';
    case 'blow-bend': return `blow bend ${note.depth}`;
    case 'draw-bend': return `draw bend ${note.depth}`;
    case 'overblow': return 'overblow';
    case 'overdraw': return 'overdraw';
  }
}

function renderHarp() {
  const harp = buildHarp(state.key, state.tuning);
  const grid = document.getElementById('harp');
  grid.innerHTML = '';

  // Background panel behind the blow/draw reeds and the number bar.
  const panel = document.createElement('div');
  panel.className = 'reed-panel';
  grid.appendChild(panel);

  const bar = document.createElement('div');
  bar.className = 'number-bar';
  grid.appendChild(bar);

  for (let h = 1; h <= 10; h++) {
    const cell = harp[h];
    grid.appendChild(makeBox(cell.blow));
    grid.appendChild(makeBox(cell.draw));

    // Hole number chip on the dark bar.
    const num = document.createElement('div');
    num.className = 'hole-num';
    num.style.gridColumn = String(h);
    num.style.gridRow = '5';
    num.textContent = String(h);
    grid.appendChild(num);

    // Always build bends/overblows; their visibility is animated via CSS classes
    // on the grid (the grid rows keep their height, so nothing reflows).
    cell.drawBends.forEach((n) => grid.appendChild(makeBox(n)));
    cell.blowBends.forEach((n) => grid.appendChild(makeBox(n)));
    if (cell.overblow) grid.appendChild(makeBox(cell.overblow));
    if (cell.overdraw) grid.appendChild(makeBox(cell.overdraw));
  }

  applyBendRows(harp);
  applyVisibility();
}

// The selection as a strip of small tab keys ("1 -1' -1 -2'' -2 / 3 …"), low to
// high — the order you'd actually play them, with the notes the harp can't
// reach marked ✕ in the place they'd have taken.
function renderTabStrip() {
  const row = document.getElementById('tab-strip');
  const keys = state.parsed ? tabStrip(buildHarp(state.key, state.tuning), state, state.parsed.pcs) : [];
  row.hidden = keys.length === 0;
  row.innerHTML = '';
  keys.forEach((k) => {
    // Key and note name share one column, so the name can never drift out of
    // alignment with the key above it.
    const cell = document.createElement('div');
    cell.className = 'tab-key';

    const el = document.createElement('button');
    el.type = 'button';
    el.className = k.missing
      ? 'box mini miss'
      : `box mini ${classForType(k.notes[0].type)} ${highlightFor(k.pc, state.parsed, state.triad)}`;
    el.dataset.pc = String(k.pc);
    el.dataset.midi = String(k.midi);
    el.textContent = k.text;
    const what = k.missing
      ? `${k.name} · not reachable with the current techniques`
      : `${k.name} · ${k.notes.map((n) => `hole ${n.hole} ${labelForType(n)}`).join(' or ')}`;
    el.title = what;
    el.setAttribute('aria-label', what); // the tab text alone reads poorly aloud
    // A missing key sounds its note too, like an unreachable chip does, so you
    // can hear what the setting costs you.
    el.addEventListener('click', () => soundNote(k.midi));
    cell.appendChild(el);

    const name = document.createElement('span');
    name.className = 'tab-name';
    name.textContent = withMusicAccidentals(k.name);
    cell.appendChild(name);

    row.appendChild(cell);
  });
}

// Scale the harp down to fit narrow viewports instead of overflowing/scrolling.
// The harp keeps its full-size layout (min-width) and we transform it to fit.
function fitHarp() {
  const fit = document.querySelector('.harp-fit');
  const area = document.querySelector('.harp-area');
  const harp = document.getElementById('harp');
  const tab = document.getElementById('tab-strip');
  if (!fit || !area || !harp || !tab) return;
  const px = (v) => parseFloat(v) || 0;
  const areaCs = getComputedStyle(area);
  const gutters = px(areaCs.paddingLeft) + px(areaCs.paddingRight); // side-label gutters
  const natW = (px(getComputedStyle(harp).minWidth) || 652) + gutters;
  const avail = fit.clientWidth;
  if (!avail) return; // laid out at zero width (hidden tab/pane) — keep the last fit
  if (avail < natW - 0.5) {
    const scale = avail / natW;
    area.style.width = `${natW}px`;
    area.style.transformOrigin = 'top left';
    area.style.transform = `scale(${scale})`;
    // Only the tab strip has to be measured (its height depends on how many keys
    // wrap); the harp's own rows come from --harp-h so the wrapper keeps
    // tracking the row-collapse animation. Measured after the width is set, so
    // the strip is laid out at its natural size.
    const tabH = tab.hidden ? 0 : tab.offsetHeight + px(getComputedStyle(tab).marginTop);
    fit.style.setProperty('--tab-h', `${tabH}px`);
    // clientWidth excludes padding; add the wrapper's own back to the height.
    const fitCs = getComputedStyle(fit);
    const padY = px(fitCs.paddingTop) + px(fitCs.paddingBottom);
    fit.style.height = `calc(var(--harp-h) * ${scale} + ${padY}px)`;
  } else {
    area.style.width = '';
    area.style.transform = '';
    area.style.transformOrigin = '';
    fit.style.height = '';
  }
}

let fitRaf = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(fitRaf);
  fitRaf = requestAnimationFrame(fitHarp);
});

// Bend rows no reed of the current tuning reaches collapse away, so a harp that
// bends shallower than Richter doesn't carry an empty band — and one that bends
// deeper (harmonic minor's three-semitone 10 blow) gets the row it needs. Set
// inline over the CSS defaults; the toggles' own collapse stays in CSS below,
// and only ever asks for the same zero back.
const BEND_ROWS = [1, 2, 3, 7, 8, 9];
function applyBendRows(harp, fit = document.querySelector('.harp-fit')) {
  const used = new Set(allNotes(harp).map(gridRowOf));
  BEND_ROWS.forEach((r) => {
    if (used.has(r)) fit.style.removeProperty(`--row-${r}`);
    else fit.style.setProperty(`--row-${r}`, '0px');
  });
}

// Show/hide bends & overblows purely in CSS so they fade in and out instead of
// popping. Kept off the render path so it never rebuilds the harp mid-animation.
// The classes sit on the fit wrapper because the collapsing row heights they
// drive are also read by the side labels and the wrapper's own height.
function applyVisibility(fit = document.querySelector('.harp-fit')) {
  fit.classList.toggle('hide-draw-bend', !state.showDrawBends);
  fit.classList.toggle('hide-blow-bend', !state.showBlowBends);
  fit.classList.toggle('hide-overblow', !state.showOverblow);
  fit.classList.toggle('hide-overdraw', !state.showOverdraw);
}

// Root note exactly as the user spelled it (keeps F# from becoming Gb), or null.
function queryRootText() {
  const m = state.query.trim().match(/^([A-Ga-g])([#b♯♭]*)/);
  if (!m) return null;
  return m[1].toUpperCase() + m[2].replace(/♯/g, '#').replace(/♭/g, 'b');
}

// Descriptive name of the current selection: "C Major", "A Minor",
// "C Blues Scale", "E Minor Pentatonic Scale", "F#9" — or '' if none.
function selectionName() {
  const p = state.parsed;
  if (!p) return '';
  // Trust the typed root only when the parse actually consumed one — for a
  // rootless mode name like "Dorian" the leading "D" is not the root.
  const typedRoot = p.hadRoot === false ? null : queryRootText();
  const root = typedRoot || PC_NAMES_FLAT[p.root];
  if (p.kind === 'chord') return `${root}${chordQualitySuffix(p.quality)}`;
  if (p.kind === 'scale') return `${root} ${scaleDisplayName(p.type)} Scale`;
  return 'Notes';
}

// What the harp is, for the title and the image: the key, plus the tuning where
// it isn't the standard Richter one.
function harpName() {
  const tuning = state.tuning === DEFAULT_TUNING ? '' : ` (${TUNINGS[state.tuning].name})`;
  return `Harp in ${state.key}${tuning}`;
}

// Title shown on the page, the browser tab and baked into the copied image.
function titleText() {
  const what = selectionName();
  return what ? `${what} · ${harpName()}` : harpName();
}

// Positions spelled out — "2nd position G (Cross harp) · 3rd position Dm" — for
// the line under the title, the exported image and the key menu's screen-reader
// labels. What is in the list is the caller's choice; see positionKeys.
function positionsText(positions) {
  return positions
    .map((p) => `${p.name} position ${p.label}${p.nick ? ` (${p.nick})` : ''}`)
    .join(' · ');
}

// The positions worth annotating a key with in the dropdown. 1st position is
// left out there: it is the option's own key, and names the same mode all the
// way down the list.
function crossPositions(key) {
  return positionKeys(key, state.tuning).filter((p) => p.fifths !== 0);
}

// Those tonics as a menu annotation — "2nd G · 3rd Dm". Terse because it sits
// beside every key in the dropdown, where the pattern repeats down the list; the
// tonics themselves are picked out as the line under the title picks them out.
function positionsBriefNodes(key) {
  const frag = document.createDocumentFragment();
  crossPositions(key).forEach((p, i) => {
    const tonic = document.createElement('b');
    tonic.textContent = withMusicAccidentals(p.label);
    frag.append(`${i ? ' · ' : ''}${p.name} `, tonic);
  });
  return frag;
}

function renderPositions() {
  const html = positionKeys(state.key, state.tuning).map((p) => {
    const hint = escapeHtml(withMusicAccidentals(p.hint));
    const nick = p.nick ? ` <i>(${escapeHtml(p.nick)})</i>` : '';
    return `<span title="${hint}">${p.name} position <b>${accidentalsHtml(p.label)}</b>${nick}</span>`;
  });
  document.getElementById('harp-positions').innerHTML = html.join('');
}

// The suggestion pills: what gets played most on this harp, so the list moves
// with the key. Rebuilt only when the key actually changes — redrawing it on
// every keystroke would take the focus off a pill the moment it was activated.
let suggestedFor = null;
function renderSuggestions() {
  const built = `${state.key} ${state.tuning}`;
  if (suggestedFor === built) return;
  suggestedFor = built;
  const pills = suggestions(state.key, state.tuning).map(({ q, hint }) =>
    `<button type="button" class="example" data-q="${escapeHtml(q)}" title="${escapeHtml(hint)}">${withMusicAccidentals(escapeHtml(q))}</button>`);
  const article = /^[AEF]/.test(state.key) ? 'an' : 'a'; // "an F harp", "a G harp"
  const tuning = state.tuning === DEFAULT_TUNING ? '' : ` (${escapeHtml(TUNINGS[state.tuning].name)})`;
  document.getElementById('examples').innerHTML =
    `<span>Common on ${article} ${withMusicAccidentals(escapeHtml(state.key))} harp${tuning}:</span>${pills.join('')}`;
}

function renderInfo() {
  const info = document.getElementById('info');
  const p = state.parsed;
  if (!p) {
    const unrecognized = state.query.trim() !== '';
    info.innerHTML = unrecognized
      ? `<p class="hint warn">Couldn't read <strong>“${escapeHtml(state.query.trim())}”</strong>.
         Try a chord like <code>Am7</code> / <code>F#9</code> or a scale like <code>G Blues</code> / <code>D Dorian</code>.</p>`
      : `<p class="hint">Type a chord (<code>C</code>, <code>Am7</code>, <code>E7</code>, <code>F#9</code>)
         or a scale (<code>G Blues</code>, <code>Em Pentatonic</code>, <code>D Dorian</code>) above.</p>`;
    return;
  }
  const title = selectionName(); // exact same name as the heading above the harp
  const sub = p.kind === 'scale' && !p.hadRoot ? '(root defaulted to C)' : '';

  // Which target notes are reachable on the current harp / settings.
  //   plain      — blow/draw + whichever bends are shown (no over techniques)
  //   reachable  — plain + whichever overblows/overdraws are shown
  //   overOnly   — obtainable only via an over technique (drives the ° marker)
  const harp = buildHarp(state.key, state.tuning);
  const plain = new Set();
  const reachable = new Set();
  const overOnly = new Set();
  for (let h = 1; h <= 10; h++) {
    const c = harp[h];
    const p2 = [c.blow, c.draw];
    if (state.showDrawBends) p2.push(...c.drawBends);
    if (state.showBlowBends) p2.push(...c.blowBends);
    p2.forEach((n) => { plain.add(n.pc); reachable.add(n.pc); });
    if (state.showOverblow && c.overblow) reachable.add(c.overblow.pc);
    if (state.showOverdraw && c.overdraw) reachable.add(c.overdraw.pc);
    [c.overblow, c.overdraw].forEach((n) => n && overOnly.add(n.pc));
  }

  // Chips sound one octave laid out from the root up, anchored at the first
  // root at or above the harp's lowest reed — so clicking along the row plays a
  // rising scale in the harp's own register (also for unreachable notes).
  const low = harp[1].blow;
  const rootMidi = low.midi + (((p.root - low.pc) % 12) + 12) % 12;

  const chips = p.pcs
    .slice()
    .sort((a, b) => ((a - p.root + 12) % 12) - ((b - p.root + 12) % 12))
    .map((pc) => {
      const reach = reachable.has(pc);
      const onlyOver = !plain.has(pc) && overOnly.has(pc);
      const bucket = highlightFor(pc, p, state.triad); // 'root' | 'match' | 'tone'
      const cls = !reach ? 'chip miss' : `chip ${bucket}`;
      const flag = !reach ? ' ✕' : onlyOver ? ' °' : '';
      const name = withMusicAccidentals(PC_NAMES_FLAT[pc]);
      const midi = rootMidi + ((((pc - p.root) % 12) + 12) % 12);
      return `<button type="button" class="${cls}" data-midi="${midi}" data-pc="${pc}" title="Play ${name}">${name}<em>${withMusicAccidentals(degreeOf(pc, p.root))}</em>${flag}</button>`;
    })
    .join('');

  const toneKey = state.triad
    ? `<span class="sw root"></span>root <span class="sw match"></span>triad (3rd &amp; 5th)
       <span class="sw tone"></span>other scale tone`
    : `<span class="sw root"></span>root <span class="sw match"></span>chord tone`;

  info.innerHTML = `
    <div class="detected"><strong>${accidentalsHtml(title)}</strong>${sub ? `<span>${sub}</span>` : ''}</div>
    <div class="chips">${chips}</div>
    <p class="legendline">${toneKey}
      <span class="sw miss"></span>unreachable (✕) · ° = needs overblow / overdraw</p>`;
}

// Notes on the current harp that match the query and are visible under the
// current toggles, ascending — what the Play button sounds.
function matchedNotes() {
  if (!state.parsed) return [];
  return playableNotes(buildHarp(state.key, state.tuning), state).filter((n) => state.parsed.pcs.includes(n.pc));
}

// Unique pitches of the above; already ascending, so the Set keeps that order.
function matchedMidis() {
  return [...new Set(matchedNotes().map((n) => n.midi))];
}

function render() {
  renderHarp();
  renderTabStrip();
  renderInfo();
  renderPositions();
  renderSuggestions();
  const titleAscii = titleText();
  document.getElementById('harp-title').innerHTML = accidentalsHtml(titleAscii);
  document.title = `${withMusicAccidentals(titleAscii)} — Harmonica Chord & Scale Finder`;
  document.getElementById('play').disabled = matchedMidis().length === 0;
  fitHarp(); // the tab strip's height feeds the scaled wrapper
  syncURL();
}

function setQuery(str) {
  state.query = str;
  state.parsed = parseInput(str);
  state.triad = state.parsed && state.parsed.kind === 'scale'
    ? tonicTriadPcs(state.parsed.pcs, state.parsed.root)
    : null;
  const input = document.getElementById('query');
  if (input.value !== str) input.value = str;
  render();
}

function initControls() {
  initTheme();

  const input = document.getElementById('query');
  input.addEventListener('input', () => setQuery(input.value));

  initTypeahead();

  const keySelect = initCombobox({
    id: 'key',
    options: keyOptions,
    selected: () => state.key,
    onChoose: (k) => { state.key = k; render(); },
  });
  initCombobox({
    id: 'tuning',
    optClass: 'stacked',
    options: tuningOptions,
    selected: () => state.tuning,
    // The keys' position annotations are read off the tuning, so they follow it.
    onChoose: (t) => { state.tuning = t; render(); keySelect.refresh(); },
  });

  // Toggling a technique animates via CSS; only the info + Play button need a
  // refresh (rebuilding the harp here would cancel the fade).
  const onToggle = () => {
    applyVisibility();
    renderTabStrip();
    renderInfo();
    document.getElementById('play').disabled = matchedMidis().length === 0;
    fitHarp();
    syncURL();
  };
  [
    ['toggle-draw-bend', 'showDrawBends'],
    ['toggle-blow-bend', 'showBlowBends'],
    ['toggle-overblow', 'showOverblow'],
    ['toggle-overdraw', 'showOverdraw'],
  ].forEach(([id, key]) => {
    const el = document.getElementById(id);
    el.checked = state[key]; // reflect state seeded from the URL
    el.addEventListener('change', (e) => { state[key] = e.target.checked; onToggle(); });
  });

  const shareBtn = document.getElementById('share-link');
  shareBtn.innerHTML = SHARE_LABEL;
  shareBtn.addEventListener('click', () => copyLink(shareBtn));

  // Delegated: the suggestions are rebuilt whenever the harp key changes.
  document.getElementById('examples').addEventListener('click', (e) => {
    const btn = e.target.closest('.example');
    if (btn) setQuery(btn.dataset.q);
  });

  // Delegated: the note chips are rebuilt on every render.
  document.getElementById('info').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) soundPitchClass(Number(chip.dataset.midi));
  });

  document.getElementById('play').addEventListener('click', playMatched);

  initAudioPriming();
  initImageButton();
}

// Browsers only let audio start from a user gesture, so wake the context on the
// first one anywhere on the page — by the time Play is clicked it is running.
function initAudioPriming() {
  const prime = () => {
    primeAudio();
    window.removeEventListener('pointerdown', prime);
    window.removeEventListener('keydown', prime);
  };
  window.addEventListener('pointerdown', prime);
  window.addEventListener('keydown', prime);
}

// Play the highlighted notes and show pulsing bars on the button until they've
// finished sounding; while they do, the button stops playback instead.
const PLAY_LABEL = 'Play the highlighted notes';
const STOP_LABEL = 'Stop playback';
let playTimer = null;
let playing = false;
function playMatched() {
  const btn = document.getElementById('play');
  if (playing) { endPlayback(btn); return; }
  const midis = matchedMidis();
  if (!midis.length) return;
  const seq = playSequence(midis);
  clearTimeout(playTimer);
  ringSequence(seq.notes);
  playing = true;
  btn.classList.add('is-playing');
  btn.innerHTML = PLAYING_ICON;
  setPlayLabel(btn, STOP_LABEL);
  playTimer = setTimeout(() => endPlayback(btn), seq.total);
}

// The sequence rings the same cards a click would, each as its own note comes
// round. Both what is still to come and what is already lit are kept, so
// stopping halfway leaves nothing glowing over the silence.
let ringTimers = [];
let ringingCards = [];
function ringSequence(notes) {
  ringTimers = notes.map(({ midi, at, ms }) => setTimeout(() => {
    ringingCards.push(...ring(cardsOf(midi), ms, BY_SEQUENCE));
  }, at));
}

function endRings() {
  ringTimers.forEach(clearTimeout);
  ringingCards.forEach((el) => { if (el._ringBy === BY_SEQUENCE) unring(el); });
  ringTimers = [];
  ringingCards = [];
}

function endPlayback(btn) {
  clearTimeout(playTimer);
  endRings();
  stopSequence();
  playing = false;
  btn.classList.remove('is-playing');
  btn.innerHTML = PLAY_ICON;
  setPlayLabel(btn, PLAY_LABEL);
}

function setPlayLabel(btn, label) {
  btn.title = label;
  btn.setAttribute('aria-label', label);
}

// Light / dark theme. The theme is set pre-paint by an inline script; here we
// just wire up the toggle and persist the choice.
function initTheme() {
  const root = document.documentElement;
  const btn = document.getElementById('theme-toggle');
  const meta = document.querySelector('meta[name="theme-color"]');

  const apply = (theme) => {
    root.dataset.theme = theme;
    if (meta) meta.content = theme === 'light' ? '#f6efe1' : '#15110c';
    btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    btn.setAttribute('aria-pressed', String(theme === 'dark'));
  };

  apply(root.dataset.theme === 'light' ? 'light' : 'dark');
  btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    apply(next);
    try { localStorage.setItem('harp-theme', next); } catch (e) { /* private mode */ }
  });
}

// Type-ahead under the query field: once a root note is typed, offer the chords
// and scales that can follow it ("G" → G, Gm7, G Blues, G Mixolydian …). The
// field stays free-form — nothing is active until you arrow onto it, so Enter
// never rewrites what you typed.
const TYPEAHEAD_GROUP_LABEL = { chord: 'Chords', scale: 'Scales' };

function initTypeahead() {
  const input = document.getElementById('query');
  const menu = document.getElementById('query-menu');
  let opts = [];
  let activeIndex = -1; // -1 = the typed text itself
  let open = false;

  const closeMenu = () => {
    if (!open) return;
    open = false;
    menu.classList.remove('open');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };

  const setActive = (i) => {
    activeIndex = i;
    // Selection follows the active row: nothing here is chosen until you pick
    // it, so aria-selected marks what the arrow keys are on.
    opts.forEach((el, idx) => {
      el.classList.toggle('active', idx === i);
      el.setAttribute('aria-selected', String(idx === i));
    });
    if (i < 0) { input.removeAttribute('aria-activedescendant'); return; }
    opts[i].scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', opts[i].id);
  };

  const build = (list) => {
    menu.innerHTML = '';
    opts = [];
    let group = null;
    let kind = null;
    list.forEach((c, i) => {
      if (c.kind !== kind) {
        kind = c.kind;
        group = document.createElement('div');
        group.className = 'typeahead-group';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', TYPEAHEAD_GROUP_LABEL[kind]);
        const head = document.createElement('span');
        head.className = 'typeahead-head';
        head.setAttribute('aria-hidden', 'true'); // the group's own label says this
        head.textContent = TYPEAHEAD_GROUP_LABEL[kind];
        group.appendChild(head);
        menu.appendChild(group);
      }
      const opt = document.createElement('div');
      opt.className = 'typeahead-opt';
      opt.id = `typeahead-opt-${i}`;
      opt.setAttribute('role', 'option');
      opt.dataset.q = c.text; // ascii, so the URL and re-parsing stay clean
      const text = document.createElement('span');
      text.textContent = withMusicAccidentals(c.text);
      const desc = document.createElement('span');
      desc.className = 'typeahead-desc';
      desc.textContent = c.desc;
      opt.append(text, desc);
      group.appendChild(opt);
      opts.push(opt);
    });
  };

  const refresh = () => {
    const typed = input.value.trim();
    const list = queryCompletions(typed);
    // A lone suggestion the field already spells out has nothing left to offer.
    if (!list.length || (list.length === 1 && list[0].text.toLowerCase() === typed.toLowerCase())) {
      closeMenu();
      return;
    }
    build(list);
    setActive(-1);
    open = true;
    menu.classList.add('open');
    input.setAttribute('aria-expanded', 'true');
  };

  const choose = (i) => {
    setQuery(opts[i].dataset.q);
    closeMenu();
    input.focus();
  };

  input.addEventListener('input', refresh);
  // Keep the caret in the field: a blur here would close the menu before the
  // click that picked an option ever landed.
  menu.addEventListener('mousedown', (e) => e.preventDefault());
  menu.addEventListener('click', (e) => {
    const opt = e.target.closest('.typeahead-opt');
    if (opt) choose(opts.indexOf(opt));
  });
  input.addEventListener('blur', closeMenu);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeMenu(); return; }
    if (e.key === 'Tab') { closeMenu(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!open) {
        refresh();
        if (!open) return; // nothing to complete — leave the caret keys as they were
        e.preventDefault();
        if (e.key === 'ArrowUp') setActive(opts.length - 1); // ↑ opens at the end
        return;
      }
      e.preventDefault();
      const last = opts.length - 1;
      // Wraps through -1, so the list always leads back to the typed text.
      setActive(e.key === 'ArrowDown'
        ? (activeIndex >= last ? -1 : activeIndex + 1)
        : (activeIndex < 0 ? last : activeIndex - 1));
      return;
    }
    if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (activeIndex >= 0) choose(activeIndex); else closeMenu();
    }
  });
}

// The harp keys as combobox options, each annotated with the tonics it serves.
function keyOptions() {
  return KEY_ORDER.map((k) => {
    const keyEl = document.createElement('span');
    keyEl.className = 'cbx-opt-key';
    keyEl.textContent = withMusicAccidentals(k);
    const posEl = document.createElement('span');
    posEl.className = 'cbx-opt-pos';
    posEl.append(positionsBriefNodes(k));
    return {
      value: k,
      text: withMusicAccidentals(k),
      nodes: [keyEl, posEl],
      // Spelled out for screen readers, which would read the terse form as noise.
      ariaLabel: withMusicAccidentals([`${k} harp`, positionsText(crossPositions(k))].filter(Boolean).join(', ')),
    };
  });
}

// The tunings, each over a line saying what it is and who makes it, under the
// heading for the kind of harp it is — there are too many to scan as one list.
function tuningOptions() {
  return TUNING_ORDER.map((id) => {
    const { name, desc, group } = TUNINGS[id];
    const nameEl = document.createElement('span');
    nameEl.className = 'cbx-opt-name';
    nameEl.textContent = name;
    const descEl = document.createElement('span');
    descEl.className = 'cbx-opt-sub';
    descEl.textContent = desc;
    return { value: id, text: name, group, nodes: [nameEl, descEl], ariaLabel: `${name} tuning. ${desc}` };
  });
}

// Accessible combobox (a native <select> can't animate its popup). Focus stays
// on the button; the active option is tracked with aria-activedescendant.
// `options()` is re-read on every rebuild, since the keys' annotations follow
// the tuning — picking one restates the other.
function initCombobox({ id, optClass, options, selected, onChoose }) {
  const btn = document.getElementById(`${id}-btn`);
  const menu = document.getElementById(`${id}-menu`);
  const valEl = document.getElementById(`${id}-val`);

  // Options can be nested in group boxes, so the rows are collected rather than
  // read off the menu's children.
  const opts = () => [...menu.querySelectorAll('.cbx-opt')];
  const selectedIndex = () => Math.max(0, opts().findIndex((o) => o.dataset.value === selected()));
  let activeIndex = 0;
  let open = false;

  const build = () => {
    menu.innerHTML = '';
    let list = menu; // options land here, or in the open group's own list
    let groupName = null;
    options().forEach((o, i) => {
      if (o.group && o.group !== groupName) {
        groupName = o.group;
        const group = document.createElement('li');
        group.className = 'cbx-group';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', groupName);
        const head = document.createElement('span');
        head.className = 'cbx-head';
        head.setAttribute('aria-hidden', 'true'); // the group's own label says this
        head.textContent = groupName;
        list = document.createElement('ul');
        list.setAttribute('role', 'none'); // grouping is the <li>'s job, not this list's
        group.append(head, list);
        menu.appendChild(group);
      }
      const li = document.createElement('li');
      li.className = optClass ? `cbx-opt ${optClass}` : 'cbx-opt';
      li.id = `${id}-opt-${i}`;
      li.setAttribute('role', 'option');
      li.dataset.value = o.value;
      li.append(...o.nodes);
      li.setAttribute('aria-label', o.ariaLabel);
      li.setAttribute('aria-selected', String(o.value === selected()));
      if (o.value === selected()) valEl.textContent = o.text;
      list.appendChild(li);
    });
  };
  build(); // reflects the state seeded from the URL

  const setActive = (i) => {
    const list = opts();
    activeIndex = Math.max(0, Math.min(i, list.length - 1));
    list.forEach((o, idx) => o.classList.toggle('active', idx === activeIndex));
    const el = list[activeIndex];
    if (el) { el.scrollIntoView({ block: 'nearest' }); btn.setAttribute('aria-activedescendant', el.id); }
  };
  const openMenu = () => {
    open = true;
    // How far the list may run before it hits the edge of the window; the CSS
    // caps that at the whole list. It drops down unless the list overruns the
    // room below and there is more of it above — a phone held landscape leaves
    // next to nothing under the button. Whatever is left over shows as many rows
    // as it holds and scrolls the rest, rather than running off-screen.
    const { top, bottom, left, right } = btn.getBoundingClientRect();
    const below = window.innerHeight - bottom - 22;
    const above = top - 22;
    const up = below < Math.min(menu.scrollHeight, above);
    menu.classList.toggle('above', up);
    menu.style.setProperty('--menu-room', `${Math.max(0, Math.round(up ? above : below))}px`);
    // A menu wider than its button (the tunings) grows to whichever side has the
    // room, and no further than the window edge; one no wider ignores both.
    const toRight = window.innerWidth - left - 16;
    const toLeft = right - 16;
    menu.classList.toggle('to-left', toLeft > toRight);
    menu.style.setProperty('--menu-width', `${Math.round(Math.max(toRight, toLeft))}px`);
    menu.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    setActive(selectedIndex()); // every opening starts from what is actually chosen
  };
  const closeMenu = (focus) => {
    open = false;
    menu.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    btn.removeAttribute('aria-activedescendant');
    if (focus) btn.focus();
  };
  const choose = (value) => {
    onChoose(value);
    build(); // moves the tick, and the button to the new value
    closeMenu(true);
  };

  // The click reaches document on purpose: that is what shuts any other popup
  // that was open — each one ignores clicks landing inside its own control.
  btn.addEventListener('click', () => { open ? closeMenu() : openMenu(); });
  menu.addEventListener('click', (e) => {
    const li = e.target.closest('.cbx-opt');
    if (li) choose(li.dataset.value);
  });
  btn.addEventListener('keydown', (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive(activeIndex + 1); break;
      case 'ArrowUp': e.preventDefault(); setActive(activeIndex - 1); break;
      case 'Home': e.preventDefault(); setActive(0); break;
      case 'End': e.preventDefault(); setActive(opts().length - 1); break;
      case 'Enter': case ' ': e.preventDefault(); choose(opts()[activeIndex].dataset.value); break;
      case 'Escape': case 'Tab': closeMenu(e.key === 'Escape'); break;
    }
  });
  document.addEventListener('click', (e) => { if (open && !e.target.closest(`#${id}-cbx`)) closeMenu(); });

  return { refresh: build };
}

// Build the export canvas plus a filename slug for the current selection.
function buildImage() {
  const canvas = renderHarpImage({
    key: state.key,
    tuning: state.tuning,
    parsed: state.parsed,
    triad: state.triad,
    showDrawBends: state.showDrawBends,
    showBlowBends: state.showBlowBends,
    showOverblow: state.showOverblow,
    showOverdraw: state.showOverdraw,
    title: withMusicAccidentals(titleText()),
    subtitle: withMusicAccidentals(positionsText(positionKeys(state.key, state.tuning))),
  });
  // Slug stays ascii (from the unformatted title) for a clean filename.
  const slug = titleText().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return { canvas, filename: `harmonica-${slug}.png` };
}

// Split button: main action does the current mode; the caret picks copy vs
// download (and remembers the choice as the new default).
// Corner image control: an icon button that opens a small Copy / Download menu.
function initImageButton() {
  const btn = document.getElementById('img-btn');
  const menu = document.getElementById('img-menu');
  let doneTimer = null;

  const closeMenu = () => { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };

  const run = async (mode) => {
    // Ensure the web font is loaded so the canvas draws note names in it, not a fallback.
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const { canvas, filename } = buildImage();
    if (mode === 'download') downloadCanvas(canvas, filename);
    else await copyCanvas(canvas, filename); // copies, or falls back to a download
    clearTimeout(doneTimer);
    btn.classList.add('is-done');
    btn.innerHTML = CHECK_ICON;
    doneTimer = setTimeout(() => { btn.classList.remove('is-done'); btn.innerHTML = IMG_ICON; }, 1500);
  };

  // Bubbles to document, which is how the key and tuning menus learn to close.
  btn.addEventListener('click', () => {
    const willOpen = !menu.classList.contains('open');
    menu.classList.toggle('open', willOpen);
    btn.setAttribute('aria-expanded', String(willOpen));
  });
  menu.querySelectorAll('.img-opt').forEach((opt) => {
    opt.addEventListener('click', () => { closeMenu(); run(opt.dataset.mode); });
  });
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !e.target.closest('#card-img')) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) closeMenu();
  });
}

const initialQuery = applyURLState(); // seed key + toggles from the URL
initControls();                       // build controls reflecting that state
setQuery(initialQuery);               // apply the query, render, fit, and sync the URL
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHarp);
