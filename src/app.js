import { parseInput, degreeOf, PC_NAMES_FLAT, chordQualitySuffix, scaleDisplayName, tonicTriadPcs, highlightFor } from './theory.js';
import { buildHarp, KEY_ORDER } from './harmonica.js';
import { playNote, playSequence } from './audio.js';
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

// Which grid row each note type/depth occupies. Blow techniques sit above the
// number bar, draw techniques below it; deeper bends sit further from center.
function gridRow(type, depth) {
  switch (type) {
    case 'blow-bend': return depth === 1 ? 2 : 1;
    case 'overblow': return 2;
    case 'blow': return 3;
    case 'draw': return 5;
    case 'draw-bend': return 5 + depth; // 6, 7, 8
    case 'overdraw': return 6;
  }
}

const TECH_TAG = { overblow: 'OB', overdraw: 'OD' };

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function classForType(type) {
  if (type === 'blow' || type === 'draw') return 'reed';
  if (type === 'overblow' || type === 'overdraw') return 'over';
  return 'bend';
}

function makeBox(note) {
  const el = document.createElement('button');
  el.type = 'button';
  // Second class is the exact technique (draw-bend / overblow / …) so each can
  // be toggled independently; classForType gives the shared base style.
  el.className = `box ${classForType(note.type)} ${note.type}`;
  el.style.gridColumn = String(note.hole);
  el.style.gridRow = String(gridRow(note.type, note.depth));
  el.title = `Hole ${note.hole} · ${labelForType(note)} · ${note.name}`;

  const name = document.createElement('span');
  name.className = 'note';
  name.textContent = note.name;
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
      deg.textContent = degreeOf(note.pc, p.root);
      el.appendChild(deg);
    }
  }

  el.addEventListener('click', () => playNote(note.midi));
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
  const harp = buildHarp(state.key);
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
    num.style.gridRow = '4';
    num.textContent = String(h);
    grid.appendChild(num);

    // Always build bends/overblows; their visibility is animated via CSS classes
    // on the grid (the grid rows keep their height, so nothing reflows).
    cell.drawBends.forEach((n) => grid.appendChild(makeBox(n)));
    cell.blowBends.forEach((n) => grid.appendChild(makeBox(n)));
    if (cell.overblow) grid.appendChild(makeBox(cell.overblow));
    if (cell.overdraw) grid.appendChild(makeBox(cell.overdraw));
  }

  applyVisibility(grid);
}

// Show/hide bends & overblows purely in CSS so they fade in and out instead of
// popping. Kept off the render path so it never rebuilds the harp mid-animation.
function applyVisibility(grid = document.getElementById('harp')) {
  grid.classList.toggle('hide-draw-bend', !state.showDrawBends);
  grid.classList.toggle('hide-blow-bend', !state.showBlowBends);
  grid.classList.toggle('hide-overblow', !state.showOverblow);
  grid.classList.toggle('hide-overdraw', !state.showOverdraw);
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

// Title shown on the page, the browser tab and baked into the copied image.
function titleText() {
  const what = selectionName();
  return what ? `${what} · Harp in ${state.key}` : `Harp in ${state.key}`;
}

function renderInfo() {
  const info = document.getElementById('info');
  const p = state.parsed;
  if (!p) {
    const unrecognized = state.query.trim() !== '';
    info.innerHTML = unrecognized
      ? `<p class="hint warn">Couldn't read <strong>“${escapeHtml(state.query.trim())}”</strong>.
         Try a chord like <code>Am7</code> / <code>F#9</code> or a scale like <code>C Blues</code> / <code>D Dorian</code>.</p>`
      : `<p class="hint">Type a chord (<code>C</code>, <code>Am7</code>, <code>E7</code>, <code>F#9</code>)
         or a scale (<code>C Blues</code>, <code>Em Pentatonic</code>, <code>D Dorian</code>) above.</p>`;
    return;
  }
  const title = selectionName(); // exact same name as the heading above the harp
  const sub = p.kind === 'scale' && !p.hadRoot ? '(root defaulted to C)' : '';

  // Which target notes are reachable on the current harp / settings.
  //   plain      — blow/draw + whichever bends are shown (no over techniques)
  //   reachable  — plain + whichever overblows/overdraws are shown
  //   overOnly   — obtainable only via an over technique (drives the ° marker)
  const harp = buildHarp(state.key);
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

  const chips = p.pcs
    .slice()
    .sort((a, b) => ((a - p.root + 12) % 12) - ((b - p.root + 12) % 12))
    .map((pc) => {
      const reach = reachable.has(pc);
      const onlyOver = !plain.has(pc) && overOnly.has(pc);
      const bucket = highlightFor(pc, p, state.triad); // 'root' | 'match' | 'tone'
      const cls = !reach ? 'chip miss' : `chip ${bucket}`;
      const flag = !reach ? ' ✕' : onlyOver ? ' °' : '';
      return `<span class="${cls}">${PC_NAMES_FLAT[pc]}<em>${degreeOf(pc, p.root)}</em>${flag}</span>`;
    })
    .join('');

  const toneKey = state.triad
    ? `<span class="sw root"></span>root <span class="sw match"></span>triad (3rd &amp; 5th)
       <span class="sw tone"></span>other scale tone`
    : `<span class="sw root"></span>root <span class="sw match"></span>chord tone`;

  info.innerHTML = `
    <div class="detected"><strong>${title}</strong>${sub ? `<span>${sub}</span>` : ''}
      <button type="button" class="share-link" title="Copy a shareable link to this selection">${SHARE_LABEL}</button>
    </div>
    <div class="chips">${chips}</div>
    <p class="legendline">${toneKey}
      <span class="sw miss"></span>unreachable (✕) · ° = needs overblow / overdraw</p>`;
}

// Unique, ascending MIDI notes on the current harp that match the query and are
// actually visible under the current toggles — what the Play button will sound.
function matchedMidis() {
  if (!state.parsed) return [];
  const harp = buildHarp(state.key);
  const out = [];
  for (let h = 1; h <= 10; h++) {
    const c = harp[h];
    const pool = [c.blow, c.draw];
    if (state.showDrawBends) pool.push(...c.drawBends);
    if (state.showBlowBends) pool.push(...c.blowBends);
    if (state.showOverblow) pool.push(c.overblow);
    if (state.showOverdraw) pool.push(c.overdraw);
    pool.forEach((n) => { if (n && state.parsed.pcs.includes(n.pc)) out.push(n.midi); });
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

function render() {
  renderHarp();
  renderInfo();
  const title = titleText();
  document.getElementById('harp-title').textContent = title;
  document.title = `${title} — Harmonica Finder`;
  document.getElementById('play').disabled = matchedMidis().length === 0;
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

  initKeySelect();

  // Toggling a technique animates via CSS; only the info + Play button need a
  // refresh (rebuilding the harp here would cancel the fade).
  const onToggle = () => {
    applyVisibility();
    renderInfo();
    document.getElementById('play').disabled = matchedMidis().length === 0;
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

  // Share button lives inside the (re-rendered) info panel — delegate its click.
  document.getElementById('info').addEventListener('click', (e) => {
    const btn = e.target.closest('.share-link');
    if (btn) copyLink(btn);
  });

  document.querySelectorAll('.example').forEach((btn) => {
    btn.addEventListener('click', () => setQuery(btn.dataset.q));
  });

  document.getElementById('play').addEventListener('click', playMatched);

  initImageButton();
}

// Play the highlighted notes and show pulsing bars on the button until they've
// finished sounding (playback itself can't be stopped mid-flight).
let playTimer = null;
function playMatched() {
  const btn = document.getElementById('play');
  const midis = matchedMidis();
  if (!midis.length) return;
  const dur = playSequence(midis); // ms until the last note stops ringing
  clearTimeout(playTimer);
  btn.classList.add('is-playing');
  btn.innerHTML = PLAYING_ICON;
  playTimer = setTimeout(() => {
    btn.classList.remove('is-playing');
    btn.innerHTML = PLAY_ICON;
  }, dur);
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

// Accessible combobox for the harp key (a native <select> can't animate its
// popup). Focus stays on the button; the active option is tracked with
// aria-activedescendant.
function initKeySelect() {
  const cbx = document.getElementById('key-cbx');
  const btn = document.getElementById('key-btn');
  const menu = document.getElementById('key-menu');
  const valEl = document.getElementById('key-val');

  KEY_ORDER.forEach((k, i) => {
    const li = document.createElement('li');
    li.className = 'cbx-opt';
    li.id = `key-opt-${i}`;
    li.setAttribute('role', 'option');
    li.dataset.key = k;
    li.textContent = k;
    li.setAttribute('aria-selected', String(k === state.key));
    menu.appendChild(li);
  });
  valEl.textContent = state.key; // reflect key seeded from the URL

  const opts = () => [...menu.children];
  let activeIndex = KEY_ORDER.indexOf(state.key);
  let open = false;

  const setActive = (i) => {
    const list = opts();
    activeIndex = Math.max(0, Math.min(i, list.length - 1));
    list.forEach((o, idx) => o.classList.toggle('active', idx === activeIndex));
    const el = list[activeIndex];
    if (el) { el.scrollIntoView({ block: 'nearest' }); btn.setAttribute('aria-activedescendant', el.id); }
  };
  const openMenu = () => {
    open = true;
    menu.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    setActive(KEY_ORDER.indexOf(state.key));
  };
  const closeMenu = (focus) => {
    open = false;
    menu.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    btn.removeAttribute('aria-activedescendant');
    if (focus) btn.focus();
  };
  const choose = (k) => {
    state.key = k;
    valEl.textContent = k;
    opts().forEach((o) => o.setAttribute('aria-selected', String(o.dataset.key === k)));
    render();
    closeMenu(true);
  };

  btn.addEventListener('click', (e) => { e.stopPropagation(); open ? closeMenu() : openMenu(); });
  menu.addEventListener('click', (e) => {
    const li = e.target.closest('.cbx-opt');
    if (li) choose(li.dataset.key);
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
      case 'Enter': case ' ': e.preventDefault(); choose(opts()[activeIndex].dataset.key); break;
      case 'Escape': case 'Tab': closeMenu(e.key === 'Escape'); break;
    }
  });
  document.addEventListener('click', (e) => { if (open && !e.target.closest('#key-cbx')) closeMenu(); });
}

// Build the export canvas plus a filename slug for the current selection.
function buildImage() {
  const canvas = renderHarpImage({
    key: state.key,
    parsed: state.parsed,
    triad: state.triad,
    showDrawBends: state.showDrawBends,
    showBlowBends: state.showBlowBends,
    showOverblow: state.showOverblow,
    showOverdraw: state.showOverdraw,
    title: titleText(),
  });
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

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
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
setQuery(initialQuery);               // apply the query, render, and sync the URL
