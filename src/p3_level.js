
// =====================================================================
//  El lugar: geometría de la nave, luz según la hora y capa principal pre-renderizada
// =====================================================================
const PXM = 24;          // píxeles de mundo por metro
const G = 470;           // gravedad (px/s²)
const ZM = 1.25;         // cámara más cerca: todo se dibuja un 25 % más grande
const FY = 214;          // fila de pantalla del suelo en el carril z=0
const TOPM = 150;        // margen superior de las capas (cámara que sube en aires altos)
const LANE = 36, WALLZ = -36, RAILZ = 12;      // la pared toca el borde trasero de rampas y pirámide
const WORLD_W = 1012, LWID = Math.round(WORLD_W * ZM);
const PAR_BG = 0.6, PAR_FG = 1.35;
const MINI = { lip: 30, R: 32, H: 38, cx: 62 };
const BIG = { lip: 972, R: 72, H: 86, cx: 900 };
const PYR = { x0: 340, x1: 392, x2: 532, x3: 584, h: 24 };
const RAIL_PTS = [[360, 38], [532, 38], [578, 38 - 24 * 46 / 52]];
const LAMPS = [215, 385, 555, 720, 880], LAMP_Y = 140, FLICK = 2;
const cam = { x: 0, xi: 0, up: 0, upi: 0 };
// mundo -> capa / pantalla
const LY = (y, z) => TOPM + FY - (y * COSE - z * SINE) * ZM;
const SX = x => x * ZM - cam.xi;
const SY = (y, z) => FY - (y * COSE - (z || 0) * SINE) * ZM + cam.upi;

// ---------- Hora del día ----------
const TOD = [
  { n: 'MAÑANA', amb: 0, tube: 0.07, win: 0.26, beamOn: 1, patch: 1, beam: [16, 10], sky: [8, 9, 29, 10, 10] },
  { n: 'ATARDECER', amb: -0.13, tube: 0.15, win: 0.2, beamOn: 0.85, patch: 2, beam: [20, 21], sky: [30, 31, 32, 19, 20, 21] },
  { n: 'NOCHE', amb: -0.42, tube: 0.5, win: 0.02, beamOn: 0.22, patch: 0, beam: [29, 9], sky: [0, 1, 26, 26, 27] }
];
const todIdx = () => (typeof SAVE !== 'undefined' && SAVE.tod) || 0;
const tod = () => TOD[todIdx()];
function lampLight(wx, wz) {
  let s = 0;
  for (const lx of LAMPS) { const dx = (wx - lx) / 85; s += Math.exp(-dx * dx) * (1 - Math.min(1, Math.abs(wz + 10) / 150)); }
  return Math.min(1.2, s);
}
function floorLight(wx, wz) { const T = tod(); return T.amb + T.tube * lampLight(wx, wz); }
function inBeam(x) { return x > 12 && x < 100; }
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

function groundY(x) {
  if (x <= MINI.lip) return MINI.H;
  if (x < MINI.cx) { const d = MINI.cx - x; return MINI.R - Math.sqrt(Math.max(0, MINI.R * MINI.R - d * d)); }
  if (x < PYR.x0) return 0;
  if (x < PYR.x1) return PYR.h * (x - PYR.x0) / (PYR.x1 - PYR.x0);
  if (x < PYR.x2) return PYR.h;
  if (x < PYR.x3) return PYR.h * (PYR.x3 - x) / (PYR.x3 - PYR.x2);
  if (x < BIG.cx) return 0;
  if (x < BIG.lip) { const d = x - BIG.cx; return BIG.R - Math.sqrt(Math.max(0, BIG.R * BIG.R - d * d)); }
  return BIG.H;
}
function isWood(x) { return x < MINI.cx + 0.5 || x > BIG.cx - 0.5 || (x > PYR.x0 && x < PYR.x3); }

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
const PATH = (() => {
  const p = [];
  p.push([MINI.lip, MINI.H], [MINI.lip, MINI.R]);
  for (let i = 1; i <= 48; i++) { const a = Math.PI + (i / 48) * Math.PI / 2; p.push([MINI.cx + MINI.R * Math.cos(a), MINI.R + MINI.R * Math.sin(a)]); }
  p.push([PYR.x0, 0], [PYR.x1, PYR.h], [PYR.x2, PYR.h], [PYR.x3, 0], [BIG.cx, 0]);
  for (let i = 1; i <= 96; i++) { const a = -Math.PI / 2 + (i / 96) * Math.PI / 2; p.push([BIG.cx + BIG.R * Math.cos(a), BIG.R + BIG.R * Math.sin(a)]); }
  p.push([BIG.lip, BIG.H]);
  return buildPath(p, 0.5);
})();
const RAILP = buildPath(RAIL_PTS, 0.5);
// Todo lo grindable (de momento, la barandilla de la pirámide)
const RAILS = [
  { pts: RAIL_PTS, z: RAILZ, kind: 'rail' }
];
RAILS.forEach(r => { r.path = buildPath(r.pts, 0.5); });
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
function railY(x) {
  if (x < RAIL_PTS[0][0] || x > RAIL_PTS[2][0]) return -1e9;
  const i = x < RAIL_PTS[1][0] ? 0 : 1;
  const a = RAIL_PTS[i], b = RAIL_PTS[i + 1];
  return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
}

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
const FLOOR_PATCHES = [[150, 205, -40, -8], [700, 770, 20, 60], [470, 520, 60, 95]];

function renderMain() {
  const T = tod();
  const w = LWID, h = TOPM + H;
  const L = new Layer(w, h);
  const KZ = SINE * ZM;
  // Suelo de hormigón pulido
  const r0 = Math.floor(LY(0, WALLZ));
  for (let r = r0; r < h; r++) {
    const wz = (r - TOPM - FY) / KZ, wzn = (r + 1 - TOPM - FY) / KZ;
    for (let px = 0; px < w; px++) {
      const wx = px / ZM;
      let v = 0.76 + wz * 0.0008;
      v += (fbm(wx * 0.018, wz * 0.035) - 0.5) * 0.28;
      v += (vnoise(wx * 0.11, wz * 0.2) - 0.5) * 0.08;
      const hs = hash2(px, r);
      if (hs > 0.988) v -= 0.22; else if (hs < 0.011) v += 0.16;
      const st = vnoise(wx * 0.015 + 7.3, wz * 0.028 + 1.1);
      if (st > 0.68) v -= (st - 0.68) * 1.4;
      for (const p of FLOOR_PATCHES) if (wx > p[0] && wx < p[1] && wz > p[2] && wz < p[3]) v += (wx < p[0] + 1.5 || wx > p[1] - 1.5) ? -0.12 : 0.07;
      if (Math.abs(wz) < 16 && (wx < 130 || wx > 830 || (wx > 300 && wx < 620))) { const m = vnoise(wx * 0.04, wz * 0.5); if (m > 0.62) v -= (m - 0.62) * 0.7; }
      for (const lx of LAMPS) { const dx = (wx - lx) / 6; if (dx * dx < 9 && wz < -12 && wz > -62) v += T.tube * 1.1 * Math.exp(-dx * dx) * Math.sin((wz + 62) / 50 * Math.PI); }
      v += floorLight(wx, wz);
      let c = dpick(FLOOR_R, v, px, r);
      const jA = Math.floor(px / ZM / 128), jB = Math.floor((px - 1) / ZM / 128);
      if (jA !== jB) c = hash2(px, r >> 2) > 0.85 ? 3 : 4;
      else if (Math.floor((px - 1) / ZM / 128) !== Math.floor((px - 2) / ZM / 128)) c = LIGHT[c];
      for (const jz of [-22, 56, 140]) { if (wz <= jz && wzn > jz) c = 4; else if (wz <= jz + 2.5 && wzn > jz + 2.5) c = LIGHT[c]; }
      L.set(px, r, c);
    }
  }
  // grietas finas del suelo
  const rnd = rng(77);
  for (let i = 0; i < 9; i++) {
    const wx = 70 + rnd() * 860, wz = -33 + rnd() * 128;
    if ((wx > PYR.x0 - 10 && wx < PYR.x3 + 10 && Math.abs(wz) < 40) || (Math.abs(wz) < 40 && (wx < 70 || wx > 890))) continue;
    crackWalk(L, wx * ZM, LY(0, wz), 30 + rnd() * 50, rnd() * Math.PI * 2, rnd, -2);
  }
  // sombra de contacto de los sólidos sobre el suelo
  const aoRow = Math.round(LY(0, LANE));
  const solid = wx => wx < MINI.cx || (wx >= PYR.x0 && wx < PYR.x3) || wx >= BIG.cx;
  for (let px = 0; px < w; px++) {
    if (!solid(px / ZM)) continue;
    for (let k = 1; k <= 5; k++) if (bay(px, aoRow + k) < 0.9 - k * 0.17) L.shade(px, aoRow + k, -1);
  }
  // props del fondo (antes que las rampas)
  drawFloorProps(L, T);
  // Sólidos: superficie visible (madera) + lateral oscuro
  function column(px, yfn, ramp, sideRamp, deck) {
    const wx0 = px / ZM, dw = 1 / ZM;
    let ymin = 1e9, ymax = -1e9;
    for (let k = 0; k <= 4; k++) { const y = yfn(wx0 + k * dw / 4); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
    const yc = yfn(wx0 + dw / 2);
    const dy = (yfn(wx0 + dw * 0.75) - yfn(wx0 + dw * 0.25)) / (dw * 0.5);
    const th = Math.atan(dy), nx = -Math.sin(th), ny = Math.cos(th);
    const litN = 0.36 + 0.6 * Math.max(0, nx * LW[0] + ny * LW[1]);
    const rTop = Math.floor(LY(ymax, -LANE)), rBot = Math.floor(LY(ymin, LANE));
    for (let r = rTop; r <= rBot; r++) {
      const z = clamp((r - TOPM - FY + yc * COSE * ZM) / KZ, -LANE, LANE);
      let v = litN + (fbm(wx0 * 0.05, z * 0.08) - 0.5) * 0.12 + floorLight(wx0, z) * 0.8;
      if (!deck) {
        const mk = Math.abs(z + 3 * Math.sin(wx0 * 0.05));
        if (mk < 14) v -= (0.16 - mk * 0.009) * vnoise(wx0 * 0.12, z * 0.4) * 1.4;
      } else v -= 0.12;
      let c = dpick(ramp, v, px, r);
      if (deck && Math.floor(wx0 / 7) !== Math.floor((wx0 - dw) / 7)) c = DARK[c];
      if (r === rTop) c = LIGHT[c];
      L.set(px, r, c);
    }
    const fl = Math.floor(LY(0, LANE));
    L.set(px, rBot + 1, 5);
    for (let r = rBot + 2; r <= fl; r++) {
      const t = (r - rBot) / Math.max(1, fl - rBot);
      const v = 0.62 - t * 0.5 + (vnoise(wx0 * 0.3, r * 0.05) - 0.5) * 0.2 + T.amb * 0.7;
      let c = dpick(sideRamp, v, px, r);
      if (Math.floor(wx0 / 24) !== Math.floor((wx0 - dw) / 24)) c = DARK[c];
      else if ((r - rBot) % 9 === 4 && Math.floor(wx0 / 24) !== Math.floor((wx0 - 2 * dw) / 24)) c = 5;   // tornillos
      L.set(px, r, c);
    }
    L.set(px, fl + 1, 0);
  }
  for (let px = 0; px < Math.ceil(MINI.cx * ZM); px++) { const wx = px / ZM; column(px, xx => groundY(Math.max(0, xx)), wx < MINI.lip ? PYRW_R : WOOD_R, SIDE_R, wx < MINI.lip); }
  for (let px = Math.floor(PYR.x0 * ZM); px < Math.ceil(PYR.x3 * ZM); px++) column(px, groundY, PYRW_R.map(c => c + 1), [1, 2, 3, 4], false);
  for (let px = Math.floor(BIG.cx * ZM); px < w; px++) { const wx = px / ZM; column(px, xx => groundY(Math.min(xx, WORLD_W)), wx >= BIG.lip ? PYRW_R : WOOD_R, SIDE_R, wx >= BIG.lip); }
  // juntas de las láminas de las rampas
  for (const x of [44, 54, 915, 935, 952, 965]) {
    const px = Math.round(x * ZM), y = groundY(x + 0.4);
    for (let r = Math.floor(LY(y, -LANE)) + 1; r < Math.floor(LY(y, LANE)); r++) L.shade(px, r, -1);
  }
  // coping metálico: tubo a lo largo de z (franja vertical en pantalla)
  function coping(x, y, side) {
    const px = Math.round(x * ZM);
    const rT = Math.floor(LY(y, -LANE)) - 1, rB = Math.floor(LY(y, LANE)) + 1;
    for (let r = rT; r <= rB; r++) {
      L.set(px - 2, r, side < 0 ? 9 : 5); L.set(px - 1, r, 8); L.set(px, r, 7); L.set(px + 1, r, side < 0 ? 5 : 9);
      L.set(px + 2 * side + (side > 0 ? 0 : -1), r, 0);
    }
    for (let i = -2; i <= 1; i++) L.set(px + i, rT - 1, 0);
  }
  coping(MINI.lip, MINI.H, 1);
  coping(BIG.lip, BIG.H, -1);
  // aristas de la pirámide
  for (const x of [PYR.x1, PYR.x2]) {
    const px = Math.round(x * ZM);
    for (let r = Math.floor(LY(PYR.h, -LANE)); r <= Math.floor(LY(PYR.h, LANE)); r++) { L.set(px - 1, r, 8); L.set(px, r, 7); L.set(px + 1, r, 4); }
  }
  for (const x of [PYR.x0, PYR.x3 - 1]) {
    const px = Math.round(x * ZM);
    for (let r = Math.floor(LY(0, -LANE)); r <= Math.floor(LY(0, LANE)); r++) { L.set(px, r, 4); L.set(px + 1, r, 3); }
  }
  // mancha de luz de la ventana sobre la mini rampa (día: más clara; atardecer: cálida)
  if (T.patch) {
    const pcx = Math.round(58 * ZM), pcy = Math.round(LY(groundY(58), 4));
    for (let y = pcy - 24; y <= pcy + 24; y++) for (let x = pcx - 60; x <= pcx + 60; x++) {
      const dx = (x - pcx + (y - pcy) * 0.9) / 52, dy = (y - pcy) / 16;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const c = L.get(x, y); if (c === 255) continue;
      const inside = d < 0.45 || bay(x, y) < (1 - d) * 1.6;
      if (!inside) continue;
      let nc = LIGHT[c];
      if (d < 0.4 && bay(x, y) < (0.45 - d) * 3) nc = LIGHT[nc];
      if (T.patch === 2) nc = WARM[nc] || nc;
      L.set(x, y, nc);
    }
  }
  return L.toCanvas();
}

// Props sobre el suelo, junto a la pared (sin graffitis): banco, mochilas, botella, tabla apoyada, radio, cono
const PROP_MAPS = {
  bench: { k: 0, W: 14, w: 13, M: 4, m: 3 },
  pack: { k: 0, R: 18, r: 17, D: 26, d: 1, y: 21 },
  pack2: { k: 0, R: 27, r: 26, D: 21, d: 20, y: 9 },
  bottle: { k: 0, B: 28, b: 27, w: 10, c: 9 },
  board: { k: 0, A: 19, B: 20, C: 21, g: 1, t: 7, w: 9 },
  radio: { k: 0, G: 4, g: 3, s: 1, S: 6, h: 2, l: 19 },
  cone: { k: 0, O: 19, o: 18, w: 10 }
};
const PROP_SPR = {
  pack: ['..kkkkk..', '.kRRRRRk.', 'kRRRRRRRk', 'kRryyyrRk', 'kRRRRRRRk', 'kRDDDDDRk', 'kRDdddDRk', 'kRDDDDDRk', 'kRRRRRRRk', '.kkkkkkk.'],
  bottle: ['.kk.', 'kwwk', 'kBbk', 'kBbk', 'kBbk', 'kBbk', 'kBbk', 'kkkk'],
  board: ['.kkk.', 'kAAAk', 'kBBBk', 'kCCCk', 'kAAAk', 'kBBBk', 'kCCCk', 'kAAAk', 'kBBBk', 'kCCCk', 'kAAAk', 'kBBBk', 'kCCCk', 'kAAAk', 'kBBBk', 'kCCCk', 'kAAAk', 'kBBBk', 'kCCCk', 'kAAAk', 'kBBBk', 'kCCCk', 'kAAAk', '.kkk.'],
  radio: ['...khhhhhhhhhhk...', '...k..........k...', 'kkkkkkkkkkkkkkkkkk', 'kGGGGGGGGGGGGGGGGk', 'kGsssGGlGGGGGsssGk', 'ksSSSsGGgGgGsSSSsk', 'ksSsSsGGGGGGsSsSsk', 'ksSSSsGgggggsSSSsk', 'kGsssGGGGGGGGsssGk', 'kggggggggggggggggk', 'kkkkkkkkkkkkkkkkkk'],
  cone: ['...k...', '..kOk..', '..kOk..', '.kwwwk.', '.kOOOk.', '.kOOOk.', 'kwwwwwk', 'kOOOOOk', 'kooooook'.slice(0, 7), 'kkkkkkk']
};
const RADIO = { x: 150, z: -31 };
function drawFloorProps(L, T) {
  const at = (x, z) => [Math.round(x * ZM), Math.round(LY(0, z))];
  const sh = (x, z) => floorLight(x, z) * 0.8;
  // sombra suave bajo cada prop
  const shadow = (px, py, wd) => { for (let i = -1; i <= wd; i++) if (bay(px + i, py) < 0.7) L.shade(px + i, py, -1); };
  // banco de madera
  { const [bx, by] = at(600, -32), len = Math.round(70 * ZM), sh0 = sh(630, -32);
    const top = by - Math.round(15 * COSE * ZM);
    for (const lx of [bx + 3, bx + len - 5]) { L.rect(lx, top + 3, 2, by - top - 3, lit(3, sh0, lx, by)); L.set(lx + 2, by - 1, 0); }
    for (let j = 0; j < 4; j++) for (let i = 0; i < len; i++) L.set(bx + i, top + j, lit(j === 0 ? 15 : (i % 9 === 0 ? 12 : j === 3 ? 13 : 14), sh0, bx + i, top + j));
    L.rect(bx, top - 1, len, 1, 0); L.rect(bx, top + 4, len, 1, 0);
    shadow(bx, by, len); }
  // mochilas, botella y gorra
  { const [x, y] = at(680, -30); L.sprite(PROP_SPR.pack, x, y - 10, PROP_MAPS.pack, sh(680, -30)); shadow(x, y, 9); }
  { const [x, y] = at(588, -30); L.sprite(PROP_SPR.pack, x, y - 10, PROP_MAPS.pack2, sh(588, -30)); shadow(x, y, 9); }
  { const [x, y] = at(692, -29); L.sprite(PROP_SPR.bottle, x, y - 8, PROP_MAPS.bottle, sh(692, -29)); }
  // tabla apoyada en la pared
  { const [x, y] = at(792, -35); L.sprite(PROP_SPR.board, x, y - 24, PROP_MAPS.board, sh(792, -35)); L.rect(x - 1, y - 20, 1, 3, 9); L.rect(x + 5, y - 20, 1, 3, 9); L.rect(x - 1, y - 6, 1, 3, 9); L.rect(x + 5, y - 6, 1, 3, 9); }
  // radio en el suelo de la entrada
  { const [x, y] = at(RADIO.x, RADIO.z); L.sprite(PROP_SPR.radio, x, y - 11, PROP_MAPS.radio, sh(RADIO.x, RADIO.z)); shadow(x, y, 18); }
  // cono
  { const [x, y] = at(872, -31); L.sprite(PROP_SPR.cone, x, y - 10, PROP_MAPS.cone, sh(872, -31)); shadow(x, y, 7); }
}

function renderRail() {
  const T = tod();
  const L = new Layer(LWID, TOPM + H);
  const post = x => {
    const ry = railY(x), gy = groundY(x), px = Math.round(x * ZM);
    const r0 = Math.round(LY(ry, RAILZ)) + 3, r1 = Math.round(LY(gy, RAILZ));
    for (let r = r0; r <= r1; r++) { L.set(px - 2, r, 0); L.set(px - 1, r, lit(8, T.amb, px, r)); L.set(px, r, lit(6, T.amb, px, r)); L.set(px + 1, r, lit(4, T.amb, px, r)); L.set(px + 2, r, 0); }
    for (let k = -3; k <= 3; k++) { L.set(px + k, r1, Math.abs(k) === 3 ? 0 : 3); L.set(px + k, r1 + 1, 0); }
  };
  for (const x of [364, 446, 528, 574]) post(x);
  for (let px = Math.round(RAIL_PTS[0][0] * ZM); px <= Math.round(RAIL_PTS[2][0] * ZM); px++) {
    const r = Math.round(LY(railY(px / ZM), RAILZ));
    L.set(px, r - 1, 0); L.set(px, r, lit(10, T.amb, px, r)); L.set(px, r + 1, lit(8, T.amb, px, r + 1)); L.set(px, r + 2, lit(6, T.amb, px, r + 2)); L.set(px, r + 3, 4); L.set(px, r + 4, 0);
  }
  for (const x of [RAIL_PTS[0][0], RAIL_PTS[2][0]]) {
    const px = Math.round(x * ZM) + (x === RAIL_PTS[0][0] ? -1 : 1), r = Math.round(LY(railY(x), RAILZ));
    for (let k = -1; k <= 4; k++) L.set(px, r + k, 0);
  }
  return L.toCanvas();
}
