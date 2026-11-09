
// =====================================================================
//  Render 3D de vóxeles a la resolución del lienzo (z-buffer, luz fija, tramado)
// =====================================================================
const COSE = 0.9165, SINE = 0.4;            // cámara algo elevada (≈23,6°)
const VIEW = [1, 0, 0, 0, COSE, -SINE, 0, SINE, COSE];
function mm(A, B) {
  return [
    A[0] * B[0] + A[1] * B[3] + A[2] * B[6], A[0] * B[1] + A[1] * B[4] + A[2] * B[7], A[0] * B[2] + A[1] * B[5] + A[2] * B[8],
    A[3] * B[0] + A[4] * B[3] + A[5] * B[6], A[3] * B[1] + A[4] * B[4] + A[5] * B[7], A[3] * B[2] + A[4] * B[5] + A[5] * B[8],
    A[6] * B[0] + A[7] * B[3] + A[8] * B[6], A[6] * B[1] + A[7] * B[4] + A[8] * B[7], A[6] * B[2] + A[7] * B[5] + A[8] * B[8]];
}
const mv = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
const I3 = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];
function rX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; }
function rY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
function rZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
const MIRZ = [1, 0, 0, 0, 1, 0, 0, 0, -1];
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vsc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vlen = a => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
const vnorm = a => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vlerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const LW = vnorm([-0.5, 0.8, 0.55]);
const LV = mv(VIEW, LW);

function makeSpr(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'); const img = x.createImageData(size, size);
  const rc = document.createElement('canvas'); rc.width = rc.height = size;
  const rx = rc.getContext('2d'); const rimg = rx.createImageData(size, size);
  return { c, x, img, u32: new Uint32Array(img.data.buffer), rc, rx, rimg, r32: new Uint32Array(rimg.data.buffer),
    z: new Float32Array(size * size), ci: new Uint8Array(size * size), pt: new Uint8Array(size * size), size };
}
function sprClear(S) { S.z.fill(-1e9); S.ci.fill(255); S.pt.fill(0); }
// Rasteriza cajas (muestreo denso de sus caras) con z-buffer. A: rig->vista (3x3), (ox,oy): origen en el búfer
function sprRaster(S, boxes, A, ox, oy, scale, bright) {
  const sz = S.size, Z = S.z, CI = S.ci, PT = S.pt;
  const step = 0.5 / scale;
  for (let bi = 0; bi < boxes.length; bi++) {
    const b = boxes[bi];
    const L = mm(A, b.R), c = mv(A, b.t);
    if (b.cyl) { rasterCyl(S, b, L, c, ox, oy, scale, bright); continue; }
    for (let f = 0; f < 6; f++) {
      const k = f >> 1, sg = (f & 1) ? -1 : 1;
      const nx = L[k] * sg, nu = L[3 + k] * sg, nd = L[6 + k] * sg;
      if (nd <= 0.02) continue;
      let I = (0.36 + 0.7 * Math.max(0, nx * LV[0] + nu * LV[1] + nd * LV[2])) * bright;
      I = I < 0 ? 0 : I > 1 ? 1 : I;
      const ia = k === 0 ? 2 : 0, ja = k === 1 ? 2 : 1;
      const hk = b.h[k], hi = b.h[ia], hj = b.h[ja];
      const bx = c[0] + L[k] * sg * hk, bu = c[1] + L[3 + k] * sg * hk, bd = c[2] + L[6 + k] * sg * hk;
      const ix = L[ia], iu = L[3 + ia], idp = L[6 + ia];
      const jx = L[ja], ju = L[3 + ja], jd = L[6 + ja];
      const mat = b.m[f];
      const isFn = typeof mat === 'function';
      let ramp = isFn ? null : mat, rn = isFn ? 0 : ramp.length - 1;
      const ni = Math.max(1, Math.ceil(2 * hi / step)), nj = Math.max(1, Math.ceil(2 * hj / step));
      const du = 2 * hi / ni, dv = 2 * hj / nj;
      for (let a = 0; a < ni; a++) {
        const u = -hi + (a + 0.5) * du;
        const rx = bx + ix * u, ru = bu + iu * u, rd = bd + idp * u;
        for (let q = 0; q < nj; q++) {
          const v = -hj + (q + 0.5) * dv;
          const px = Math.floor(ox + (rx + jx * v) * scale), py = Math.floor(oy - (ru + ju * v) * scale);
          if (px < 0 || py < 0 || px >= sz || py >= sz) continue;
          const id = py * sz + px, D = rd + jd * v;
          if (D <= Z[id]) continue;
          Z[id] = D;
          if (isFn) { ramp = mat((u + hi) / (2 * hi), (v + hj) / (2 * hj)); rn = ramp.length - 1; }
          let ri = Math.floor(I * rn + 0.5 + (BAYER[((py & 3) << 2) | (px & 3)] - 0.5) * 0.8);
          CI[id] = ramp[ri < 0 ? 0 : ri > rn ? rn : ri];
          PT[id] = b.part;
        }
      }
    }
  }
}
// Contorno exterior de 1 px + líneas interiores entre piezas a distinta profundidad.
// Con fRow >= 0 prepara además el reflejo tramado (colores oscurecidos, más denso cerca de los pies).
function sprFinish(S, ocol, fRow) {
  const sz = S.size, ci = S.ci, z = S.z, pt = S.pt, u = S.u32;
  const refl = fRow !== undefined && fRow >= 0, r = S.r32;
  u.fill(0);
  if (refl) r.fill(0);
  const oc = PAL32[ocol];
  for (let y = 0; y < sz; y++) {
    const dens = refl ? 0.55 * clamp(1 - (fRow - y) / 44, 0, 1) : 0;
    for (let x = 0; x < sz; x++) {
      const i = y * sz + x, c = ci[i];
      if (c !== 255) {
        let col = c;
        const zi = z[i] + 2.4, p = pt[i];
        if ((x > 0 && ci[i - 1] !== 255 && pt[i - 1] !== p && z[i - 1] > zi) ||
            (x < sz - 1 && ci[i + 1] !== 255 && pt[i + 1] !== p && z[i + 1] > zi) ||
            (y > 0 && ci[i - sz] !== 255 && pt[i - sz] !== p && z[i - sz] > zi) ||
            (y < sz - 1 && ci[i + sz] !== 255 && pt[i + sz] !== p && z[i + sz] > zi)) col = DARK[DARK[c]];
        u[i] = PAL32[col];
        if (dens > 0 && bay(x, y) < dens) r[i] = PAL32[DARK[col]];
      } else if ((x > 0 && ci[i - 1] !== 255) || (x < sz - 1 && ci[i + 1] !== 255) || (y > 0 && ci[i - sz] !== 255) || (y < sz - 1 && ci[i + sz] !== 255)) u[i] = oc;
    }
  }
  S.x.putImageData(S.img, 0, 0);
  if (refl) S.rx.putImageData(S.rimg, 0, 0);
}

// ---------- Materiales (rampas oscuro->claro) ----------
const RP = {
  black: [0, 1, 2, 3], grey: [2, 3, 4, 5, 6], white: [5, 7, 8, 9, 10], wood: [12, 13, 14, 15, 16], brown: [11, 12, 13, 14],
  red: [17, 18, 19, 20], orange: [18, 19, 20, 21], yellow: [13, 20, 21, 10], green: [22, 23, 24, 25], olive: [11, 22, 23, 24],
  blue: [26, 27, 28, 29], sky: [27, 28, 29, 10], purple: [30, 31, 32], pink: [30, 31, 32, 9], metal: [3, 5, 7, 9],
  skin1: [13, 14, 15, 16], skin2: [12, 13, 14, 15], skin3: [11, 12, 13, 14], skin4: [0, 11, 12, 13], hair: [0, 11, 12],
  gold: [13, 20, 21, 10], neon: [23, 24, 25, 10], navy: [1, 26, 27, 28]
};
const COLORS = [
  { n: 'BLANCO', r: RP.white }, { n: 'GRIS', r: RP.grey }, { n: 'NEGRO', r: RP.black }, { n: 'ROJO', r: RP.red },
  { n: 'NARANJA', r: RP.orange }, { n: 'AMARILLO', r: RP.yellow }, { n: 'VERDE', r: RP.green }, { n: 'OLIVA', r: RP.olive },
  { n: 'AZUL', r: RP.blue }, { n: 'MARINO', r: RP.navy }, { n: 'CELESTE', r: RP.sky }, { n: 'MORADO', r: RP.purple },
  { n: 'ROSA', r: RP.pink }, { n: 'MARRÓN', r: RP.brown }
];
const SKINS = [{ n: 'CLARA', r: RP.skin1 }, { n: 'MEDIA', r: RP.skin2 }, { n: 'MORENA', r: RP.skin3 }, { n: 'OSCURA', r: RP.skin4 }];
const HEADWEAR = ['CASCO', 'GORRA', 'GORRO', 'NADA'];
const darkR = r => r.map(c => DARK[c]);

// Gráficos de tabla (cara inferior): g(u,v) u a lo largo, v a lo ancho -> rampa.  unl: [reto, medalla] que la desbloquea
const BOARDS = [
  { n: 'CLÁSICA', price: 0, g: (u, v) => (v > 0.36 && v < 0.64) ? RP.white : (u < 0.08 || u > 0.92) ? RP.black : RP.red },
  { n: 'DAMERO', price: 0, g: (u, v) => ((Math.floor(u * 12) + Math.floor(v * 3)) & 1) ? RP.white : RP.black },
  { n: 'LLAMAS', price: 150, g: (u, v) => { const f = u * 1.25 - 0.18 * Math.abs(Math.sin(v * 9.4)) - 0.25; return f < 0 ? RP.black : f < 0.18 ? RP.red : f < 0.4 ? RP.orange : RP.yellow; } },
  { n: 'CEBRA', price: 180, g: (u, v) => (Math.floor(u * 16 + Math.sin(v * 6) * 1.5) & 1) ? RP.white : RP.black },
  { n: 'ATARDECER', price: 200, g: (u) => u < 0.25 ? RP.purple : u < 0.5 ? RP.pink : u < 0.75 ? RP.orange : RP.yellow },
  { n: 'ESTRELLAS', price: 220, g: (u, v) => hash2(Math.floor(u * 30), Math.floor(v * 8)) > 0.88 ? RP.yellow : RP.navy },
  { n: 'SELVA', price: 250, g: (u, v) => { const n = vnoise(u * 9, v * 3); return n < 0.35 ? RP.brown : n < 0.6 ? RP.olive : RP.green; } },
  { n: 'CORAZONES', price: 260, g: (u, v) => { const x = (u * 8) % 1 - 0.5, y = v - 0.5; return (x * x + Math.pow(y * 1.6 - Math.sqrt(Math.abs(x)) * 0.8, 2) < 0.12) ? RP.red : RP.pink; } },
  { n: 'OLA', price: 300, g: (u, v) => { const w = 0.5 + 0.28 * Math.sin(u * 18); return Math.abs(v - w) < 0.13 ? RP.white : v > w ? RP.navy : RP.sky; } },
  { n: 'RAYO', unl: [5, 1], g: (u, v) => { const z = Math.abs(((u * 6) % 2) - 1); return Math.abs(v - z) < 0.2 ? RP.yellow : RP.navy; } },
  { n: 'LA NAVE', unl: [10, 1], g: (u, v) => (((Math.floor((u * 24 + v * 6))) & 3) < 2) ? RP.yellow : RP.black },
  { n: 'NEÓN', unl: [7, 3], g: (u, v) => Math.abs(((u * 10 + v * 2) % 2) - 1) < 0.25 ? RP.neon : RP.purple },
  { n: 'ORO', unl: [19, 1], g: (u, v) => hash2(Math.floor(u * 40), Math.floor(v * 10)) > 0.9 ? [10, 10, 10] : RP.gold }
];
const WHEELS = [
  { n: 'BLANCAS', r: RP.white, price: 0 }, { n: 'AMARILLAS', r: RP.yellow, price: 0 }, { n: 'ROJAS', r: RP.red, price: 60 },
  { n: 'ROSAS', r: RP.pink, price: 80 }, { n: 'AZULES', r: RP.blue, price: 100 }, { n: 'NEGRAS', r: RP.black, price: 120 },
  { n: 'MORADAS', r: RP.purple, price: 140 }, { n: 'NEÓN', r: RP.neon, unl: [9, 1] }, { n: 'DORADAS', r: RP.gold, unl: [17, 3] }
];
const PRINTS = ['LISA', 'RAYAS', 'NÚMERO', 'LOGO'];
const LEGS = ['LARGO', 'CORTO'];
const PROTS = ['NADA', 'RODILLERAS', 'RODILLERAS Y CODERAS'];
const ACCS = ['NADA', 'GAFAS', 'MOCHILA'];

// ---------- Construcción de piezas ----------
const six = m => [m, m, m, m, m, m];
function box(t, h, R, m, part) { return { t, h, R: R || I3(), m: Array.isArray(m) && m.length === 6 && (Array.isArray(m[0]) || typeof m[0] === 'function') ? m : six(m), part }; }
function limb(A, B, hw, hd, mat, part, hint) {
  const d = vsub(B, A); const len = vlen(d) || 0.001;
  const Y = vsc(d, 1 / len);
  let X = vcross(Y, hint || [0, 0, 1]);
  if (vlen(X) < 0.05) X = vcross(Y, [1, 0, 0]);
  X = vnorm(X);
  const Z = vcross(X, Y);
  return { R: [X[0], Y[0], Z[0], X[1], Y[1], Z[1], X[2], Y[2], Z[2]], t: vsc(vadd(A, B), 0.5), h: [hw, len / 2, hd], m: Array.isArray(mat) && mat.length === 6 && typeof mat[0] !== 'number' ? mat : six(mat), part };
}
function ik2(A, C, l1, l2, hint) {
  let d = vsub(C, A); let dist = vlen(d);
  const maxd = l1 + l2 - 0.05;
  if (dist > maxd) { d = vsc(d, maxd / dist); C = vadd(A, d); dist = maxd; }
  if (dist < 0.1) dist = 0.1;
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const dn = vsc(d, 1 / dist);
  let p = vsub(hint, vsc(dn, vdot(hint, dn)));
  if (vlen(p) < 0.01) p = [0, 0, 1];
  p = vnorm(p);
  return { B: [A[0] + dn[0] * a + p[0] * hh, A[1] + dn[1] * a + p[1] * hh, A[2] + dn[2] * a + p[2] * hh], C };
}
function defaultPose() {
  return { crouch: 0.15, tuck: 0, leanF: 0.12, leanX: 0, twist: 0, headYaw: 0.95, headPitch: 0, arm: 0, grab: 0, hipX: 0, hipZ: 0, hipDy: 0,
    ff: [0, 0, 0], bf: [0, 0, 0], ffRot: 0, bfRot: 0, fall: 0, armUp: 0, swing: 0, hands: null };
}
// píxel de un glifo de la fuente dentro de un rectángulo (u0..u1, v0..v1) de una cara
function glyphAt(ch, u, v, u0, u1, v0, v1) {
  if (u < u0 || u > u1 || v < v0 || v > v1) return false;
  const gx = Math.min(2, Math.floor((u - u0) / (u1 - u0) * 3)), gy = 4 - Math.min(4, Math.floor((v - v0) / (v1 - v0) * 5));
  return FONT[ch].some(p => p[0] === gx && p[1] === gy);
}
// Cuerpo en espacio "cuerpo": lado guía en +X, pecho hacia +Z, origen en la superficie de la tabla
function buildBody(p, cu, out) {
  const sh = COLORS[cu.shirt].r, pa = COLORS[cu.pants].r, sho = COLORS[cu.shoes].r, sk = SKINS[cu.skin].r, hc = COLORS[cu.hat].r;
  const sole = RP.white, pad = [0, 1, 2, 4];
  const shoeMat = (u, v) => v < 0.4 ? sole : sho;
  const hipY = 20.5 - 7.5 * p.crouch + p.hipDy;
  const pel = [p.hipX, hipY, p.hipZ];
  const footY = 6.5 * p.tuck;
  const spread = 5.5 * (1 - p.fall * 0.55);
  const fF = vadd([spread, footY, 0.3], p.ff), fB = vadd([-spread, footY, 0.3], p.bf);
  const hint = [0.0, 0.15, 1];
  const shorts = cu.legs === 1;
  const thighM = shorts ? (u, v) => v > 0.72 ? sk : pa : pa;
  const shinM = shorts ? (u, v) => v > 0.74 ? RP.white : sk : pa;
  const legs = [[fF, 2, p.ffRot, 3, 5, 7], [fB, -2, p.bfRot, 4, 6, 8]];
  for (const [F, hx, rot, pTh, pSh, pFo] of legs) {
    const hip = [pel[0] + hx, hipY, pel[2]];
    const ank = vadd(F, [0, 2.1, 0.1]);
    const r = ik2(hip, ank, 10.5, 10.2, hint);
    out.push(limb(hip, r.B, 1.8, 1.8, [thighM, thighM, pa, pa, thighM, thighM], pTh));
    out.push(limb(r.B, r.C, 1.55, 1.55, [shinM, shinM, sk, sk, shinM, shinM], pSh));
    if (cu.prot >= 1) out.push(box(vadd(r.B, [0, -0.4, 1.0]), [1.95, 1.8, 1.25], null, pad, 23));
    const sr = rY(rot);
    const sc = vadd(vsub(r.C, [0, 2.1, 0.1]), mv(sr, [0, 1, 0.9]));
    out.push({ t: sc, h: [1.45, 1.0, 2.35], R: sr, m: [shoeMat, shoeMat, sho, sole, shoeMat, shoeMat], part: pFo });
  }
  out.push(box(vadd(pel, [0, 0.8, 0]), [3.5, 1.9, 2.1], null, pa, 2));
  const T = mm(rY(p.twist), mm(rZ(-p.leanX), rX(p.leanF)));
  const base = vadd(pel, [0, 2.4, 0]);
  const pr = cu.print | 0;
  const hem = (u, v) => v < 0.12 ? darkR(sh) : null;
  const sideM = (u, v) => hem(u, v) || (pr === 1 && Math.floor(v * 7) % 2 ? RP.white : sh);
  const frontM = (u, v) => hem(u, v) || (pr === 1 && Math.floor(v * 7) % 2 ? RP.white : (pr === 3 && glyphAt('N', u, v, 0.34, 0.66, 0.5, 0.85)) || (pr === 2 && glyphAt('7', u, v, 0.62, 0.8, 0.62, 0.85)) ? RP.white : sh);
  const backM = (u, v) => hem(u, v) || (pr === 1 && Math.floor(v * 7) % 2 ? RP.white : pr === 2 && glyphAt('7', u, v, 0.3, 0.7, 0.35, 0.85) ? RP.white : sh);
  out.push({ t: vadd(base, mv(T, [0, 6, 0])), h: [3.9, 6.2, 2.2], R: T, m: [sideM, sideM, sh, sh, frontM, backM], part: 1 });
  out.push(box(vadd(base, mv(T, [0, 12.6, 0])), [1.2, 0.9, 1.2], T, sk, 1));
  if (cu.acc === 2) out.push(box(vadd(base, mv(T, [0, 6.6, -3.5])), [3.0, 3.9, 1.3], T, darkR(hc), 24));
  // Cabeza
  const HR = mm(T, mm(rY(p.headYaw), rX(p.headPitch || 0)));
  const hcen = vadd(base, mv(T, [0, 16.3, 0.2]));
  const faceMat = (u, v) => ((v > 0.3 && v < 0.48) && ((u > 0.16 && u < 0.34) || (u > 0.62 && u < 0.8))) ? RP.black : sk;
  const backMat = (u, v) => v > 0.45 ? RP.hair : sk;
  out.push({ t: hcen, h: [3, 3.1, 3], R: HR, m: [sk, sk, sk, sk, faceMat, backMat], part: 13 });
  const hb = (off, h, m) => out.push({ t: vadd(hcen, mv(HR, off)), h, R: HR, m: (Array.isArray(m) && m.length === 6 && typeof m[0] !== 'number') ? m : six(m), part: 14 });
  if (cu.head === 0) {            // casco
    const top = (u, v) => (u > 0.42 && u < 0.58) ? darkR(hc) : hc;
    hb([0, 2.25, -0.2], [3.65, 2.05, 3.65], [hc, hc, top, hc, hc, hc]);
    hb([0, -0.2, -2.0], [3.65, 2.4, 1.85], hc);
  } else if (cu.head === 1) {     // gorra
    hb([0, 2.0, -0.1], [3.4, 1.8, 3.4], hc);
    hb([0, 0.55, 4.2], [2.8, 0.35, 1.6], darkR(hc));
    hb([0, -0.2, -2.2], [3.1, 2.0, 0.9], RP.hair);
  } else if (cu.head === 2) {     // gorro
    const band = (u, v) => v < 0.32 ? darkR(hc) : hc;
    hb([0, 2.3, -0.2], [3.55, 2.5, 3.55], [band, band, hc, hc, band, band]);
    hb([0, 5.4, -0.2], [1.2, 0.9, 1.2], RP.white);
  } else {                        // nada: pelo
    hb([0, 2.5, -0.4], [3.3, 1.2, 3.3], RP.hair);
    hb([0, 0.3, -2.4], [3.2, 2.2, 0.9], RP.hair);
  }
  if (cu.acc === 1) {             // gafas de sol
    const g = [0, 1, 26, 29];
    hb([0, -0.35, 3.1], [2.9, 0.6, 0.35], [g, g, g, g, (u) => u > 0.42 && u < 0.58 ? [0, 0, 1] : g, g]);
  }
  // Brazos
  p.hands = {};
  const shc = vadd(base, mv(T, [0, 11, 0]));
  const ride = [[0.45, -0.88, 0.18], [0.5, -0.78, 0.38]], spr = [[0.93, -0.33, 0.12], [0.97, 0.05, 0.22]], upp = [[0.55, 0.6, 0.3], [0.3, 0.9, 0.2]];
  for (let s = 1; s >= -1; s -= 2) {
    const shoulder = vadd(shc, mv(T, [4.6 * s, 0, 0]));
    const blend = j => {
      let a = vlerp(ride[j], spr[j], p.arm); a = vlerp(a, upp[j], p.armUp);
      return vnorm(mv(T, [a[0] * s, a[1], a[2] - (p.swing || 0) * (j ? 1.1 : 0.7) * s]));
    };
    let el = vadd(shoulder, vsc(blend(0), 6.3));
    let wr = vadd(el, vsc(blend(1), 5.6));
    if (s === 1 && p.grab > 0.01 && p.grabTarget) {
      const tgt = vlerp(wr, p.grabTarget, p.grab);
      const r = ik2(shoulder, tgt, 6.3, 5.6, mv(T, [0.3, 0, -1]));
      el = r.B; wr = r.C;
    }
    p.hands[s] = wr;
    const pu = s === 1 ? 9 : 11;
    out.push(limb(shoulder, el, 1.25, 1.25, sh, pu));
    out.push(limb(el, wr, 1.05, 1.05, sk, pu + 1));
    if (cu.prot === 2) out.push(box(el, [1.5, 1.5, 1.5], null, pad, 23));
    const hd = vnorm(vsub(wr, el));
    out.push(box(vadd(wr, vsc(hd, 1.0)), [1.15, 1.15, 1.15], null, sk, pu + 1));
  }
  return out;
}
// Tabla en su espacio local: nariz en +X, origen en la superficie (lija). Ruedas cilíndricas que giran.
function buildBoard(cu, out, Rb, ob, spin) {
  const gfx = BOARDS[cu.board].g, wh = WHEELS[cu.wheels].r;
  const grip = (u, v) => hash2(Math.floor(u * 40), Math.floor(v * 13)) > 0.86 ? [1, 2, 3, 4] : RP.black;
  const ply = RP.wood;
  const parts = [];
  const deckM = (u0, u1) => [ply, ply, grip, (u, v) => gfx(u0 + u * (u1 - u0), v), ply, ply];
  const k = 0.42, ck = Math.cos(k), skk = Math.sin(k);
  parts.push({ t: [0, -0.5, 0], h: [8, 0.5, 3.5], R: I3(), m: deckM(0.18, 0.82), part: 20 });
  parts.push({ t: [8 + 2.2 * ck, -0.5 + 2.2 * skk, 0], h: [2.3, 0.5, 3.15], R: rZ(k), m: deckM(0.82, 1), part: 20 });
  parts.push({ t: [-8 - 2.2 * ck, -0.5 + 2.2 * skk, 0], h: [2.3, 0.5, 3.15], R: rZ(-k), m: deckM(0, 0.18).map((m, i) => i === 3 ? ((u, v) => gfx(0.18 * u, v)) : m), part: 20 });
  const capM = (rr, t) => rr < 0.42 ? RP.metal : (t < 0.12 ? darkR(wh) : wh);
  for (const sx of [-6, 6]) {
    parts.push({ t: [sx, -1.6, 0], h: [1.3, 0.6, 1.4], R: I3(), m: six(RP.metal), part: 21 });
    parts.push({ t: [sx, -2.7, 0], h: [0.8, 0.6, 3.0], R: I3(), m: six(RP.metal), part: 21 });
    for (const sz of [-3.05, 3.05]) parts.push({ cyl: true, t: [sx, -4.35, sz], h: [1.65, 1.65, 0.95], R: I3(), m: [wh, capM], part: 22, spin: spin || 0 });
  }
  const piv = [0, -1.6, 0];
  for (const b of parts) {
    out.push({ cyl: b.cyl, spin: b.spin, t: vadd(vadd(ob, piv), mv(Rb, vsub(b.t, piv))), h: b.h, R: mm(Rb, b.R), m: b.m, part: b.part });
  }
  return out;
}
// Aplica una transformación (matriz + desplazamiento) a un conjunto de cajas
function xformBoxes(list, M, off) {
  for (const b of list) { b.t = vadd(mv(M, b.t), off); b.R = mm(M, b.R); }
  return list;
}

const SPR_MAIN = makeSpr(128), SPR_BOARD = makeSpr(96), SPR_PREV = makeSpr(176);
// Dibuja cajas (espacio rig) con rotación de mundo Rw y origen O (coordenadas de mundo) en pantalla
let REFLECT = null;   // fila de pantalla del suelo pulido para reflejar el siguiente dibujo
function drawRigWorld(S, boxes, Rw, O, bright) {
  const A = mm(VIEW, Rw);
  const sx = SX(O[0]), sy = SY(O[1], O[2]);
  const ax = Math.round(sx), ay = Math.round(sy), half = S.size >> 1;
  sprClear(S);
  sprRaster(S, boxes, A, half + (sx - ax), half + (sy - ay), ZM, bright);
  const f = REFLECT; REFLECT = null;
  sprFinish(S, 0, f !== null ? f - (ay - half) : -1);
  if (f !== null) { ctx.save(); ctx.translate(0, 2 * f); ctx.scale(1, -1); ctx.drawImage(S.rc, ax - half, ay - half); ctx.restore(); }
  ctx.drawImage(S.c, ax - half, ay - half);
}
function drawRigAt(S, boxes, Rw, sx, sy, scale, bright) {
  const A = mm(VIEW, Rw);
  const ax = Math.round(sx), ay = Math.round(sy), half = S.size >> 1;
  sprClear(S);
  sprRaster(S, boxes, A, half + (sx - ax), half + (sy - ay), scale, bright);
  sprFinish(S, 0);
  ctx.drawImage(S.c, ax - half, ay - half);
}
