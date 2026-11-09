
// =====================================================================
//  Revert, impacto (micropausa y temblor), special y trucos de coping extra
// =====================================================================
const JUICE = { stop: 0, shake: 0 };
function hitStop(t) { JUICE.stop = Math.max(JUICE.stop, t); }
function shake(a) { JUICE.shake = Math.max(JUICE.shake, a); }
SND.revert = function () { SND.push(); SND.catchB(); };

// Revert: giro de 180 arrastrando la cola al caer en una rampa; el combo sigue vivo más tiempo
function doRevert() {
  P.revWin = 0; P.revBuf = 0;
  addTrick('Revert', 100);
  P.facing = -P.facing;
  P.revAnim = 0.28;
  P.v *= 0.94;
  P.grace = 1.5;
  P.pumpUsed = true;
  sparks(P.x, P.y, P.z, -sgn(P.v) || 1, 3);
  dust(P.x, P.y, P.z, 4, 60);
  popup('REVERT', 29);
  SND.revert();
}

// Special: con la barra llena, Shift + tecla en el aire
const SPECIALS = { KeyW: 'Christ Air', KeyA: 'Kickflip McTwist', KeyD: '360 Flip', KeyS: 'Impossible' };
function startSpecial(code) {
  P.special = 0;
  if (code === 'KeyW') { P.christ = 0.001; addTrick('Christ Air', 1800); }
  else {
    startFlip(code === 'KeyA' ? 'kf' : code === 'KeyD' ? 'tre' : 'imp', 1);
    P.flip.special = true;
    if (code === 'KeyA') { P.flip.specialName = 'Kickflip McTwist'; P.mcTwist = 3 * Math.PI * (P.bsSign || -1); }
  }
  popup('¡SPECIAL!', 21);
  SND.win(); shake(1);
  P.celebrate = 0;
}

// Grinds de coping extra: W+A smith, W+D feeble (se mantienen con W)
LIPS.SMITH = { n: 'Smith Grind', pts: 200, rate: 240, exit: 'fwd' };
LIPS.FEEBLE = { n: 'Feeble Grind', pts: 210, rate: 250, exit: 'fwd' };
LIPNAMES.push('Smith Grind', 'Feeble Grind');
const COPING_GRINDS = ['KeyW', 'SMITH', 'FEEBLE'];
const lipHoldKey = c => (c === 'SMITH' || c === 'FEEBLE') ? 'KeyW' : c;
