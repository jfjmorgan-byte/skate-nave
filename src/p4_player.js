
// =====================================================================
//  Patinador: física sobre superficies, trucos, grind, manual, caídas, combos
// =====================================================================
const PUSHCAP = 215, VMAX = 440, SPINR = 11, RROLL = 16.5, RSHOVE = 10.5;
const FLIPS = {
  kf: { names: ['Kickflip', 'Double Kickflip', 'Triple Kickflip'], roll: 1, shove: 0, pts: 150 },
  hf: { names: ['Heelflip', 'Double Heelflip', 'Triple Heelflip'], roll: -1, shove: 0, pts: 160 },
  sh: { names: ['Pop Shove-it', '360 Shove-it', '540 Shove-it'], roll: 0, shove: 1, pts: 100 },
  vk: { names: ['Varial Kickflip', 'Double Varial Kickflip', 'Triple Varial Kickflip'], roll: 1, shove: 1, pts: 280 },
  vh: { names: ['Varial Heelflip', 'Double Varial Heelflip', 'Triple Varial Heelflip'], roll: -1, shove: -1, pts: 300 },
  hd: { names: ['Hardflip', 'Double Hardflip', 'Triple Hardflip'], roll: 1, shove: -1, pts: 320 },
  tre: { names: ['360 Flip', 'Double 360 Flip', 'Triple 360 Flip'], roll: 1, shove: 2, pts: 420 },
  imp: { names: ['Impossible', 'Double Impossible', 'Triple Impossible'], roll: 0, shove: 0, pitch: 1, pts: 500 }
};
const MULT_PTS = [1, 2.3, 3.8];
const SPINPTS = { 180: 150, 360: 400, 540: 800, 720: 1300, 900: 2000, 1080: 3000 };
const GRINDS = {
  KeyW: { n: '50-50 Grind', pts: 100, rate: 160 }, KeyS: { n: '5-0 Grind', pts: 120, rate: 180 },
  KeyA: { n: 'Boardslide', pts: 150, rate: 200 }, KeyD: { n: 'Crooked Grind', pts: 180, rate: 220 }
};
const P = {};
const combo = { list: [], base: 0, airBonus: 0, show: 0 };
const popups = [];
const recent = [];
let score = 0;
const isEasy = () => SAVE.diff === 0;
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);

function resetPlayer(x, facing) {
  for (const k in P) delete P[k];
  Object.assign(P, {
    mode: 'ground', s: sOfX(PATH, x === undefined ? 160 : x), v: 0, x: 0, y: 0, vx: 0, vy: 0, z: 0, zt: 0,
    facing: facing || 1, theta: 0, spin: 0, spinV: 0, bsSign: -1, lip: 0, vy0: 1,
    airStartY: 0, airMaxY: 0, airTricks: [], popped: false, airT: 0,
    flip: null, grab: 0, grabE: null, manual: false, mbal: 0, manT: 0, manE: null,
    charging: false, charge: 0, queuedFlip: null, pushing: false, push: 0, braking: false,
    pumpT: 0, pumpUsed: false, kick: null, crouch: 0.15, bpitch: 0, tuck: 0, land: 0,
    grind: null, rs: 0, rv: 0, gbal: 0, grindKey: null, bail: null, grace: 0, tq: [], lastX: 0
  });
  const p = pathAt(PATH, P.s); P.x = p.x; P.y = p.y; P.theta = Math.atan2(p.ty, p.tx); P.lastX = P.x;
  combo.list = []; combo.base = 0; combo.airBonus = 0;
}
function popup(text, col, big) { popups.push({ text, x: P.x, y: P.y + 52, t: 0, col: col || 21, big }); }

// ---------- Combos ----------
function addTrick(name, pts) {
  let rep = 0; for (const t of combo.list) if (t.name === name) rep++;
  let rec = 0; for (const n of recent) if (n === name) rec++;
  const f = Math.pow(0.5, rep) * Math.pow(0.8, Math.min(rec, 4));
  const e = { name, pts: Math.round(pts * f), f, acc: 0 };
  if (!combo.list.length) combo.t0 = game.t;
  combo.list.push(e); combo.base += e.pts; combo.show = 3;
  if (!(P.flip && P.flip.special) && !P.christ) P.special = Math.min(1, (P.special || 0) + pts / 2400);
  if (P.airTricks) P.airTricks.push(name);
  emit('trick', { name });
  return e;
}
function contTrick(e, rate, dt) {
  if (!e) return;
  e.acc += rate * e.f * dt;
  const whole = Math.floor(e.acc);
  if (whole > 0) { e.pts += whole; combo.base += whole; e.acc -= whole; }
}
function comboTotal() { return Math.round((combo.base + combo.airBonus) * Math.max(1, combo.list.length)); }
function bankCombo() {
  const n = combo.list.length;
  if (!n) { combo.base = 0; combo.airBonus = 0; return; }
  const total = comboTotal();
  score += total;
  for (const t of combo.list) { recent.push(t.name); if (recent.length > 14) recent.shift(); }
  const coinsWon = total >= 150 ? Math.max(1, Math.floor(total / 300)) : 0;
  emit('bank', { n, total, names: combo.list.map(t => t.name), coins: coinsWon });
  combo.list = []; combo.base = 0; combo.airBonus = 0;
}
function loseCombo() {
  if (combo.list.length) { HUD.lost = 1.6; HUD.lostPts = comboTotal(); }
  combo.list = []; combo.base = 0; combo.airBonus = 0;
}

// ---------- Utilidades de estado ----------
function travelDir() { const v = P.mode === 'grind' ? P.rv : P.mode === 'air' ? P.vx : P.v; return Math.abs(v) > 1 ? sgn(v) : P.facing; }
function startAir(vx, vy, vert) {
  const dir = Math.abs(vx) > 2 ? sgn(vx) : (P.mode === 'grind' ? sgn(P.rv) : sgn(P.v)) || P.facing;
  const fakie = dir !== P.facing;
  P.bsSign = (SAVE.cust.stance === 0 ? -1 : 1) * (fakie ? -1 : 1);
  P.fakieAir = fakie; P.mcTwist = 0; P.christ = 0;
  P.mode = 'air'; P.vx = vx; P.vy = vy; P.airT = 0;
  P.airStartY = P.y; P.airMaxY = P.y; P.airTricks = []; P.popped = false; P.grabT = 0;
  P.spin = 0; P.spinV = 0; P.lip = vert || 0; P.manual = false; P.manE = null; P.grace = 0;
  P.pushing = false; P.braking = false; P.kick = null;
}
function launchVert(side) {
  // techo de aire: 2,2 m en la mini, 4 m en la grande (se pierde el exceso de energía)
  const sp = Math.min(Math.abs(P.v), side < 0 ? 225 : 305);
  if (P.lipKey && startLip(side, P.lipKey)) return;     // con la tecla mantenida te clavas en el coping a cualquier velocidad
  if (sp < 26) { P.s = side < 0 ? 0.01 : PATH.L - 0.01; P.v = 0; return; }
  P.x = side < 0 ? MINI.lip : BIG.lip; P.y = side < 0 ? MINI.H : BIG.H;
  startAir(0, sp, side);
  P.vy0 = sp;
  SND.coping();
}
function canManual() { return P.mode === 'ground' && Math.abs(P.v) > 22 && Math.abs(P.theta) < 0.5 && !P.kick; }
function startManual() {
  P.manual = true; P.mbal = (Math.random() - 0.5) * 0.25; P.manT = 0; P.grace = 0;
  P.manE = addTrick('Manual', 60); P.charging = false; P.pushing = false; P.braking = false;
}
function endManual(failed) {
  if (!P.manual) return;
  P.manual = false;
  emit('manualEnd', { t: P.manT });
  P.manE = null;
  if (!failed) P.grace = 0.6;
}
function startFlip(type, mult) {
  const F = FLIPS[type]; mult = mult || 1;
  P.flip = { type, mult, roll: 0, shove: 0, pitch: 0, rollT: F.roll * 2 * Math.PI * (type === 'sh' ? 0 : mult), shoveT: F.shove * Math.PI * (type === 'sh' ? mult : 1) * (SAVE.cust.stance ? -1 : 1), pitchT: (F.pitch || 0) * 2 * Math.PI * mult, done: false, after: 0 };
  if (P.grabE) { P.grabE = null; }
  SND.flip();
}
function flipProg(f) { const T = Math.abs(f.rollT) + Math.abs(f.shoveT) + Math.abs(f.pitchT || 0); return T ? (Math.abs(f.roll) + Math.abs(f.shove) + Math.abs(f.pitch || 0)) / T : 1; }
function completeFlip() {
  const f = P.flip; if (!f || f.done) return;
  f.done = true; f.after = 0; f.roll = f.rollT; f.shove = f.shoveT;
  const F = FLIPS[f.type];
  addTrick((P.fakieAir ? 'Fakie ' : '') + (f.specialName || F.names[f.mult - 1]), F.pts * MULT_PTS[f.mult - 1] * (f.special ? 5 : 1));
  SND.catchB();
}
function pop(ch) {
  const onRail = P.mode === 'grind';
  const p = onRail ? pathAt(RAILS[P.rail || 0].path, P.rs) : pathAt(PATH, P.s);
  const v = onRail ? P.rv : P.v;
  const nx = -p.ty, ny = p.tx, pv = 92 + 74 * ch;
  if (onRail) endGrind();
  if (P.manual) { P.manual = false; P.manE = null; }
  P.charging = false; P.charge = 0;
  startAir(v * p.tx + nx * pv, v * p.ty + ny * pv, 0);
  P.popped = true; P.bpitch = 0.5;
  SND.pop(ch);
  if (P.queuedFlip) { startFlip(P.queuedFlip, P.queuedMult || 1); P.queuedFlip = null; P.queuedMult = 1; }
}
function nearRail() {
  if (P.mode !== 'air' || P.lip || P.vy > 40) return false;
  const ry = Math.max(...RAILS.map(r => railYi(r, P.x + P.vx * 0.12)));
  return ry > -1e8 && P.y - ry > -2 && P.y - ry < 34;
}
// Teclas de truco con pequeño búfer para combinar A+S / D+S y detectar dobles
function trickKey(code) {
  if (P.mode === 'grind') { switchGrind(code); return; }
  if (code === 'KeyW') return;
  if (P.mode === 'air' && nearRail() && !P.flip) { P.grindKey = code; return; }
  P.tq.push({ code, t: 0 });
}
function resolveTricks(dt) {
  if (!P.tq.length) return;
  for (const q of P.tq) q.t += dt;
  const codes = P.tq.map(q => q.code);
  const has = c => codes.includes(c);
  const distinct = new Set(codes);
  if (P.tq[0].t < 0.075 && distinct.size < 2 && codes.length < 2) return;
  let type = null, mult = 1;
  if (has('KeyA') && has('KeyD')) type = 'hd';
  else if (has('KeyA') && has('KeyS')) type = 'vk';
  else if (has('KeyD') && has('KeyS')) type = 'vh';
  else if (has('KeyA')) type = 'kf';
  else if (has('KeyD')) type = 'hf';
  else if (has('KeyS')) type = 'sh';
  if (distinct.size === 1 && codes.length >= 2) mult = Math.min(3, codes.length);
  P.tq.length = 0;
  if (type) doFlip(type, mult);
}
function doFlip(type, mult) {
  if (P.mode === 'air') {
    const f = P.flip;
    if (f && !f.done && f.type === type && f.mult < 3 && flipProg(f) < 0.75) {
      f.mult++;
      if (type === 'sh') f.shoveT += sgn(f.shoveT) * Math.PI; else f.rollT += sgn(f.rollT) * 2 * Math.PI;
      SND.flip();
      return;
    }
    if (!f && P.grab < 0.4) startFlip(type, mult);
  } else if (P.mode === 'ground' && !P.kick) {
    if (P.charging) { P.queuedFlip = type; P.queuedMult = mult; }
    else if (Math.abs(P.theta) < 0.9) { P.queuedFlip = type; P.queuedMult = mult; pop(0.6); }
  }
}

// ---------- Paso principal del jugador ----------
function playerUpdate(dt) {
  const easy = isEasy();
  for (const c of ['KeyA', 'KeyD', 'KeyS', 'KeyW']) {
    if (!pressed[c]) continue;
    P.lastTK = c; P.lastTKt = 0;
    if (P.mode === 'walk' || P.mode === 'deck' || P.mode === 'lip' || P.mode === 'bail') continue;
    if (P.mode === 'air' && (P.special || 0) >= 1 && kShift() && !P.flip) { startSpecial(c); continue; }
    if (nearLip()) { P.lipKey = c; P.lipKeyT = 0.6; continue; }
    if (c !== 'KeyW' || P.mode === 'grind') trickKey(c);
  }
  // mantener W/A/S/D mientras se sube la rampa: el truco de coping queda preparado
  if (nearLip()) for (const c of ['KeyW', 'KeyA', 'KeyD', 'KeyS']) if (keys[c]) { P.lipKey = c; P.lipKeyT = 0.3; break; }
  if (P.lastTKt !== undefined) P.lastTKt += dt;
  resolveTricks(dt);
  P.bpitch = approach(P.bpitch, 0, dt * 3.2);
  P.land = approach(P.land, 0, dt * 4);
  P.z += (P.zt - P.z) * Math.min(1, dt * 14);
  P.lipKeyT = Math.max(0, (P.lipKeyT || 0) - dt); if (!P.lipKeyT) P.lipKey = null;
  P.celebrate = Math.max(0, (P.celebrate || 0) - dt);
  P.sketchy = Math.max(0, (P.sketchy || 0) - dt);
  P.revAnim = Math.max(0, (P.revAnim || 0) - dt);
  if (P.grace > (P.graceMax || 0)) P.graceMax = P.grace; if (!(P.grace > 0)) P.graceMax = 0;
  P.idleT = ((P.mode === 'ground' || P.mode === 'deck') && Math.abs(P.v || 0) < 2 && !P.kick && !P.drop) ? (P.idleT || 0) + dt : 0;
  if (P.mode === 'ground') groundUpdate(dt, easy);
  else if (P.mode === 'air') airUpdate(dt, easy);
  else if (P.mode === 'grind') grindUpdate(dt, easy);
  else if (P.mode === 'bail') bailUpdate(dt);
  else if (P.mode === 'walk') walkUpdate(dt);
  else if (P.mode === 'deck') deckUpdate(dt);
  else if (P.mode === 'lip') lipUpdate(dt, easy);
  if (P.mode === 'ground') P.wspin = (P.wspin || 0) - P.v * dt / 1.65 * P.facing;
  if (P.mode === 'grind' && Math.random() < 0.8) sparks(P.x, P.y, P.z, sgn(P.rv), 2);
  updateParts(dt);
  // sonido de rodadura
  const rolling = P.mode === 'ground' ? Math.abs(P.v) : 0;
  SND.roll(rolling, isWood(P.x), P.mode === 'ground');
  SND.grind(P.mode === 'grind' ? Math.abs(P.rv) : 0);
  SND.brake(P.mode === 'ground' && P.braking && Math.abs(P.v) > 8);
  if (P.mode === 'ground' && !isWood(P.x) && Math.floor(P.x / 128) !== Math.floor(P.lastX / 128)) SND.click(Math.abs(P.v));
  P.lastX = P.x;
}

function groundUpdate(dt, easy) {
  const p0 = pathAt(PATH, P.s);
  const ang = Math.atan2(p0.ty, p0.tx);
  // kickturn
  if (P.kick) {
    P.kick.t += dt; P.v = 0;
    if (P.kick.t >= P.kick.dur) { P.facing = -P.facing; P.kick = null; SND.land(30); }
    return;
  }
  // lip trick parado justo en el coping
  if (P.lipKey && (P.s < 3 || P.s > PATH.L - 3) && startLip(P.s < 3 ? -1 : 1, P.lipKey)) return;
  // bajarse de la tabla
  if (pressed.KeyE && Math.abs(P.v) < 70 && !P.manual && Math.abs(ang) < 0.5) { dismount(); return; }
  // frenada: polvo y marcas
  if (P.braking && Math.abs(P.v) > 30) { skidMark(P.x - sgn(P.v) * 6, P.z); if (Math.random() < 0.5) dust(P.x - sgn(P.v) * 8, P.y, P.z, 1, 30); }
  // ollie: cargar y soltar
  if (keys.Space && !P.charging && pressed.Space && Math.abs(ang) < 0.9) { P.charging = true; P.charge = 0; }
  if (P.charging) {
    P.charge = Math.min(1, P.charge + dt / 0.42);
    if (!keys.Space) { pop(P.charge); return; }
    if (Math.abs(ang) >= 0.95) { P.charging = false; }
  }
  // manual
  if (pressed.KeyW && !P.manual && canManual()) startManual();
  if (P.manual) {
    const drift = easy ? 1.0 : 2.0;
    P.mbal += (P.mbal * drift * 1.3 + (Math.random() - 0.5) * drift * 1.6) * dt;
    if (keys.ArrowUp) P.mbal -= 2.7 * dt;
    if (keys.ArrowDown) P.mbal += 2.7 * dt;
    P.manT += dt;
    contTrick(P.manE, 140, dt);
    emit('manual', { t: P.manT });
    if (Math.abs(P.mbal) >= 1) { endManual(true); bailNow(); return; }
    if (!keys.KeyW || Math.abs(ang) > 0.62 || Math.abs(P.v) < 6) endManual(false);
  }
  // impulso (empujar)
  if (!P.manual && !P.charging) {
    if (keys.ArrowUp && !P.pushing && Math.abs(ang) < 0.3) { P.pushing = true; P.push = 0; P.pushHit = false; }
    if (P.pushing) {
      P.push += dt * 2.1;
      if (!P.pushHit && P.push > 0.33) {
        P.pushHit = true;
        if (Math.abs(ang) < 0.3) {
          const dir = Math.abs(P.v) < 5 ? P.facing : sgn(P.v);
          if (Math.abs(P.v) < PUSHCAP) P.v = dir * Math.min(PUSHCAP, Math.abs(P.v) + (Math.abs(P.v) < 5 ? 70 : 52));
          SND.push(); dust(P.x - dir * 8, P.y, P.z + 5, 3, 40);
        }
      }
      if (P.push >= 1) { if (keys.ArrowUp && Math.abs(ang) < 0.3) { P.push = 0; P.pushHit = false; } else P.pushing = false; }
    }
  } else P.pushing = false;
  // freno
  P.braking = !!keys.ArrowDown && !P.manual && !P.pushing;
  // revert: Shift justo al caer en una rampa (mantiene vivo el combo)
  if (P.revWin > 0) { P.revWin -= dt; if (pShift() && combo.list.length) { doRevert(); } }
  // bombeo
  // Más fácil: vale mantener Shift o pulsarlo hasta 0,45 s antes; se bombea al bajar y también al subir la curva
  P.pumpT = Math.max(0, P.pumpT - dt);
  P.pumpBuf = Math.max(0, (P.pumpBuf || 0) - dt);
  if (pShift()) P.pumpBuf = 0.45;
  const slope = Math.abs(ang), desc = P.v * p0.ty < -1, asc = P.v * p0.ty > 1;
  if (slope < 0.08) { P.pumpUsed = false; P.pumpUp = false; }
  P.pumpReady = !P.manual && slope > 0.15 && slope < 1.4 && ((desc && !P.pumpUsed) || (asc && !P.pumpUp && Math.abs(P.v) > 40));
  if (P.pumpReady && (P.pumpBuf > 0 || kShift())) {
    const k = isEasy() ? 1.2 : 1;
    if (desc) { P.v += sgn(P.v) * (20 + Math.abs(P.v) * 0.2) * k; P.pumpUsed = true; popup('¡BOMBEO!', 25); }
    else { P.v += sgn(P.v) * (10 + Math.abs(P.v) * 0.08) * k; P.pumpUp = true; popup('BOMBEO', 24); }
    P.v = clamp(P.v, -VMAX, VMAX);
    P.pumpT = 0.36; P.pumpBuf = 0;
    SND.pump();
  }
  // kickturn arriba de la rampa o casi parado
  if ((pressed.ArrowLeft || pressed.ArrowRight) && !P.manual && !P.charging) {
    if ((Math.abs(ang) > 0.45 && Math.abs(P.v) < 50) || (Math.abs(ang) < 0.3 && Math.abs(P.v) < 20)) {
      P.kick = { t: 0, dur: 0.34, dir: pressed.ArrowLeft ? 1 : -1 };
      P.v = 0; P.pushing = false;
      emit('kickturn', {});
      return;
    }
  }
  // gracia del combo
  if (!P.manual && !P.lipKey && combo.list.length) {
    if (P.grace > 0) { P.grace -= dt; if (P.grace <= 0) bankCombo(); }
    else bankCombo();
  }
  // física (2 subpasos)
  const n = 2, h = dt / n;
  for (let i = 0; i < n && P.mode === 'ground'; i++) groundStep(h);
  P.crouch = approach(P.crouch, P.charging ? 0.3 + 0.6 * P.charge : P.manual ? 0.22 : P.pumpT > 0 ? 0.25 + 0.5 * Math.sin(P.pumpT / 0.36 * Math.PI) : P.braking ? 0.4 : 0.15 + P.land * 0.5, dt * 5);
  P.tuck = approach(P.tuck, 0, dt * 8);
  P.grab = 0;
}
function groundStep(dt) {
  const p = pathAt(PATH, P.s);
  const wood = isWood(p.x);
  let fr = (wood ? 4 : 6) + 0.00005 * P.v * P.v;
  if (P.manual) fr += 5;
  if (P.braking) fr += 320;
  const a = -G * p.ty;
  const dv = fr * dt;
  if (Math.abs(P.v) <= dv && Math.abs(a) < 0.5) P.v = 0;
  else P.v -= sgn(P.v) * Math.min(Math.abs(P.v), dv);
  P.v = clamp(P.v + a * dt, -VMAX, VMAX);
  const s0 = P.s, s1 = P.s + P.v * dt;
  for (const k of PATH.kinks) {
    if (k.d < 0 && ((s0 < k.s && s1 >= k.s) || (s0 > k.s && s1 <= k.s)) && Math.abs(P.v) > 320 && !P.manual) {
      const pk = pathAt(PATH, k.s + (P.v > 0 ? -0.6 : 0.6));
      P.s = k.s; P.x = k.x; P.y = k.y;
      startAir(P.v * pk.tx, P.v * pk.ty, 0);
      return;
    }
  }
  if (s1 <= 0) { launchVert(-1); return; }
  if (s1 >= PATH.L) { launchVert(1); return; }
  P.s = s1;
  const q = pathAt(PATH, P.s); P.x = q.x; P.y = q.y; P.theta = Math.atan2(q.ty, q.tx);
}

function airUpdate(dt, easy) {
  P.airT += dt;
  // giros 180/360/540...
  let want = 0;
  if (keys.ArrowLeft) want = P.bsSign; else if (keys.ArrowRight) want = -P.bsSign;
  if (pShift()) P.revBuf = 0.25;                                  // revert preparado para la próxima rampa
  P.revBuf = Math.max(0, (P.revBuf || 0) - dt);
  if (P.mcTwist) {                                                // special: el McTwist gira solo 540
    P.spinV = sgn(P.mcTwist) * SPINR * 1.2;
    if (Math.abs(P.spin) >= Math.abs(P.mcTwist) - 0.05) { P.spin = P.mcTwist; P.spinV = 0; P.mcTwist = 0; }
  } else if (want) P.spinV = approach(P.spinV, want * SPINR, 80 * dt);
  else if (P.spinV !== 0) {
    if (easy && Math.abs(P.spin) > 0.05) {
      const d = sgn(P.spinV);
      const tgt = d > 0 ? Math.ceil(P.spin / Math.PI - 1e-4) * Math.PI : Math.floor(P.spin / Math.PI + 1e-4) * Math.PI;
      if (Math.abs(tgt - P.spin) <= Math.abs(P.spinV) * dt) { P.spin = tgt; P.spinV = 0; }
    } else P.spinV = 0;
  }
  P.spin += P.spinV * dt;
  // grab (W mantenido)
  if (keys.KeyW && !P.flip && !nearRail()) {
    P.grab = Math.min(1, P.grab + dt * 9);
    if (P.grab > 0.7 && !P.grabE) P.grabE = addTrick('Indy Grab', 100);
    if (P.grabE) { contTrick(P.grabE, 180, dt); P.grabT = (P.grabT || 0) + dt; }
  } else { P.grab = Math.max(0, P.grab - dt * 9); if (P.grab < 0.3) P.grabE = null; }
  // flip en curso
  if (P.flip) {
    const f = P.flip;
    if (!f.done) {
      f.roll = approach(f.roll, f.rollT, RROLL * dt);
      f.shove = approach(f.shove, f.shoveT, RSHOVE * dt);
      f.pitch = approach(f.pitch || 0, f.pitchT || 0, RROLL * 0.8 * dt);
      if (f.roll === f.rollT && f.shove === f.shoveT && f.pitch === (f.pitchT || 0)) completeFlip();
    } else { f.after += dt; if (f.after > 0.09) P.flip = null; }
  }
  if (P.christ) { P.christ += dt; if (combo.list.length) contTrick(combo.list[combo.list.length - 1], 300, dt); }
  P.tuck = approach(P.tuck, (P.flip && !P.flip.done) ? 1 : P.christ ? 0.25 : P.grab * 0.7, dt * 12);
  P.crouch = approach(P.crouch, P.christ ? 0.05 : 0.3 + P.grab * 0.55 + (P.flip ? 0.2 : 0), dt * 6);
  // integración
  const n = 2, h = dt / n;
  for (let i = 0; i < n && P.mode === 'air'; i++) airStep(h);
}
function airStep(dt) {
  if (P.lip) {
    P.vy -= G * dt; P.y += P.vy * dt;
    const lipY = P.lip < 0 ? MINI.H : BIG.H, lx = P.lip < 0 ? MINI.lip : BIG.lip;
    P.airMaxY = Math.max(P.airMaxY, P.y);
    const f = clamp(Math.abs(P.vy) / Math.max(1, P.vy0), 0, 1);
    P.theta = (P.lip < 0 ? -Math.PI / 2 : Math.PI / 2) * Math.pow(f, 0.7);
    P.x = lx - P.lip * (1 + 9 * (1 - f));
    if (P.y <= lipY && P.vy < 0) { P.y = lipY; P.x = lx; reenterVert(); }
    return;
  }
  const x0 = P.x, y0 = P.y;
  P.vy -= G * dt; P.x += P.vx * dt; P.y += P.vy * dt;
  if (P.x < MINI.lip + 1) { P.x = MINI.lip + 1; if (P.vx < 0) P.vx = -P.vx * 0.2; }
  if (P.x > BIG.lip - 1) { P.x = BIG.lip - 1; if (P.vx > 0) P.vx = -P.vx * 0.2; }
  P.airMaxY = Math.max(P.airMaxY, P.y);
  P.theta += (0 - P.theta) * Math.min(1, 2.4 * dt);
  if (P.vy < 0) {
    for (let ri = 0; ri < RAILS.length; ri++) {
      const r0 = railYi(RAILS[ri], x0), r1 = railYi(RAILS[ri], P.x);
      if (r1 > -1e8 && r0 > -1e8 && y0 >= r0 - 0.5 && P.y <= r1) { P.y = r1; P.rail = ri; catchRail(); return; }
    }
  }
  const gy = groundY(P.x);
  if (P.y <= gy) { P.y = gy; landGround(); }
}
function evalLanding() {
  const easy = isEasy();
  const k = Math.round(P.spin / Math.PI);
  const errS = Math.abs(P.spin - k * Math.PI), tolS = easy ? 0.95 : 0.42;
  if (errS > tolS) { P.bailKind = 'side'; return false; }
  let sk = errS / tolS;
  const cleanFlip = !P.flip || P.flip.done;
  if (P.flip && !P.flip.done) {
    const f = P.flip;
    const rem = Math.abs(f.rollT - f.roll) + Math.abs(f.shoveT - f.shove) + Math.abs((f.pitchT || 0) - (f.pitch || 0)), tolF = easy ? 1.9 : 0.3;
    if (rem > tolF) { P.bailKind = 'front'; return false; }
    sk = Math.max(sk, rem / tolF);
    completeFlip();
  }
  if (!easy && P.grab > 0.5) { P.bailKind = 'back'; return false; }
  if (sk > 0.55) { P.sketchy = 0.7; popup('SKETCHY', 19); }
  // aterrizaje perfecto: recto y con el truco acabado en el aire
  P.perfect = sk < 0.14 && cleanFlip && (P.airTricks.length > 0 || Math.abs(k) >= 1);
  return true;
}
function applySpin() {
  const k = Math.round(P.spin / Math.PI);
  if (Math.abs(k) >= 1) {
    const deg = Math.abs(k) * 180;
    const bs = sgn(P.spin) === sgn(P.bsSign);
    addTrick((bs ? 'BS ' : 'FS ') + deg, SPINPTS[deg] || deg * 3);
  }
  if (k & 1) P.facing = -P.facing;
  P.spin = 0; P.spinV = 0;
}
function finishLanding(vert, impact) {
  applySpin();
  P.grabE = null; P.grab = 0;
  const h = (P.airMaxY - P.airStartY) / PXM;
  const cnt = P.airTricks.length;
  if (vert && cnt === 0 && h > 0.25) addTrick('Air', 60 + h * 60);
  if (!vert && P.popped && cnt === 0) addTrick(P.fakieAir ? 'Fakie Ollie' : 'Ollie', 50);
  if (P.perfect) { combo.airBonus += 150 + 60 * P.airTricks.length; popup('¡PERFECTO!', 21); SND.coin(); P.perfect = false; }
  if ((impact || 0) > 220 || h > 1.4) { hitStop(0.05); shake((impact || 0) > 320 ? 2 : 1); }
  P.mcTwist = 0; P.christ = 0;
  if (h >= 0.25 && (vert || P.popped || P.airTricks.length)) {
    combo.airBonus += Math.round(h * h * 40 + h * 60);
    HUD.air = { h, t: 2.2, x: P.x, y: P.airMaxY };
    if (h > SAVE.rec.air) SAVE.rec.air = h;
  }
  const fakie = sgn(P.v) !== 0 && sgn(P.v) !== P.facing;
  if (vert && fakie) addTrick('Fakie', 100);
  emit('land', { tricks: P.airTricks.slice(), h, vert, lip: vert, fakie, popped: P.popped, grabT: P.grabT || 0 });
  P.flip = null; P.popped = false; P.lip = 0; P.grindKey = null; P.grabT = 0;
  P.land = clamp((impact || 0) / 260, 0.15, 1);
  if (!vert) dust(P.x, P.y, P.z, Math.round(clamp((impact || 0) / 35, 2, 10)), 90);
  if ((impact || 0) > 230 || h > 1.8) spookPigeons(P.x);
  if (keys.KeyW && canManual()) startManual(); else P.grace = 0.6;
  if (vert) { if (P.revBuf > 0) doRevert(); else P.revWin = 0.28; }
  SND.land(impact || 60);
}
function reenterVert() {
  const sp = Math.abs(P.vy), side = P.lip;
  if (!evalLanding()) {
    P.s = side < 0 ? 0.5 : PATH.L - 0.5; P.v = side < 0 ? sp : -sp; P.mode = 'ground';
    bailNow(); return;
  }
  P.mode = 'ground'; P.s = side < 0 ? 0.01 : PATH.L - 0.01; P.v = side < 0 ? sp : -sp;
  const q = pathAt(PATH, P.s); P.x = q.x; P.y = q.y; P.theta = Math.atan2(q.ty, q.tx);
  SND.coping();
  finishLanding(side, 40);
}
function landGround() {
  const s = sOfX(PATH, P.x);
  const p = pathAt(PATH, s);
  const vt = P.vx * p.tx + P.vy * p.ty;
  const vn = Math.abs(P.vx * (-p.ty) + P.vy * p.tx);
  P.s = s; P.v = clamp(vt, -VMAX, VMAX);
  if (!evalLanding()) { P.mode = 'ground'; bailNow(); return; }
  P.mode = 'ground'; P.x = p.x; P.y = p.y; P.theta = Math.atan2(p.ty, p.tx);
  finishLanding(0, vn);
}
// ---------- Grind ----------
function catchRail() {
  if (!evalLanding()) { bailNow(); return; }
  applySpin();
  P.grabE = null; P.grab = 0; P.flip = null;
  P.mode = 'grind';
  P.rs = clamp(sOfX(RAILS[P.rail].path, P.x), 0, RAILS[P.rail].path.L);
  const rp = pathAt(RAILS[P.rail].path, P.rs);
  P.rv = P.vx * rp.tx + P.vy * rp.ty;
  if (Math.abs(P.rv) < 25) P.rv = 25 * (sgn(P.vx) || P.facing);
  let code = 'KeyW';
  if (P.grindKey) code = P.grindKey;
  else for (const c of ['KeyA', 'KeyD', 'KeyS', 'KeyW']) if (keys[c]) code = c;
  P.grindKey = null;
  P.grind = { code, e: addTrick(GRINDS[code].n, GRINDS[code].pts), mn: P.rs, mx: P.rs, t: 0 };
  P.gbal = (Math.random() - 0.5) * 0.3;
  P.zt = RAILS[P.rail].z; P.charging = false;
  P.airTricks = [];
  SND.grindStart();
}
function switchGrind(code) {
  if (!P.grind || !GRINDS[code] || P.grind.code === code) return;
  if (P.grind.t < 0.25) {        // elección justo al caer: sustituye
    const e = P.grind.e; combo.base -= e.pts; combo.list.splice(combo.list.indexOf(e), 1);
  }
  P.grind.code = code; P.grind.e = addTrick(GRINDS[code].n, GRINDS[code].pts);
  SND.grindStart();
}
function endGrind() {
  if (!P.grind) return;
  const cov = (P.grind.mx - P.grind.mn) / RAILS[P.rail || 0].path.L;
  emit('grind', { coverage: cov, t: P.grind.t, code: P.grind.code, rail: P.rail || 0 });
  P.grind = null; P.zt = 0;
}
function grindUpdate(dt, easy) {
  const g = P.grind;
  const rp = pathAt(RAILS[P.rail].path, P.rs);
  if (pressed.Space && !P.charging) { P.charging = true; P.charge = 0; }
  if (P.charging) { P.charge = Math.min(1, P.charge + dt / 0.42); if (!keys.Space) { pop(Math.max(0.35, P.charge)); return; } }
  const fr = 24 + (g.code === 'KeyA' ? 14 : g.code === 'KeyD' ? 8 : 0);
  P.rv += -G * rp.ty * dt;
  P.rv -= sgn(P.rv) * Math.min(Math.abs(P.rv), fr * dt);
  const drift = easy ? 0.9 : 1.8;
  P.gbal += (P.gbal * drift * 1.4 + (Math.random() - 0.5) * drift * 1.5) * dt;
  if (keys.ArrowLeft) P.gbal -= 2.7 * dt;
  if (keys.ArrowRight) P.gbal += 2.7 * dt;
  g.t += dt;
  contTrick(g.e, GRINDS[g.code].rate, dt);
  P.crouch = approach(P.crouch, P.charging ? 0.35 + 0.5 * P.charge : 0.35, dt * 6);
  P.tuck = approach(P.tuck, 0, dt * 10);
  if (Math.abs(P.gbal) >= 1) {
    const vx = P.rv * rp.tx, vy = P.rv * rp.ty;
    endGrind(); P.vx = vx; P.vy = vy; P.mode = 'air';
    bailNow(); return;
  }
  P.rs += P.rv * dt;
  g.mn = Math.min(g.mn, P.rs); g.mx = Math.max(g.mx, P.rs);
  if (P.rs <= 0 || P.rs >= RAILS[P.rail].path.L || Math.abs(P.rv) < 3) {
    P.rs = clamp(P.rs, 0, RAILS[P.rail].path.L);
    const q = pathAt(RAILS[P.rail].path, P.rs);
    P.x = q.x; P.y = q.y;
    const vx = P.rv * q.tx, vy = P.rv * q.ty;
    endGrind();
    startAir(vx, vy + 10, 0);
    return;
  }
  const q = pathAt(RAILS[P.rail].path, P.rs);
  P.x = q.x; P.y = q.y; P.theta = Math.atan2(q.ty, q.tx);
}
// ---------- Caídas ----------
function mkPB(x, y, vx, vy) { return { x, y, vx, vy, air: true, s: 0, v: 0 }; }
function pbStep(b, dt, fr) {
  if (b.air) {
    b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < MINI.lip + 1) { b.x = MINI.lip + 1; b.vx = Math.abs(b.vx) * 0.3; }
    if (b.x > BIG.lip - 1) { b.x = BIG.lip - 1; b.vx = -Math.abs(b.vx) * 0.3; }
    const gy = groundY(b.x);
    if (b.y <= gy) {
      b.s = sOfX(PATH, b.x); const p = pathAt(PATH, b.s);
      b.v = b.vx * p.tx + b.vy * p.ty; b.air = false; b.x = p.x; b.y = p.y;
      return true;
    }
  } else {
    const p = pathAt(PATH, b.s);
    b.v += -G * p.ty * dt;
    const d = fr * dt;
    b.v = Math.abs(b.v) <= d ? (Math.abs(p.ty) < 0.05 ? 0 : b.v - sgn(b.v) * d * 0.5) : b.v - sgn(b.v) * d;
    b.s += b.v * dt;
    if (b.s < 1) { b.s = 1; b.v = Math.abs(b.v) * 0.3; }
    if (b.s > PATH.L - 1) { b.s = PATH.L - 1; b.v = -Math.abs(b.v) * 0.3; }
    const q = pathAt(PATH, b.s); b.x = q.x; b.y = q.y;
  }
  return false;
}
function bailNow() {
  let vx, vy;
  if (P.mode === 'ground') { const p = pathAt(PATH, P.s); vx = P.v * p.tx; vy = P.v * p.ty; const q = pathAt(PATH, P.s); P.x = q.x; P.y = q.y; }
  else { vx = P.vx; vy = P.vy; }
  if (P.grind) endGrind();
  loseCombo();
  SND.fall();
  const body = mkPB(P.x, P.y + 1, vx * 0.6, Math.max(vy * 0.4, 30));
  const board = mkPB(P.x, P.y + 2, vx * 1.1 + (Math.random() - 0.5) * 60, Math.max(vy * 0.4, 0) + 70);
  P.bail = { t: 0, body, board, brot: 0, bspin: (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 10), byaw: P.facing > 0 ? 0 : Math.PI,
    dir: sgn(vx) || P.facing, upside: Math.random() < 0.4, still: 0, ret: 0, rx: 0 };
  P.mode = 'bail'; P.flip = null; P.grab = 0; P.grabE = null; P.grind = null; P.manual = false; P.manE = null;
  P.special = 0; P.mcTwist = 0; P.christ = 0; P.revWin = 0; shake(3); hitStop(0.06);
  P.charging = false; P.spin = 0; P.spinV = 0; P.zt = 0; P.lip = 0; P.kick = null; P.pushing = false; P.braking = false;
  P.tq.length = 0; P.queuedFlip = null; P.grindKey = null; P.lipKey = null;
  P.bail.kind = P.bailKind || (Math.random() < 0.5 ? 'back' : 'front'); P.bailKind = null;
  dust(P.x, P.y, 0, 12, 120); spookPigeons(P.x);
  emit('bail', {});
}
function bailUpdate(dt) {
  const b = P.bail;
  b.t += dt;
  pbStep(b.body, dt, 260);
  if (b.ret === 0) {
    if (pbStep(b.board, dt, 70)) SND.boardHit();
    if (b.board.air) b.brot += b.bspin * dt;
    else b.brot = b.upside ? Math.PI : 0;
  }
  P.x = b.body.x; P.y = b.body.y;
  if (!b.body.air && Math.abs(b.body.v) < 6) b.still += dt;
  if (b.t > 1.3 && b.still > 0.3 && !b.ret) { b.ret = 0.0001; b.rx = b.board.s; }
  if (b.t > 3.5 && !b.ret) { b.ret = 0.0001; b.rx = b.board.s; b.body.v = 0; }
  if (b.ret) {
    b.ret += dt;
    if (b.ret > 0.6) {
      const k = clamp((b.ret - 0.6) / 0.4, 0, 1);
      b.board.s = lerp(b.rx, b.body.s, k * k * (3 - 2 * k));
      const q = pathAt(PATH, b.board.s); b.board.x = q.x; b.board.y = q.y; b.board.air = false;
      b.brot = b.upside ? Math.PI * (1 - k) : 0;
    }
    if (b.ret > 1.05) {
      const s = b.body.s, f = P.facing;
      P.mode = 'ground'; P.s = s; P.v = 0; P.bail = null;
      const q = pathAt(PATH, s); P.x = q.x; P.y = q.y; P.theta = Math.atan2(q.ty, q.tx);
      P.crouch = 0.6; P.land = 0.6; P.grace = 0; P.facing = f;
    }
  }
}

// ---------- Pose y dibujo ----------
function computePose() {
  const p = defaultPose();
  p.crouch = P.crouch;
  p.tuck = P.tuck;
  p.leanF = 0.1 + P.crouch * 0.4;
  if (P.mode === 'air') { p.arm = 0.55 + 0.3 * P.grab; p.armUp = P.lip ? 0.25 : 0.1; }
  else if (P.mode === 'grind') { p.arm = 0.9; p.leanX = P.gbal * 0.45; }
  else if (P.manual) { p.arm = 0.85; p.leanX = -0.2 - P.mbal * 0.4; }
  else p.arm = 0.12 + Math.min(0.3, Math.abs(P.v) / 900);
  if (P.grab > 0.01) { p.grab = P.grab; p.grabTarget = [1.5, -0.6 + 3 * P.grab, 3.7]; p.leanF += 0.25 * P.grab; }
  if (P.mode === 'ground' && P.pushing) {
    const ph = P.push % 1;
    const base = [-5.5, 0, 0.3];
    let t;
    if (ph < 0.2) { const k = ph / 0.2; t = [lerp(-5.5, -1, k), lerp(0, -6, k) + Math.sin(k * Math.PI) * 2, lerp(0.3, 5.5, k)]; }
    else if (ph < 0.55) { const k = (ph - 0.2) / 0.35; t = [lerp(-1, -15, k), -6, 5.5]; }
    else { const k = (ph - 0.55) / 0.45; t = [lerp(-15, -5.5, k), lerp(-6, 0, k) + Math.sin(k * Math.PI) * 3, lerp(5.5, 0.3, k)]; }
    p.bf = vsub(t, base);
    const am = Math.sin(Math.min(1, ph / 0.15) * Math.PI / 2) * (ph > 0.85 ? (1 - ph) / 0.15 : 1);
    p.ffRot = Math.PI / 2 * am; p.twist = 0.75 * am; p.crouch = Math.max(p.crouch, 0.42 * am); p.headYaw = 0.5;
    p.hipX = 2.5 * am;
  }
  if (P.mode === 'ground' && P.braking && Math.abs(P.v) > 5) { p.bf = [-6, -6, 4.5]; p.twist = 0.35; p.crouch = 0.4; p.ffRot = 0.6; }
  // brazos que acompañan el empuje y mirada
  if (P.mode === 'ground' && P.pushing) p.swing = Math.sin(P.push * Math.PI * 2) * 0.9;
  if (P.mode === 'air' && P.flip && !P.flip.done) { p.headPitch = 0.6; p.headYaw = 0.5; }
  if (P.mode === 'air' && Math.abs(P.spinV) > 1) p.headYaw = 0.2;
  if (P.mode === 'deck' && P.drop) { p.crouch = Math.max(p.crouch, 0.45); p.leanX = 0.3; p.arm = 0.6; }
  if (P.sketchy > 0) { const w = Math.sin(game.t * 28); p.arm = 1; p.armUp = 0.45 + 0.35 * w; p.leanX = 0.22 * w; }
  if (P.celebrate > 0 && (P.mode === 'ground' || P.mode === 'deck')) { p.armUp = 1; p.arm = 0.25; p.headPitch = -0.35; p.crouch = 0.1 + 0.15 * Math.abs(Math.sin(game.t * 9)); }
  if (P.christ) { p.arm = 1; p.armUp = 0.55; p.leanF = -0.05; p.headPitch = -0.25; p.crouch = 0.05; }
  if ((P.idleT || 0) > 2.5) { p.headYaw = 0.95 + Math.sin(P.idleT * 0.9) * 0.9; p.leanX = Math.sin(P.idleT * 0.45) * 0.06; }
  return p;
}
function playerBright() { return lightAtPlayer(P.x); }
function drawPlayer() {
  if (P.mode === 'bail') { drawBail(); return; }
  if (P.mode === 'walk') { drawWalker(); return; }
  if (P.mode === 'lip') { drawLip(); return; }
  const cu = SAVE.cust;
  const pose = computePose();
  const boxes = [];
  buildBody(pose, cu, boxes);
  if (cu.stance === 1) xformBoxes(boxes, MIRZ, [0, 0, 0]);
  let roll = 0, shove = 0;
  if (P.flip) { roll = P.flip.roll; shove = P.flip.shove; }
  const lift = P.mode === 'air' ? 2.2 * P.tuck + 1.5 * P.grab + (P.christ ? 8 : 0) : 0;
  const Rb = mm(rY(shove), mm(rX(roll), rZ(P.bpitch + (P.flip ? P.flip.pitch || 0 : 0) + (P.christ ? 1.45 : 0))));
  buildBoard(cu, boxes, Rb, [0, lift, 0], P.wspin || 0);
  let pitch = 0, piv = null, extraYaw = 0, h = 6;
  if (P.mode === 'ground' && P.manual) { pitch = 0.2 + P.mbal * 0.12; piv = [-6, -6, 0]; }
  if ((P.mode === 'ground' || P.mode === 'deck') && P.kick) { const k = P.kick.t / P.kick.dur; extraYaw = P.kick.dir * Math.PI * (k * k * (3 - 2 * k)); pitch = 0.35 * Math.sin(k * Math.PI); piv = [-6, -6, 0]; }
  if (P.mode === 'grind') {
    const c = P.grind.code; h = 3.9;
    if (c === 'KeyS') { pitch = 0.22; piv = [-6, -3.9, 0]; }
    else if (c === 'KeyA') { extraYaw = Math.PI / 2; h = 1.0; }
    else if (c === 'KeyD') { pitch = -0.2; piv = [6, -3.9, 0]; extraYaw = 0.3; }
  }
  if (piv) { const M = rZ(pitch); xformBoxes(boxes, M, vsub(piv, mv(M, piv))); }
  const yaw = (P.facing > 0 ? 0 : Math.PI) + P.spin + extraYaw + (P.revAnim > 0 ? Math.PI * P.revAnim / 0.28 : 0);
  const Rw = mm(rZ(P.theta), rY(yaw));
  const nx = -Math.sin(P.theta), ny = Math.cos(P.theta);
  const O = [P.x + nx * h, P.y + ny * h, P.z];
  if (P.mode !== 'grind' && !isWood(P.x) && groundY(P.x) === 0 && P.y < 40) REFLECT = Math.round(SY(0, P.z));
  drawRigWorld(SPR_MAIN, boxes, Rw, O, playerBright());
}
function drawBail() {
  const b = P.bail, cu = SAVE.cust;
  // tabla
  const bb = b.board;
  const bp = bb.air ? { tx: 1, ty: 0 } : pathAt(PATH, bb.s);
  const bth = bb.air ? 0 : Math.atan2(bp.ty, bp.tx);
  const bnx = -Math.sin(bth), bny = Math.cos(bth);
  const up = Math.cos(b.brot) < 0;
  const bh = bb.air ? 3 : (up ? 0 : 6);
  const boxesB = buildBoard(cu, [], I3(), [0, 0, 0]);
  drawRigWorld(SPR_BOARD, boxesB, mm(rZ(bth), mm(rY(b.byaw), rX(b.brot))), [bb.x + bnx * bh, bb.y + bny * bh, 0], playerBright());
  // cuerpo
  const bd = b.body;
  const p = bd.air ? { tx: 1, ty: 0 } : pathAt(PATH, bd.s);
  const th = Math.atan2(p.ty, p.tx);
  let k = clamp(b.t / 0.35, 0, 1);
  if (b.ret) k = 1 - clamp(b.ret / 0.55, 0, 1);
  const pose = defaultPose();
  pose.fall = k; pose.arm = 0.4 + 0.6 * k; pose.armUp = 0.6 * k; pose.crouch = b.ret ? 0.5 * k + 0.1 : 0.1 + 0.2 * k; pose.leanF = 0.1;
  pose.headYaw = 0.6;
  const boxes = [];
  buildBody(pose, cu, boxes);
  if (cu.stance === 1) xformBoxes(boxes, MIRZ, [0, 0, 0]);
  // caída hacia delante, hacia atrás o de lado según el error
  const kd = b.kind === 'front' ? 1 : -1;
  const rot = kd * b.dir * Math.PI / 2 * k * (P.facing > 0 ? 1 : -1);
  const twist = b.kind === 'side' ? rX(0.9 * k) : I3();
  const Rw = mm(rZ(th), mm(rY(P.facing > 0 ? 0 : Math.PI), mm(rZ(rot), twist)));
  const nx = -Math.sin(th), ny = Math.cos(th);
  const hh = 4.6 * k;
  drawRigWorld(SPR_MAIN, boxes, Rw, [bd.x + nx * hh, bd.y + ny * hh, 0], playerBright());
}
