
// =====================================================================
//  Extras: partículas, ruedas redondas, caminar, plataformas, drop in, lip tricks
// =====================================================================
// ---------- Partículas recicladas ----------
const PARTS = [];
for (let i = 0; i < 260; i++) PARTS.push({ life: 0 });
let partIdx = 0;
const SPARK = [10, 21, 20, 19, 18], DUSTC = [8, 7, 6, 5], DUSTW = [15, 14, 13, 12];
function spawn(x, y, z, vx, vy, life, col, g) {
  const p = PARTS[partIdx]; partIdx = (partIdx + 1) % PARTS.length;
  p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.col = col; p.g = g;
}
function sparks(x, y, z, dir, n) {
  for (let i = 0; i < n; i++) spawn(x + (Math.random() - 0.5) * 6, y + 1, z + (Math.random() - 0.5) * 4, -dir * (40 + Math.random() * 110) + (Math.random() - 0.5) * 40, 20 + Math.random() * 90, 0.2 + Math.random() * 0.3, SPARK, 380);
}
function dust(x, y, z, n, spread) {
  const c = isWood(x) ? DUSTW : DUSTC;
  for (let i = 0; i < n; i++) spawn(x + (Math.random() - 0.5) * 10, y + 0.5, z + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * (spread || 60), 8 + Math.random() * 30, 0.35 + Math.random() * 0.4, c, 70);
}
function updateParts(dt) {
  for (const p of PARTS) {
    if (p.life <= 0) continue;
    p.life -= dt; p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    const gy = groundY(p.x);
    if (p.y < gy) { p.y = gy; p.vy = Math.abs(p.vy) * 0.25; p.vx *= 0.5; }
  }
}
function drawParts() {
  for (const p of PARTS) {
    if (p.life <= 0) continue;
    const sx = Math.round(SX(p.x)), sy = Math.round(SY(p.y, p.z));
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
    const k = 1 - p.life / p.max;
    const col = p.col[Math.min(p.col.length - 1, Math.floor(k * p.col.length))];
    if (p.col === DUSTC || p.col === DUSTW) { if (bay(sx, sy) > 1 - k * 0.6) continue; }
    ctx.fillStyle = PAL_HEX[col];
    ctx.fillRect(sx, sy, 1, 1);
  }
}
// Marcas de frenada pintadas sobre la capa del suelo (persisten)
let skidCount = 0;
function skidMark(x, z) {
  if (!LAYERS || skidCount > 4000) return;
  const y = groundY(x);
  if (Math.abs(y) > 0.5 && !(x > PYR.x1 && x < PYR.x2)) return;
  const c = LAYERS.main.getContext('2d');
  c.fillStyle = PAL_HEX[isWood(x) ? 12 : 3];
  for (const dz of [-3, 3]) {
    const px = Math.round(x * ZM), py = Math.round(LY(y, z + dz));
    if (bay(px, py) < 0.55) { c.fillRect(px, py, 1, 1); skidCount++; }
  }
}

// ---------- Ruedas redondas: cilindro muestreado con normales reales ----------
function rasterCyl(S, b, L, c, ox, oy, scale, bright) {
  const sz = S.size, Z = S.z, CI = S.ci, PT = S.pt;
  const r = b.h[0], hz = b.h[2], step = 0.42 / scale;
  const side = b.m[0], cap = b.m[1], spin = b.spin || 0;
  const plot = (lx, ly, lz, nx, ny, nz, ramp) => {
    const vnd = L[6] * nx + L[7] * ny + L[8] * nz;
    if (vnd <= 0.02) return;
    const vnx = L[0] * nx + L[1] * ny + L[2] * nz, vnu = L[3] * nx + L[4] * ny + L[5] * nz;
    const X = c[0] + L[0] * lx + L[1] * ly + L[2] * lz, U = c[1] + L[3] * lx + L[4] * ly + L[5] * lz, D = c[2] + L[6] * lx + L[7] * ly + L[8] * lz;
    const px = Math.floor(ox + X * scale), py = Math.floor(oy - U * scale);
    if (px < 0 || py < 0 || px >= sz || py >= sz) return;
    const id = py * sz + px;
    if (D <= Z[id]) return;
    Z[id] = D;
    let I = (0.36 + 0.7 * Math.max(0, vnx * LV[0] + vnu * LV[1] + vnd * LV[2])) * bright;
    I = I < 0 ? 0 : I > 1 ? 1 : I;
    const rn = ramp.length - 1;
    let ri = Math.floor(I * rn + 0.5 + (BAYER[((py & 3) << 2) | (px & 3)] - 0.5) * 0.8);
    CI[id] = ramp[ri < 0 ? 0 : ri > rn ? rn : ri]; PT[id] = b.part;
  };
  const na = Math.max(10, Math.ceil(2 * Math.PI * r / step));
  for (let i = 0; i < na; i++) {
    const a = (i + 0.5) / na * 2 * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
    for (let z = -hz + step / 2; z < hz; z += step) plot(r * ca, r * sa, z, ca, sa, 0, side);
  }
  for (const sz2 of [-1, 1]) for (let rr = step / 2; rr < r; rr += step) {
    const n = Math.max(6, Math.ceil(2 * Math.PI * rr / step));
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) / n * 2 * Math.PI;
      const t = (((a + spin) / (2 * Math.PI)) % 1 + 1) % 1;
      plot(rr * Math.cos(a), rr * Math.sin(a), sz2 * hz, 0, 0, sz2, typeof cap === 'function' ? cap(rr / r, t) : cap);
    }
  }
}

// ---------- Bajarse de la tabla, caminar y subir a las plataformas ----------
const WALK_SP = 58;
function dismount() {
  const deck = P.mode === 'deck' ? P.deck : 0;
  const dir = P.mode === 'ground' && Math.abs(P.v) > 3 ? sgn(P.v) : P.facing;
  P.vx = P.mode === 'ground' ? P.v * 0.3 : 0;
  P.mode = 'walk'; P.onDeck = deck; P.wdir = dir; P.wph = 0; P.climb = null; P.kick = null; P.drop = null;
  P.manual = false; P.pushing = false; P.braking = false; P.charging = false; P.theta = 0;
  if (combo.list.length) bankCombo();
  SND.boardHit();
}
function mountBoard() {
  P.facing = P.wdir || P.facing;
  if (P.onDeck) { placeOnDeck(P.onDeck, P.x, P.facing); }
  else {
    P.mode = 'ground'; P.s = sOfX(PATH, P.x); P.v = 0;
    const q = pathAt(PATH, P.s); P.x = q.x; P.y = q.y; P.theta = Math.atan2(q.ty, q.tx);
  }
  P.land = 0.4;
  SND.land(40);
}
function walkUpdate(dt) {
  if (P.climb) { climbUpdate(dt); return; }
  const mv = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
  if (mv) P.wdir = mv;
  P.vx = approach(P.vx || 0, mv * WALK_SP, 420 * dt);
  const lo = P.onDeck < 0 ? 3 : P.onDeck > 0 ? 977 : 52, hi = P.onDeck < 0 ? 26 : P.onDeck > 0 ? 1009 : 928;
  let nx = P.x + P.vx * dt;
  if (nx < lo || nx > hi) { nx = clamp(nx, lo, hi); P.vx = 0; }
  P.x = nx; P.y = groundY(P.x); P.theta = 0;
  P.wph += Math.abs(P.vx) * dt * 0.17;
  if (!mv && Math.abs(P.vx) < 1) P.wph = approach(P.wph % Math.PI, 0, dt * 3);
  if (!P.onDeck && pressed.ArrowUp && (P.x <= 60 || P.x >= 920)) startClimb(P.x < 500 ? -1 : 1, true);
  else if (P.onDeck && pressed.ArrowDown) startClimb(P.onDeck, false);
  else if (pressed.KeyE) mountBoard();
}
function startClimb(side, up) {
  const sFloor = side < 0 ? sOfX(PATH, 56) : sOfX(PATH, 924);
  const sLip = side < 0 ? 0 : PATH.L;
  const deckX = side < 0 ? MINI.lip - 12 : BIG.lip + 12;
  P.climb = { t: 0, dur: side < 0 ? 0.8 : 1.1, side, up, sFloor, sLip, deckX };
  P.vx = 0; P.wdir = up ? (side < 0 ? -1 : 1) : (side < 0 ? 1 : -1);
}
function climbUpdate(dt) {
  const c = P.climb;
  c.t += dt;
  let k = clamp(c.t / c.dur, 0, 1);
  if (!c.up) k = 1 - k;
  const lipX = c.side < 0 ? MINI.lip : BIG.lip, lipY = c.side < 0 ? MINI.H : BIG.H;
  if (k < 0.7) {
    const q = pathAt(PATH, lerp(c.sFloor, c.sLip, k / 0.7));
    P.x = q.x; P.y = q.y;
  } else {
    const t = (k - 0.7) / 0.3;
    P.x = lerp(lipX, c.deckX, t); P.y = lipY + Math.sin(t * Math.PI) * 7;
  }
  P.wph += dt * 9;
  if (c.t >= c.dur) {
    P.climb = null;
    if (c.up) { P.onDeck = c.side; P.x = c.deckX; P.y = lipY; P.wdir = -c.side; }
    else { P.onDeck = 0; const q = pathAt(PATH, c.sFloor); P.x = q.x; P.y = q.y; }
    emit('climb', { side: c.side, up: c.up });
  }
}
function drawWalker() {
  const cu = SAVE.cust;
  const pose = defaultPose();
  const ph = P.wph || 0, sw = Math.sin(ph * 2);
  const moving = P.climb || Math.abs(P.vx || 0) > 2;
  const step = moving ? 3.8 : 0;
  pose.crouch = P.climb ? 0.35 : 0.02; pose.leanF = P.climb ? 0.45 : 0.08; pose.headYaw = 0; pose.arm = 0.05;
  pose.ff = [2 - 5.5, Math.max(0, Math.cos(ph * 2)) * 2.2 * (moving ? 1 : 0), step * sw - 0.3];
  pose.bf = [-2 + 5.5, Math.max(0, -Math.cos(ph * 2)) * 2.2 * (moving ? 1 : 0), -step * sw - 0.3];
  pose.swing = moving ? sw : 0;
  if (P.climb) pose.armUp = 0.8;
  const boxes = [];
  buildBody(pose, cu, boxes);
  const hb = pose.hands ? pose.hands[-1] : [-6, 22, 0];
  buildBoard(cu, boxes, rZ(-Math.PI / 2), vadd(hb, [-1.6, 1, 0]));
  const yaw = (P.wdir || 1) > 0 ? Math.PI / 2 : -Math.PI / 2;
  if (!P.onDeck && !isWood(P.x)) REFLECT = Math.round(SY(0, P.z));
  drawRigWorld(SPR_MAIN, boxes, rY(yaw), [P.x, P.y, P.z], playerBright());
}

// ---------- Plataformas y drop in ----------
function placeOnDeck(side, x, facing) {
  P.mode = 'deck'; P.deck = side; P.onDeck = side;
  P.x = clamp(x === undefined ? (side < 0 ? 16 : 994) : x, side < 0 ? 3 : 977, side < 0 ? 26 : 1009);
  P.y = side < 0 ? MINI.H : BIG.H; P.theta = 0; P.v = 0; P.vx = 0;
  P.facing = facing || -side; P.drop = null; P.kick = null; P.lipKey = null;
}
function deckUpdate(dt) {
  const side = P.deck, toward = -side;
  const lipX = side < 0 ? MINI.lip : BIG.lip, lipY = side < 0 ? MINI.H : BIG.H;
  if (P.drop) {
    const d = P.drop;
    d.t += dt;
    const k = clamp(d.t / 0.5, 0, 1);
    if (k < 0.35) { P.x = lerp(d.x0, lipX, k / 0.35); P.y = lipY; P.theta = 0; }
    else { const t = (k - 0.35) / 0.65; P.x = lipX; P.y = lipY; P.theta = -toward * Math.PI / 2 * (t * t * (3 - 2 * t)); }
    P.crouch = approach(P.crouch, 0.45, dt * 5);
    if (k >= 1) {
      P.drop = null; P.mode = 'ground'; P.onDeck = 0;
      P.s = side < 0 ? 0.6 : PATH.L - 0.6; P.v = toward * 70;
      const q = pathAt(PATH, P.s); P.x = q.x; P.y = q.y; P.theta = Math.atan2(q.ty, q.tx);
      P.airTricks = [];
      addTrick('Drop In', 40); P.grace = 0;
      emit('drop', { side });
      SND.coping(); P.land = 0.5;
    }
    return;
  }
  if (P.kick) {
    P.kick.t += dt;
    if (P.kick.t >= P.kick.dur) { P.facing = -P.facing; P.kick = null; SND.land(30); }
    return;
  }
  P.y = lipY; P.theta = 0;
  P.crouch = approach(P.crouch, 0.15, dt * 4);
  const pr = pressed.ArrowRight ? 1 : pressed.ArrowLeft ? -1 : 0;
  if (P.facing === toward && (pr === toward || pressed.ArrowUp)) { P.drop = { t: 0, x0: P.x }; SND.push(); }
  else if (pr && pr !== P.facing) P.kick = { t: 0, dur: 0.34, dir: pr < 0 ? 1 : -1 };
  else if (pressed.KeyE) dismount();
}

// ---------- Lip tricks en el coping ----------
const LIPS = {
  KeyW: { n: 'Coping 50-50', pts: 140, rate: 210, exit: 'fwd' },
  KeyA: { n: 'Rock to Fakie', pts: 120, rate: 120, exit: 'fakie' },
  KeyD: { n: "Rock 'n' Roll", pts: 160, rate: 140, exit: 'fwd' },
  KeyS: { n: 'Nose Stall', pts: 130, rate: 130, exit: 'fakie' }
};
const LIPNAMES = Object.values(LIPS).map(l => l.n);
// Subiendo una de las rampas hacia su coping (desde el principio de la curva)
function nearLip() {
  if (P.mode !== 'ground') return false;
  return (P.s < 58 && P.v < -5) || (P.s > PATH.L - 128 && P.v > 5) || P.s < 3 || P.s > PATH.L - 3;
}
function startLip(side, code) {
  if (code === 'KeyW' && keys.KeyA) code = 'SMITH'; else if (code === 'KeyW' && keys.KeyD) code = 'FEEBLE';
  const L = LIPS[code]; if (!L) return false;
  const sp = Math.abs(P.v);
  P.mode = 'lip'; P.lipS = side; P.lipC = code; P.lipT = 0; P.lipOut = 0;
  P.lbal = (Math.random() - 0.5) * 0.2; P.lipKey = null;
  P.x = side < 0 ? MINI.lip : BIG.lip; P.y = side < 0 ? MINI.H : BIG.H; P.v = 0;
  P.lipVz = COPING_GRINDS.includes(code) ? (Math.random() < 0.5 ? -1 : 1) * (35 + sp * 0.3) : 0;
  P.lead = P.facing === side ? 1 : -1;
  P.airTricks = []; P.grace = 0;
  P.lipE = addTrick(L.n, L.pts);
  SND.grindStart();
  sparks(P.x, P.y, P.z, -side, 5);
  return true;
}
function lipUpdate(dt, easy) {
  const L = LIPS[P.lipC];
  if (P.lipOut > 0) {
    P.lipOut += dt;
    if (P.lipOut >= 0.24) exitLip();
    return;
  }
  P.lipT += dt;
  const drift = easy ? 0.4 : 1.4;
  P.lbal += (P.lbal * drift * 1.3 + (Math.random() - 0.5) * drift * 1.4) * dt;
  if (keys.ArrowLeft) P.lbal -= 2.6 * dt;
  if (keys.ArrowRight) P.lbal += 2.6 * dt;
  contTrick(P.lipE, L.rate, dt);
  if (COPING_GRINDS.includes(P.lipC)) {
    P.zt = P.z = clamp(P.z + P.lipVz * dt, -31, 31);
    P.lipVz = approach(P.lipVz, 0, 22 * dt);
    if (Math.random() < 0.7) sparks(P.x, P.y, P.z, sgn(P.lipVz) || 1, 1);
    if (Math.abs(P.z) >= 31) P.lipVz = 0;
  }
  if (Math.abs(P.lbal) >= 1) {
    P.mode = 'ground'; P.s = P.lipS < 0 ? 0.5 : PATH.L - 0.5; P.v = P.lipS < 0 ? 40 : -40;
    bailNow(); return;
  }
  // se sale al soltar la tecla del truco (o con espacio)
  if (pressed.Space || pressed.ArrowDown || pressed.ArrowUp || (P.lipT > 0.25 && !keys[lipHoldKey(P.lipC)])) P.lipOut = 0.0001;
}
function exitLip() {
  const side = P.lipS, L = LIPS[P.lipC];
  emit('lip', { code: P.lipC, name: L.n, t: P.lipT });
  if (L.exit === 'fwd') P.facing = -P.facing;
  P.mode = 'ground'; P.zt = 0;
  P.s = side < 0 ? 0.6 : PATH.L - 0.6; P.v = side < 0 ? 75 : -75;
  const q = pathAt(PATH, P.s); P.x = q.x; P.y = q.y; P.theta = Math.atan2(q.ty, q.tx);
  P.lipE = null; P.grace = 0.6; P.land = 0.35;
  SND.coping();
}
// Pose del lip trick: orientación (θ, giro) y origen del rig
function lipRig() {
  const s = P.lipS, code = P.lipC;
  const lipX = s < 0 ? MINI.lip : BIG.lip, lipY = s < 0 ? MINI.H : BIG.H;
  const kin = clamp(P.lipT / 0.16, 0, 1);
  const kout = clamp(P.lipOut / 0.24, 0, 1);
  const baseYaw = P.facing > 0 ? 0 : Math.PI;
  let th = 0, yaw = baseYaw, h = 1, ox = lipX, oy = lipY;
  if (COPING_GRINDS.includes(code)) { yaw = baseYaw + Math.PI / 2 * -P.lead; h = 3.9; th = code === 'SMITH' ? -s * 0.35 : code === 'FEEBLE' ? s * 0.3 : 0; }
  else if (code === 'KeyA' || code === 'KeyD') {
    const a = 0.3 + 0.1 * Math.sin(P.lipT * 14) * Math.max(0, 1 - P.lipT * 2);
    th = -s * a; h = 1;
  } else if (code === 'KeyS') {
    const b = 0.85; th = s * b;
    ox = lipX - s * Math.cos(b) * 10; oy = lipY - Math.sin(b) * 10; h = 0.6;
  }
  const vert = s * Math.PI / 2;
  th = lerp(vert, th, kin);
  if (kout > 0) {
    th = lerp(th, vert, kout); ox = lerp(ox, lipX, kout); oy = lerp(oy, lipY, kout); h = lerp(h, 6, kout);
    if (COPING_GRINDS.includes(code)) yaw = lerp(yaw, baseYaw + (LIPS[code].exit === 'fwd' ? Math.PI : 0), kout);
    if (code === 'KeyD') yaw = baseYaw + Math.PI * kout;
  } else if (kin < 1) { ox = lerp(lipX, ox, kin); oy = lerp(lipY, oy, kin); h = lerp(6, h, kin); if (COPING_GRINDS.includes(code)) yaw = lerp(baseYaw, yaw, kin); }
  return { th, yaw, h, ox, oy };
}
function drawLip() {
  const cu = SAVE.cust, r = lipRig();
  const pose = defaultPose();
  pose.crouch = 0.35; pose.arm = 0.85; pose.leanX = P.lbal * 0.45; pose.headYaw = 0.5;
  if (P.lipC === 'KeyS') { pose.leanF = 0.35; pose.crouch = 0.5; }
  const boxes = [];
  buildBody(pose, cu, boxes);
  if (cu.stance === 1) xformBoxes(boxes, MIRZ, [0, 0, 0]);
  buildBoard(cu, boxes, I3(), [0, 0, 0]);
  const Rw = mm(rZ(r.th), rY(r.yaw));
  const nx = -Math.sin(r.th), ny = Math.cos(r.th);
  drawRigWorld(SPR_MAIN, boxes, Rw, [r.ox + nx * r.h, r.oy + ny * r.h, P.z], playerBright());
}

// ---------- Pistas de contexto ----------
function contextHint() {
  if (P.mode === 'deck' && !P.drop) return P.facing === -P.deck ? '→ / ↑ DROP IN · E BAJARTE DE LA TABLA'.replace('→', P.deck < 0 ? '→' : '←') : '← → GIRARTE HACIA LA RAMPA';
  if (P.mode === 'walk' && !P.climb) {
    if (P.onDeck) return '↓ BAJAR · E SUBIRTE A LA TABLA';
    if (P.x <= 60 || P.x >= 920) return '↑ SUBIR A LA PLATAFORMA · E SUBIRTE A LA TABLA';
    return '← → CAMINAR · E SUBIRTE A LA TABLA';
  }
  if (P.mode === 'lip') return '← → EQUILIBRIO · SUELTA LA TECLA PARA VOLVER';
  if (P.mode === 'ground' && nearLip()) {
    if (P.lipKey) return LIPS[P.lipKey].n.toUpperCase() + ' EN EL COPING...';
    if (game.mode === 'retos' && (game.reto === 4 || game.reto === 8)) return 'MANTÉN W A S D: LIP TRICK · SIN TECLA: AIRE';
  }
  return '';
}
