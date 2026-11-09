'use strict';
// =====================================================================
//  PIXEL SKATE: LA NAVE  —  núcleo: lienzo, paleta, tramado, fuente
// =====================================================================
const H = 270;
let W = 480;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d', { alpha: false });

function computeW() {
  const a = window.innerWidth / Math.max(1, window.innerHeight);
  let w = Math.round(H * a);
  w = Math.max(400, Math.min(640, w));
  return w & ~1;
}
function fitCanvas() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  cv.style.width = Math.max(1, Math.floor(W * s)) + 'px';
  cv.style.height = Math.max(1, Math.floor(H * s)) + 'px';
}

// ---------- Paleta limitada (33 colores) ----------
const PAL_HEX = [
  '#0d0d12', '#1c1c24', '#2c2d36', '#3f414b', '#555863', '#6e717b', '#8b8e96', '#aaacb1', '#c9cacb', '#e6e5e0', '#fbf8ef', // 0-10 grises
  '#2e1f18', '#563826', '#8a5c3c', '#b98a5e', '#dcb888', '#f3dcb0',                                                   // 11-16 maderas / piel
  '#5c1f24', '#a6302f', '#e0572e', '#f39a32', '#f7d354',                                                              // 17-21 cálidos
  '#24402a', '#3f6b38', '#6e9a48', '#a8c96a',                                                                         // 22-25 verdes
  '#1d2a4d', '#2f4f8f', '#4f86c9', '#8cc2ec',                                                                         // 26-29 azules
  '#3d2550', '#7a3f8c', '#d97aa6',                                                                                    // 30-32 morados
  '#187a7a', '#19aaaa', '#86dcd6'                                                                                     // 33-35 verde azulado (logo)
];
const PAL32 = new Uint32Array(PAL_HEX.length);
PAL_HEX.forEach((h, i) => {
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
  PAL32[i] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
});
const FAMILIES = [[0, 10], [11, 16], [17, 21], [22, 25], [26, 29], [30, 32], [33, 35]];
const DARK = new Uint8Array(PAL_HEX.length), LIGHT = new Uint8Array(PAL_HEX.length);
for (const [a, b] of FAMILIES) for (let i = a; i <= b; i++) {
  DARK[i] = i > a ? i - 1 : (a === 0 ? 0 : 0);
  LIGHT[i] = i < b ? i + 1 : 10;
}
DARK[11] = 0; DARK[17] = 11; DARK[22] = 1; DARK[26] = 1; DARK[30] = 1; DARK[33] = 1;

// ---------- Tramado Bayer 4x4 ----------
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sgn = v => v < 0 ? -1 : v > 0 ? 1 : 0;
function dpick(ramp, v, x, y) {
  const n = ramp.length - 1;
  let i = Math.floor(v * n + bay(x, y));
  return ramp[i < 0 ? 0 : i > n ? n : i];
}

// ---------- Ruido determinista ----------
function hash2(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) { return vnoise(x, y) * 0.5 + vnoise(x * 2.03 + 5.1, y * 2.03 + 1.7) * 0.3 + vnoise(x * 4.1 + 9.3, y * 4.1 + 3.3) * 0.2; }

// ---------- Fuente propia 3x5 (con tildes y Ñ) ----------
const FONT = {};
function defGlyph(ch, rows, extra) {
  const px = [];
  rows.forEach((r, y) => { for (let x = 0; x < 3; x++) if (r[x] === '#') px.push([x, y]); });
  if (extra) for (const p of extra) px.push(p);
  FONT[ch] = px;
}
const GL = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'], Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'], '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
  ' ': ['...', '...', '...', '...', '...'], '.': ['...', '...', '...', '...', '.#.'], ',': ['...', '...', '...', '.#.', '#..'],
  ':': ['...', '.#.', '...', '.#.', '...'], ';': ['...', '.#.', '...', '.#.', '#..'], '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '¡': ['.#.', '...', '.#.', '.#.', '.#.'], '?': ['##.', '..#', '.#.', '...', '.#.'], '¿': ['.#.', '...', '.#.', '#..', '.##'],
  '-': ['...', '...', '###', '...', '...'], '+': ['...', '.#.', '###', '.#.', '...'], '/': ['..#', '..#', '.#.', '#..', '#..'],
  '(': ['.#.', '#..', '#..', '#..', '.#.'], ')': ['.#.', '..#', '..#', '..#', '.#.'], "'": ['.#.', '.#.', '...', '...', '...'],
  '"': ['#.#', '#.#', '...', '...', '...'], '%': ['#.#', '..#', '.#.', '#..', '#.#'], '=': ['...', '###', '...', '###', '...'],
  '>': ['#..', '.#.', '..#', '.#.', '#..'], '<': ['..#', '.#.', '#..', '.#.', '..#'], '_': ['...', '...', '...', '...', '###'],
  '*': ['...', '#.#', '.#.', '#.#', '...'], '#': ['#.#', '###', '#.#', '###', '#.#'], '[': ['##.', '#..', '#..', '#..', '##.'],
  ']': ['.##', '..#', '..#', '..#', '.##'], '·': ['...', '...', '.#.', '...', '...'],
  '←': ['.#.', '#..', '###', '#..', '.#.'], '→': ['.#.', '..#', '###', '..#', '.#.'],
  '↑': ['.#.', '###', '.#.', '.#.', '.#.'], '↓': ['.#.', '.#.', '.#.', '###', '.#.'],
  '×': ['...', '#.#', '.#.', '#.#', '...'], '✓': ['...', '..#', '..#', '#.#', '.#.'],
  '©': ['###', '#.#', '#..', '#.#', '###']
};
for (const k in GL) defGlyph(k, GL[k]);
const ACUTE = [[1, -1], [2, -2]], TILDE = [[0, -1], [1, -2], [2, -1], [3, -2]], DIAER = [[0, -2], [2, -2]];
defGlyph('Á', GL.A, ACUTE); defGlyph('É', GL.E, ACUTE); defGlyph('Í', GL.I, ACUTE);
defGlyph('Ó', GL.O, ACUTE); defGlyph('Ú', GL.U, ACUTE); defGlyph('Ñ', GL.N, TILDE); defGlyph('Ü', GL.U, DIAER);
const FONT_LIST = Object.keys(FONT);
const FONT_IDX = {}; FONT_LIST.forEach((c, i) => FONT_IDX[c] = i);
const atlasCache = {};
function fontAtlas(col) {
  let a = atlasCache[col];
  if (a) return a;
  a = document.createElement('canvas');
  a.width = FONT_LIST.length * 4; a.height = 8;
  const x = a.getContext('2d');
  x.fillStyle = PAL_HEX[col];
  FONT_LIST.forEach((ch, i) => { for (const [px, py] of FONT[ch]) x.fillRect(i * 4 + px, py + 2, 1, 1); });
  atlasCache[col] = a;
  return a;
}
const upper = s => String(s).toUpperCase();
const textW = s => Math.max(0, [...String(s)].length * 4 - 1);
function drawText1(s, x, y, col) {
  const a = fontAtlas(col);
  let cx = x | 0; const cy = (y | 0) - 2;
  for (const ch of s) {
    const i = FONT_IDX[ch];
    if (i !== undefined && ch !== ' ') ctx.drawImage(a, i * 4, 0, 4, 8, cx, cy, 4, 8);
    cx += 4;
  }
}
// sh: color de sombra (desplazada 1,1) o -1 sin sombra
function drawText(s, x, y, col, sh) {
  s = upper(s);
  if (sh !== undefined && sh >= 0) drawText1(s, x + 1, y + 1, sh);
  drawText1(s, x, y, col);
}
function drawTextC(s, cx, y, col, sh) { drawText(s, Math.round(cx - textW(upper(s)) / 2), y, col, sh); }
function drawTextR(s, rx, y, col, sh) { drawText(s, rx - textW(upper(s)), y, col, sh); }
function fmt(n) {
  n = Math.round(n);
  const neg = n < 0; let s = String(Math.abs(n)), o = '';
  while (s.length > 3) { o = '.' + s.slice(-3) + o; s = s.slice(0, -3); }
  return (neg ? '-' : '') + s + o;
}
const fmtM = m => (Math.round(m * 10) / 10).toFixed(1).replace('.', ',');

// Texto en bloques sombreados (logo, combo): cada píxel de la fuente => bloque b×b con degradado tramado,
// brillo superior, contorno oscuro de 1 px y sombra. Todo a la escala de píxel del lienzo.
const blockCache = new Map();
function makeBlockText(str, o) {
  const key = str + '|' + o.b + '|' + o.ramp.join(',') + '|' + o.outline + '|' + o.shadow + '|' + (o.sd || 1) + '|' + o.hl;
  let c = blockCache.get(key);
  if (c) return c;
  if (blockCache.size > 300) blockCache.clear();
  const chars = [...upper(str)];
  const b = o.b, cw = 4 * b, sd = o.sd || 1;
  const pad = 2 + (o.shadow >= 0 ? sd : 0);
  const w = Math.max(1, chars.length * cw - b + pad * 2), h = 7 * b + pad * 2;
  const g = new Uint8Array(w * h).fill(255);
  const top = pad + 2 * b;
  chars.forEach((ch, i) => {
    const gl = FONT[ch]; if (!gl) return;
    for (const [gx, gy] of gl) for (let yy = 0; yy < b; yy++) for (let xx = 0; xx < b; xx++) {
      const X = pad + i * cw + gx * b + xx, Y = top + gy * b + yy;
      g[Y * w + X] = 254;
    }
  });
  const n = o.ramp.length;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (g[i] !== 254) continue;
    const t = clamp((y - top) / (5 * b - 1 || 1), 0, 1);
    let ri = Math.floor(t * (n - 1) + bay(x, y) * 0.999);
    let col = o.ramp[clamp(ri, 0, n - 1)];
    if (o.hl >= 0 && b > 1 && (y === 0 || g[i - w] === 255)) col = o.hl;
    g[i] = col;
  }
  const filled = i => g[i] !== 255 && g[i] !== 253 && g[i] !== 252;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (g[i] !== 255) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      if (filled(Y * w + X)) { near = true; break; }
    }
    if (near) g[i] = 253;
  }
  if (o.shadow >= 0) {
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x; if (g[i] !== 255) continue;
      for (let k = 1; k <= sd; k++) {
        const X = x - k, Y = y - k; if (X < 0 || Y < 0) break;
        const j = Y * w + X;
        if (g[j] !== 255 && g[j] !== 252) { g[i] = 252; break; }
      }
    }
  }
  c = document.createElement('canvas'); c.width = w; c.height = h;
  const cx = c.getContext('2d'), img = cx.createImageData(w, h), u = new Uint32Array(img.data.buffer);
  for (let i = 0; i < w * h; i++) {
    const v = g[i];
    if (v === 255) continue;
    u[i] = v === 253 ? PAL32[o.outline] : v === 252 ? PAL32[o.shadow] : PAL32[v];
  }
  cx.putImageData(img, 0, 0);
  c.ox = pad; c.oy = top;
  blockCache.set(key, c);
  return c;
}
// Texto pequeño con contorno (HUD)
function drawTextO(s, x, y, col, ocol) {
  const c = makeBlockText(s, { b: 1, ramp: [col], outline: ocol === undefined ? 0 : ocol, shadow: -1, hl: -1 });
  ctx.drawImage(c, (x | 0) - c.ox, (y | 0) - c.oy);
  return c.width - c.ox * 2;
}
function drawTextOC(s, cx, y, col, ocol) { drawTextO(s, Math.round(cx - textW(upper(s)) / 2), y, col, ocol); }
function drawBig(s, cx, y, ramp, ocol, sh) {
  const c = makeBlockText(s, { b: 2, ramp, outline: ocol === undefined ? 0 : ocol, shadow: sh === undefined ? 1 : sh, hl: -1, sd: 1 });
  const x = Math.round(cx - (c.width) / 2);
  ctx.drawImage(c, x, (y | 0) - c.oy);
}

// Rejilla de tramado para oscurecer (sin transparencias): patrón de damero de píxeles oscuros
let ditherDim = null;
function makeDim() {
  ditherDim = document.createElement('canvas'); ditherDim.width = W; ditherDim.height = H;
  const x = ditherDim.getContext('2d'), img = x.createImageData(W, H), u = new Uint32Array(img.data.buffer);
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) if (bay(i, y) < 0.62) u[y * W + i] = PAL32[0];
  x.putImageData(img, 0, 0);
}
function dimScreen() { ctx.drawImage(ditherDim, 0, 0); }
function rect(x, y, w, h, col) { ctx.fillStyle = PAL_HEX[col]; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }
function frame(x, y, w, h, col) { rect(x, y, w, 1, col); rect(x, y + h - 1, w, 1, col); rect(x, y, 1, h, col); rect(x + w - 1, y, 1, h, col); }
// Panel con borde biselado de 1 px y fondo tramado
function panel(x, y, w, h) {
  rect(x, y, w, h, 1);
  frame(x, y, w, h, 0);
  rect(x + 1, y + 1, w - 2, 1, 4);
  rect(x + 1, y + 1, 1, h - 2, 3);
  rect(x + 1, y + h - 2, w - 2, 1, 0);
}

// ---------- Entrada ----------
const keys = Object.create(null), pressed = Object.create(null), released = Object.create(null);
const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'Tab', 'Enter', 'Escape']);
window.addEventListener('keydown', e => {
  if (PREVENT.has(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  if (typeof SND !== 'undefined') SND.unlock();
});
window.addEventListener('keyup', e => {
  if (PREVENT.has(e.code)) e.preventDefault();
  keys[e.code] = false; released[e.code] = true;
});
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
cv.addEventListener('mousedown', () => { cv.focus(); if (typeof SND !== 'undefined') SND.unlock(); });
const kShift = () => !!(keys.ShiftLeft || keys.ShiftRight);
const pShift = () => !!(pressed.ShiftLeft || pressed.ShiftRight);
const pOK = () => !!(pressed.Enter || pressed.Space || pressed.NumpadEnter);
const pBack = () => !!(pressed.Escape || pressed.Backspace);
function clearEdges() { for (const k in pressed) delete pressed[k]; for (const k in released) delete released[k]; }
