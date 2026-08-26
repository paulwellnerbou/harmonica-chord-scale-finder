// Render the current harp layout (with highlights) to a canvas and copy it to
// the clipboard as a PNG. Drawn natively so we control the background — it is
// left transparent, i.e. without the page's blue backdrop.

import { blueNotePc, degreeOf, highlightFor, withMusicAccidentals } from './theory.js';
import { buildHarp, gridRowOf, HOLE_ROWS, tabStrip } from './harmonica.js';

const COL_W = 92, GAP_X = 10, GAP_Y = 8, PAD = 26, TITLE_H = 44, SUB_H = 22, TITLE_GAP = 12;
const GUTTER = 30; // side gutters holding the vertical BLOW / DRAW labels
const ROW_H = [0, 50, 50, 50, 70, 38, 70, 50, 50, 50]; // 1-indexed: rows 1..9
const BLOW_ROW = 4, NUM_ROW = 5, DRAW_ROW = 6;
const GRID_W = 10 * COL_W + 9 * GAP_X;
// Tab strip below the harp, at the same fractions of the harp width as the cqw
// values in styles.css — so a full 7-note scale fits one row here too.
const cq = (n) => Math.round(GRID_W * n / 100);
const TAB_TOP = cq(2.1), TAB_H = cq(3.6), TAB_GAP = cq(0.58), TAB_PAD_X = cq(0.66),
  TAB_MIN_W = cq(2.8), TAB_RADIUS = cq(0.75), TAB_NAME_TOP = cq(0.35), TAB_NAME_H = cq(1.4);
const TAB_DASH = [cq(0.5), cq(0.4)]; // the missing keys' dashed outline
const TAB_ROW_H = TAB_H + TAB_NAME_TOP + TAB_NAME_H; // key + the note name under it

const FONT = "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const TAB_FONT = `700 ${cq(1.45)}px ${FONT}`;
const TAB_NAME_FONT = `600 ${cq(1.15)}px ${FONT}`;
const INK = [34, 27, 18]; // --box-ink, also drawn at reduced alpha — see inkAlpha
// Refilled from the page's own custom properties on every render (syncColors),
// so a copied image matches whatever instrument the current theme is showing —
// the cover plate differs between themes. What follows are the defaults, and
// the fallback if a property ever reads back empty. Background stays transparent.
const COLORS = {
  reed: ['#f7f0e2', '#d8caad'],
  bend: ['#d7e8ed', '#83b3bf'],
  over: ['#f8e5c3', '#d3a45f'],
  match: ['#c9f0d7', '#1f9d55'],
  tone: ['#e2f5ea', '#7fc79b'],
  root: ['#ffe3c1', '#ec7a12'],
  // Cover plate + comb, mirroring --plate-hi/-lo/-edge and --comb-hi/-lo.
  plate: ['#f4ecdd', '#e2d8c4'],
  plateEdge: '#c9ba9d',
  comb: ['#5c3a21', '#2b1a0e'],
  ink: `rgb(${INK})`,
};
const inkAlpha = (a) => `rgba(${INK}, ${a})`;

// Read the instrument back off the page. A second hard-coded copy here is
// exactly what would let the export drift from the harp it has to mirror.
function syncColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name) => cs.getPropertyValue(name).trim();
  const pair = (a, b, fallback) => { const x = v(a), y = v(b); return x && y ? [x, y] : fallback; };
  COLORS.reed = pair('--reed-fill', '--reed-border', COLORS.reed);
  COLORS.bend = pair('--bend-fill', '--bend-border', COLORS.bend);
  COLORS.over = pair('--over-fill', '--over-border', COLORS.over);
  COLORS.match = pair('--match-fill', '--match', COLORS.match);
  COLORS.tone = pair('--tone-fill', '--tone', COLORS.tone);
  COLORS.root = pair('--root-fill', '--root', COLORS.root);
  COLORS.plate = pair('--plate-hi', '--plate-lo', COLORS.plate);
  COLORS.comb = pair('--comb-hi', '--comb-lo', COLORS.comb);
  COLORS.plateEdge = v('--plate-edge') || COLORS.plateEdge;
  // INK is mutated in place — inkAlpha() closes over the array, not its value.
  const ink = /^#([0-9a-f]{6})$/i.exec(v('--box-ink'));
  if (ink) {
    const n = parseInt(ink[1], 16);
    INK[0] = (n >> 16) & 255; INK[1] = (n >> 8) & 255; INK[2] = n & 255;
  }
  COLORS.ink = `rgb(${INK})`;
}
const TAG = { overblow: 'OB', overdraw: 'OD' };

function baseStyle(type) {
  if (type === 'blow' || type === 'draw') return 'reed';
  if (type === 'overblow' || type === 'overdraw') return 'over';
  return 'bend';
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// The blue note's inner glow, mirroring .blue-note in styles.css. Canvas
// gradients are round, so the CSS ellipse comes from scaling a unit circle to
// the key's proportions — hence the fill in those scaled units.
const BLUE_NOTE = [47, 106, 208]; // --blue-note
function blueGlow(ctx, x, y, w, h, r) {
  const blue = (a) => `rgba(${BLUE_NOTE}, ${a})`;
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(w * 0.58, h * 0.66);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, blue(0.42));
  g.addColorStop(0.55, blue(0.15));
  g.addColorStop(0.8, blue(0));
  ctx.fillStyle = g;
  ctx.fillRect(-2, -2, 4, 4);
  ctx.restore();
}

// The tab strip's keys, measured and wrapped into centered rows of at most
// `maxW`. Returns [] when nothing is selected.
function layoutTabStrip(parsed, harp, show, maxW) {
  if (!parsed) return [];
  const measure = document.createElement('canvas').getContext('2d');
  const textW = (s, font) => { measure.font = font; return Math.ceil(measure.measureText(s).width); };
  const keys = tabStrip(harp, show, parsed.pcs)
    .map((k) => {
      const name = withMusicAccidentals(k.name);
      // Widest of key label / note name, mirroring the stretched column on screen.
      const w = Math.max(TAB_MIN_W, textW(k.text, TAB_FONT) + TAB_PAD_X * 2, textW(name, TAB_NAME_FONT));
      return { ...k, name, w };
    });

  const rows = [];
  let row = null;
  for (const k of keys) {
    if (row && row.w + TAB_GAP + k.w > maxW) row = null;
    if (!row) { row = { keys: [], w: -TAB_GAP }; rows.push(row); }
    row.keys.push(k);
    row.w += TAB_GAP + k.w;
  }
  return rows;
}

export function renderHarpImage({ key, tuning, parsed, triad, showDrawBends, showBlowBends, showOverblow, showOverdraw, title, subtitle }) {
  syncColors();
  const harp = buildHarp(key, tuning);
  const show = { showDrawBends, showBlowBends, showOverblow, showOverdraw };
  const bluePc = blueNotePc(parsed);

  // Every box the export draws, ascending by hole so the row heights can be
  // taken from what is actually in them: a row left empty — by a technique
  // switched off, or by a tuning that doesn't bend that deep — collapses away,
  // same as on screen, instead of carrying a band of empty space under the title.
  const boxes = [];
  for (let h = 1; h <= 10; h++) {
    const c = harp[h];
    boxes.push(c.blow, c.draw);
    if (showDrawBends) boxes.push(...c.drawBends);
    if (showBlowBends) boxes.push(...c.blowBends);
    if (showOverblow && c.overblow) boxes.push(c.overblow);
    if (showOverdraw && c.overdraw) boxes.push(c.overdraw);
  }
  const rowShown = new Set([...boxes.map(gridRowOf), NUM_ROW]);
  const rowTop = [0];
  let y = PAD + TITLE_H + (subtitle ? SUB_H : 0) + TITLE_GAP;
  for (let r = 1; r <= HOLE_ROWS; r++) { rowTop[r] = y; if (rowShown.has(r)) y += ROW_H[r] + GAP_Y; }
  const gridBottom = y - GAP_Y; // last visible row's bottom, without its trailing gap

  const width = PAD * 2 + GUTTER * 2 + GRID_W;
  const tabRows = layoutTabStrip(parsed, harp, show, GRID_W);
  const tabH = tabRows.length ? TAB_TOP + tabRows.length * (TAB_ROW_H + TAB_GAP) - TAB_GAP : 0;
  const height = gridBottom + tabH + PAD;

  const dpr = 2; // retina-crisp export
  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  // No background fill — the PNG stays transparent.

  const gridLeft = PAD + GUTTER; // left edge of hole 1 (past the label gutter)
  const colX = (h) => gridLeft + (h - 1) * (COL_W + GAP_X);

  const vGradient = (top, bottom, [hi, lo]) => {
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, hi);
    g.addColorStop(1, lo);
    return g;
  };

  // Brushed cover plate behind blow / number bar / draw.
  const panelY = rowTop[BLOW_ROW] - 4;
  const panelH = rowTop[DRAW_ROW] + ROW_H[DRAW_ROW] + 4 - panelY;
  ctx.fillStyle = vGradient(panelY, panelY + panelH, COLORS.plate);
  ctx.strokeStyle = COLORS.plateEdge;
  ctx.lineWidth = 1.5;
  roundRect(ctx, gridLeft - 4, panelY, GRID_W + 8, panelH, 16);
  ctx.fill();
  ctx.stroke();

  // Wooden comb (number bar), jutting out past the plate at both ends as on the page.
  const barH = 34, barOver = 34; // 30px past the plate, which itself sits 4px past the grid
  const barX = gridLeft - barOver, barW = GRID_W + barOver * 2;
  const barY = rowTop[NUM_ROW] + (ROW_H[NUM_ROW] - barH) / 2;
  ctx.fillStyle = vGradient(barY, barY + barH, COLORS.comb);
  roundRect(ctx, barX, barY, barW, barH, 8); // matches .number-bar border-radius
  ctx.fill();
  // Grain, mirroring .number-bar's repeating gradient.
  ctx.save();
  roundRect(ctx, barX, barY, barW, barH, 8);
  ctx.clip();
  for (let gy = 0; gy < barH; gy += 9) {
    ctx.fillStyle = 'rgba(255, 233, 196, 0.05)';
    ctx.fillRect(barX, barY + gy, barW, 1);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(barX, barY + gy + 4, barW, 1);
  }
  ctx.restore();

  const drawBox = (n, x) => {
    const row = gridRowOf(n);
    const top = rowTop[row];
    const h = ROW_H[row];

    const bucket = highlightFor(n.pc, parsed, triad); // null|'dim'|'root'|'match'|'tone'
    const hit = bucket === 'root' || bucket === 'match' || bucket === 'tone';
    const dim = bucket === 'dim';
    const styleKey = hit ? bucket : baseStyle(n.type);
    const [fill, stroke] = COLORS[styleKey];

    ctx.save();
    if (dim) ctx.globalAlpha = 0.32;
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = bucket === 'match' || bucket === 'root' ? 2.5 : 1.5;
    roundRect(ctx, x, top, COL_W, h, 10);
    ctx.fill();
    ctx.stroke();
    if (n.pc === bluePc) blueGlow(ctx, x, top, COL_W, h, 10);

    // Over-bar, mirroring .box.over::before at the export's larger scale (its
    // note type is 21px against the page's 18.4px, so the CSS 28x2.5 grows too).
    if (baseStyle(n.type) === 'over') {
      const barW = 32;
      ctx.fillStyle = inkAlpha(0.8);
      roundRect(ctx, x + (COL_W - barW) / 2, top + 7, barW, 3, 1.5);
      ctx.fill();
    }

    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const big = n.type === 'blow' || n.type === 'draw';
    ctx.font = `700 ${big ? 25 : 21}px ${FONT}`;
    ctx.fillText(withMusicAccidentals(n.name), x + COL_W / 2, top + h / 2);

    if (hit) {
      ctx.font = `700 11px ${FONT}`;
      ctx.fillStyle = inkAlpha(0.62);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(withMusicAccidentals(degreeOf(n.pc, parsed.root)), x + COL_W - 6, top + h - 4);
    }
    if (TAG[n.type]) {
      ctx.font = `800 9px ${FONT}`;
      ctx.fillStyle = inkAlpha(0.5);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(TAG[n.type], x + COL_W - 6, top + 5);
    }
    ctx.restore();
  };

  boxes.forEach((n) => drawBox(n, colX(n.hole)));

  // Hole-number chips on top of the bar.
  for (let h = 1; h <= 10; h++) {
    const cx = colX(h) + COL_W / 2;
    const chipW = 26, chipH = 22;
    ctx.fillStyle = '#0b0805';
    roundRect(ctx, cx - chipW / 2, barY + (barH - chipH) / 2, chipW, chipH, 6);
    ctx.fill();
    ctx.fillStyle = '#f2e7d3';
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(h), cx, barY + barH / 2 + 0.5);
  }

  // Vertical BLOW / DRAW labels flanking both sides, centered on the blow / draw
  // reed rows (blow reads up, draw down).
  const blowY = rowTop[BLOW_ROW] + ROW_H[BLOW_ROW] / 2;
  const drawY = rowTop[DRAW_ROW] + ROW_H[DRAW_ROW] / 2;
  ctx.fillStyle = '#8a7c66';
  ctx.font = `800 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const vlabel = (text, cx, cy, up) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(up ? -Math.PI / 2 : Math.PI / 2);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };
  for (const cx of [PAD + GUTTER / 2, width - PAD - GUTTER / 2]) {
    vlabel('BLOW', cx, blowY, true);
    vlabel('DRAW', cx, drawY, false);
  }

  // Tab strip: the same keys as the row under the harp on screen, wrapped into
  // as many rows as the harp's width needs.
  let tabY = gridBottom + TAB_TOP;
  for (const row of tabRows) {
    let tabX = (width - row.w) / 2;
    for (const k of row.keys) {
      ctx.save();
      roundRect(ctx, tabX, tabY, k.w, TAB_H, TAB_RADIUS);
      if (k.missing) {
        // Unreachable: a dashed empty socket, as on screen. Ink at low alpha
        // stands in for the page's --line/--faint, which are theme-dependent.
        ctx.setLineDash(TAB_DASH);
        ctx.strokeStyle = inkAlpha(0.3);
        ctx.lineWidth = 1.5;
      } else {
        const bucket = highlightFor(k.pc, parsed, triad); // always a hit here
        const [fill, stroke] = COLORS[bucket];
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = bucket === 'tone' ? 1.5 : 2.5;
        ctx.fill();
      }
      ctx.stroke();
      ctx.restore();
      if (!k.missing && k.pc === bluePc) blueGlow(ctx, tabX, tabY, k.w, TAB_H, TAB_RADIUS);

      ctx.fillStyle = k.missing ? inkAlpha(0.42) : COLORS.ink;
      ctx.font = TAB_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(k.text, tabX + k.w / 2, tabY + TAB_H / 2 + 1);

      ctx.font = TAB_NAME_FONT;
      ctx.fillStyle = inkAlpha(k.missing ? 0.42 : 0.62);
      ctx.fillText(k.name, tabX + k.w / 2, tabY + TAB_H + TAB_NAME_TOP + TAB_NAME_H / 2);
      tabX += k.w + TAB_GAP;
    }
    tabY += TAB_ROW_H + TAB_GAP;
  }

  // Title (harp key + chord/scale) and the position keys under it.
  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 22px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, width / 2, PAD + TITLE_H / 2);
  if (subtitle) {
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = inkAlpha(0.6);
    ctx.fillText(subtitle, width / 2, PAD + TITLE_H + SUB_H / 2 - 2);
  }

  return canvas;
}

export function downloadCanvas(canvas, filename) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  a.click();
}

// Copy the canvas to the clipboard as PNG; fall back to a download if the
// clipboard image API is unavailable or blocked. Returns 'copied'|'downloaded'.
export async function copyCanvas(canvas, filename) {
  if (navigator.clipboard && window.ClipboardItem) {
    try {
      const item = new ClipboardItem({
        // Pass a Promise so Safari keeps the user-gesture context while toBlob runs.
        'image/png': new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png')),
      });
      await navigator.clipboard.write([item]);
      return 'copied';
    } catch { /* fall through to download */ }
  }
  downloadCanvas(canvas, filename);
  return 'downloaded';
}
