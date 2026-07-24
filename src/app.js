import { parseInput, degreeOf, PC_NAMES_FLAT } from './theory.js';
import { buildHarp, KEY_ORDER } from './harmonica.js';
import { playNote, playSequence } from './audio.js';
import { renderHarpImage, copyCanvas } from './exporter.js';

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
  const rootName = PC_NAMES_FLAT[p.root];
  if (p.kind === 'chord') {
    const q = p.quality === '' ? 'major' : p.quality;
    return { title: `${rootName}${p.quality === '' ? '' : p.quality}`, sub: `${rootName} ${q} chord` };
  }
  if (p.kind === 'scale') {
    const label = p.type.replace(/\b\w/g, (c) => c.toUpperCase());
    return { title: `${rootName} ${label}`, sub: `${rootName} ${p.type} scale${p.hadRoot ? '' : ' (root defaulted to C)'}` };
  }
  return { title: 'Notes', sub: 'note set' };
}

// Title shown on the page, in the browser tab and baked into the copied image.
// Uses the query verbatim (only when recognized) so it reads back what the user
// asked for — e.g. "C Blues · Harp in C".
function titleText() {
  const what = state.parsed ? state.query.trim().replace(/\s+/g, ' ') : '';
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

  const copyBtn = document.getElementById('copy');
  copyBtn.addEventListener('click', async () => {
    const canvas = renderHarpImage({
      key: state.key,
      parsed: state.parsed,
      showBends: state.showBends,
      showOver: state.showOver,
      title: titleText(),
    });
    const slug = titleText().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    const result = await copyCanvas(canvas, `harmonica-${slug}.png`);
    const original = copyBtn.textContent;
    copyBtn.textContent = result === 'copied' ? '✓ Copied!' : '⤓ Downloaded';
    copyBtn.disabled = true;
    setTimeout(() => { copyBtn.textContent = original; copyBtn.disabled = false; }, 1600);
  });
}

initControls();
render();
