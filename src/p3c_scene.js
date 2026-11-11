
// =====================================================================
//  Pared de hormigón, techo, ventana, puerta, carteles; luces, palomas y detalles animados
// =====================================================================
const WIN = { x0: 128, x1: 180, y0: 104, y1: 146 };   // ventana (x en capa de fondo, y = altura en el muro)
const DOOR = { x: 900, w: 30, h: 50 };
const FAN = { x: 770, y: 122, r: 13 };
const CONDUIT_Y = 134, LOGO_CX = 380, LOGO_Y = 76;
const KW = () => COSE * ZM;

// part = 'wall': muro de hormigón pegado a las rampas (se mueve con ellas); part = 'ceil': techo (más lento, parallax)
function renderBG(w, part) {
  const t = theme();
  if (t === 'park') return renderBG_park(w, part);
  if (t === 'pool') return renderBG_pool(w, part);
  if (t === 'parking') return renderBG_parking(w, part);
  return renderBG_nave(w, part);
}
function renderBG_nave(w, part) {
  const T = tod(), ti = todIdx();
  const h = TOPM + H;
  const L = new Layer(w, h);
  const baseRow = LY(0, WALLZ), K = KW();
  const wy = r => (baseRow - r) / K;
  const rowOf = y => Math.round(baseRow - y * K);
  const lampBX = LAMPS.map(lx => lx * ZM);
  const wallLight = (x, y) => {
    let s = T.amb * 0.9;
    for (const bx of lampBX) { const dx = (x - bx) / 75, dy = (y - 150) / 80; s += T.tube * 0.75 * Math.exp(-dx * dx - dy * dy); }
    const wx = (x - (WIN.x0 + WIN.x1) / 2) / 70, wyy = (y - (WIN.y0 + WIN.y1) / 2) / 55;
    s += T.win * Math.exp(-wx * wx - wyy * wyy);
    if (ti === 2) { const ex = (x - DOOR.x - DOOR.w / 2) / 40, ey = (y - DOOR.h - 8) / 25; s += 0.16 * Math.exp(-ex * ex - ey * ey); }
    return s;
  };
  const CEIL = 200;
  for (let r = 0; r < h; r++) {
    const y = wy(r);
    if (part === 'ceil' ? y <= CEIL + 12 : y > CEIL + 12) continue;
    for (let x = 0; x < w; x++) {
      let c;
      if (y > CEIL + 12) {                                  // techo de chapa y cerchas metálicas
        let v = 0.24 + T.amb * 0.5 + ((x >> 2) % 2 ? 0.07 : 0) + (fbm(x * 0.03, y * 0.05) - 0.5) * 0.1;
        c = dpick([0, 1, 2, 3], v, x, r);
        const tz = ((x + (y - CEIL) * 1.8) % 48 + 48) % 48, tz2 = ((x - (y - CEIL) * 1.8) % 48 + 48) % 48;
        if ((tz < 1.4 || tz2 < 1.4) && y < CEIL + 46) c = lit(4, T.amb, x, r);
        if (Math.abs(y - CEIL - 46) < 1.2) c = lit(4, T.amb, x, r);
      } else if (y > CEIL) {                                // viga de hormigón
        let v = 0.32 + (fbm(x * 0.05, y * 0.2) - 0.5) * 0.15 + wallLight(x, y) * 0.8;
        c = dpick(WALL_R, v, x, r);
        if (y < CEIL + 1.2) c = 1;
      } else {                                              // muro de hormigón visto
        let v = 0.42 - y * 0.001;            // muro de hormigón más oscuro que el suelo
        v += (fbm(x * 0.012, y * 0.02) - 0.5) * 0.26;
        v += (vnoise(x * 0.08, y * 0.12) - 0.5) * 0.1;
        const hs = hash2(x * 7 + 3, r * 13 + 1);
        if (hs > 0.978) v -= 0.17; else if (hs < 0.018) v += 0.11;
        const streak = vnoise(x * 0.07, y * 0.006); if (streak > 0.68) v -= (streak - 0.68) * 0.9;
        const eff = vnoise(x * 0.05 + 3, y * 0.03); if (y < 40 && eff > 0.7) v += (eff - 0.7) * 0.6 * (1 - y / 40);   // eflorescencia
        if (y < 20) v -= 0.16 * (1 - y / 20) + (vnoise(x * 0.2, y * 0.3) > 0.62 ? 0.07 : 0);
        v += wallLight(x, y);
        c = dpick(WALL_R, v, x, r);
        // juntas de encofrado (suaves) y paños de 160 x 64
        const jx = (x + Math.round(Math.sin(y * 0.07))) % 160;
        if (jx === 0) c = DARK[c]; else if (jx === 1) c = LIGHT[c];
        const ly = y % 64; if (ly < 0.9 && y > 2) c = DARK[c]; else if (ly > 63 && y > 2) c = LIGHT[c];
        // agujeros de los latiguillos del encofrado
        const tx = x % 40, ty = y % 32;
        if ((tx === 19 || tx === 20) && ty >= 15.6 && ty < 17.4) c = 1;
        else if ((tx === 19 || tx === 20) && ty >= 14.6 && ty < 15.6) c = LIGHT[LIGHT[c]];
        // coqueras (poros)
        if (hash2(x >> 1, r >> 1) > 0.9965) c = DARK[DARK[c]];
        if (Math.abs(y - 5) < 0.6) c = DARK[c];
      }
      L.set(x, r, c);
    }
  }
  if (part === 'ceil') return L.toCanvas();
  // grietas del muro
  const rnd = rng(1234);
  for (let i = 0; i < 7; i++) crackWalk(L, rnd() * w, rowOf(20 + rnd() * 150), 40 + rnd() * 70, Math.PI / 2 + (rnd() - 0.5), rnd, -2);
  // columnas de hormigón (cara frontal con arista iluminada, lateral en sombra, base sucia)
  for (let cx0 = 250; cx0 < w; cx0 += 280) {
    const top = rowOf(CEIL), bot = Math.ceil(baseRow) + 1;
    for (let x = cx0; x < cx0 + 20; x++) for (let r = top; r <= bot; r++) {
      const k = x - cx0, y = wy(r);
      let v = 0.5 + (fbm(x * 0.09, y * 0.04) - 0.5) * 0.2 + wallLight(x, y) - (y < 16 ? 0.15 : 0);
      if (k >= 15) v -= 0.3;                                     // lateral
      if (hash2(x * 5, r * 3) > 0.975) v -= 0.18;
      let c = dpick(WALL_R, v, x, r);
      if (k === 0 || k === 19) c = 1; else if (k === 1) c = LIGHT[c]; else if (k === 15) c = DARK[c];
      if ((k === 6 || k === 7) && Math.abs(y % 32 - 16) < 0.9) c = 1;
      L.set(x, r, c);
    }
    for (let x = cx0 - 1; x < cx0 + 21; x++) { L.set(x, bot, 1); L.set(x, bot + 1, 0); }
  }
  // conducto eléctrico con cajas de registro
  for (let x = 0; x < w; x++) { const r = rowOf(CONDUIT_Y); L.set(x, r - 1, 1); L.set(x, r, lit(6, T.amb, x, r)); L.set(x, r + 1, lit(4, T.amb, x, r)); L.set(x, r + 2, 1); }
  for (let bx = 60; bx < w; bx += 300) { const r = rowOf(CONDUIT_Y) - 3; L.rect(bx, r, 8, 8, lit(5, T.amb, bx, r)); L.rect(bx, r, 8, 1, 1); L.rect(bx, r + 7, 8, 1, 1); L.rect(bx, r, 1, 8, 1); L.rect(bx + 7, r, 1, 8, 1); L.set(bx + 3, r + 3, 2); }
  // ventana lateral: el cielo depende de la hora
  for (let x = WIN.x0 - 2; x <= WIN.x1 + 2; x++) for (let y = WIN.y0 - 2; y <= WIN.y1 + 2; y += 1 / K) {
    const r = rowOf(y);
    let c;
    if (x < WIN.x0 || x > WIN.x1 || y < WIN.y0 || y > WIN.y1) c = (y < WIN.y0 - 1) ? 7 : 1;
    else {
      const mx = (x - WIN.x0) % 17, my = Math.floor((y - WIN.y0) * K) % 16;
      if (mx === 0 || my === 0) c = 2;
      else {
        const t = (y - WIN.y0) / (WIN.y1 - WIN.y0);
        c = dpick(T.sky, (ti === 2 ? 0.2 + t * 0.4 : 0.25 + t * 0.75) + (hash2(Math.floor((x - WIN.x0) / 17), Math.floor((y - WIN.y0) * K / 16)) - 0.5) * 0.3, x, r);
        if (ti === 2 && hash2(x, r) > 0.985) c = 9;
      }
    }
    L.set(x, r, c);
  }
  if (ti === 2) { const mx = WIN.x1 - 12, my = rowOf(WIN.y1 - 8); L.rect(mx, my, 3, 3, 9); L.set(mx + 3, my + 1, 8); L.set(mx + 1, my - 1, 8); }
  // puerta metálica y salida de emergencia
  { const x0 = DOOR.x, rT = rowOf(DOOR.h), rB = Math.ceil(baseRow);
    for (let r = rT - 2; r <= rB; r++) for (let x = x0 - 2; x < x0 + DOOR.w + 2; x++) {
      const k = x - x0;
      let c;
      if (k < 0 || k >= DOOR.w || r < rT) c = (k === -2 || k === DOOR.w + 1 || r === rT - 2) ? 0 : lit(5, T.amb, x, r);
      else { c = dpick([1, 22, 23, 24], 0.55 + (k < 2 ? 0.2 : 0) - (k > DOOR.w - 3 ? 0.25 : 0) + T.amb * 0.8 + (vnoise(x * 0.2, r * 0.1) - 0.5) * 0.15, x, r); }
      L.set(x, r, c);
    }
    const br = rowOf(DOOR.h * 0.45);
    L.rect(x0 + 3, br, DOOR.w - 6, 2, lit(7, T.amb, x0, br)); L.rect(x0 + 3, br + 2, DOOR.w - 6, 1, 1);
    L.rect(x0 + 10, rowOf(DOOR.h - 6), 10, 10, 1); L.rect(x0 + 11, rowOf(DOOR.h - 6) + 1, 8, 8, ti === 2 ? 1 : 3);
    const sy = rowOf(DOOR.h + 12);
    L.rect(x0 - 1, sy - 1, DOOR.w + 2, 10, 0); L.rect(x0, sy, DOOR.w, 8, ti === 2 ? 25 : 24);
    L.text('SALIDA', x0 + 3, sy + 2, 10); }
  // extintor con su cartel
  { const ex = DOOR.x - 26, rB = rowOf(10), rT = rowOf(30);
    for (let r = rT; r <= rB; r++) for (let x = ex; x < ex + 7; x++) {
      const k = x - ex;
      L.set(x, r, k === 0 || k === 6 ? 0 : lit(k === 1 ? 19 : k > 4 ? 17 : 18, T.amb, x, r));
    }
    L.rect(ex + 1, rT - 3, 5, 3, 0); L.rect(ex + 2, rT - 2, 3, 2, 3); L.rect(ex + 1, rT + 6, 5, 4, 9); L.rect(ex + 6, rT, 2, 8, 0);
    const sr = rowOf(44); L.rect(ex - 15, sr - 1, 37, 9, 0); L.rect(ex - 14, sr, 35, 7, 18); L.text('EXTINTOR', ex - 12, sr + 1, 10); }
  // carteles: casco obligatorio, horario, campeonato, prohibido fumar
  const plaque = (x, y, ww, hh, bg) => { const r = rowOf(y); L.rect(x - 1, r - 1, ww + 2, hh + 2, 0); L.rect(x, r, ww, hh, lit(bg, T.amb * 0.8, x, r)); L.set(x, r, 7); L.set(x + ww - 1, r, 7); return r; };
  { const r = plaque(40, 96, 64, 30, 9);
    for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) { const d = i * i + j * j; if (d <= 36) L.set(72 + i, r + 8 + j, d > 30 ? 26 : 27); }
    for (let j = -3; j <= 1; j++) for (let i = -4; i <= 4; i++) if (i * i + (j + 1) * (j + 1) * 2 <= 16) L.set(72 + i, r + 8 + j, 10);
    L.rect(68, r + 10, 9, 1, 10);
    L.text('USO OBLIGATORIO', 41, r + 17, 1); L.text('DEL CASCO', 54, r + 23, 1); }
  { const r = plaque(290, 92, 36, 22, 10); L.text('HORARIO', 294, r + 3, 1); L.text('10-22 H', 294, r + 10, 27); L.rect(294, r + 16, 28, 1, 6); }
  { const r = plaque(470, 112, 48, 52, 21);
    L.rect(472, r + 2, 44, 18, 26);
    for (let i = 0; i < 44; i++) { const yy = r + 12 + Math.round(Math.sin(i * 0.25) * 3); L.set(472 + i, yy, 19); L.set(472 + i, yy + 1, 18); }
    L.rect(486, r + 6, 6, 2, 9); L.rect(484, r + 8, 10, 1, 1);
    L.text('CAMPEONATO', 474, r + 23, 1); L.text('LA NAVE', 480, r + 30, 17); L.text('SAB 18H', 480, r + 38, 1); L.text('SKATE', 484, r + 45, 26); }
  { const cx = 640, r = rowOf(70);
    for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) { const d = i * i + j * j; if (d <= 36) L.set(cx + i, r + j, d > 24 ? 18 : 10); }
    L.rect(cx - 4, r, 8, 2, 4); L.rect(cx + 3, r, 1, 2, 19);
    for (let k = -4; k <= 4; k++) { L.set(cx + k, r - k, 18); L.set(cx + k + 1, r - k, 18); } }
  // carcasa del ventilador (las aspas se dibujan en cada fotograma)
  { const cx = FAN.x, cy = rowOf(FAN.y);
    for (let j = -FAN.r - 2; j <= FAN.r + 2; j++) for (let i = -FAN.r - 2; i <= FAN.r + 2; i++) {
      const d = Math.sqrt(i * i + j * j);
      if (d > FAN.r + 1.5) continue;
      let c = d > FAN.r + 0.5 ? 0 : d > FAN.r - 1 ? lit(6, T.amb, cx + i, cy + j) : lit(1, 0, cx + i, cy + j);
      if (d < FAN.r - 1 && (Math.abs(d - FAN.r * 0.5) < 0.5)) c = 3;
      L.set(cx + i, cy + j, c);
    }
    L.rect(cx - 2, cy + FAN.r + 1, 4, 10, lit(4, T.amb, cx, cy)); L.rect(cx - 6, cy + FAN.r + 11, 12, 2, 2); }
  // logo en la pared
  const half = WALL_LOGO.length >> 1;
  paintWallLogo(L, LOGO_CX - half, rowOf(LOGO_Y) - half, T);
  return L.toCanvas();
}

// Valla de rombos en primer plano: más baja y abierta; versión «fina» cuando el skater pasa por detrás
function renderFence(thin) {
  const T = tod();
  const w = 300, h = TOPM + H;
  const L = new Layer(w, h);
  const top = TOPM + 182;
  for (let r = top; r < h; r++) for (let x = 0; x < 240; x++) {
    const a = ((x + r) % 13 + 13) % 13, b = ((x - r) % 13 + 13) % 13;
    if (a === 0 || b === 0) {
      if (thin && bay(x, r) > 0.4 && !(a === 0 && b === 0)) continue;
      L.set(x, r, lit((a === 0 && b === 0) ? 7 : (bay(x, r) < 0.3 ? 5 : 2), T.amb, x, r));
    } else if (!thin && a === 1 && hash2(x, r) < 0.35) L.set(x, r, 0);
  }
  for (const px of [6, 118, 236]) for (let r = top - 6; r < h; r++) {
    L.set(px - 1, r, 0); L.set(px, r, lit(8, T.amb, px, r)); L.set(px + 1, r, lit(6, T.amb, px, r)); L.set(px + 2, r, 4); L.set(px + 3, r, 0);
  }
  for (let x = 4; x < 240; x++) { L.set(x, top - 2, 0); L.set(x, top - 1, lit(8, T.amb, x, top)); L.set(x, top, 6); L.set(x, top + 1, 4); L.set(x, top + 2, 0); }
  return L.toCanvas();
}

// ---------- Haz de luz de la ventana y polvo ----------
let BEAMPAT = null, HALO = null, REFL_MASK = null;
function buildBeamPattern() {
  const T = tod();
  BEAMPAT = document.createElement('canvas'); BEAMPAT.width = W + 8; BEAMPAT.height = 16;
  const x = BEAMPAT.getContext('2d'), img = x.createImageData(W + 8, 16), u = new Uint32Array(img.data.buffer);
  const dens = [0.07, 0.13, 0.2, 0.27].map(d => d * T.beamOn);
  for (let lev = 0; lev < 4; lev++) for (let ry = 0; ry < 4; ry++) for (let i = 0; i < W + 8; i++)
    if (bay(i, ry) < dens[lev]) u[(lev * 4 + ry) * (W + 8) + i] = PAL32[bay(i + 2, ry + 1) < 0.5 ? T.beam[0] : T.beam[1]];
  x.putImageData(img, 0, 0);
  // halo de los tubos: cono de luz tramado hacia abajo
  HALO = document.createElement('canvas'); HALO.width = 120; HALO.height = 90;
  const hx = HALO.getContext('2d'), hi = hx.createImageData(120, 90), hu = new Uint32Array(hi.data.buffer);
  const hd = T.tube * 0.9 * Math.max(0.35, lampScale()), kind = MAP.lampKind, hc = kind === 'sodium' ? [20, 21] : kind === 'post' ? [16, 21] : [9, 10];
  for (let j = 0; j < 90; j++) for (let i = 0; i < 120; i++) {
    const spread = 18 + j * 0.45, dx = (i - 60) / spread, f = (1 - dx * dx) * (1 - j / 90);
    if (f > 0 && bay(i, j) < f * hd) hu[j * 120 + i] = PAL32[bay(i + 1, j + 2) < 0.5 ? hc[0] : hc[1]];
  }
  hx.putImageData(hi, 0, 0);
}
function beamGeom() {
  const K = KW(), baseRow = FY + WALLZ * SINE * ZM;
  const topY = Math.round(baseRow - WIN.y0 * K) + cam.upi, topL = WIN.x0 + 2 - cam.xi, topR = WIN.x1 - 1 - cam.xi;
  const botY = Math.round(SY(0, 0)) - 2, botL = Math.round(18 * ZM) - cam.xi, botR = Math.round(92 * ZM) - cam.xi;
  return { topY, topL, topR, botY, botL, botR };
}
function drawBeam() {
  if (tod().beamOn < 0.05) return;
  const g = beamGeom();
  if (Math.max(g.topR, g.botR) < 0) return;
  for (let y = g.topY; y <= g.botY; y++) {
    if (y < 0 || y >= H) continue;
    const t = (y - g.topY) / (g.botY - g.topY);
    let xl = Math.round(g.topL + (g.botL - g.topL) * t), xr = Math.round(g.topR + (g.botR - g.topR) * t);
    xl = Math.max(0, xl); xr = Math.min(W, xr);
    if (xr <= xl) continue;
    const lev = t < 0.25 ? 3 : t < 0.55 ? 2 : t < 0.85 ? 1 : 0;
    ctx.drawImage(BEAMPAT, (xl + cam.xi) & 3, lev * 4 + ((((y - cam.upi) % 4) + 4) % 4), xr - xl, 1, xl, y, xr - xl, 1);
  }
}
const DUST = [];
for (let i = 0; i < 50; i++) DUST.push({ u: Math.random(), v: Math.random(), ph: Math.random() * 6.28, sp: 0.01 + Math.random() * 0.03 });
function updateDust(dt, tm) {
  for (const d of DUST) {
    d.u += d.sp * dt * (0.6 + 0.4 * Math.sin(tm * 0.7 + d.ph));
    d.v += Math.sin(tm * 0.5 + d.ph * 3) * 0.02 * dt;
    if (d.u > 1) { d.u -= 1; d.v = Math.random(); }
    if (d.v < 0) d.v += 1; if (d.v > 1) d.v -= 1;
  }
}
function drawDust(tm) {
  if (theme() !== 'nave') return;
  if (tod().beamOn < 0.3) return;
  const g = beamGeom(), T = tod();
  for (const d of DUST) {
    if (Math.sin(tm * 2.1 + d.ph * 5) < -0.2) continue;
    const y = Math.round(g.topY + (g.botY - g.topY) * d.u);
    const xl = g.topL + (g.botL - g.topL) * d.u, xr = g.topR + (g.botR - g.topR) * d.u;
    const x = Math.round(xl + (xr - xl) * d.v);
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    ctx.fillStyle = PAL_HEX[Math.sin(tm * 3 + d.ph) > 0.4 ? T.beam[1] : T.beam[0]];
    ctx.fillRect(x, y, 1, 1);
  }
}

// ---------- Tubos colgantes (uno parpadea) ----------
let flickOn = true, flickT = 0;
function updateFlicker(dt) {
  flickT -= dt;
  if (flickT <= 0) {
    if (flickOn) { flickOn = Math.random() < 0.35; flickT = flickOn ? 0.05 + Math.random() * 0.08 : 0.03 + Math.random() * 0.12; if (Math.random() < 0.3) { flickOn = true; flickT = 1 + Math.random() * 3; } }
    else { flickOn = true; flickT = Math.random() < 0.5 ? 0.04 + Math.random() * 0.1 : 0.8 + Math.random() * 2.5; }
  }
}
// ---------- Palomas sobre los tubos: se espantan con los golpes ----------
const PIGEON_SIT = [['.kk..', 'kgGk.', '.kGGk', '..kk.'], ['..kk.', '.kgGk', '.kGGk', '..kk.']];
const PIGEON_FLY = [['k...k', 'gkGkg', '.kGk.', '..k..'], ['.....', 'kgGgk', '.kGk.', '.....']];
let PIGEONS = [];
function resetPigeons() { PIGEONS = (MAP.pigeons || []).map((li, i) => ({ li, ox: (i % 2 ? 6 : -9) + (i * 3) % 5, st: 'sit', x: 0, y: 0, vx: 0, vy: 0, t: Math.random() * 5, back: 0 })); }
function spookPigeons(x) {
  for (const p of PIGEONS) if (p.st === 'sit' && Math.abs(LAMPS[p.li] - x) < 420) {
    p.st = 'fly'; p.x = LAMPS[p.li] + p.ox; p.y = LAMP_Y + 5; p.vx = (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 60); p.vy = 50 + Math.random() * 40; p.back = 8 + Math.random() * 8;
  }
}
function updatePigeons(dt) {
  for (const p of PIGEONS) {
    p.t += dt;
    if (p.st === 'fly') {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 12 * dt;
      p.back -= dt;
      if (p.back <= 0) { p.st = 'ret'; p.x = LAMPS[p.li] + p.ox + sgn(p.vx) * -260; p.y = LAMP_Y + 70; }
    } else if (p.st === 'ret') {
      const tx = LAMPS[p.li] + p.ox, ty = LAMP_Y + 5;
      p.x += (tx - p.x) * Math.min(1, dt * 1.6); p.y += (ty - p.y) * Math.min(1, dt * 1.6);
      if (Math.abs(tx - p.x) < 1 && Math.abs(ty - p.y) < 1) p.st = 'sit';
    }
  }
}
function drawPigeons() {
  for (const p of PIGEONS) {
    const sit = p.st === 'sit';
    const wx = sit ? LAMPS[p.li] + p.ox : p.x, wyy = sit ? LAMP_Y + 5 : p.y;
    const sx = Math.round(SX(wx)), sy = Math.round(SY(wyy, -10));
    if (sx < -6 || sx > W + 6 || sy < -6 || sy > H) continue;
    const fr = sit ? PIGEON_SIT[Math.sin(p.t * 1.3 + p.li) > 0.85 ? 1 : 0] : PIGEON_FLY[Math.floor(p.t * 12) % 2];
    const flip = sit ? (p.ox > 0) : p.vx < 0;
    fr.forEach((row, j) => { for (let i = 0; i < 5; i++) { const ch = row[flip ? 4 - i : i]; if (ch === '.') continue; rect(sx + i - 2, sy + j - 4, 1, 1, ch === 'k' ? 1 : ch === 'g' ? 5 : 6); } });
  }
}
// ---------- Ventilador, LED de la radio y brillos en el coping ----------
function drawFanBlades(tm) {
  if (theme() !== 'nave') return;
  const baseRow = FY + WALLZ * SINE * ZM;
  const cx = FAN.x - cam.xi, cy = Math.round(baseRow - FAN.y * KW()) + cam.upi;
  if (cx < -20 || cx > W + 20) return;
  const a0 = tm * 9;
  for (let b = 0; b < 3; b++) {
    const a = a0 + b * Math.PI * 2 / 3;
    for (let k = 1; k < FAN.r - 1; k++) {
      const x = Math.round(cx + Math.cos(a) * k), y = Math.round(cy + Math.sin(a) * k);
      rect(x, y, 1, 1, k > FAN.r - 4 ? 5 : 6);
      const x2 = Math.round(cx + Math.cos(a + 0.18) * k), y2 = Math.round(cy + Math.sin(a + 0.18) * k);
      if (k > 3) rect(x2, y2, 1, 1, 4);
    }
  }
  rect(cx - 1, cy - 1, 3, 3, 2); rect(cx, cy, 1, 1, 7);
}

// ---------- Construcción y dibujo de capas ----------
function buildLayers() {
  const t0 = performance.now();
  const main = renderMain();
  const rail = renderRail();
  const wall = renderBG(LWID + 8, 'wall');
  const ceil = renderBG(W + Math.ceil((LWID - W) * PAR_BG) + 4, 'ceil');
  const fence = renderFence(false), fenceThin = renderFence(true);
  LAYERS = { main, rail, wall, ceil, fence, fenceThin };
  buildBeamPattern();
  LAYERS.ms = performance.now() - t0;
}
function rebuildBG() {
  LAYERS.ceil = renderBG(W + Math.ceil((LWID - W) * PAR_BG) + 4, 'ceil');
  buildBeamPattern();
}
function updateScene(dt, tm) { updateDust(dt, tm); updateFlicker(dt); updatePigeons(dt); }
function drawRailLayer() { ctx.drawImage(LAYERS.rail, -cam.xi, -TOPM + cam.upi); }
// Sombra tramada sobre la superficie
function drawShadow(x, z, hgt, wide) {
  const gy = groundY(x);
  const cx = Math.round(SX(x)), cy = Math.round(SY(gy, z));
  const rw = Math.max(3, ((wide || 11) - hgt * 0.06) * ZM), rh = Math.max(1.5, (3 - hgt * 0.01) * ZM);
  const dens = clamp(0.75 - hgt * 0.006, 0.3, 0.75) + (inBeam(x) ? 0.2 * tod().beamOn : 0);
  ctx.fillStyle = PAL_HEX[0];
  for (let y = -Math.ceil(rh); y <= Math.ceil(rh); y++) for (let xx = -Math.ceil(rw); xx <= Math.ceil(rw); xx++) {
    const d = (xx * xx) / (rw * rw) + (y * y) / (rh * rh);
    if (d > 1) continue;
    if (bay(cx + xx, cy + y) < dens * (1.15 - d * 0.6)) ctx.fillRect(cx + xx, cy + y, 1, 1);
  }
}
// ---------- Detalles por mapa (cada fotograma) ----------
function drawDetails(tm) {
  const t = theme();
  if (t === 'nave') {                                   // LED de la radio al ritmo de la música
    const rx = Math.round(SX(RADIO.x)) + 7, ry = Math.round(SY(0, RADIO.z)) - 7;
    if (rx > -4 && rx < W + 4 && !SND.muted && (tm * 1.4) % 1 < 0.5) rect(rx, ry, 1, 1, 21);
  }
  if (MATS[t].coping !== 'metal') return;
  for (const [lx, ly, ph] of [[MINI.lip, MINI.H, 0], [BIG.lip, BIG.H, 1.3]]) {   // brillo que recorre los copings
    const k = (tm * 0.45 + ph) % 3;
    if (k > 1) continue;
    const z = lerp(-LANE, LANE, k);
    const x = Math.round(SX(lx)) - 1, y = Math.round(SY(ly, z));
    rect(x, y, 1, 1, 10); rect(x, y - 1, 1, 1, 9); rect(x - 1, y, 1, 1, 9);
  }
}
// Luces: tubos colgantes (nave), lámparas de sodio (parking) o farolas (skatepark)
function drawLamps() {
  const kind = MAP.lampKind;
  if (!kind) return;
  const night = lampScale() > 0.3;
  for (let i = 0; i < LAMPS.length; i++) {
    const on = (i !== FLICK || flickOn) && (kind !== 'post' || night);
    const cx = Math.round(SX(LAMPS[i])), cy = Math.round(SY(LAMP_Y, -10));
    if (cx < -70 || cx > W + 70 || cy < -10) continue;
    if (kind === 'post') {
      const by = Math.round(SY(0, -30));
      if (on) ctx.drawImage(HALO, cx - 60, cy + 3);
      rect(cx - 2, cy, 4, by - cy, 0); rect(cx - 1, cy, 2, by - cy, 3); rect(cx - 1, cy, 1, by - cy, 5);
      rect(cx - 4, by - 3, 8, 3, 0); rect(cx - 3, by - 2, 6, 1, 3);
      rect(cx - 7, cy - 4, 14, 5, 0); rect(cx - 6, cy - 3, 12, 2, 3); rect(cx - 5, cy - 1, 10, 1, on ? 21 : 5);
      continue;
    }
    if (on) ctx.drawImage(HALO, cx - 60, cy + 4);
    if (kind === 'sodium') {
      rect(cx - 1, 0, 2, Math.max(0, cy - 2), 1);
      rect(cx - 10, cy - 3, 20, 6, 0); rect(cx - 9, cy - 2, 18, 2, 3);
      rect(cx - 8, cy, 16, 1, on ? 21 : 5); rect(cx - 8, cy + 1, 16, 1, on ? 20 : 4);
      continue;
    }
    rect(cx - 13, 0, 1, Math.max(0, cy - 2), 1); rect(cx + 12, 0, 1, Math.max(0, cy - 2), 1);
    rect(cx - 17, cy - 3, 34, 7, 0);
    rect(cx - 16, cy - 2, 32, 2, 4); rect(cx - 16, cy - 2, 32, 1, 6);
    rect(cx - 15, cy, 30, 1, on ? 10 : 6); rect(cx - 15, cy + 1, 30, 1, on ? 29 : 5); rect(cx - 16, cy + 2, 32, 1, 2);
  }
}
function drawSceneBack() {
  const bgx = Math.round(cam.x * PAR_BG);
  ctx.drawImage(LAYERS.ceil, -bgx, -TOPM + cam.upi);
  ctx.drawImage(LAYERS.wall, -cam.xi, -TOPM + cam.upi);
  drawFanBlades(game.t);
  ctx.drawImage(LAYERS.main, -cam.xi, -TOPM + cam.upi);
  drawDetails(game.t);
  if (theme() === 'nave') drawBeam();
  drawLamps();
  drawPigeons();
}
function drawFence() {
  if (!MAP.fence) return;
  const fx = Math.round(cam.x * PAR_FG);
  if (fx > 300) return;
  const psx = (typeof P !== 'undefined' && P.x !== undefined) ? SX(P.x) : -999;
  const behind = psx > -fx - 30 && psx < -fx + 250;
  ctx.drawImage(behind ? LAYERS.fenceThin : LAYERS.fence, -fx - 10, -TOPM + cam.upi);
}
