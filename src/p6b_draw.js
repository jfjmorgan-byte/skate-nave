
// =====================================================================
//  Dibujo: escena, HUD, menús, vestidor, resultados; bucle a 60 fps
// =====================================================================
function drawLogo(cx, y, b) {
  const l1 = makeBlockText('PIXEL SKATE', { b, ramp: [10, 21, 21, 20, 20, 19, 18], outline: 0, shadow: 1, sd: b > 2 ? 3 : 2, hl: 10 });
  ctx.drawImage(l1, Math.round(cx - l1.width / 2), y);
  const b2 = Math.max(1, b - 2);
  const l2 = makeBlockText('LA NAVE', { b: b2, ramp: [10, 29, 28, 27], outline: 0, shadow: 1, sd: 2, hl: b2 > 1 ? 10 : -1 });
  const y2 = y + l1.height - 4;
  const lx = Math.round(cx - l2.width / 2);
  for (let i = 0; i < 3; i++) {
    rect(lx - 40, y2 + l2.oy + 1 + i * Math.max(2, b2 + 1), 34, 1, i === 1 ? 20 : 19);
    rect(lx + l2.width + 6, y2 + l2.oy + 1 + i * Math.max(2, b2 + 1), 34, 1, i === 1 ? 20 : 19);
  }
  ctx.drawImage(l2, lx, y2);
  return y2 + l2.height;
}
function drawIdleSkater(x, facing) {
  resetPlayer(x, facing);
  P.crouch = 0.15 + Math.sin(game.t * 2) * 0.03;
  P.idleT = game.t;
  drawShadow(P.x, 0, 0);
  drawPlayer();
}
function drawScene(withSkater, noParts) {
  drawSceneBack();
  if (withSkater) {
    const onRail = P.mode === 'grind' || P.z > 6;
    if (onRail) drawRailLayer();
    if (P.mode === 'bail') {
      drawShadow(P.bail.board.x, 0, P.bail.board.y - groundY(P.bail.board.x), 9);
      drawShadow(P.bail.body.x, 0, P.bail.body.y - groundY(P.bail.body.x), 13);
    } else drawShadow(P.x, P.z, Math.max(0, P.y - groundY(P.x)), P.mode === 'walk' ? 6 : 11);
    drawPlayer();
    if (!onRail) drawRailLayer();
    if (!noParts) drawParts();
  } else drawRailLayer();
  drawDust(game.t);
  drawFence();
}
function drawCoins(rx, y) {
  const s = fmt(SAVE.coins);
  const x = rx - textW(s);
  drawTextO(s, x, y, 21, 0);
  const cx = x - 7;
  const C = ['.###.', '#+++#', '#+#+#', '#+++#', '.###.'];
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
    const ch = C[j][i]; if (ch === '.') continue;
    rect(cx + i, y + j, 1, 1, ch === '#' ? 19 : ch === '+' ? 21 : 10);
  }
  rect(cx - 1, y + 1, 1, 3, 0); rect(cx + 5, y + 1, 1, 3, 0); rect(cx + 1, y - 1, 3, 1, 0); rect(cx + 1, y + 5, 3, 1, 0);
}
// Medalla pixel de 5x5 (gris si aún no se tiene)
function drawMedal(x, y, tier, got) {
  const c = got ? MEDAL_COL[tier] : MEDAL_COL[0];
  const M = ['.###.', '#+++#', '#++##', '#+###', '.###.'];
  rect(x + 1, y - 1, 3, 1, 0); rect(x + 1, y + 5, 3, 1, 0); rect(x - 1, y + 1, 1, 3, 0); rect(x + 5, y + 1, 1, 3, 0);
  rect(x, y, 1, 1, 0); rect(x + 4, y, 1, 1, 0); rect(x, y + 4, 1, 1, 0); rect(x + 4, y + 4, 1, 1, 0);
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
    const ch = M[j][i]; if (ch === '.') continue;
    rect(x + i, y + j, 1, 1, ch === '+' ? c[1] : c[0]);
  }
}
function medalRow(i, cx, y) {
  const R = RETOS[i], got = medalOf(i);
  const items = [];
  for (let k = 1; k <= 3; k++) if (R.m[k - 1]) items.push([k, R.m[k - 1]]);
  const w = items.reduce((a, [, l]) => a + 9 + textW(l) + 8, -8);
  let x = Math.round(cx - w / 2);
  for (const [k, l] of items) {
    drawMedal(x, y, k, got >= k);
    drawTextO(l, x + 8, y, got >= k ? 10 : 6, 0);
    x += 9 + textW(l) + 8;
  }
}
function drawMeter(cx, cy, val, vertical) {
  if (vertical) {
    const h = 30, x = cx, y = cy - h / 2;
    rect(x - 1, y - 1, 5, h + 2, 0); rect(x, y, 3, h, 2);
    rect(x, y + h / 2 - 5, 3, 10, 23);
    const my = Math.round(y + h / 2 + val * (h / 2 - 1));
    rect(x - 1, my - 1, 5, 3, 0); rect(x, my, 3, 1, Math.abs(val) > 0.7 ? 19 : 21);
  } else {
    const w = 34, x = cx - w / 2, y = cy;
    rect(x - 1, y - 1, w + 2, 5, 0); rect(x, y, w, 3, 2);
    rect(x + w / 2 - 6, y, 12, 3, 23);
    const mx = Math.round(x + w / 2 + val * (w / 2 - 1));
    rect(mx - 1, y - 1, 3, 5, 0); rect(mx, y, 1, 3, Math.abs(val) > 0.7 ? 19 : 21);
  }
}
function panelBox(x, y, w, h) {
  x = Math.round(x); y = Math.round(y);
  rect(x, y, w, h, 1); frame(x, y, w, h, 0); rect(x + 1, y + 1, w - 2, 1, 3); rect(x + 1, y + h - 2, w - 2, 1, 0);
}
function drawHUD() {
  drawTextO('PUNTOS ' + fmt(score), 5, 5, 10, 0);
  drawTextO('MEJOR COMBO ' + fmt(SAVE.rec.combo), 5, 13, 7, 0);
  // barra de special
  { const sp = P.special || 0, full = sp >= 1, bw = 44;
    drawTextO('SPECIAL', 5, 22, full ? (game.t % 0.4 < 0.2 ? 21 : 10) : 6, 0);
    rect(35, 22, bw + 2, 5, 0); rect(36, 23, bw, 3, 2);
    for (let i = 0; i < Math.round(sp * bw); i++) rect(36 + i, 23, 1, 3, full ? (((i + Math.floor(game.t * 20)) % 6) < 3 ? 21 : 20) : i > bw * 0.6 ? 20 : 26);
    if (full) drawTextO('SHIFT + W A D S', 84, 22, 21, 0); }
  drawCoins(W - 6, 5);
  const dl = SAVE.diff ? 'REALISTA' : 'FÁCIL';
  drawTextO(dl, W - 6 - textW(dl), 14, 6, 0);
  if (game.timed) {
    const s = Math.ceil(game.timeLeft), txt = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    drawBig(txt, W / 2, 6, s <= 10 && game.t % 1 < 0.5 ? [10, 20, 19, 18] : [10, 9, 8, 7]);
    if (game.mode === 'retos') medalRow(game.reto, W / 2, 26);
    else drawTextOC('CONTRARRELOJ · RÉCORD ' + fmt(SAVE.rec.timed), W / 2, 26, 7, 0);
  } else if (game.mode === 'retos' && game.reto >= 0) {
    const R = RETOS[game.reto];
    drawTextOC('RETO ' + (game.reto + 1) + '/' + RETOS.length + ': ' + R.t, W / 2, 5, HUD.reto > 0 && (game.t * 6 % 2 < 1) ? 10 : 20, 0);
    medalRow(game.reto, W / 2, 13);
    if (!HUD.medal) drawTextOC(R.d, W / 2, 22, 8, 0);
  } else drawTextOC('SESIÓN LIBRE', W / 2, 5, 7, 0);
  // velocidad
  const sp = P.mode === 'ground' ? Math.abs(P.v) : P.mode === 'grind' ? Math.abs(P.rv) : P.mode === 'air' ? Math.hypot(P.vx, P.vy) : 0;
  const bw = 60;
  drawTextO('VEL', 5, H - 12, 7, 0);
  rect(19, H - 13, bw + 2, 7, 0); rect(20, H - 12, bw, 5, 2);
  const fw = Math.round(clamp(sp / VMAX, 0, 1) * bw);
  for (let i = 0; i < fw; i++) rect(20 + i, H - 12, 1, 5, i > bw * 0.65 ? 19 : i > bw * 0.45 ? 20 : 24);
  const mk = Math.round(Math.sqrt(2 * G * BIG.H) / VMAX * bw);
  rect(20 + mk, H - 14, 1, 9, 10);
  if (P.mode === 'ground' && P.pumpReady) drawTextO('SHIFT: ¡BOMBEA!', 86, H - 12, game.t % 0.3 < 0.18 ? 25 : 10, 0);
  // combo actual
  if (combo.list.length) {
    const total = comboTotal();
    drawBig(fmt(combo.base + combo.airBonus) + ' × ' + combo.list.length, W / 2, 44, [10, 21, 20, 19]);
    const names = combo.list.map(t => t.name.toUpperCase());
    let line = names.join(' + ');
    while (textW(line) > W - 30 && names.length > 1) { names.shift(); line = '... + ' + names.join(' + '); }
    drawTextOC(line, W / 2, 64, 9, 0);
    drawTextOC('= ' + fmt(total), W / 2, 72, 21, 0);
    if (P.mode === 'ground' && !P.manual && P.grace > 0 && P.graceMax) {
      const gw = 60, gx = Math.round(W / 2 - gw / 2), fw2 = Math.round(gw * P.grace / P.graceMax);
      rect(gx - 1, 80, gw + 2, 4, 0); rect(gx, 81, fw2, 2, P.grace < 0.25 ? 18 : 21);
      drawTextOC('W MANUAL · SHIFT REVERT', W / 2, 86, 7, 0);
    }
  } else if (HUD.bank && (HUD.bank.t > 0.3 || game.t * 10 % 2 < 1)) {
    drawBig('+' + fmt(HUD.bank.total), W / 2, 44, [10, 25, 24, 23]);
    if (HUD.bank.coins) drawTextOC('+' + HUD.bank.coins + (HUD.bank.coins === 1 ? ' MONEDA' : ' MONEDAS'), W / 2, 66, 21, 0);
  }
  if (HUD.lost > 0 && !combo.list.length) {
    drawBig('¡CAÍDA!', W / 2, 44, [10, 20, 19, 18]);
    if (HUD.lostPts) drawTextOC('COMBO PERDIDO: ' + fmt(HUD.lostPts), W / 2, 66, 19, 0);
  }
  if (HUD.air) {
    const sx = Math.round(SX(HUD.air.x)), sy = Math.round(SY(HUD.air.y + 50, 0) - (2.2 - HUD.air.t) * 6);
    drawTextOC('AIRE ' + fmtM(HUD.air.h) + ' M', clamp(sx, 30, W - 30), clamp(sy, 32, H - 20), 29, 0);
  }
  for (const p of popups) {
    const sx = Math.round(SX(p.x)), sy = Math.round(SY(p.y, 0) - p.t * 14);
    drawTextOC(p.text, clamp(sx, 24, W - 24), sy, p.col, 0);
  }
  const psx = Math.round(SX(P.x)), psy = Math.round(SY(P.y, P.z || 0));
  if (P.mode === 'ground' && P.manual) drawMeter(psx + 16, psy - 22, P.mbal, true);
  if (P.mode === 'grind') drawMeter(psx, psy - 58, P.gbal, false);
  if (P.mode === 'lip') drawMeter(psx, psy - 60, P.lbal, false);
  if (P.charging) { const w = Math.round(P.charge * 16); rect(psx - 9, psy + 10, 18, 4, 0); rect(psx - 8, psy + 11, w, 2, P.charge >= 1 ? 10 : 21); }
  // medalla conseguida
  if (HUD.medal) {
    const m = HUD.medal, y = 92;
    panelBox(W / 2 - 112, y - 7, 224, m.unl ? 46 : 38);
    drawBig('¡MEDALLA DE ' + MEDAL[m.tier] + '!', W / 2, y, m.tier === 3 ? [10, 21, 20, 19] : m.tier === 2 ? [10, 9, 8, 7] : [16, 15, 14, 13]);
    drawMedal(W / 2 - 104, y + 2, m.tier, true); drawMedal(W / 2 + 99, y + 2, m.tier, true);
    drawTextOC('+' + m.coins + ' MONEDAS' + (m.next ? ' · SIGUIENTE RETO...' : ''), W / 2, y + 19, 21, 0);
    if (m.unl) drawTextOC('DESBLOQUEADO: ' + m.unl, W / 2, y + 28, 29, 0);
  }
  const hint = contextHint();
  if (hint) drawTextOC(hint, W / 2, H - 22, 10, 0);
  else if (game.hintT > 0 && game.mode === 'free' && !combo.list.length) drawTextOC('↑ EMPUJAR · ESPACIO OLLIE · SHIFT BOMBEAR · P PAUSA', W / 2, H - 22, 8, 0);
  if (SND.muted) drawTextO('SIN SONIDO (M)', W - 64, H - 12, 6, 0);
}
function drawMenuScreen() {
  drawScene(false);
  drawIdleSkater(150, 1);
  dimScreen();
  const ly = drawLogo(W / 2, 4, 3);
  const top = ly + 6;
  const lw = 144;
  const lx = Math.max(6, Math.round(W / 2 - (lw + 242) / 2));
  panelBox(lx, top, lw, 144);
  MENU.forEach((m, i) => {
    const y = top + 7 + i * 14;
    const on = i === game.sel;
    let l = m.l;
    if (m.id === 'diff') l += ': ' + (SAVE.diff ? 'REALISTA' : 'FÁCIL');
    if (m.id === 'snd') l += ': ' + (SAVE.muted ? 'NO' : 'SÍ');
    if (m.id === 'tod') l += ': ' + TOD[SAVE.tod].n;
    if (m.id === 'map') l += ': ' + MAPS[SAVE.map].n;
    if (on) { rect(lx + 3, y - 3, lw - 6, 11, 27); drawText('>', lx + 5, y, 21, 0); }
    drawText(l, lx + 11, y, on ? 10 : 7, 0);
  });
  drawText(SAVE.diff ? 'CAER RECTO Y CON EL TRUCO ACABADO' : 'TOLERANCIA AMPLIA AL ATERRIZAR', lx + 5, top + 134, 6, 0);
  drawCoins(lx + lw - 4, top - 8);
  const nMed = Object.values(SAVE.medals).reduce((a, v) => a + v, 0);
  drawTextO('MEDALLAS ' + nMed + '/' + RETOS.length * 3, lx, top + 151, 7, 0);
  drawTextO('COMBO ' + fmt(SAVE.rec.combo), lx, top + 160, 6, 0);
  drawTextO('AIRE ' + fmtM(SAVE.rec.air) + ' M · MANUAL ' + fmtM(SAVE.rec.manual) + ' S', lx, top + 169, 6, 0);
  drawTextO('CONTRARRELOJ ' + fmt(SAVE.rec.timed), lx, top + 178, 6, 0);
  const cx = lx + lw + 6, cw = Math.min(W - cx - 4, 242);
  const CL = CONTROLS.slice(0, 18);
  panelBox(cx, top, cw, 30 + CL.length * 8);
  drawText('CONTROLES', cx + 5, top + 5, 21, 0);
  CL.forEach((c, i) => {
    const y = top + 15 + i * 8;
    drawText(c[0], cx + 5, y, 20, 0);
    drawText(c[1], cx + 36, y, 8, 0);
  });
  drawText('MÁS EN CONTROLES: REVERT, SPECIAL, MANDO...', cx + 5, top + 17 + CL.length * 8, 29, 0);
  drawTextO('↑↓ ELEGIR · ENTER ACEPTAR · ESC VOLVER', lx, H - 9, 6, 0);
}
function drawTitle() {
  drawScene(false);
  dimScreen();
  const bx = buildBoard(SAVE.cust, [], rX(game.t * 3.2), [0, 0, 0], game.t * 6);
  drawRigAt(SPR_PREV, bx, rY(0.5 + Math.sin(game.t * 0.6) * 0.3), W / 2, 40, 2, 1.1);
  const ly = drawLogo(W / 2, 64, 4);
  if (game.t % 1.2 < 0.8) drawTextOC('PULSA ENTER PARA EMPEZAR', W / 2, ly + 20, 10, 0);
  drawTextOC('UN JUEGO DE SKATE ORIGINAL · SKATEPARK DENTRO DE UNA NAVE', W / 2, H - 22, 7, 0);
  drawTextOC('© 2026 · TODO GENERADO POR CÓDIGO', W / 2, H - 12, 5, 0);
}
function drawRetos() {
  drawScene(false);
  dimScreen();
  drawBig('RETOS DEL PARQUE', W / 2, 6, [10, 21, 20, 19]);
  const w = Math.min(W - 16, 380), x = Math.round(W / 2 - w / 2), top = 24;
  panelBox(x, top, w, 212);
  RETOS.forEach((r, i) => {
    const y = top + 6 + i * 10;
    const on = i === game.rsel, unl = retoUnlocked(i), m = medalOf(i);
    if (on) rect(x + 3, y - 2, w - 6, 9, 27);
    drawText((i + 1 < 10 ? '0' : '') + (i + 1), x + 6, y, unl ? 20 : 4, 0);
    drawText(r.t, x + 20, y, unl ? (on ? 10 : 8) : 4, 0);
    if (!unl) drawTextR('BLOQUEADO', x + w - 6, y, 4, 0);
    else for (let k = 1; k <= 3; k++) if (r.m[k - 1]) drawMedal(x + w - 6 - (4 - k) * 8, y, k, m >= k);
  });
  const R = RETOS[game.rsel];
  if (retoUnlocked(game.rsel)) {
    drawTextOC(R.d, W / 2, top + 218, 9, 0);
    medalRow(game.rsel, W / 2, top + 228);
  } else drawTextOC('CONSIGUE AL MENOS BRONCE EN EL RETO ANTERIOR', W / 2, top + 218, 19, 0);
  drawTextOC('ENTER JUGAR · ESC VOLVER', W / 2, H - 9, 6, 0);
}
function drawControls() {
  drawScene(false);
  dimScreen();
  drawBig('CONTROLES', W / 2, 6, [10, 21, 20, 19]);
  const w = Math.min(W - 16, 300), x = Math.round(W / 2 - w / 2), top = 24;
  panelBox(x, top, w, 12 + CONTROLS.length * 9);
  CONTROLS.forEach((c, i) => {
    const y = top + 6 + i * 9;
    drawText(c[0], x + 8, y, 20, 0);
    drawText(c[1], x + 46, y, 9, 0);
  });
  drawTextOC('NOMBRES DE TRUCOS EN INGLÉS, COMO EN EL SKATE REAL', W / 2, top + 18 + CONTROLS.length * 9, 6, 0);
  drawTextOC('ENTER O ESC PARA VOLVER', W / 2, H - 9, 6, 0);
}
function drawVest() {
  drawScene(false);
  dimScreen();
  drawBig('VESTIDOR', W / 2, 6, [10, 21, 20, 19]);
  const cu = vestCust();
  const pcx = Math.round(W * 0.27), pcy = 156;
  for (let y = -7; y <= 7; y++) for (let x = -46; x <= 46; x++) {
    const d = (x * x) / (46 * 46) + (y * y) / 49;
    if (d > 1) continue;
    rect(pcx + x, pcy + 26 + y, 1, 1, d > 0.86 ? 0 : bay(pcx + x, pcy + 26 + y) < 0.5 - d * 0.3 ? 4 : 3);
  }
  const pose = defaultPose(); pose.crouch = 0.12; pose.arm = 0.15 + 0.1 * Math.sin(game.t * 1.5); pose.headYaw = 0.6;
  const boxes = [];
  buildBody(pose, cu, boxes);
  if (cu.stance) xformBoxes(boxes, MIRZ, [0, 0, 0]);
  buildBoard(cu, boxes, I3(), [0, 0, 0], game.t * 4);
  drawRigAt(SPR_PREV, boxes, rY(game.t * 0.9), pcx, pcy + 12, 2, 1.12);
  const row = VROWS[game.vsel];
  if (row === 'TABLA' || row === 'RUEDAS') {
    const bb = buildBoard(cu, [], rX(Math.PI + Math.sin(game.t * 1.3) * 0.6), [0, 0, 0], game.t * 5);
    drawRigAt(SPR_PREV, bb, rY(0.2), pcx, 44, 2, 1.15);
  }
  drawTextOC(cu.stance ? 'GOOFY' : 'REGULAR', pcx, pcy + 40, 7, 0);
  const x = Math.round(W * 0.5), w = W - x - 8, top = 24;
  panelBox(x, top, w, 8 + VROWS.length * 12);
  const c = SAVE.cust;
  const hatL = c.head === 0 ? 'COLOR CASCO' : c.head === 1 ? 'COLOR GORRA' : c.head === 2 ? 'COLOR GORRO' : 'COLOR';
  const val = {
    'POSTURA': c.stance ? 'GOOFY' : 'REGULAR', 'CABEZA': HEADWEAR[c.head], 'COLOR': c.head === 3 ? '-' : COLORS[c.hat].n,
    'CAMISETA': COLORS[c.shirt].n, 'ESTAMPADO': PRINTS[c.print], 'PANTALÓN': COLORS[c.pants].n, 'PERNERA': LEGS[c.legs],
    'ZAPATILLAS': COLORS[c.shoes].n, 'PIEL': SKINS[c.skin].n, 'PROTECCIONES': PROTS[c.prot], 'ACCESORIO': ACCS[c.acc],
    'TABLA': BOARDS[vest.board].n, 'RUEDAS': WHEELS[vest.wheels].n, 'VOLVER': ''
  };
  VROWS.forEach((r, i) => {
    const y = top + 6 + i * 12;
    const on = i === game.vsel;
    if (on) rect(x + 3, y - 3, w - 6, 11, 27);
    drawText(r === 'COLOR' ? hatL : r === 'PROTECCIONES' ? 'PROTECCIÓN' : r, x + 6, y, on ? 10 : 7, 0);
    let v = val[r], col = 21;
    if (r === 'PROTECCIONES' && c.prot === 2) v = 'RODILLAS+CODOS';
    if (r === 'TABLA' && !boardOwned(vest.board)) { v += BOARDS[vest.board].unl ? ' ·' : ' (' + BOARDS[vest.board].price + ')'; col = 19; }
    if (r === 'RUEDAS' && !wheelOwned(vest.wheels)) { v += WHEELS[vest.wheels].unl ? ' ·' : ' (' + WHEELS[vest.wheels].price + ')'; col = 19; }
    if (v) drawTextR((on ? '< ' : '') + v + (on ? ' >' : ''), x + w - 6, y, col, 0);
  });
  drawCoins(x + w - 4, top - 10);
  let msg = game.msg;
  if (!msg && row === 'TABLA' && !boardOwned(vest.board)) msg = BOARDS[vest.board].unl ? 'CONSIGUE ' + unlText(BOARDS[vest.board]) : 'ENTER: COMPRAR POR ' + BOARDS[vest.board].price + ' MONEDAS';
  if (!msg && row === 'RUEDAS' && !wheelOwned(vest.wheels)) msg = WHEELS[vest.wheels].unl ? 'CONSIGUE ' + unlText(WHEELS[vest.wheels]) : 'ENTER: COMPRAR POR ' + WHEELS[vest.wheels].price + ' MONEDAS';
  if (msg) drawTextOC(msg, W / 2, top + 16 + VROWS.length * 12, 20, 0);
  drawTextOC('↑↓ ELEGIR · ← → CAMBIAR · ESC GUARDAR Y VOLVER', W / 2, H - 9, 6, 0);
}
function drawPause() {
  drawScene(true);
  dimScreen();
  drawBig('PAUSA', W / 2, 40, [10, 21, 20, 19]);
  const items = pauseItems();
  const w = 150, x = Math.round(W / 2 - w / 2), top = 62;
  panelBox(x, top, w, 10 + items.length * 15);
  items.forEach((p, i) => {
    const y = top + 8 + i * 15, on = i === game.pauseSel;
    if (on) { rect(x + 3, y - 3, w - 6, 11, 27); drawText('>', x + 7, y, 21, 0); }
    drawText(p, x + 15, y, on ? 10 : 7, 0);
  });
  drawTextOC('PUNTOS ' + fmt(score) + ' · MONEDAS ' + fmt(SAVE.coins), W / 2, top + 20 + items.length * 15, 8, 0);
}
function drawResults() {
  drawScene(true);
  dimScreen();
  const r = game.result || { score: 0, medal: 0 };
  const w = 230, x = Math.round(W / 2 - w / 2), top = 50;
  panelBox(x, top, w, 150);
  drawBig('¡TIEMPO!', W / 2, top + 10, [10, 21, 20, 19]);
  drawTextOC('PUNTOS', W / 2, top + 34, 7, 0);
  drawBig(fmt(r.score), W / 2, top + 44, [10, 25, 24, 23]);
  if (r.best) drawTextOC('¡NUEVO RÉCORD!', W / 2, top + 66, game.t % 0.6 < 0.4 ? 21 : 10, 0);
  else drawTextOC('RÉCORD ' + fmt(SAVE.rec.timed), W / 2, top + 66, 7, 0);
  for (let k = 1; k <= 3; k++) drawMedal(W / 2 - 30 + (k - 1) * 28, top + 82, k, r.medal >= k);
  drawTextOC(r.medal ? 'MEDALLA DE ' + MEDAL[r.medal] : 'SIN MEDALLA (BRONCE: 8.000)', W / 2, top + 94, r.medal ? 21 : 6, 0);
  drawTextOC('BRONCE 8.000 · PLATA 20.000 · ORO 40.000', W / 2, top + 106, 6, 0);
  drawTextOC('ENTER CONTINUAR · R REPETIR', W / 2, top + 132, 9, 0);
}
function render() {
  ctx.imageSmoothingEnabled = false;
  switch (game.scr) {
    case 'title': drawTitle(); break;
    case 'menu': drawMenuScreen(); break;
    case 'retos': drawRetos(); break;
    case 'vest': drawVest(); break;
    case 'controls': drawControls(); break;
    case 'pause': drawPause(); break;
    case 'results': drawResults(); break;
    case 'play':
      if (JUICE.shake > 0.3) {
        const ox = Math.round((Math.random() - 0.5) * 2 * JUICE.shake), oy = Math.round((Math.random() - 0.5) * 2 * JUICE.shake);
        rect(0, 0, W, H, 0); ctx.save(); ctx.translate(ox, oy); drawScene(true); ctx.restore();
      } else drawScene(true);
      drawHUD(); break;
    case 'replay': drawReplay(); break;
  }
  drawTouch();
}

// ---------- Arranque y bucle a 60 fps ----------
function applySize(force) {
  const nw = computeW();
  if (nw !== W || force) {
    W = nw; cv.width = W; cv.height = H;
    ctx.imageSmoothingEnabled = false;
    makeDim();
    if (LAYERS) rebuildBG();
  }
  fitCanvas();
}
let lastT = 0, accT = 0;
function frameLoop(t) {
  requestAnimationFrame(frameLoop);
  if (!lastT) lastT = t;
  let dt = (t - lastT) / 1000; lastT = t;
  if (dt > 0.25) dt = 0.25;
  accT += dt;
  let n = 0;
  while (accT >= STEP && n < 5) { update(STEP); accT -= STEP; n++; }
  if (n >= 5) accT = 0;
  if (n) render();
}
function boot() {
  loadSave();
  loadMap(SAVE.map); resetPigeons(); SND.setBpm(MAP.bpm);
  SND.setMuted(SAVE.muted);
  applySize(true);
  buildLayers();
  resetPlayer(170, 1);
  updateCamera(0, true);
  render();
  window.addEventListener('resize', () => applySize(false));
  requestAnimationFrame(frameLoop);
  cv.focus();
}
// Ganchos de prueba: avanzar el juego a mano si el panel está oculto (rAF en pausa)
window.update = update;
window.render = render;
window.PS = {
  P, game, combo, SAVE: () => SAVE, cam, HUD,
  press(code) { if (!keys[code]) pressed[code] = true; keys[code] = true; },
  release(code) { keys[code] = false; released[code] = true; },
  step(n, dt) { for (let i = 0; i < (n || 1); i++) update(dt || STEP); render(); },
  shot() { return cv.toDataURL('image/png'); }
};
boot();
