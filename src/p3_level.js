
// =====================================================================
//  Mapas: geometría por piezas, luz según la hora y capa principal pre-renderizada
// =====================================================================
const PXM = 24;          // píxeles de mundo por metro
const G = 470;           // gravedad (px/s²)
const ZM = 1.25;         // cámara más cerca: todo se dibuja un 25 % más grande
const FY = 214;          // fila de pantalla del suelo en el carril z=0
const TOPM = 150;        // margen superior de las capas (cámara que sube en aires altos)
const LANE = 36, WALLZ = -36, RAILZ = 12;      // la pared toca el borde trasero de rampas y obstáculos
const PAR_BG = 0.6, PAR_FG = 1.35;
const FLICK = 2;
const cam = { x: 0, xi: 0, up: 0, upi: 0 };
// mundo -> capa / pantalla
const LY = (y, z) => TOPM + FY - (y * COSE - z * SINE) * ZM;
const SX = x => x * ZM - cam.xi;
const SY = (y, z) => FY - (y * COSE - (z || 0) * SINE) * ZM + cam.upi;

// ---------- Mapas: rampa izquierda (L), tramo central (mid) y rampa derecha (Rr) ----------
// L: lip = x del coping, R = radio, base = altura del fondo de la curva, vext = tramo vertical
// Rr: cx = x donde empieza la curva; mid = polilínea del suelo entre las dos curvas
const MAPS = {
  nave: { n: 'LA NAVE', theme: 'nave', W: 1012, L: { lip: 30, R: 32, base: 0, vext: 6 }, Rr: { cx: 900, R: 72, base: 0, vext: 14 },
    mid: [[62, 0], [340, 0], [392, 24], [532, 24], [584, 0], [900, 0]], rail: [[360, 38], [532, 38], [578, 38 - 24 * 46 / 52]],
    lamps: [215, 385, 555, 720, 880], lampY: 140, lampKind: 'tube', caps: [225, 305], bpm: 84, fence: true, pigeons: [0, 0, 1, 3, 4, 4] },
  park: { n: 'EL SKATEPARK', theme: 'park', W: 980, L: { lip: 40, R: 48, base: 0, vext: 8 }, Rr: { cx: 860, R: 70, base: 0, vext: 12 },
    mid: [[88, 0], [330, 0], [374, 22], [514, 22], [558, 0], [860, 0]], rail: [[384, 36], [514, 36], [554, 36 - 22 * 40 / 44]],
    lamps: [215, 650], lampY: 150, lampKind: 'post', caps: [250, 300], bpm: 92, fence: true, pigeons: [0, 0, 1] },
  pool: { n: 'LA PISCINA', theme: 'pool', W: 680, L: { lip: 44, R: 40, base: 52, vext: 8 }, Rr: { cx: 560, R: 76, base: 0, vext: 24 },
    mid: [[84, 52], [260, 52], [380, 0], [560, 0]], rail: null,
    lamps: [], lampY: 0, lampKind: null, caps: [240, 300], bpm: 96, fence: false, pigeons: [] },
  parking: { n: 'EL PARKING', theme: 'parking', W: 1100, L: { lip: 30, R: 36, base: 0, vext: 8 }, Rr: { cx: 1010, R: 56, base: 0, vext: 10 },
    mid: [[66, 0], [380, 0], [560, 40], [700, 40], [840, 0], [1010, 0]], rail: [[570, 54], [700, 54], [836, 54 - 40 * 136 / 140]],
    lamps: [170, 370, 570, 770, 960], lampY: 112, lampKind: 'sodium', caps: [230, 290], bpm: 78, fence: false, pigeons: [] }
};
const MAP_IDS = ['nave', 'park', 'pool', 'parking'];
let MAP = null, WORLD_W = 0, LWID = 0, MINI = null, BIG = null, MID = null, RAIL_PTS = null, LAMPS = [], LAMP_Y = 140;
let PATH = null, RAILP = null, RAILS = [];

// ---------- Hora del día ----------
const TOD = [
  { n: 'MAÑANA', amb: 0, tube: 0.07, win: 0.26, beamOn: 1, patch: 1, beam: [16, 10], sky: [8, 9, 29, 10, 10] },
  { n: 'ATARDECER', amb: -0.13, tube: 0.15, win: 0.2, beamOn: 0.85, patch: 2, beam: [20, 21], sky: [30, 31, 32, 19, 20, 21] },
  { n: 'NOCHE', amb: -0.42, tube: 0.5, win: 0.02, beamOn: 0.22, patch: 0, beam: [29, 9], sky: [0, 1, 26, 26, 27] }
];
const TOD_PARKING = { n: 'PARKING', amb: -0.3, tube: 0.5, win: 0, beamOn: 0, patch: 0, beam: [20, 21], sky: [0, 1, 2] };
const todIdx = () => (typeof SAVE !== 'undefined' && SAVE.tod) || 0;
const tod = () => (MAP && MAP.theme === 'parking') ? TOD_PARKING : TOD[todIdx()];
const theme = () => MAP ? MAP.theme : 'nave';
// cuánto iluminan las lámparas del mapa (las farolas del parque solo de noche/atardecer)
function lampScale() { const t = theme(); return t === 'park' ? [0, 0.5, 1.1][todIdx()] : t === 'pool' ? 0 : 1; }
function lampLight(wx, wz) {
  let s = 0;
  for (const lx of LAMPS) { const dx = (wx - lx) / 85; s += Math.exp(-dx * dx) * (1 - Math.min(1, Math.abs(wz + 10) / 150)); }
  return Math.min(1.2, s) * lampScale();
}
function floorLight(wx, wz) { const T = tod(); return T.amb + T.tube * lampLight(wx, wz); }
function inBeam(x) { return theme() === 'nave' && x > 12 && x < 100; }
function lightAtPlayer(x) {
  const T = tod();
  let b = 1 + T.amb * 1.1 + T.tube * 1.15 * lampLight(x, 0);
  if (inBeam(x)) b += 0.22 * T.beamOn;
  return clamp(b, 0.5, 1.35);
}
// desplaza un color de la paleta k pasos (con tramado) dentro de su familia
function lit(c, shift, x, y) {
  let k = Math.floor(shift * 3 + bay(x, y));
  while (k > 0) { c = LIGHT[c]; k--; }
  while (k < 0) { c = DARK[c]; k++; }
  return c;
}
const WARM = { 1: 11, 2: 12, 3: 12, 4: 13, 5: 13, 6: 14, 7: 15, 8: 15, 9: 16, 10: 16, 12: 13, 13: 14, 14: 15, 15: 21, 16: 21 };

function midY(x) {
  const m = MID;
  if (x <= m[0][0]) return m[0][1];
  for (let i = 0; i < m.length - 1; i++) if (x <= m[i + 1][0]) return m[i][1] + (m[i + 1][1] - m[i][1]) * (x - m[i][0]) / ((m[i + 1][0] - m[i][0]) || 1);
  return m[m.length - 1][1];
}
function groundY(x) {
  if (x <= MINI.lip) return MINI.H;
  if (x < MINI.cx) { const d = MINI.cx - x; return MINI.base + MINI.R - Math.sqrt(Math.max(0, MINI.R * MINI.R - d * d)); }
  if (x < BIG.cx) return midY(x);
  if (x < BIG.lip) { const d = x - BIG.cx; return BIG.base + BIG.R - Math.sqrt(Math.max(0, BIG.R * BIG.R - d * d)); }
  return BIG.H;
}
function isWood(x) {
  const t = theme();
  if (t === 'nave') return x < MINI.cx + 0.5 || x > BIG.cx - 0.5 || midY(x) > 0.5;
  if (t === 'parking') return x < MINI.cx + 0.5 || x > BIG.cx - 0.5;
  return false;
}

// Camino remuestreado por longitud de arco
function buildPath(poly, step) {
  const segL = [], cum = [0];
  for (let i = 1; i < poly.length; i++) {
    const l = Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
    segL.push(l); cum.push(cum[i - 1] + l);
  }
  const L = cum[cum.length - 1];
  const n = Math.floor(L / step) + 1;
  const X = new Float32Array(n), Y = new Float32Array(n), TX = new Float32Array(n), TY = new Float32Array(n);
  let seg = 0;
  for (let k = 0; k < n; k++) {
    const s = Math.min(L, k * step);
    while (seg < segL.length - 1 && cum[seg + 1] < s) seg++;
    const a = poly[seg], b = poly[seg + 1], t = segL[seg] > 0 ? (s - cum[seg]) / segL[seg] : 0;
    X[k] = a[0] + (b[0] - a[0]) * t; Y[k] = a[1] + (b[1] - a[1]) * t;
    TX[k] = (b[0] - a[0]) / (segL[seg] || 1); TY[k] = (b[1] - a[1]) / (segL[seg] || 1);
  }
  const kinks = [];
  for (let i = 1; i < poly.length - 1; i++) {
    const a1 = Math.atan2(poly[i][1] - poly[i - 1][1], poly[i][0] - poly[i - 1][0]);
    const a2 = Math.atan2(poly[i + 1][1] - poly[i][1], poly[i + 1][0] - poly[i][0]);
    let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    if (Math.abs(d) > 0.12) kinks.push({ s: cum[i], d, x: poly[i][0], y: poly[i][1] });
  }
  return { X, Y, TX, TY, L, n, step, kinks };
}
// Carga un mapa: fija las piezas y reconstruye el camino y las barandillas
function loadMap(id) {
  const m = MAPS[id] || MAPS.nave;
  MAP = Object.assign({ id: MAPS[id] ? id : 'nave' }, m);
  WORLD_W = m.W; LWID = Math.round(WORLD_W * ZM);
  MINI = { lip: m.L.lip, R: m.L.R, base: m.L.base || 0 }; MINI.cx = MINI.lip + MINI.R; MINI.H = MINI.base + MINI.R + m.L.vext;
  BIG = { cx: m.Rr.cx, R: m.Rr.R, base: m.Rr.base || 0 }; BIG.lip = BIG.cx + BIG.R; BIG.H = BIG.base + BIG.R + m.Rr.vext;
  MID = m.mid; RAIL_PTS = m.rail; LAMPS = m.lamps; LAMP_Y = m.lampY;
  const p = [];
  p.push([MINI.lip, MINI.H], [MINI.lip, MINI.base + MINI.R]);
  for (let i = 1; i <= 48; i++) { const a = Math.PI + (i / 48) * Math.PI / 2; p.push([MINI.cx + MINI.R * Math.cos(a), MINI.base + MINI.R + MINI.R * Math.sin(a)]); }
  for (const q of MID.slice(1, -1)) p.push([q[0], q[1]]);
  p.push([BIG.cx, BIG.base]);
  for (let i = 1; i <= 96; i++) { const a = -Math.PI / 2 + (i / 96) * Math.PI / 2; p.push([BIG.cx + BIG.R * Math.cos(a), BIG.base + BIG.R + BIG.R * Math.sin(a)]); }
  p.push([BIG.lip, BIG.H]);
  PATH = buildPath(p, 0.5);
  RAILS = RAIL_PTS ? [{ pts: RAIL_PTS, z: RAILZ, kind: 'rail' }] : [];
  RAILS.forEach(r => { r.path = buildPath(r.pts, 0.5); });
  RAILP = RAILS.length ? RAILS[0].path : null;
}
function railYi(r, x) {
  const p = r.pts;
  if (x < p[0][0] || x > p[p.length - 1][0]) return -1e9;
  for (let i = 0; i < p.length - 1; i++) if (x <= p[i + 1][0]) return p[i][1] + (p[i + 1][1] - p[i][1]) * (x - p[i][0]) / (p[i + 1][0] - p[i][0]);
  return -1e9;
}
function pathAt(P, s) {
  const f = clamp(s / P.step, 0, P.n - 1.001), i = Math.floor(f), t = f - i;
  return { x: P.X[i] + (P.X[i + 1] - P.X[i]) * t, y: P.Y[i] + (P.Y[i + 1] - P.Y[i]) * t, tx: P.TX[i], ty: P.TY[i] };
}
function sOfX(P, x) {
  let lo = 0, hi = P.n - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (P.X[m] < x) lo = m + 1; else hi = m; }
  if (lo > 0 && P.X[lo] > x) { const t = (x - P.X[lo - 1]) / ((P.X[lo] - P.X[lo - 1]) || 1); return (lo - 1 + t) * P.step; }
  return lo * P.step;
}
loadMap('nave');

// ---------- Capas de píxeles indexados ----------
function Layer(w, h) { this.w = w; this.h = h; this.d = new Uint8Array(w * h).fill(255); }
Layer.prototype.set = function (x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; };
Layer.prototype.get = function (x, y) { x |= 0; y |= 0; return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.d[y * this.w + x] : 255; };
Layer.prototype.rect = function (x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); };
Layer.prototype.shade = function (x, y, k) { let c = this.get(x, y); if (c === 255) return; while (k > 0) { c = LIGHT[c]; k--; } while (k < 0) { c = DARK[c]; k++; } this.set(x, y, c); };
Layer.prototype.text = function (s, x, y, c) { let cx = x; for (const ch of upper(s)) { const g = FONT[ch]; if (g) for (const [px, py] of g) this.set(cx + px, y + py, c); cx += 4; } };
// sprite de caracteres: cada letra se traduce con el mapa de colores; '.' es transparente
Layer.prototype.sprite = function (rows, x, y, map, shift) {
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const k = r[i]; if (k === '.' || map[k] === undefined) continue; this.set(x + i, y + j, shift ? lit(map[k], shift, x + i, y + j) : map[k]); } });
};
Layer.prototype.toCanvas = function () {
  const c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
  const x = c.getContext('2d'), img = x.createImageData(this.w, this.h), u = new Uint32Array(img.data.buffer);
  for (let i = 0; i < this.d.length; i++) if (this.d[i] !== 255) u[i] = PAL32[this.d[i]];
  x.putImageData(img, 0, 0);
  return c;
};
const FLOOR_R = [2, 3, 4, 5, 6, 7, 8, 9];     // hormigón claro, casi blanco
const WALL_R = [1, 2, 3, 4, 5, 6, 7, 8];
const SIDE_R = [0, 1, 2, 3, 4];
const WOOD_R = [12, 13, 14, 15, 16];
const PYRW_R = [11, 12, 13, 14, 15];
let LAYERS = null;
// pequeño generador determinista para grietas y detalles
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function crackWalk(L, x, y, n, ang, rnd, k) {
  for (let i = 0; i < n; i++) {
    ang += (rnd() - 0.5) * 0.9;
    x += Math.cos(ang) * 1.2; y += Math.sin(ang) * 0.7;
    L.shade(Math.round(x), Math.round(y), k);
    if (rnd() < 0.04 && n > 8) crackWalk(L, x, y, n >> 2, ang + (rnd() < 0.5 ? 0.9 : -0.9), rnd, k);
  }
}

// ---------- Materiales por tema ----------
const MATS = {
  nave: { surf: WOOD_R, mid: PYRW_R.map(c => c + 1), deck: PYRW_R, side: SIDE_R, midSide: [1, 2, 3, 4], coping: 'metal' },
  park: { surf: [3, 4, 5, 6, 7, 8], mid: [3, 4, 5, 6, 7, 8], deck: [3, 4, 5, 6, 7], side: [1, 2, 3, 4, 5], midSide: [1, 2, 3, 4, 5], coping: 'metal' },
  pool: { surf: [26, 27, 28, 29, 10], mid: [26, 27, 28, 29, 10], deck: [12, 13, 14, 15], side: [0, 11, 12, 13], midSide: [0, 11, 12, 13], coping: 'stone' },
  parking: { surf: WOOD_R, mid: [2, 3, 4, 5, 6], deck: PYRW_R, side: [11, 12, 13, 14], midSide: [1, 2, 3, 4], coping: 'metal' }
};
// Color del suelo (plano y=0) según el tema
function floorColor(t, T, px, r, wx, wz, wzn) {
  let v, c;
  const hs = hash2(px, r);
  if (t === 'pool') {
    if (wz > LANE) {                                    // corte de tierra delante de la piscina
      v = 0.5 - (wz - LANE) * 0.004 + (vnoise(wx * 0.15, wz * 0.3) - 0.5) * 0.3 + T.amb * 0.6;
      c = dpick([0, 11, 12, 13], v, px, r);
      if (hs > 0.985) c = 5; else if (hs < 0.008) c = 14;
      if (wz < LANE + 2.2) c = 7;
      return c;
    }
    v = 0.62 + (fbm(wx * 0.04, wz * 0.08) - 0.5) * 0.22 + floorLight(wx, wz);
    const st = vnoise(wx * 0.05 + 2, wz * 0.08); if (st > 0.66) v -= (st - 0.66) * 1.2;
    c = dpick([26, 27, 28, 29, 10], v, px, r);
    const dx = wx - 470;
    if (Math.abs(dx) < 6 && Math.abs(wz) < 4) c = (Math.round(dx * ZM) & 1) ? 1 : 3;   // sumidero
    if (hs > 0.993) c = 23;                                                            // hojitas
    return c;
  }
  if (t === 'parking') {
    v = 0.44 + wz * 0.0007 + (fbm(wx * 0.02, wz * 0.04) - 0.5) * 0.24;
    if (hs > 0.988) v -= 0.18; else if (hs < 0.01) v += 0.12;
    const st = vnoise(wx * 0.02 + 5, wz * 0.03); if (st > 0.62) v -= (st - 0.62) * 1.3;
    v += floorLight(wx, wz) * 0.6;
    c = dpick([1, 2, 3, 4, 5, 6], v, px, r);
    // luz naranja de sodio bajo las lámparas
    if (lampLight(wx, wz) > 0.55 && bay(px, r) < (lampLight(wx, wz) - 0.55) * 1.4) c = WARM[c] || c;
    // plazas pintadas junto a la pared y línea amarilla del carril
    const bay110 = ((wx % 110) + 110) % 110;
    if (wz < 12 && bay110 < 1.6) c = dpick([7, 8, 9], 0.6 + v * 0.2, px, r);
    if (wz > 20 && wz < 23) c = (Math.floor(wx / 14) & 1) ? 20 : 21;
    return c;
  }
  if (t === 'park') {
    if (wz > 112) {                                     // césped delante de la pista
      v = 0.45 + (vnoise(wx * 0.2, wz * 0.4) - 0.5) * 0.4 + T.amb * 0.8;
      c = dpick([22, 23, 24, 25], v, px, r);
      if (hs > 0.96) c = 25; else if (hs < 0.02) c = 22;
      return c;
    }
    v = 0.62 + wz * 0.0006 + (fbm(wx * 0.02, wz * 0.04) - 0.5) * 0.26;
    if (hs > 0.988) v -= 0.2; else if (hs < 0.011) v += 0.14;
    const st = vnoise(wx * 0.017 + 4, wz * 0.03); if (st > 0.7) v -= (st - 0.7) * 1.2;
    v += floorLight(wx, wz);
    c = dpick(FLOOR_R, v, px, r);
    if (Math.floor(px / ZM / 96) !== Math.floor((px - 1) / ZM / 96)) c = 4;
    for (const jz of [-4, 52]) if (wz <= jz && wzn > jz) c = 4;
    if (hs > 0.997) c = hash2(px + 3, r) > 0.5 ? 19 : 13;                          // hojas secas
    return c;
  }
  // nave: hormigón pulido claro
  v = 0.76 + wz * 0.0008;
  v += (fbm(wx * 0.018, wz * 0.035) - 0.5) * 0.28;
  v += (vnoise(wx * 0.11, wz * 0.2) - 0.5) * 0.08;
  if (hs > 0.988) v -= 0.22; else if (hs < 0.011) v += 0.16;
  const st = vnoise(wx * 0.015 + 7.3, wz * 0.028 + 1.1);
  if (st > 0.68) v -= (st - 0.68) * 1.4;
  for (const p of [[150, 205, -40, -8], [700, 770, 20, 60], [470, 520, 60, 95]]) if (wx > p[0] && wx < p[1] && wz > p[2] && wz < p[3]) v += (wx < p[0] + 1.5 || wx > p[1] - 1.5) ? -0.12 : 0.07;
  if (Math.abs(wz) < 16 && (wx < 130 || wx > 830 || (wx > 300 && wx < 620))) { const m = vnoise(wx * 0.04, wz * 0.5); if (m > 0.62) v -= (m - 0.62) * 0.7; }
  for (const lx of LAMPS) { const dx = (wx - lx) / 6; if (dx * dx < 9 && wz < -12 && wz > -62) v += T.tube * 1.1 * Math.exp(-dx * dx) * Math.sin((wz + 62) / 50 * Math.PI); }
  v += floorLight(wx, wz);
  c = dpick(FLOOR_R, v, px, r);
  const jA = Math.floor(px / ZM / 128), jB = Math.floor((px - 1) / ZM / 128);
  if (jA !== jB) c = hash2(px, r >> 2) > 0.85 ? 3 : 4;
  else if (Math.floor((px - 1) / ZM / 128) !== Math.floor((px - 2) / ZM / 128)) c = LIGHT[c];
  for (const jz of [-22, 56, 140]) { if (wz <= jz && wzn > jz) c = 4; else if (wz <= jz + 2.5 && wzn > jz + 2.5) c = LIGHT[c]; }
  return c;
}

function renderMain() {
  const T = tod(), t = theme(), M = MATS[t];
  const w = LWID, h = TOPM + H;
  const L = new Layer(w, h);
  const KZ = SINE * ZM;
  const r0 = Math.floor(LY(0, WALLZ));
  for (let r = r0; r < h; r++) {
    const wz = (r - TOPM - FY) / KZ, wzn = (r + 1 - TOPM - FY) / KZ;
    for (let px = 0; px < w; px++) L.set(px, r, floorColor(t, T, px, r, px / ZM, wz, wzn));
  }
  // grietas finas del suelo
  if (t !== 'pool') {
    const rnd = rng(77);
    for (let i = 0; i < 9; i++) {
      const wx = 70 + rnd() * (WORLD_W - 150), wz = -33 + rnd() * 128;
      if (groundY(wx) > 0.5 && Math.abs(wz) < 40) continue;
      crackWalk(L, wx * ZM, LY(0, wz), 30 + rnd() * 50, rnd() * Math.PI * 2, rnd, -2);
    }
  }
  // sombra de contacto de los sólidos sobre el suelo
  const aoRow = Math.round(LY(0, LANE));
  if (t !== 'pool') for (let px = 0; px < w; px++) {
    if (groundY(px / ZM) < 0.5) continue;
    for (let k = 1; k <= 5; k++) if (bay(px, aoRow + k) < 0.9 - k * 0.17) L.shade(px, aoRow + k, -1);
  }
  drawFloorProps(L, T);
  // Sólidos: superficie visible + lateral (en la piscina: corte de tierra)
  const lipH = Math.max(MINI.H, BIG.H);
  function column(px, ramp, sideRamp, deck, midPiece) {
    const wx0 = px / ZM, dw = 1 / ZM;
    let ymin = 1e9, ymax = -1e9;
    for (let k = 0; k <= 4; k++) { const y = groundY(clamp(wx0 + k * dw / 4, 0, WORLD_W)); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
    const yc = groundY(clamp(wx0 + dw / 2, 0, WORLD_W));
    const dy = (groundY(clamp(wx0 + dw * 0.75, 0, WORLD_W)) - groundY(clamp(wx0 + dw * 0.25, 0, WORLD_W))) / (dw * 0.5);
    const th = Math.atan(dy), nx = -Math.sin(th), ny = Math.cos(th);
    const litN = 0.36 + 0.6 * Math.max(0, nx * LW[0] + ny * LW[1]);
    const rTop = Math.floor(LY(ymax, -LANE)), rBot = Math.floor(LY(ymin, LANE));
    for (let r = rTop; r <= rBot; r++) {
      const z = clamp((r - TOPM - FY + yc * COSE * ZM) / KZ, -LANE, LANE);
      let v = litN + (fbm(wx0 * 0.05, z * 0.08) - 0.5) * 0.12 + floorLight(wx0, z) * 0.8;
      if (!deck && t !== 'pool') {
        const mk = Math.abs(z + 3 * Math.sin(wx0 * 0.05));
        if (mk < 14) v -= (0.16 - mk * 0.009) * vnoise(wx0 * 0.12, z * 0.4) * 1.4;
      } else if (deck) v -= 0.12;
      let c = dpick(ramp, v, px, r);
      if (deck) {
        if (t === 'pool') { if (Math.floor(wx0 / 9) !== Math.floor((wx0 - dw) / 9) || (r - rTop) % 6 === 0) c = DARK[c]; }
        else if (t === 'park') { if (Math.floor(wx0 / 12) !== Math.floor((wx0 - dw) / 12)) c = DARK[c]; }
        else if (Math.floor(wx0 / 7) !== Math.floor((wx0 - dw) / 7)) c = DARK[c];
      } else if (t === 'pool' && yc > lipH - 11 && yc < lipH - 1.5) {               // franja de azulejos bajo el coping
        const tx = Math.floor(wx0 / 3.2), ty = Math.floor(z / 5);
        c = ((tx + ty) & 1) ? lit(27, floorLight(wx0, z), px, r) : lit(28, floorLight(wx0, z), px, r);
        if (Math.floor((wx0 - dw) / 3.2) !== tx) c = 29;
      } else if (t === 'parking' && midPiece && Math.abs(dy) > 0.05 && hash2(px >> 2, r >> 1) > 0.94) c = DARK[c];
      if (r === rTop) c = LIGHT[c];
      L.set(px, r, c);
    }
    const fl = Math.floor(LY(0, LANE));
    L.set(px, rBot + 1, t === 'pool' ? 7 : 5);
    for (let r = rBot + 2; r <= fl; r++) {
      const tt = (r - rBot) / Math.max(1, fl - rBot);
      const v = 0.62 - tt * 0.5 + (vnoise(wx0 * 0.3, r * 0.05) - 0.5) * 0.2 + T.amb * 0.7;
      let c = dpick(sideRamp, v, px, r);
      if (t === 'pool') { if (r === rBot + 2) c = 7; else if (hash2(px, r) > 0.985) c = 5; }
      else if (t === 'park') { if ((r - rBot) % 14 === 0) c = DARK[c]; }
      else if (Math.floor(wx0 / 24) !== Math.floor((wx0 - dw) / 24)) c = DARK[c];
      else if ((r - rBot) % 9 === 4 && Math.floor(wx0 / 24) !== Math.floor((wx0 - 2 * dw) / 24)) c = 5;
      L.set(px, r, c);
    }
    if (t !== 'pool') L.set(px, fl + 1, 0);
  }
  const midSolid = px => groundY(px / ZM) > 0.3;
  for (let px = 0; px < Math.ceil(MINI.cx * ZM); px++) { const wx = px / ZM; column(px, wx < MINI.lip ? M.deck : M.surf, M.side, wx < MINI.lip, false); }
  for (let px = Math.ceil(MINI.cx * ZM); px < Math.floor(BIG.cx * ZM); px++) if (midSolid(px)) column(px, M.mid, M.midSide, false, true);
  for (let px = Math.floor(BIG.cx * ZM); px < w; px++) { const wx = px / ZM; column(px, wx >= BIG.lip ? M.deck : M.surf, M.side, wx >= BIG.lip, false); }
  // juntas de las láminas (madera) en las curvas
  if (t === 'nave' || t === 'parking') for (const x of [MINI.lip + MINI.R * 0.45, MINI.lip + MINI.R * 0.75, BIG.cx + BIG.R * 0.2, BIG.cx + BIG.R * 0.5, BIG.cx + BIG.R * 0.74, BIG.cx + BIG.R * 0.9]) {
    const px = Math.round(x * ZM), y = groundY(x + 0.4);
    for (let r = Math.floor(LY(y, -LANE)) + 1; r < Math.floor(LY(y, LANE)); r++) L.shade(px, r, -1);
  }
  // coping: tubo metálico o bloques de piedra (piscina)
  function coping(x, y, side) {
    const px = Math.round(x * ZM);
    const rT = Math.floor(LY(y, -LANE)) - 1, rB = Math.floor(LY(y, LANE)) + 1;
    for (let r = rT; r <= rB; r++) {
      if (M.coping === 'stone') {
        const jn = (r - rT) % 9 === 0;
        for (let k = -3; k <= 2; k++) L.set(px + k, r, jn ? 13 : lit(k === -3 || k === 2 ? 14 : k === -2 ? 16 : 15, T.amb * 0.8, px + k, r));
        L.set(px + 3 * side + (side > 0 ? 0 : -1), r, 0);
      } else {
        L.set(px - 2, r, side < 0 ? 9 : 5); L.set(px - 1, r, 8); L.set(px, r, 7); L.set(px + 1, r, side < 0 ? 5 : 9);
        L.set(px + 2 * side + (side > 0 ? 0 : -1), r, 0);
      }
    }
    for (let i = -3; i <= 2; i++) L.set(px + i, rT - 1, 0);
  }
  coping(MINI.lip, MINI.H, 1);
  coping(BIG.lip, BIG.H, -1);
  // aristas del tramo central: metal en las convexas, línea oscura en las cóncavas (rayas de aviso en el parking)
  for (const k of PATH.kinks) {
    if (k.x <= MINI.cx || k.x >= BIG.cx) continue;
    const px = Math.round(k.x * ZM);
    for (let r = Math.floor(LY(k.y, -LANE)); r <= Math.floor(LY(k.y, LANE)); r++) {
      if (t === 'pool') { if (k.d < 0) L.shade(px, r, 1); continue; }
      if (k.d < 0) {
        if (t === 'parking') { const s = ((r >> 1) & 1) ? 21 : 0; L.set(px - 1, r, s); L.set(px, r, s); L.set(px + 1, r, s); }
        else { L.set(px - 1, r, 8); L.set(px, r, 7); L.set(px + 1, r, 4); }
      } else if (k.y < 0.5) { L.set(px, r, 4); L.set(px + 1, r, 3); }
    }
  }
  // mancha de luz de la ventana sobre la mini rampa (solo en la nave)
  if (t === 'nave' && T.patch) {
    const pcx = Math.round(58 * ZM), pcy = Math.round(LY(groundY(58), 4));
    for (let y = pcy - 24; y <= pcy + 24; y++) for (let x = pcx - 60; x <= pcx + 60; x++) {
      const dx = (x - pcx + (y - pcy) * 0.9) / 52, dy = (y - pcy) / 16;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const c = L.get(x, y); if (c === 255) continue;
      if (!(d < 0.45 || bay(x, y) < (1 - d) * 1.6)) continue;
      let nc = LIGHT[c];
      if (d < 0.4 && bay(x, y) < (0.45 - d) * 3) nc = LIGHT[nc];
      if (T.patch === 2) nc = WARM[nc] || nc;
      L.set(x, y, nc);
    }
  }
  return L.toCanvas();
}

// Barandillas (si el mapa tiene)
function renderRail() {
  const T = tod();
  const L = new Layer(LWID, TOPM + H);
  for (const rl of RAILS) {
    const p = rl.pts;
    const post = x => {
      const ry = railYi(rl, x), gy = groundY(x), px = Math.round(x * ZM);
      const r0 = Math.round(LY(ry, rl.z)) + 3, r1 = Math.round(LY(gy, rl.z));
      for (let r = r0; r <= r1; r++) { L.set(px - 2, r, 0); L.set(px - 1, r, lit(8, T.amb, px, r)); L.set(px, r, lit(6, T.amb, px, r)); L.set(px + 1, r, lit(4, T.amb, px, r)); L.set(px + 2, r, 0); }
      for (let k = -3; k <= 3; k++) { L.set(px + k, r1, Math.abs(k) === 3 ? 0 : 3); L.set(px + k, r1 + 1, 0); }
    };
    const posts = [p[0][0] + 4, (p[0][0] + p[1][0]) / 2, p[1][0] - 4];
    if (p.length > 2) posts.push(p[2][0] - 4);
    posts.forEach(post);
    for (let px = Math.round(p[0][0] * ZM); px <= Math.round(p[p.length - 1][0] * ZM); px++) {
      const r = Math.round(LY(railYi(rl, Math.min(px / ZM, p[p.length - 1][0])), rl.z));
      L.set(px, r - 1, 0); L.set(px, r, lit(10, T.amb, px, r)); L.set(px, r + 1, lit(8, T.amb, px, r + 1)); L.set(px, r + 2, lit(6, T.amb, px, r + 2)); L.set(px, r + 3, 4); L.set(px, r + 4, 0);
    }
    for (const x of [p[0][0], p[p.length - 1][0]]) {
      const px = Math.round(x * ZM) + (x === p[0][0] ? -1 : 1), r = Math.round(LY(railYi(rl, x), rl.z));
      for (let k = -1; k <= 4; k++) L.set(px, r + k, 0);
    }
  }
  return L.toCanvas();
}
