// Render the current harp layout (with highlights) to a canvas and copy it to
// the clipboard as a PNG. Drawn natively so we control the background — it is
// left transparent, i.e. without the page's blue backdrop.

import { degreeOf, highlightFor, withMusicAccidentals } from './theory.js';
import { buildHarp, tabStrip } from './harmonica.js';

const COL_W = 92, GAP_X = 10, GAP_Y = 8, PAD = 26, TITLE_H = 44, TITLE_GAP = 12;
const GUTTER = 30; // side gutters holding the vertical BLOW / DRAW labels
const ROW_H = [0, 50, 50, 70, 38, 70, 50, 50, 50]; // 1-indexed: rows 1..8
const GRID_W = 10 * COL_W + 9 * GAP_X;
// Tab line below the harp, at the same fractions of the harp width as the cqw
// values in styles.css — so a full 7-note scale fits one line here too.
const cq = (n) => Math.round(GRID_W * n / 100);
const TAB_TOP = cq(2.1), TAB_H = cq(3.6), TAB_GAP = cq(0.58), TAB_PAD_X = cq(0.66),
  TAB_MIN_W = cq(2.8), TAB_RADIUS = cq(0.75), TAB_NAME_TOP = cq(0.35), TAB_NAME_H = cq(1.4);
const TAB_DASH = [cq(0.5), cq(0.4)]; // the missing keys' dashed outline
const TAB_ROW_H = TAB_H + TAB_NAME_TOP + TAB_NAME_H; // key + the note name under it

const FONT = "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const TAB_FONT = `700 ${cq(1.45)}px ${FONT}`;
const TAB_NAME_FONT = `600 ${cq(1.15)}px ${FONT}`;
const INK = [34, 27, 18]; // --box-ink, also drawn at reduced alpha — see inkAlpha
// Mirrors the CSS custom properties in styles.css so a copied image matches the
// on-screen (bright) instrument. The export keeps a transparent background.
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
  comb: ['#2c2720', '#16110c'],
  ink: `rgb(${INK})`,
};
const inkAlpha = (a) => `rgba(${INK}, ${a})`;
const TAG = { overblow: 'OB', overdraw: 'OD' };

// Same row/style mapping as the DOM renderer (see app.js).
function gridRow(type, depth) {
  switch (type) {
    case 'blow-bend': return depth === 1 ? 2 : 1;
    case 'overblow': return 2;
    case 'blow': return 3;
    case 'draw': return 5;
    case 'draw-bend': return 5 + depth;
    case 'overdraw': return 6;
  }
}
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

// The tab strip's keys, measured and wrapped into centered lines of at most
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

  const lines = [];
  let line = null;
  for (const k of keys) {
    if (line && line.w + TAB_GAP + k.w > maxW) line = null;
    if (!line) { line = { keys: [], w: -TAB_GAP }; lines.push(line); }
    line.keys.push(k);
    line.w += TAB_GAP + k.w;
  }
  return lines;
}

export function renderHarpImage({ key, parsed, triad, showDrawBends, showBlowBends, showOverblow, showOverdraw, title }) {
  const harp = buildHarp(key);
  const show = { showDrawBends, showBlowBends, showOverblow, showOverdraw };

  // Rows whose only occupants are switched off collapse away — same as on screen,
  // so the export doesn't carry a band of empty space under the title.
  const rowShown = [false, showBlowBends, showBlowBends || showOverblow, true, true, true,
    showDrawBends || showOverdraw, showDrawBends, showDrawBends];
  const rowTop = [0, 0];
  let y = PAD + TITLE_H + TITLE_GAP;
  for (let r = 1; r <= 8; r++) { rowTop[r] = y; if (rowShown[r]) y += ROW_H[r] + GAP_Y; }
  const gridBottom = y - GAP_Y; // last visible row's bottom, without its trailing gap

  const width = PAD * 2 + GUTTER * 2 + GRID_W;
  const tabLines = layoutTabStrip(parsed, harp, show, GRID_W);
  const tabH = tabLines.length ? TAB_TOP + tabLines.length * (TAB_ROW_H + TAB_GAP) - TAB_GAP : 0;
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
  const panelY = rowTop[3] - 4;
  const panelH = rowTop[5] + ROW_H[5] + 4 - panelY;
  ctx.fillStyle = vGradient(panelY, panelY + panelH, COLORS.plate);
  ctx.strokeStyle = COLORS.plateEdge;
  ctx.lineWidth = 1.5;
  roundRect(ctx, gridLeft - 4, panelY, GRID_W + 8, panelH, 16);
  ctx.fill();
  ctx.stroke();

  // Dark comb (number bar) with a slight overhang, like the page.
  const barH = 30;
  const barY = rowTop[4] + (ROW_H[4] - barH) / 2;
  ctx.fillStyle = vGradient(barY, barY + barH, COLORS.comb);
  roundRect(ctx, gridLeft - 6, barY, GRID_W + 12, barH, 8); // matches .number-bar border-radius
  ctx.fill();

  const drawBox = (n, x) => {
    const row = gridRow(n.type, n.depth);
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

  for (let h = 1; h <= 10; h++) {
    const c = harp[h];
    const boxes = [c.blow, c.draw];
    if (showDrawBends) boxes.push(...c.drawBends);
    if (showBlowBends) boxes.push(...c.blowBends);
    if (showOverblow && c.overblow) boxes.push(c.overblow);
    if (showOverdraw && c.overdraw) boxes.push(c.overdraw);
    boxes.forEach((n) => drawBox(n, colX(h)));
  }

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
  const blowY = rowTop[3] + ROW_H[3] / 2;
  const drawY = rowTop[5] + ROW_H[5] / 2;
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
  // as many lines as the harp's width needs.
  let tabY = gridBottom + TAB_TOP;
  for (const line of tabLines) {
    let tabX = (width - line.w) / 2;
    for (const k of line.keys) {
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

  // Title (harp key + chord/scale).
  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 22px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, width / 2, PAD + TITLE_H / 2);

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
