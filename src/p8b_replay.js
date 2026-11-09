
// =====================================================================
//  Modo vídeo: graba los últimos 15 s, guarda el mejor clip y lo reproduce con filtros
// =====================================================================
const SNAP_KEYS = ['mode', 'x', 'y', 'z', 'theta', 'facing', 'spin', 'grab', 'tuck', 'crouch', 'bpitch', 'pushing', 'push', 'braking', 'v', 'manual', 'mbal',
  'gbal', 'lipS', 'lipC', 'lipT', 'lipOut', 'lead', 'lbal', 'deck', 'onDeck', 'wdir', 'wph', 'vx', 'wspin', 'celebrate', 'sketchy', 'idleT', 'land',
  'charging', 'charge', 'revAnim', 'christ', 's', 'lip', 'rail'];
const REF_KEYS = ['flip', 'kick', 'drop', 'climb', 'grind', 'bail'];
const REC = { buf: new Array(900), i: 0, n: 0 };
let BEST_CLIP = null;
function snapP() {
  const o = {};
  for (const k of SNAP_KEYS) o[k] = P[k];
  o.flip = P.flip ? { roll: P.flip.roll, shove: P.flip.shove, pitch: P.flip.pitch || 0, done: P.flip.done } : null;
  o.kick = P.kick ? Object.assign({}, P.kick) : null;
  o.drop = P.drop ? Object.assign({}, P.drop) : null;
  o.climb = P.climb ? Object.assign({}, P.climb) : null;
  o.grind = P.grind ? { code: P.grind.code } : null;
  o.bail = P.bail ? JSON.parse(JSON.stringify(P.bail)) : null;
  o.camx = cam.x; o.camup = cam.up; o.t = game.t;
  return o;
}
function recFrame() { REC.buf[REC.i] = snapP(); REC.i = (REC.i + 1) % REC.buf.length; REC.n = Math.min(REC.n + 1, REC.buf.length); }
function lastFrames(sec) {
  const n = Math.min(REC.n, Math.round(sec * 60)), out = [];
  for (let k = n; k > 0; k--) out.push(REC.buf[(REC.i - k + REC.buf.length * 2) % REC.buf.length]);
  return out;
}
function clipBank(total, names) {
  if (BEST_CLIP && BEST_CLIP.total >= total) return;
  const dur = clamp(game.t - (combo.t0 || game.t) + 2.5, 3, 15);
  BEST_CLIP = { frames: lastFrames(dur), total, names };
}
function resetRec() { REC.i = 0; REC.n = 0; BEST_CLIP = null; }

const FILTERS = ['NORMAL', 'MÓVIL', 'VHS', 'OJO DE PEZ'];
const SPEEDS = [1, 0.5, 0.25];
const REPLAY = { frames: [], i: 0, sp: 0, filter: 1, paused: false, title: '' };
function openReplay(frames, title) {
  if (!frames || frames.length < 10) { SND.uiNo(); return; }
  REPLAY.frames = frames; REPLAY.i = 0; REPLAY.paused = false; REPLAY.title = title;
  game.scr = 'replay';
  SND.roll(0, false, false); SND.grind(0); SND.brake(false);
}
function replayUpdate() {
  const R = REPLAY;
  if (pressed.ArrowRight) { R.filter = (R.filter + 1) % FILTERS.length; SND.ui(); }
  if (pressed.ArrowLeft) { R.filter = (R.filter + FILTERS.length - 1) % FILTERS.length; SND.ui(); }
  if (pressed.ArrowDown) { R.sp = Math.min(SPEEDS.length - 1, R.sp + 1); SND.ui(); }
  if (pressed.ArrowUp) { R.sp = Math.max(0, R.sp - 1); SND.ui(); }
  if (pressed.Space) { R.paused = !R.paused; SND.ui(); }
  if (pressed.Escape || pressed.Enter || pressed.KeyP || pressed.Backspace) { game.scr = 'pause'; SND.ui(); return; }
  if (!R.paused) { R.i += SPEEDS[R.sp]; if (R.i >= R.frames.length) R.i = 0; }
}
function withSnapshot(f, fn) {
  const saved = {};
  for (const k of SNAP_KEYS) saved[k] = P[k];
  for (const k of REF_KEYS) saved[k] = P[k];
  const cs = { x: cam.x, xi: cam.xi, up: cam.up, upi: cam.upi }, ts = game.t;
  for (const k of SNAP_KEYS) P[k] = f[k];
  for (const k of REF_KEYS) P[k] = f[k];
  cam.x = f.camx; cam.xi = Math.round(f.camx); cam.up = f.camup; cam.upi = Math.round(f.camup); game.t = f.t;
  try { fn(); } finally {
    for (const k of SNAP_KEYS) P[k] = saved[k];
    for (const k of REF_KEYS) P[k] = saved[k];
    Object.assign(cam, cs); game.t = ts;
  }
}
function drawReplay() {
  const R = REPLAY, f = R.frames[Math.min(R.frames.length - 1, Math.floor(R.i))];
  withSnapshot(f, () => drawScene(true, true));
  const t = R.i / 60;
  applyFilter(R.filter, f, t);
  // interfaz del reproductor
  drawTextO(R.title, 5, H - 22, 21, 0);
  drawTextO('← → FILTRO: ' + FILTERS[R.filter] + '   ↑ ↓ VELOCIDAD: ' + (SPEEDS[R.sp] === 1 ? 'NORMAL' : 'X' + String(SPEEDS[R.sp]).replace('.', ',')) + '   ESPACIO PAUSA   ESC VOLVER', 5, H - 12, 9, 0);
  const pw = W - 10, px = 5, py = H - 30;
  rect(px, py, pw, 3, 0); rect(px + 1, py + 1, Math.round((pw - 2) * R.i / R.frames.length), 1, 19);
  if (R.paused && game.t % 1 < 0.6) drawBig('PAUSA', W / 2, H / 2 - 8, [10, 9, 8, 7]);
}
// Filtros en píxeles (sin suavizado): se trabaja sobre el propio lienzo
function applyFilter(k, f, t) {
  if (k === 0) return;
  if (k === 1) {                                         // móvil en vertical
    const fw = Math.round(H * 9 / 16), sx = clamp(Math.round(SX(f.x)) - fw / 2, 0, W - fw);
    rect(0, 0, sx, H, 0); rect(sx + fw, 0, W - sx - fw, H, 0);
    for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) if ((7 - i) * (7 - i) + (7 - j) * (7 - j) > 49) {
      rect(sx + i, j, 1, 1, 0); rect(sx + fw - 1 - i, j, 1, 1, 0); rect(sx + i, H - 1 - j, 1, 1, 0); rect(sx + fw - 1 - i, H - 1 - j, 1, 1, 0);
    }
    if (game.t % 1 < 0.6) { rect(sx + 7, 9, 3, 3, 18); rect(sx + 8, 8, 1, 5, 18); rect(sx + 6, 10, 5, 1, 18); }
    drawTextO('REC', sx + 13, 8, 10, 0);
    const s = Math.floor(t);
    drawTextO('00:' + String(s).padStart(2, '0'), sx + fw - 28, 8, 10, 0);
    rect(sx + fw - 14, 18, 8, 4, 10); rect(sx + fw - 6, 19, 1, 2, 10); rect(sx + fw - 13, 19, 5, 2, 24);
    return;
  }
  const img = ctx.getImageData(0, 0, W, H), d = new Uint32Array(img.data.buffer);
  if (k === 2) {                                         // VHS: bandas de tracking, temblor y ruido
    const band = ((t * 70) % (H + 60)) - 30;
    const src = d.slice();
    for (let y = 0; y < H; y++) {
      let off = 0;
      if (Math.abs(y - band) < 6) off = 2 + (y & 1);
      else if (hash2(y, Math.floor(t * 30)) > 0.985) off = 1;
      if (off) for (let x = 0; x < W; x++) d[y * W + x] = src[y * W + Math.min(W - 1, x + off)];
    }
    const nz = Math.floor(t * 60);
    for (let i = 0; i < 260; i++) { const p = Math.floor(hash2(i, nz) * W * H); d[p] = PAL32[hash2(i, nz + 7) > 0.5 ? 10 : 8]; }
    ctx.putImageData(img, 0, 0);
    drawTextO('> PLAY', 8, 8, 10, 0);
    drawTextO('SP', W - 18, 8, 10, 0);
    drawTextO('06 NOV 2026  ' + String(Math.floor(t)).padStart(2, '0') + 'S', W - 76, H - 44, 10, 0);
    return;
  }
  if (k === 3) {                                         // ojo de pez: distorsión de barril con vecino más cercano
    const src = d.slice(), cx = W / 2, cy = H / 2, rN = Math.hypot(cx, cy);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x - cx) / rN, dy = (y - cy) / rN, r2 = dx * dx + dy * dy;
      const s = 0.72 + 0.5 * r2;
      const sx = Math.round(cx + dx * rN * s), sy = Math.round(cy + dy * rN * s);
      const i = y * W + x;
      if (sx < 0 || sy < 0 || sx >= W || sy >= H || (r2 > 0.62 && bay(x, y) < (r2 - 0.62) * 4)) d[i] = PAL32[0];
      else d[i] = src[sy * W + sx];
    }
    ctx.putImageData(img, 0, 0);
  }
}
