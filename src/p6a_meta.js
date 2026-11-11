
// =====================================================================
//  Juego: guardado, retos con medallas, contrarreloj, menús y vestidor
// =====================================================================
const SAVE_KEY = 'pixelskate_lanave_v2', OLD_KEY = 'pixelskate_lanave_v1';
function defaultSave() {
  return {
    diff: 0, tod: 0, map: 'nave', muted: false, coins: 0, medals: {}, ownB: [], ownW: [],
    cust: { stance: 0, head: 0, hat: 0, shirt: 7, print: 0, pants: 1, legs: 0, shoes: 2, skin: 1, prot: 1, acc: 0, board: 0, wheels: 0 },
    rec: { combo: 0, air: 0, session: 0, manual: 0, timed: 0 }
  };
}
let SAVE = defaultSave();
function loadSave() {
  try {
    let s = localStorage.getItem(SAVE_KEY), o, d = defaultSave();
    if (s) o = JSON.parse(s);
    else if ((s = localStorage.getItem(OLD_KEY))) {      // migración desde la primera versión
      const v1 = JSON.parse(s), mb = { 2: 2, 3: 4, 4: 6, 5: 8 }, mw = { 2: 2, 3: 4, 4: 5 };
      o = { diff: v1.diff, muted: v1.muted, coins: v1.coins, rec: v1.rec, cust: v1.cust,
        ownB: (v1.ownB || []).map(i => mb[i]).filter(i => i !== undefined), ownW: (v1.ownW || []).map(i => mw[i]).filter(i => i !== undefined) };
      if (o.cust) { o.cust.board = mb[o.cust.board] || 0; o.cust.wheels = mw[o.cust.wheels] || (o.cust.wheels === 1 ? 1 : 0); }
    }
    if (!o) return;
    SAVE = Object.assign(d, o);
    SAVE.cust = Object.assign(defaultSave().cust, o.cust || {});
    SAVE.rec = Object.assign(defaultSave().rec, o.rec || {});
    if (!SAVE.medals || typeof SAVE.medals !== 'object') SAVE.medals = {};
    for (const k of ['ownB', 'ownW']) if (!Array.isArray(SAVE[k])) SAVE[k] = [];
    const c = SAVE.cust, lim = (k, n) => { c[k] = clamp(c[k] | 0, 0, n - 1); };
    lim('stance', 2); lim('head', 4); lim('hat', COLORS.length); lim('shirt', COLORS.length); lim('pants', COLORS.length);
    lim('shoes', COLORS.length); lim('skin', SKINS.length); lim('print', PRINTS.length); lim('legs', LEGS.length);
    lim('prot', PROTS.length); lim('acc', ACCS.length); lim('board', BOARDS.length); SAVE.tod = clamp(SAVE.tod | 0, 0, 2); if (!MAPS[SAVE.map]) SAVE.map = 'nave'; lim('wheels', WHEELS.length);
    if (!boardOwned(c.board)) c.board = 0;
    if (!wheelOwned(c.wheels)) c.wheels = 0;
    SAVE.coins = Math.max(0, SAVE.coins | 0);
  } catch (e) { SAVE = defaultSave(); }
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* sin almacenamiento */ } }
const medalOf = i => SAVE.medals[i] || 0;
const MEDAL = ['', 'BRONCE', 'PLATA', 'ORO'];
const MEDAL_COINS = [0, 25, 40, 70];
const MEDAL_COL = [[2, 3], [12, 14], [6, 9], [20, 21]];
function unlOk(it) { return it.unl && medalOf(it.unl[0]) >= it.unl[1]; }
function boardOwned(i) { const b = BOARDS[i]; return b.price === 0 || unlOk(b) || SAVE.ownB.includes(i); }
function wheelOwned(i) { const b = WHEELS[i]; return b.price === 0 || unlOk(b) || SAVE.ownW.includes(i); }
const unlText = it => 'RETO ' + (it.unl[0] + 1) + ': ' + MEDAL[it.unl[1]];

// ---------- Retos (20) con medallas de bronce, plata y oro ----------
const TIER = (v, a, b, c) => v >= c ? 3 : v >= b ? 2 : v >= a ? 1 : 0;
const hasT = (e, n) => !!(e.tricks && e.tricks.some(t => t === n || t === 'Fakie ' + n));
const spinDeg = e => Math.max(0, ...(e.tricks || []).map(n => { const m = /^(BS|FS) (\d+)$/.exec(n); return m ? +m[2] : 0; }));
const hasFlip = e => (e.tricks || []).some(n => /flip|Shove/.test(n));
const RETOS = [
  { t: 'DROP IN', d: 'DESDE LA PLATAFORMA DE LA MINI: → O ↑ PARA DEJARTE CAER.', m: ['', '', 'HECHO'], g: e => e.type === 'drop' ? 3 : 0 },
  { t: 'OLLIE ALTO', d: 'EN EL PLANO, MANTÉN ESPACIO PARA CARGAR Y SUÉLTALO.', m: ['0,5 M', '0,8 M', '1,1 M'], g: e => e.type === 'land' && !e.vert && e.popped && e.tricks.length === 1 && e.tricks[0] === 'Ollie' ? TIER(e.h, 0.5, 0.8, 1.1) : 0 },
  { t: 'KICKFLIP', d: 'SALTA CON ESPACIO Y PULSA A EN EL AIRE.', m: ['KICKFLIP', 'A 0,6 M', 'CON 180'], g: e => e.type === 'land' && hasT(e, 'Kickflip') ? (spinDeg(e) >= 180 ? 3 : e.h >= 0.6 ? 2 : 1) : 0 },
  { t: 'MANUAL', d: 'RUEDA, MANTÉN W Y EQUILIBRA CON ↑ ↓.', m: ['2 S', '3,5 S', '6 S'], g: e => e.type === 'manual' ? TIER(e.t, 2, 3.5, 6) : 0 },
  { t: '50-50 EN EL COPING', d: 'MANTÉN W MIENTRAS SUBES UNA RAMPA: TE QUEDAS EN EL COPING. SUELTA PARA VOLVER.', m: ['HECHO', '1,5 S', '3 S'], g: e => e.type === 'lip' && e.code === 'KeyW' ? TIER(e.t, 0.01, 1.5, 3) : 0 },
  { t: 'LA BARANDILLA', d: 'OLLIE A LA BARANDILLA DE LA PIRÁMIDE Y EQUILIBRA CON ← →.', m: ['MITAD', 'ENTERA', 'ENTERA EN SLIDE'], g: e => e.type === 'grind' && e.rail === 0 ? (e.coverage >= 0.86 ? (e.code === 'KeyA' || e.code === 'KeyD' ? 3 : 2) : e.coverage >= 0.4 ? 1 : 0) : 0 },
  { t: 'AIRE EN LA MINI', d: 'EMPUJA CON ↑ Y BOMBEA CON SHIFT AL BAJAR LAS CURVAS.', m: ['0,6 M', '1,2 M', '1,8 M'], g: e => e.type === 'land' && e.vert === -1 ? TIER(e.h, 0.6, 1.2, 1.8) : 0 },
  { t: 'AIRE EN LA GRANDE', d: 'HACE FALTA MUCHA VELOCIDAD: BOMBEA EN CADA CURVA.', m: ['0,8 M', '1,5 M', '2,5 M'], g: e => e.type === 'land' && e.vert === 1 ? TIER(e.h, 0.8, 1.5, 2.5) : 0 },
  { t: 'LIP TRICKS', d: 'MANTÉN AL SUBIR LA RAMPA: A ROCK TO FAKIE · D ROCK N ROLL · S NOSE STALL.', m: ['UNO', '2 SEGUNDOS', 'EN COMBO DE 4'], g: e => e.type === 'lip' ? (e.t >= 2 ? 2 : 1) : (e.type === 'bank' && e.n >= 4 && e.names.some(n => LIPNAMES.includes(n)) ? 3 : 0) },
  { t: 'GIRO DE 360', d: 'MANTÉN ← O → EN EL AIRE.', m: ['360', '360 CON FLIP', '540'], g: e => e.type === 'land' ? (spinDeg(e) >= 540 ? 3 : spinDeg(e) >= 360 ? (hasFlip(e) ? 2 : 1) : 0) : 0 },
  { t: 'COMBO', d: 'GRIND, MANUAL Y LIP TRICKS MANTIENEN VIVO EL COMBO.', m: ['3 TRUCOS', '5 TRUCOS', '8 TRUCOS'], g: e => e.type === 'bank' ? TIER(e.n, 3, 5, 8) : 0 },
  { t: 'VARIAL KICKFLIP', d: 'PULSA A + S A LA VEZ EN EL AIRE.', m: ['HECHO', 'A 0,8 M', 'CON 180'], g: e => e.type === 'land' && hasT(e, 'Varial Kickflip') ? (spinDeg(e) >= 180 ? 3 : e.h >= 0.8 ? 2 : 1) : 0 },
  { t: 'PUNTOS EN UN COMBO', d: 'SUMA PUNTOS SIN CAERTE Y SIN CORTAR EL COMBO.', m: ['2.000', '5.000', '12.000'], g: e => e.type === 'bank' ? TIER(e.total, 2000, 5000, 12000) : 0 },
  { t: 'FAKIE', d: 'UN AIRE EN RAMPA SIN GIRAR TERMINA EN FAKIE.', m: ['FAKIE', 'A 1 M', 'CON FLIP'], g: e => e.type === 'land' && e.vert && e.fakie ? (hasFlip(e) ? 3 : e.h >= 1 ? 2 : 1) : 0 },
  { t: 'DOBLE KICKFLIP', d: 'PULSA A DOS VECES SEGUIDAS EN UN AIRE ALTO.', m: ['DOBLE', 'A 1 M', 'TRIPLE'], g: e => e.type === 'land' ? (hasT(e, 'Triple Kickflip') ? 3 : hasT(e, 'Double Kickflip') ? (e.h >= 1 ? 2 : 1) : 0) : 0 },
  { t: 'GRAB LARGO', d: 'MANTÉN W EN EL AIRE Y SUELTA ANTES DE CAER.', m: ['0,4 S', '0,8 S', '1,2 S'], g: e => e.type === 'land' ? TIER(e.grabT || 0, 0.4, 0.8, 1.2) : 0 },
  { t: 'LA PLATAFORMA GRANDE', d: 'BÁJATE CON E, CAMINA A LA RAMPA GRANDE, SUBE CON ↑ Y HAZ DROP IN.', m: ['', '', 'HECHO'], g: e => e.type === 'drop' && e.side === 1 ? 3 : 0 },
  { t: 'GIRO DE 540', d: 'VUELTA Y MEDIA: NECESITAS UN AIRE ALTO EN LA RAMPA GRANDE.', m: ['540', '540 CON GRAB', '720'], g: e => e.type === 'land' ? (spinDeg(e) >= 720 ? 3 : spinDeg(e) >= 540 ? ((e.grabT || 0) > 0.15 ? 2 : 1) : 0) : 0 },
  { t: 'CONTRARRELOJ', d: '2 MINUTOS PARA HACER TODOS LOS PUNTOS QUE PUEDAS.', m: ['8.000', '20.000', '40.000'], g: e => e.type === 'timedEnd' ? TIER(e.score, 8000, 20000, 40000) : 0, timed: true },
  { t: 'MAESTRO DE LA NAVE', d: 'UN COMBO ENORME: MEZCLA AIRES, GRINDS, MANUALS Y LIP TRICKS.', m: ['15.000', '30.000', '60.000'], g: e => e.type === 'bank' ? TIER(e.total, 15000, 30000, 60000) : 0 }
];
const retoUnlocked = i => i === 0 || medalOf(i - 1) >= 1;
const TIMED_MEDALS = [8000, 20000, 40000];

const game = { scr: 'title', t: 0, mode: 'free', timed: false, timeLeft: 0, over: 0, reto: -1, sel: 0, pauseSel: 0, vsel: 0, rsel: 0, msg: '', dirty: false, saveT: 0, from: 'menu', hintT: 0, result: null };
const HUD = { air: null, bank: null, lost: 0, lostPts: 0, reto: 0, medal: null };
function emit(type, d) {
  d.type = type;
  if (type === 'bank') {
    SAVE.coins += d.coins;
    if (d.total > SAVE.rec.combo) SAVE.rec.combo = d.total;
    HUD.bank = { total: d.total, n: d.n, coins: d.coins, t: 2.4 };
    if (d.coins) SND.coin();
    if (d.total >= 3000 && P.mode !== 'bail') P.celebrate = 1.2;
    game.dirty = true;
    if (d.total > 0) clipBank(d.total, d.names);
  }
  if (type === 'manualEnd' && d.t > SAVE.rec.manual) SAVE.rec.manual = d.t;
  if (game.scr === 'play' && game.mode === 'retos' && game.reto >= 0) {
    let g = 0;
    try { g = RETOS[game.reto].g(d) || 0; } catch (e) { g = 0; }
    if (g > medalOf(game.reto)) awardMedal(game.reto, g);
  }
}
function awardMedal(i, tier) {
  const old = medalOf(i);
  let coins = 0;
  for (let k = old + 1; k <= tier; k++) coins += MEDAL_COINS[k] + i * 3;
  SAVE.medals[i] = tier; SAVE.coins += coins;
  const unl = [];
  BOARDS.forEach(b => { if (b.unl && b.unl[0] === i && b.unl[1] > old && b.unl[1] <= tier) unl.push('TABLA ' + b.n); });
  WHEELS.forEach(b => { if (b.unl && b.unl[0] === i && b.unl[1] > old && b.unl[1] <= tier) unl.push('RUEDAS ' + b.n); });
  HUD.medal = { tier, coins, t: 3.6, unl: unl.join(' · '), next: tier === 3 && i + 1 < RETOS.length };
  P.celebrate = 1.4;
  SND.win(); writeSave();
}
// Carga el mapa (y su escenario) solo si cambia
function ensureMap(id) {
  if (MAP && MAP.id === id && LAYERS) return;
  loadMap(id); resetPigeons(); buildLayers(); SND.setBpm(MAP.bpm);
  for (const p of PARTS) p.life = 0;
}
function startPlay(mode, reto) {
  ensureMap(mode === 'retos' ? 'nave' : SAVE.map);
  game.scr = 'play'; game.mode = mode; game.reto = reto === undefined ? -1 : reto;
  game.timed = mode === 'timed' || (mode === 'retos' && RETOS[game.reto] && !!RETOS[game.reto].timed);
  game.timeLeft = 120; game.over = 0;
  score = 0; resetPlayer(170, 1); placeOnDeck(-1, undefined, 1);
  HUD.air = null; HUD.bank = null; HUD.lost = 0; HUD.medal = null; HUD.reto = 2.5;
  popups.length = 0; game.hintT = 8;
  resetRec(); JUICE.stop = 0; JUICE.shake = 0;
  for (const p of PARTS) p.life = 0;
  updateCamera(0, true);
}
function finishTimed() {
  if (combo.list.length) bankCombo();
  const best = score > SAVE.rec.timed;
  if (best) SAVE.rec.timed = score;
  emit('timedEnd', { score });
  game.result = { score, best, medal: TIMED_MEDALS.filter(v => score >= v).length, combo: SAVE.rec.combo };
  game.scr = 'results'; writeSave();
  SND.roll(0, false, false); SND.grind(0); SND.brake(false);
}

// ---------- Cámara ----------
function updateCamera(dt, snap) {
  const vx = P.mode === 'ground' ? P.v * (pathAt(PATH, P.s).tx) : P.mode === 'air' ? P.vx : P.mode === 'grind' ? P.rv : P.mode === 'walk' ? (P.vx || 0) : 0;
  const tx = clamp(P.x * ZM - W * 0.5 + clamp(vx * 0.35 * ZM, -W * 0.18, W * 0.18), 0, LWID - W);
  cam.x = snap ? tx : cam.x + (tx - cam.x) * Math.min(1, dt * 4.5);
  cam.xi = Math.round(cam.x);
  const top = FY - (P.y + 48) * COSE * ZM;
  const need = clamp(34 - top, 0, TOPM - 6);
  cam.up = snap ? need : cam.up + (need - cam.up) * Math.min(1, dt * 4);
  cam.upi = Math.round(cam.up);
}

// ---------- Menús ----------
const MENU = [
  { id: 'retos', l: 'RETOS DEL PARQUE' }, { id: 'free', l: 'SESIÓN LIBRE' }, { id: 'timed', l: 'CONTRARRELOJ (2 MIN)' }, { id: 'vest', l: 'VESTIDOR' },
  { id: 'map', l: 'MAPA' }, { id: 'tod', l: 'HORA' }, { id: 'diff', l: 'DIFICULTAD' }, { id: 'snd', l: 'SONIDO' }, { id: 'ctrl', l: 'CONTROLES' }
];
const CONTROLS = [
  ['↑', 'IMPULSAR (EMPUJAR CON EL PIE)'],
  ['↓', 'FRENAR'],
  ['← →', '← BACKSIDE  → FRONTSIDE'],
  ['', 'EN EL AIRE: GIROS DE 180, 360, 540...'],
  ['', 'ARRIBA DE UNA RAMPA O CASI PARADO: KICKTURN'],
  ['SHIFT', 'BOMBEAR: AL BAJAR LAS CURVAS GANAS VELOCIDAD'],
  ['ESPACIO', 'OLLIE: MANTÉN PARA CARGAR, SUELTA PARA SALTAR'],
  ['A D S', 'A KICKFLIP · D HEELFLIP · S POP SHOVE-IT'],
  ['A+S D+S', 'VARIAL KICKFLIP · VARIAL HEELFLIP'],
  ['2 VECES', 'LA MISMA TECLA: DOBLE FLIP'],
  ['W', 'GRAB EN EL AIRE · MANUAL EN EL SUELO (↑ ↓)'],
  ['RAIL', 'CAE ENCIMA TRAS UN OLLIE Y ELIGE EL GRIND:'],
  ['', 'W 50-50 · S 5-0 · A BOARDSLIDE · D CROOKED (← →)'],
  ['COPING', 'MANTÉN AL SUBIR: W 50-50 · A ROCK TO FAKIE'],
  ['', "D ROCK 'N' ROLL · S NOSE STALL · SUELTA: VOLVER"],
  ['E', 'BAJARTE O SUBIRTE A LA TABLA · CAMINAR ← →'],
  ['', 'JUNTO A RAMPA ↑ SUBIR · PLATAFORMA → DROP IN'],
  ['SHIFT', 'AL CAER EN UNA RAMPA: REVERT (SIGUE EL COMBO)'],
  ['A+D', 'HARDFLIP · COPING W+A SMITH · W+D FEEBLE'],
  ['SPECIAL', 'BARRA LLENA: SHIFT + W A D S EN EL AIRE'],
  ['MANDO', 'A OLLIE X KICK B HEEL Y W LB S RB SHIFT'],
  ['P ESC', 'PAUSA (REPETICIÓN Y MEJOR CLIP)  M SILENCIAR']
];
const PAUSE_ALL = ['CONTINUAR', 'VER REPETICIÓN', 'MEJOR CLIP', 'REINICIAR', 'SIGUIENTE RETO', 'CONTROLES', 'SALIR AL MENÚ'];
const pauseItems = () => PAUSE_ALL.filter(s => (s !== 'MEJOR CLIP' || BEST_CLIP) && (s !== 'VER REPETICIÓN' || REC.n > 30)) .filter(s => s !== 'SIGUIENTE RETO' || (game.mode === 'retos' && game.reto + 1 < RETOS.length && retoUnlocked(game.reto + 1)));
const VROWS = ['POSTURA', 'CABEZA', 'COLOR', 'CAMISETA', 'ESTAMPADO', 'PANTALÓN', 'PERNERA', 'ZAPATILLAS', 'PIEL', 'PROTECCIONES', 'ACCESORIO', 'TABLA', 'RUEDAS', 'VOLVER'];
const vest = { board: 0, wheels: 0 };

function menuUpdate() {
  if (pressed.ArrowDown) { game.sel = (game.sel + 1) % MENU.length; SND.ui(); }
  if (pressed.ArrowUp) { game.sel = (game.sel + MENU.length - 1) % MENU.length; SND.ui(); }
  const it = MENU[game.sel].id;
  if (it === 'diff' && (pressed.ArrowLeft || pressed.ArrowRight || pOK())) { SAVE.diff = 1 - SAVE.diff; SND.ui(); writeSave(); return; }
  if (it === 'snd' && (pressed.ArrowLeft || pressed.ArrowRight || pOK())) { SAVE.muted = !SAVE.muted; SND.setMuted(SAVE.muted); SND.ui(); writeSave(); return; }
  if (it === 'map' && (pressed.ArrowLeft || pressed.ArrowRight || pOK())) { const i = MAP_IDS.indexOf(SAVE.map); SAVE.map = MAP_IDS[(i + (pressed.ArrowLeft ? MAP_IDS.length - 1 : 1)) % MAP_IDS.length]; SND.ui(); writeSave(); ensureMap(SAVE.map); return; }
  if (it === 'tod' && (pressed.ArrowLeft || pressed.ArrowRight || pOK())) { SAVE.tod = (SAVE.tod + (pressed.ArrowLeft ? 2 : 1)) % 3; SND.ui(); writeSave(); buildLayers(); return; }
  if (pOK()) {
    SND.uiOk();
    if (it === 'retos') { game.scr = 'retos'; let i = 0; while (i + 1 < RETOS.length && medalOf(i) >= 1 && retoUnlocked(i + 1)) i++; game.rsel = i; }
    else if (it === 'free') startPlay('free');
    else if (it === 'timed') startPlay('timed');
    else if (it === 'vest') openVest('menu');
    else if (it === 'ctrl') { game.scr = 'controls'; game.from = 'menu'; }
  }
  if (pBack()) { game.scr = 'title'; SND.ui(); }
}
function retosUpdate() {
  if (pressed.ArrowDown) { game.rsel = (game.rsel + 1) % RETOS.length; SND.ui(); }
  if (pressed.ArrowUp) { game.rsel = (game.rsel + RETOS.length - 1) % RETOS.length; SND.ui(); }
  if (pOK()) {
    if (retoUnlocked(game.rsel)) { SND.uiOk(); startPlay('retos', game.rsel); }
    else SND.uiNo();
  }
  if (pBack()) { game.scr = 'menu'; SND.ui(); }
}
function resultsUpdate() {
  if (pressed.KeyR) { SND.uiOk(); startPlay(game.mode, game.reto); return; }
  if (pOK() || pBack()) { SND.ui(); game.scr = game.mode === 'retos' ? 'retos' : 'menu'; if (game.scr === 'menu') ensureMap(SAVE.map); }
}
function openVest(from) { game.scr = 'vest'; game.from = from; game.vsel = 0; vest.board = SAVE.cust.board; vest.wheels = SAVE.cust.wheels; game.msg = ''; }
function closeVest() {
  if (boardOwned(vest.board)) SAVE.cust.board = vest.board;
  if (wheelOwned(vest.wheels)) SAVE.cust.wheels = vest.wheels;
  writeSave();
  game.scr = game.from === 'pause' ? 'pause' : 'menu';
}
function vestCust() { return Object.assign({}, SAVE.cust, { board: vest.board, wheels: vest.wheels }); }
function vestUpdate() {
  const n = VROWS.length;
  if (pressed.ArrowDown) { game.vsel = (game.vsel + 1) % n; SND.ui(); game.msg = ''; }
  if (pressed.ArrowUp) { game.vsel = (game.vsel + n - 1) % n; SND.ui(); game.msg = ''; }
  const d = pressed.ArrowRight ? 1 : pressed.ArrowLeft ? -1 : 0;
  const c = SAVE.cust;
  const cyc = (v, m) => (v + d + m) % m;
  if (d) {
    SND.ui();
    switch (VROWS[game.vsel]) {
      case 'POSTURA': c.stance = 1 - c.stance; break;
      case 'CABEZA': c.head = cyc(c.head, 4); break;
      case 'COLOR': if (c.head !== 3) c.hat = cyc(c.hat, COLORS.length); break;
      case 'CAMISETA': c.shirt = cyc(c.shirt, COLORS.length); break;
      case 'ESTAMPADO': c.print = cyc(c.print, PRINTS.length); break;
      case 'PANTALÓN': c.pants = cyc(c.pants, COLORS.length); break;
      case 'PERNERA': c.legs = cyc(c.legs, LEGS.length); break;
      case 'ZAPATILLAS': c.shoes = cyc(c.shoes, COLORS.length); break;
      case 'PIEL': c.skin = cyc(c.skin, SKINS.length); break;
      case 'PROTECCIONES': c.prot = cyc(c.prot, PROTS.length); break;
      case 'ACCESORIO': c.acc = cyc(c.acc, ACCS.length); break;
      case 'TABLA': vest.board = cyc(vest.board, BOARDS.length); if (boardOwned(vest.board)) c.board = vest.board; break;
      case 'RUEDAS': vest.wheels = cyc(vest.wheels, WHEELS.length); if (wheelOwned(vest.wheels)) c.wheels = vest.wheels; break;
    }
  }
  if (pOK()) {
    const row = VROWS[game.vsel];
    if (row === 'VOLVER') { SND.uiOk(); closeVest(); return; }
    if (row === 'TABLA' && !boardOwned(vest.board)) buyItem(BOARDS[vest.board], vest.board, SAVE.ownB, () => { c.board = vest.board; });
    else if (row === 'RUEDAS' && !wheelOwned(vest.wheels)) buyItem(WHEELS[vest.wheels], vest.wheels, SAVE.ownW, () => { c.wheels = vest.wheels; });
    else if (row === 'POSTURA') { c.stance = 1 - c.stance; SND.ui(); }
  }
  if (pBack()) { SND.ui(); closeVest(); }
}
function buyItem(item, idx, list, onOk) {
  if (item.unl) { game.msg = 'CONSIGUE ' + unlText(item) + ' PARA DESBLOQUEARLA'; SND.uiNo(); return; }
  if (SAVE.coins >= item.price) { SAVE.coins -= item.price; list.push(idx); onOk(); SND.coin(); game.msg = '¡COMPRADA! ' + item.n; writeSave(); }
  else { game.msg = 'TE FALTAN ' + (item.price - SAVE.coins) + ' MONEDAS'; SND.uiNo(); }
}
function pauseUpdate() {
  const items = pauseItems();
  game.pauseSel = Math.min(game.pauseSel, items.length - 1);
  if (pressed.ArrowDown) { game.pauseSel = (game.pauseSel + 1) % items.length; SND.ui(); }
  if (pressed.ArrowUp) { game.pauseSel = (game.pauseSel + items.length - 1) % items.length; SND.ui(); }
  if (pressed.KeyP || pressed.Escape) { game.scr = 'play'; SND.ui(); return; }
  if (pOK()) {
    SND.uiOk();
    const s = items[game.pauseSel];
    if (s === 'CONTINUAR') game.scr = 'play';
    else if (s === 'REINICIAR') startPlay(game.mode, game.reto);
    else if (s === 'SIGUIENTE RETO') startPlay('retos', game.reto + 1);
    else if (s === 'VER REPETICIÓN') openReplay(lastFrames(15), 'ÚLTIMOS 15 SEGUNDOS');
    else if (s === 'MEJOR CLIP') openReplay(BEST_CLIP.frames, 'MEJOR CLIP: ' + fmt(BEST_CLIP.total) + ' PUNTOS');
    else if (s === 'CONTROLES') { game.scr = 'controls'; game.from = 'pause'; }
    else { game.scr = 'menu'; ensureMap(SAVE.map); if (score > SAVE.rec.session) SAVE.rec.session = score; writeSave(); }
  }
}

// ---------- Actualización ----------
const STEP = 1 / 60;
function update(dt) {
  dt = dt || STEP;
  game.t += dt;
  pollPad();
  if (pressed.KeyM) { SAVE.muted = SND.toggle(); writeSave(); }
  updateScene(dt, game.t);
  SND.tick();
  switch (game.scr) {
    case 'title':
      cam.x = (Math.sin(game.t * 0.07) * 0.5 + 0.5) * (LWID - W); cam.xi = Math.round(cam.x); cam.up = 0; cam.upi = 0;
      if (Object.keys(pressed).length) { game.scr = 'menu'; SND.uiOk(); }
      break;
    case 'menu': cam.x = lerp(cam.x, 0, dt * 0.8); cam.xi = Math.round(cam.x); menuUpdate(); break;
    case 'retos': retosUpdate(); break;
    case 'vest': vestUpdate(); break;
    case 'controls': if (pOK() || pBack() || pressed.KeyP) { game.scr = game.from; SND.ui(); } break;
    case 'pause': pauseUpdate(); break;
    case 'results': resultsUpdate(); break;
    case 'replay': replayUpdate(); break;
    case 'play': playUpdate(dt); break;
  }
  game.saveT += dt;
  if (game.dirty && game.saveT > 2) { writeSave(); game.dirty = false; game.saveT = 0; }
  clearEdges();
}
function playUpdate(dt) {
  if (pressed.KeyP || pressed.Escape) { game.scr = 'pause'; game.pauseSel = 0; SND.ui(); SND.roll(0, false, false); SND.grind(0); SND.brake(false); return; }
  JUICE.shake = Math.max(0, JUICE.shake - dt * 10);
  if (JUICE.stop > 0) { JUICE.stop -= dt; return; }
  playerUpdate(dt);
  recFrame();
  updateCamera(dt, false);
  combo.show = Math.max(0, combo.show - dt);
  if (HUD.air) { HUD.air.t -= dt; if (HUD.air.t <= 0) HUD.air = null; }
  if (HUD.bank) { HUD.bank.t -= dt; if (HUD.bank.t <= 0) HUD.bank = null; }
  HUD.lost = Math.max(0, HUD.lost - dt);
  HUD.reto = Math.max(0, HUD.reto - dt);
  game.hintT = Math.max(0, game.hintT - dt);
  for (let i = popups.length - 1; i >= 0; i--) { popups[i].t += dt; if (popups[i].t > 1.1) popups.splice(i, 1); }
  if (score > SAVE.rec.session) { SAVE.rec.session = score; game.dirty = true; }
  if (HUD.medal) {
    HUD.medal.t -= dt;
    if (HUD.medal.t <= 0) {
      const nx = HUD.medal.next; HUD.medal = null;
      if (nx && !game.timed) { if (RETOS[game.reto + 1].timed) startPlay('retos', game.reto + 1); else { game.reto++; HUD.reto = 2.5; } }
    }
  }
  if (game.timed) {
    game.timeLeft = Math.max(0, game.timeLeft - dt);
    if (game.timeLeft <= 0) {
      game.over += dt;
      const calm = !combo.list.length && (P.mode === 'ground' || P.mode === 'walk' || P.mode === 'deck' || P.mode === 'bail');
      if (calm || game.over > 6) finishTimed();
    }
  }
}
