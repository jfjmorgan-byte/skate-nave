
// =====================================================================
//  Mando (Gamepad API) y botones táctiles en pantalla
// =====================================================================
const PAD = { prev: {}, seen: false };
const PAD_BTN = { 0: ['Space'], 1: ['KeyD', 'Backspace'], 2: ['KeyA'], 3: ['KeyW'], 4: ['KeyS'], 5: ['ShiftLeft'], 6: ['KeyS'], 7: ['ShiftLeft'],
  8: ['KeyE'], 9: ['Escape'], 12: ['ArrowUp'], 13: ['ArrowDown'], 14: ['ArrowLeft'], 15: ['ArrowRight'] };
function virtKey(code, down, prevDown) {
  if (down && !prevDown) { if (!keys[code]) pressed[code] = true; keys[code] = true; SND.unlock(); }
  else if (!down && prevDown) { keys[code] = false; released[code] = true; }
}
function pollPad() {
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  const now = {};
  for (const gp of gps) {
    if (!gp) continue;
    PAD.seen = true;
    for (const b in PAD_BTN) if (gp.buttons[b] && gp.buttons[b].pressed) for (const c of PAD_BTN[b]) now[c] = true;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    if (ax < -0.5) now.ArrowLeft = true; if (ax > 0.5) now.ArrowRight = true;
    if (ay < -0.5) now.ArrowUp = true; if (ay > 0.5) now.ArrowDown = true;
  }
  const all = new Set([...Object.keys(now), ...Object.keys(PAD.prev)]);
  for (const c of all) virtKey(c, !!now[c], !!PAD.prev[c]);
  PAD.prev = now;
}

// ---------- Táctil ----------
const TOUCH = { on: false, ptr: new Map() };
function touchButtons() {
  const s = 22, cx = 42, cy = H - 38, rx = W - 40, ry = H - 40;
  return [
    { c: 'ArrowLeft', x: cx - s - s / 2, y: cy - s / 2, w: s, h: s, l: '←' },
    { c: 'ArrowRight', x: cx + s / 2, y: cy - s / 2, w: s, h: s, l: '→' },
    { c: 'ArrowUp', x: cx - s / 2, y: cy - s - s / 2, w: s, h: s, l: '↑' },
    { c: 'ArrowDown', x: cx - s / 2, y: cy + s / 2, w: s, h: s - 6, l: '↓' },
    { c: 'Space', x: rx - 14, y: ry - 14, w: 30, h: 30, l: 'OLLIE' },
    { c: 'KeyA', x: rx - 40, y: ry - 6, w: 22, h: 20, l: 'A' },
    { c: 'KeyD', x: rx + 20, y: ry - 34, w: 18, h: 20, l: 'D' },
    { c: 'KeyS', x: rx - 14, y: ry + 18, w: 30, h: 14, l: 'S' },
    { c: 'KeyW', x: rx - 14, y: ry - 36, w: 30, h: 18, l: 'W' },
    { c: 'ShiftLeft', x: rx - 44, y: ry - 34, w: 26, h: 18, l: 'SHIFT' },
    { c: 'KeyE', x: 6, y: H - 92, w: 16, h: 14, l: 'E' },
    { c: 'Escape', x: W - 22, y: 24, w: 18, h: 14, l: 'II' }
  ];
}
function touchAt(px, py) {
  for (const b of touchButtons()) if (px >= b.x && py >= b.y && px < b.x + b.w && py < b.y + b.h) return b.c;
  return null;
}
function canvasPos(e) {
  const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
}
function setTouchKey(id, code) {
  const old = TOUCH.ptr.get(id);
  if (old === code) return;
  if (old) { let still = false; for (const [k, v] of TOUCH.ptr) if (k !== id && v === old) still = true; if (!still) virtKey(old, false, true); }
  if (code) { virtKey(code, true, false); TOUCH.ptr.set(id, code); } else TOUCH.ptr.delete(id);
}
cv.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  e.preventDefault();
  TOUCH.on = true;
  const [x, y] = canvasPos(e);
  let code = touchAt(x, y);
  if (!code && game.scr !== 'play') code = 'Enter';
  setTouchKey(e.pointerId, code);
}, { passive: false });
cv.addEventListener('pointermove', e => {
  if (e.pointerType !== 'touch' || !TOUCH.ptr.has(e.pointerId)) return;
  e.preventDefault();
  const [x, y] = canvasPos(e);
  const c = touchAt(x, y);
  if (c) setTouchKey(e.pointerId, c);
}, { passive: false });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) cv.addEventListener(ev, e => { if (e.pointerType === 'touch') setTouchKey(e.pointerId, null); });
function drawTouch() {
  if (!TOUCH.on) return;
  for (const b of touchButtons()) {
    const down = !!keys[b.c];
    rect(b.x, b.y, b.w, b.h, 0);
    rect(b.x + 1, b.y + 1, b.w - 2, b.h - 2, down ? 27 : 2);
    rect(b.x + 1, b.y + 1, b.w - 2, 1, down ? 28 : 4);
    drawText(b.l, Math.round(b.x + b.w / 2 - textW(b.l) / 2), Math.round(b.y + b.h / 2 - 2), down ? 10 : 8, -1);
  }
}
