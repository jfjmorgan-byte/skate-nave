
// =====================================================================
//  Fondos de los mapas nuevos: skatepark, piscina y parking
//  part = 'ceil' (lejano, parallax 0,6) · part = 'wall' (pegado a las rampas, se mueve con ellas)
// =====================================================================
function bgFrame(w) {
  const h = TOPM + H, baseRow = LY(0, WALLZ), K = COSE * ZM;
  return { L: new Layer(w, h), h, baseRow, K, wy: r => (baseRow - r) / K, rowOf: y => Math.round(baseRow - y * K) };
}
// Cielo con nubes, sol o luna y estrellas según la hora
function paintSky(F, w) {
  const ti = todIdx(), { L, h, baseRow } = F;
  const sky = ti === 0 ? [27, 28, 29, 9, 10] : ti === 1 ? [30, 31, 32, 19, 20, 21] : [0, 1, 26, 27];
  for (let r = 0; r < h; r++) {
    const t = clamp(r / baseRow, 0, 1);
    for (let x = 0; x < w; x++) {
      let c = dpick(sky, ti === 2 ? t * 0.7 : 0.15 + t * 0.85, x, r);
      const cl = fbm(x * 0.008 + 3, r * 0.03);
      if (ti < 2 && cl > 0.6 && r < baseRow * 0.8) c = cl > 0.66 ? (ti === 0 ? 10 : 20) : (ti === 0 ? 9 : 32);
      if (ti === 2 && hash2(x, r) > 0.996 && r < baseRow * 0.7) c = hash2(x + 1, r) > 0.5 ? 9 : 8;
      L.set(x, r, c);
    }
  }
  const sx = Math.round(w * 0.72), sy = Math.round(baseRow * (ti === 1 ? 0.62 : 0.22)), rr = ti === 1 ? 14 : 8;
  for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) {
    const d = i * i + j * j; if (d > rr * rr) continue;
    L.set(sx + i, sy + j, ti === 2 ? (d < rr * rr * 0.5 ? 9 : 8) : ti === 1 ? (d < rr * rr * 0.5 ? 21 : 20) : 10);
  }
}
// Ciudad lejana (siluetas con ventanas encendidas de noche)
function paintSkyline(F, w, top) {
  const ti = todIdx(), { L, rowOf } = F, rnd = rng(55);
  const col = ti === 0 ? [5, 6, 7] : ti === 1 ? [30, 31, 30] : [0, 1, 2];
  let x = 0;
  while (x < w) {
    const bw = 18 + Math.floor(rnd() * 34), bh = 40 + rnd() * top;
    const r0 = rowOf(bh), r1 = rowOf(20);
    for (let r = r0; r <= r1; r++) for (let i = 0; i < bw; i++) {
      let c = i === 0 ? col[0] : col[1];
      if (i > 1 && i < bw - 2 && (r - r0) % 5 > 1 && (i % 4) > 0 && hash2(x + i >> 2, r >> 2) > (ti === 2 ? 0.55 : 0.8)) c = ti === 2 ? 21 : col[2];
      L.set(x + i, r, c);
    }
    x += bw + Math.floor(rnd() * 6);
  }
}
// Copas de árbol redondeadas y palmeras
function paintTree(F, x, base, size, ti) {
  const { L, rowOf } = F, g = ti === 2 ? [0, 22, 22, 23] : [22, 23, 24, 25];
  const r0 = rowOf(base + size * 0.5), cy = rowOf(base + size * 1.4);
  for (let r = r0 - 1; r <= rowOf(base); r++) { L.set(x - 1, r, 11); L.set(x, r, 12); L.set(x + 1, r, 11); }
  for (let j = -size; j <= size; j++) for (let i = -size * 1.2; i <= size * 1.2; i++) {
    const n = vnoise((x + i) * 0.25, (cy + j) * 0.25);
    const d = (i * i) / (size * size * 1.44) + (j * j) / (size * size);
    if (d > 0.8 + n * 0.4) continue;
    L.set(x + i, cy + j, dpick(g, 0.75 - (j + size) / (size * 2) * 0.6 + (n - 0.5) * 0.4, x + i, cy + j));
  }
}
function paintPalm(F, x, base, hgt, ti, lean) {
  const { L, rowOf } = F, g = ti === 2 ? [0, 22, 23] : [22, 23, 24, 25];
  const top = rowOf(base + hgt), bot = rowOf(base);
  for (let r = top; r <= bot; r++) {
    const t = (bot - r) / (bot - top), cx = Math.round(x + lean * t * t * 18);
    L.set(cx - 1, r, 11); L.set(cx, r, ((r >> 1) & 1) ? 13 : 12); L.set(cx + 1, r, 12);
  }
  const cx = Math.round(x + lean * 18), cy = top;
  for (let a = 0; a < 7; a++) {
    const ang = -Math.PI + a * Math.PI / 6 + 0.15;
    for (let k = 0; k < 22; k++) {
      const px = Math.round(cx + Math.cos(ang) * k), py = Math.round(cy + Math.sin(ang) * k * 0.6 + (k * k) * 0.035);
      L.set(px, py, g[k < 8 ? 1 : k < 16 ? 2 : g.length - 1]); L.set(px, py + 1, g[0]);
    }
  }
}

// ---------- El Skatepark (exterior) ----------
function renderBG_park(w, part) {
  const T = tod(), ti = todIdx(), F = bgFrame(w), { L, rowOf, baseRow } = F;
  if (part === 'ceil') {
    paintSky(F, w);
    paintSkyline(F, w, 90);
    const rnd = rng(9);
    for (let x = 10; x < w; x += 34 + Math.floor(rnd() * 30)) paintTree(F, x, 0, 10 + Math.floor(rnd() * 8), ti);
    return L.toCanvas();
  }
  // valla metálica y setos pegados a la pista
  for (let r = rowOf(64); r <= Math.ceil(baseRow) + 1; r++) {
    const y = F.wy(r);
    for (let x = 0; x < w; x++) {
      if (y < 16) {
        const n = vnoise(x * 0.18, r * 0.25);
        if (y > 9 + n * 7) continue;
        L.set(x, r, dpick([22, 23, 24, 25], 0.3 + (y / 16) * 0.5 + (n - 0.5) * 0.5 + T.amb, x, r));
        continue;
      }
      const a = ((x + r) % 9 + 9) % 9, b = ((x - r) % 9 + 9) % 9;
      if (a === 0 || b === 0) L.set(x, r, lit(bay(x, r) < 0.4 ? 6 : 4, T.amb, x, r));
    }
  }
  for (let x = 6; x < w; x += 80) for (let r = rowOf(66); r <= Math.ceil(baseRow); r++) { L.set(x - 1, r, 0); L.set(x, r, lit(7, T.amb, x, r)); L.set(x + 1, r, lit(5, T.amb, x, r)); L.set(x + 2, r, 0); }
  for (let x = 0; x < w; x++) { const r = rowOf(64); L.set(x, r - 1, 0); L.set(x, r, lit(7, T.amb, x, r)); L.set(x, r + 1, 0); }
  // cartel del parque
  const r = rowOf(60), x0 = 520;
  L.rect(x0 - 1, r - 1, 72, 14, 0); L.rect(x0, r, 70, 12, 23); L.text('SKATEPARK', x0 + 4, r + 1, 10); L.text('MUNICIPAL', x0 + 4, r + 7 - 1, 25);
  return L.toCanvas();
}

// ---------- La Piscina ----------
function renderBG_pool(w, part) {
  const T = tod(), ti = todIdx(), F = bgFrame(w), { L, rowOf, baseRow } = F;
  const top = BIG.H;
  if (part === 'ceil') {
    paintSky(F, w);
    // casa al fondo
    const hx0 = 60, hx1 = 300, roof = top + 90;
    for (let r = rowOf(roof); r <= rowOf(top + 10); r++) for (let x = hx0; x < hx1; x++) {
      const y = F.wy(r);
      let c;
      if (y > roof - 16) { if (Math.abs(x - (hx0 + hx1) / 2) > (roof - y) * 3.2 + 100) continue; c = ((x + (r >> 1)) % 6 < 3) ? 18 : 19; }
      else { c = dpick([7, 8, 9, 10], 0.6 + T.amb + (vnoise(x * 0.1, r * 0.1) - 0.5) * 0.2, x, r); if ((x - hx0) % 60 > 20 && (x - hx0) % 60 < 38 && y > top + 30 && y < roof - 26) c = ti === 2 ? 21 : 27; }
      L.set(x, r, c);
    }
    paintPalm(F, 360, top, 120, ti, 1); paintPalm(F, 420, top, 96, ti, -1); paintPalm(F, w - 120, top, 110, ti, -1);
    paintTree(F, 30, top, 14, ti); paintTree(F, w - 40, top, 16, ti);
    return L.toCanvas();
  }
  // pared trasera de la piscina, azulejos, coping, patio y valla de madera
  for (let r = rowOf(top + 66); r <= Math.ceil(baseRow) + 1; r++) {
    const y = F.wy(r);
    for (let x = 0; x < w; x++) {
      let c;
      if (y < top - 11) { c = dpick([26, 27, 28, 29], 0.5 + y / top * 0.3 + (fbm(x * 0.03, y * 0.05) - 0.5) * 0.2 + T.amb, x, r); if (Math.abs(y - 26) < 0.6) c = DARK[c]; }
      else if (y < top - 1.5) { const tx = Math.floor(x / 4), ty = Math.floor(y / 4); c = lit(((tx + ty) & 1) ? 27 : 28, T.amb, x, r); if (x % 4 === 0) c = 29; }
      else if (y < top + 4) { c = lit(((x % 18) === 0) ? 13 : (y > top + 2.5 ? 16 : 15), T.amb, x, r); if (y < top - 0.5) c = 14; }
      else if (y < top + 12) { c = lit(((x >> 3) + (r >> 2)) & 1 ? 13 : 14, T.amb, x, r); }
      else { const plank = x % 12; c = plank === 0 ? 11 : lit(plank < 2 ? 14 : 13, T.amb * 0.9, x, r); if (y > top + 64) c = 12; }
      L.set(x, r, c);
    }
  }
  // escalera metálica en la parte honda, foco de la piscina y marcas de profundidad
  const lx = Math.round(BIG.cx * ZM) - 70;
  for (let r = rowOf(top + 12); r <= rowOf(30); r++) { L.set(lx, r, 0); L.set(lx + 1, r, 8); L.set(lx + 2, r, 0); L.set(lx + 12, r, 0); L.set(lx + 13, r, 8); L.set(lx + 14, r, 0); }
  for (let y = 40; y < top - 6; y += 12) { const r = rowOf(y); for (let i = 2; i < 12; i++) { L.set(lx + i, r, 7); L.set(lx + i, r + 1, 0); } }
  const fx = Math.round(BIG.cx * ZM) + 30, fy = rowOf(34);
  for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (i * i + j * j <= 16) L.set(fx + i, fy + j, i * i + j * j > 10 ? 0 : (ti === 2 ? 10 : 9));
  L.text('1,2 M', Math.round(MINI.cx * ZM) + 40, rowOf(top - 18), 1);
  L.text('3,5 M', Math.round(BIG.cx * ZM) - 40, rowOf(top - 18), 1);
  return L.toCanvas();
}

// ---------- El Parking ----------
function paintCar(L, rowOf, x, col, T) {
  const len = 100, body = [DARK[col[0]], col[0], col[1], col[2]];
  for (let y = 4; y <= 30; y += 0.5) {
    const r = rowOf(y);
    for (let i = 0; i < len; i++) {
      let c = null;
      const roofIn = Math.max(0, (y - 17) * 2.2);
      if (y <= 17) { if (i < 2 || i > len - 3) continue; c = dpick(body, 0.75 - (17 - y) / 13 * 0.5 + T.amb, x + i, r); if (y > 15.5) c = col[2]; }
      else if (i > 18 + roofIn && i < len - 12 - roofIn * 0.6) { c = (y > 28.5) ? body[0] : dpick([1, 26, 27, 28], 0.4 + (i % 30 < 4 ? 0.4 : 0) + T.amb * 0.5, x + i, r); if (i === Math.round(len / 2)) c = body[0]; }
      if (c === null) continue;
      L.set(x + i, r, c);
    }
  }
  for (const wx of [x + 20, x + len - 22]) for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) {
    const d = i * i + j * j; if (d > 36) continue;
    L.set(wx + i, rowOf(6) + j, d < 9 ? 6 : d < 16 ? 3 : 0);
  }
  L.rect(x + len - 4, rowOf(14), 3, 3, 9); L.rect(x + 1, rowOf(14), 3, 3, 18);
}
function renderBG_parking(w, part) {
  const T = tod(), F = bgFrame(w), { L, rowOf, baseRow } = F;
  if (part === 'ceil') { L.rect(0, 0, w, F.h, 0); return L.toCanvas(); }
  const lampPX = LAMPS.map(x => x * ZM);
  const glow = (x, y) => { let s = 0; for (const lx of lampPX) { const dx = (x - lx) / 60, dy = (y - LAMP_Y + 10) / 60; s += Math.exp(-dx * dx - dy * dy); } return s; };
  for (let r = 0; r <= Math.ceil(baseRow) + 1; r++) {
    const y = F.wy(r);
    for (let x = 0; x < w; x++) {
      let c;
      if (y > 150) { c = dpick([0, 1, 2, 3], 0.4 + (fbm(x * 0.04, y * 0.05) - 0.5) * 0.2 + glow(x, y) * 0.2, x, r); if (Math.abs(y - 152) < 1) c = 1; }
      else {
        let v = 0.42 + (fbm(x * 0.015, y * 0.03) - 0.5) * 0.22 + T.amb * 0.6 + glow(x, y) * 0.35;
        if (hash2(x * 3, r * 5) > 0.98) v -= 0.15;
        c = dpick(WALL_R, v, x, r);
        if (glow(x, y) > 0.5 && bay(x, r) < (glow(x, y) - 0.5)) c = WARM[c] || c;
        if (y > 34 && y < 41) c = lit(y > 39.5 ? 20 : 21, T.amb * 0.5, x, r);          // franja pintada
        if (Math.abs(y - 140) < 2.5) c = lit(Math.abs(y - 140) < 1 ? 7 : 5, T.amb, x, r);   // tubería
      }
      L.set(x, r, c);
    }
  }
  // columnas numeradas con rayas de aviso
  let n = 1;
  for (let cx0 = 120; cx0 < w; cx0 += 300, n++) {
    for (let x = cx0; x < cx0 + 26; x++) for (let r = rowOf(150); r <= Math.ceil(baseRow); r++) {
      const k = x - cx0, y = F.wy(r);
      let c = dpick(WALL_R, 0.55 + T.amb * 0.6 + (k > 21 ? -0.25 : 0) + glow(x, y) * 0.3, x, r);
      if (y < 22) c = (((x + r) >> 2) & 1) ? 21 : 0;
      if (k === 0 || k === 25) c = 0;
      L.set(x, r, c);
    }
    L.rect(cx0 + 4, rowOf(70), 18, 11, 9); L.text('A' + n, cx0 + 8, rowOf(70) + 3, 0);
  }
  // coches aparcados entre columnas
  const cars = [[18, 19, 20], [26, 27, 28], [7, 8, 9], [3, 4, 5], [22, 23, 24]];
  let ci = 0;
  for (let cx0 = 150; cx0 + 110 < w; cx0 += 150) {
    if ((cx0 - 120) % 300 > 260 || (cx0 - 120) % 300 < 30) continue;
    paintCar(L, rowOf, cx0, cars[ci++ % cars.length], T);
  }
  // rótulos: planta y salida
  L.rect(20, rowOf(110), 46, 22, 21); L.rect(21, rowOf(110) + 1, 44, 20, 0); L.text('P-1', 30, rowOf(110) + 8, 21);
  const sx = w - 120; L.rect(sx - 1, rowOf(120) - 1, 40, 11, 0); L.rect(sx, rowOf(120), 38, 9, 24); L.text('SALIDA', sx + 4, rowOf(120) + 2, 10);
  // el logo también aquí, como cartel
  const half = WALL_LOGO.length >> 1;
  paintWallLogo(L, Math.round((LAMPS[2] + LAMPS[3]) / 2 * ZM) - half, rowOf(86) - half, T);
  return L.toCanvas();
}
