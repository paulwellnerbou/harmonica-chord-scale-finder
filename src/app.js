import { parseInput, degreeOf, PC_NAMES_FLAT, chordQualitySuffix, scaleDisplayName } from './theory.js';
import { buildHarp, KEY_ORDER } from './harmonica.js';
import { playNote, playSequence } from './audio.js';
import { renderHarpImage, copyCanvas, downloadCanvas } from './exporter.js';

const state = {
  key: 'C',
  query: '',
  parsed: null,
  showBends: true,
  showOver: true,
};

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
  el.className = `box ${classForType(note.type)}`;
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
  if (p) {
    if (p.pcs.includes(note.pc)) {
      el.classList.add(note.pc === p.root ? 'root' : 'match');
      const deg = document.createElement('span');
      deg.className = 'deg';
      deg.textContent = degreeOf(note.pc, p.root);
      el.appendChild(deg);
    } else {
      el.classList.add('dim');
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

    if (state.showBends) {
      cell.drawBends.forEach((n) => grid.appendChild(makeBox(n)));
      cell.blowBends.forEach((n) => grid.appendChild(makeBox(n)));
    }
    if (state.showOver) {
      if (cell.overblow) grid.appendChild(makeBox(cell.overblow));
      if (cell.overdraw) grid.appendChild(makeBox(cell.overdraw));
    }
  }
}

function describeParsed(p) {
  // Prefer the root exactly as typed (keeps F#, not Gb) so this matches the title.
  const rootName = queryRootText() || PC_NAMES_FLAT[p.root];
  if (p.kind === 'chord') {
    return { title: `${rootName}${chordQualitySuffix(p.quality)}`, sub: `${rootName}${p.quality} chord` };
  }
  if (p.kind === 'scale') {
    const label = scaleDisplayName(p.type);
    return { title: `${rootName} ${label}`, sub: `${rootName} ${label} scale${p.hadRoot ? '' : ' (root defaulted to C)'}` };
  }
  return { title: 'Notes', sub: 'note set' };
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
  const root = queryRootText() || PC_NAMES_FLAT[p.root];
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
  const { title, sub } = describeParsed(p);

  // Which target notes are actually reachable on the current harp / settings.
  const harp = buildHarp(state.key);
  const reachable = new Set();
  const needsOver = new Set();
  for (let h = 1; h <= 10; h++) {
    const c = harp[h];
    const simple = [c.blow, c.draw, ...(state.showBends ? [...c.drawBends, ...c.blowBends] : [])];
    simple.forEach((n) => reachable.add(n.pc));
    [c.overblow, c.overdraw].forEach((n) => n && needsOver.add(n.pc));
  }

  const chips = p.pcs
    .slice()
    .sort((a, b) => ((a - p.root + 12) % 12) - ((b - p.root + 12) % 12))
    .map((pc) => {
      const reach = reachable.has(pc) || (state.showOver && needsOver.has(pc));
      const onlyOver = !reachable.has(pc) && needsOver.has(pc);
      const cls = pc === p.root ? 'chip root' : reach ? 'chip match' : 'chip miss';
      const flag = !reach ? ' ✕' : onlyOver ? ' °' : '';
      return `<span class="${cls}">${PC_NAMES_FLAT[pc]}<em>${degreeOf(pc, p.root)}</em>${flag}</span>`;
    })
    .join('');

  info.innerHTML = `
    <div class="detected"><strong>${title}</strong><span>${sub}</span></div>
    <div class="chips">${chips}</div>
    <p class="legendline"><span class="sw root"></span>root
      <span class="sw match"></span>chord/scale tone
      <span class="sw miss"></span>unreachable (✕) · ° = needs overblow</p>`;
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
    if (state.showBends) pool.push(...c.drawBends, ...c.blowBends);
    if (state.showOver) pool.push(c.overblow, c.overdraw);
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
}

function setQuery(str) {
  state.query = str;
  state.parsed = parseInput(str);
  const input = document.getElementById('query');
  if (input.value !== str) input.value = str;
  render();
}

function initControls() {
  const input = document.getElementById('query');
  input.addEventListener('input', () => setQuery(input.value));

  const keySel = document.getElementById('key');
  KEY_ORDER.forEach((k) => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = k;
    if (k === state.key) opt.selected = true;
    keySel.appendChild(opt);
  });
  keySel.addEventListener('change', () => { state.key = keySel.value; render(); });

  document.getElementById('toggle-bends').addEventListener('change', (e) => {
    state.showBends = e.target.checked; render();
  });
  document.getElementById('toggle-over').addEventListener('change', (e) => {
    state.showOver = e.target.checked; render();
  });

  document.querySelectorAll('.example').forEach((btn) => {
    btn.addEventListener('click', () => setQuery(btn.dataset.q));
  });

  document.getElementById('play').addEventListener('click', () => {
    const midis = matchedMidis();
    if (midis.length) playSequence(midis);
  });

  initImageButton();
}

// Build the export canvas plus a filename slug for the current selection.
function buildImage() {
  const canvas = renderHarpImage({
    key: state.key,
    parsed: state.parsed,
    showBends: state.showBends,
    showOver: state.showOver,
    title: titleText(),
  });
  const slug = titleText().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return { canvas, filename: `harmonica-${slug}.png` };
}

// Split button: main action does the current mode; the caret picks copy vs
// download (and remembers the choice as the new default).
function initImageButton() {
  let mode = 'copy';
  const action = document.getElementById('img-action');
  const caret = document.getElementById('img-caret');
  const menu = document.getElementById('img-menu');
  const label = (m) => (m === 'download' ? '⤓ Download image' : '⧉ Copy image');

  const closeMenu = () => { menu.hidden = true; caret.setAttribute('aria-expanded', 'false'); };

  const run = async () => {
    const { canvas, filename } = buildImage();
    let msg;
    if (mode === 'download') { downloadCanvas(canvas, filename); msg = '✓ Downloaded'; }
    else { msg = (await copyCanvas(canvas, filename)) === 'copied' ? '✓ Copied!' : '⤓ Downloaded'; }
    action.disabled = true;
    action.textContent = msg;
    setTimeout(() => { action.textContent = label(mode); action.disabled = false; }, 1600);
  };

  action.addEventListener('click', run);
  caret.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.hidden;
    menu.hidden = !open;
    caret.setAttribute('aria-expanded', String(open));
  });
  menu.querySelectorAll('.img-opt').forEach((opt) => {
    opt.addEventListener('click', () => {
      mode = opt.dataset.mode;
      action.textContent = label(mode);
      action.title = mode === 'download'
        ? 'Download the harp layout as a PNG (transparent background)'
        : 'Copy the harp layout as an image (transparent background)';
      closeMenu();
      run();
    });
  });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !e.target.closest('.split-btn')) closeMenu();
  });
}

initControls();
render();
