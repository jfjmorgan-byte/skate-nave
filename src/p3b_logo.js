// Logo de la pared (convertido a pixel art desde la imagen del usuario): . vacío, w blanco, t verde azulado, d verde azulado oscuro, k contorno
const WALL_LOGO = [
  '.................................................................................................',
  '........................................wwwwwwwwwwwwwwwww........................................',
  '....................................wwwwwwwwwwwwwwwwwwwwwwwww....................................',
  '.................................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.................................',
  '..............................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..............................',
  '............................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww............................',
  '..........................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..........................',
  '........................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww........................',
  '.......................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.......................',
  '.....................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.....................',
  '....................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww....................',
  '..................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..................',
  '.................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.................',
  '................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww................',
  '...............wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww...............',
  '..............wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..............',
  '.............wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.............',
  '............wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww............',
  '...........wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww...........',
  '...........wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww...........',
  '..........wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..........',
  '.........wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.........',
  '.........wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.........',
  '........wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww........',
  '.......wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.......',
  '.......wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.......',
  '......wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww......',
  '......wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww......',
  '.....wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwttttwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.....',
  '.....wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwtttttwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.....',
  '....wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwdtdwwwwtttttdwwwwwwwwwwwwwwwwwwwwwwwwwwwwww....',
  '....wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwtttkwwwttttttwwwwwkwwwwddwwwwwwwwwwwwwwwwww....',
  '....wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwttttwwwdtttttdwwwttdwwwttkwwwwwwwwwwwwwwwww....',
  '...wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwttttdwwwttttttkwwtttdwktttwwwwwwwwwwwwwwwwww...',
  '...wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwkwwwdttttkwwdttttttwwttttwwtttkwdtkwwwwwwwwwwwww...',
  '...wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwdttttwwwtttttwwwttttttdkttttkwtttkwttttkwwwwwwwwwww...',
  '..wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwdttttttwwtttttdwwtttttttwdtttwwtttwwttttttwwwwwwwwwww..',
  '..wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwttttttttwdtttttwwwtttdtttwdttddtttwwttttttkwwwwwwwwww..',
  '..wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwkttttttttwttttttdwwttkwdttkwdttttttkwttttttkwwwwwwwwww..',
  '..wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwkwwdttttttttwwttttttwwttwwwtttwwttttttkwdtttttwwwwwwwwwww..',
  '.wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwttttwdttttttttwwttttttwwwttwwdtttwdtttttkwdttkkwwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwkttttwwttttttttkwttttttwwwttkwwdttwdtttttkdttttdwwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwkttttwwttttttttwwttttttwwwdtkwwwttwdtttttwttttttkwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwdwwwttttwwttttttttwwttttttkwwdtkwwwttwwttttkwttttttkwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwtttdwttttwwttttttttwwttttttdwwwtkwdtttwwktttkwttktttwwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwtttttttttwwtttttttdwdtttttttwwwtwwdtttwwwdtdwdtttdwwwwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwtttttttttkwtttttttwwttttwtttkwwtdwwttdtkwwkwwwttttdwwwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwwwwwwwwwwwwdttkwwtttttttttkwktttttkwdttttwdttkwwttddttttkwwwwwwdtttkwwwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwwwwwwwwwwdttttkwwwttttttttwwdttttkwwdttttwtttkwwttttttttwwwwwwwwwwwwwwwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwwwwwwwwwdttttdtwwkttttttttwwttttkwwwdtttwwtttkwwtttttttkwwwwwwwwwwwwwwwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwwwwwwwdtttttdttwwkttttttttkwttttttwwdtttwttttkwwttttttkwwwwwwwwwwwwwwwwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwwwwwwttttttttttwwkttttttttkwttttttkwdttttttttkwdttttkwwwwwwwwwwwwwwwwwwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwwwwktttttdtttttwwkttttttttwwtttttttwdttttttttkwtttttwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwwwdttttddttttdddwwttttttttwwtttttttwdtttttttdwwttttkwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwwdtttddttttddttdwkttdttttdwdttttttkwdtttttttkwwttttwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwktttttttttdttttdwtttkttttkwdttttttkwdtttttttwwdttttwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.',
  '.wwwwwwwwwwwwwttttttttdttttttwwtttwttttwwttkwwwwwdttttttttwwttttkwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.',
  '..wwwwwwwwwwwwtttttttddtttttwwwttdwttttwdttkwwwwdttttttttwwtttwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..',
  '..wwwwwwwwwwwwkttttttttttttwwwdttwwtttkwdttkwwwdtttttttttwwttwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..',
  '..wwwwwwwwwwwwwtttttttttttwwwwtttwwtttwwtttkwwttttttttttkwwkkwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..',
  '..wwwwwwwwwwwwwkttttttttdwwwwtttwwwttdwktttwwwtttttttttkwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..',
  '...wwwwwwwwwwwwwkttttttwwwwwwtttwwwttwwdtttwwdttttttttdwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww...',
  '...wwwwwwwwwwwwwwkttttwwwwwwwwkwwwdttwdtttwwwttttttttdwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww...',
  '...wwwwwwwwwwwwwwwktkwwwwwwwwwwwwwdtwwtttdwwwtttttttdwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww...',
  '....wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwttttkwwtttttttdwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww....',
  '....wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwdttttkwwttttttdwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww....',
  '....wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwtttttwwtttttttwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww....',
  '.....wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwttttkwdttttttwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.....',
  '.....wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwttttwwttttttkwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.....',
  '......wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwtttkwdttttttwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww......',
  '......wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwkwwkttttttwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww......',
  '.......wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwttttttkwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.......',
  '.......wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwdttttttwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.......',
  '........wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwdttttttwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww........',
  '.........wwwwwwwwwwwwwwwwwwwwwwwwwwwwktttttttwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.........',
  '.........wwwwwwwwwwwwwwwwwwwwwwwwwwwwtttttttwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.........',
  '..........wwwwwwwwwwwwwwwwwwwwwwwwwwttttttdwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..........',
  '...........wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww...........',
  '...........wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww...........',
  '............wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww............',
  '.............wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.............',
  '..............wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..............',
  '...............wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww...............',
  '................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww................',
  '.................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.................',
  '..................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..................',
  '....................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww....................',
  '.....................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.....................',
  '.......................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.......................',
  '........................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww........................',
  '..........................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..........................',
  '............................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww............................',
  '..............................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..............................',
  '.................................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.................................',
  '....................................wwwwwwwwwwwwwwwwwwwwwwwww....................................',
  '........................................wwwwwwwwwwwwwwwww........................................',
  '.................................................................................................'
];
// Pinta el logo sobre la capa del muro: borde oscuro, blanco con sombreado tramado,
// letras con luz arriba-izquierda y sombra abajo-derecha, algo de desgaste y la luz de la hora.
function paintWallLogo(L, ox, oy, T) {
  const N = WALL_LOGO.length;
  const at = (i, j) => (j >= 0 && j < N && i >= 0 && i < WALL_LOGO[j].length) ? WALL_LOGO[j][i] : '.';
  const baseRow = LY(0, WALLZ), K = COSE * ZM;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const ch = at(i, j), X = ox + i, R = oy + j;
    const wy = (baseRow - R) / K;
    if (Math.abs(wy - CONDUIT_Y) < 1.6) continue;              // el conducto eléctrico queda delante
    if (ch === '.') {
      if (at(i - 1, j) !== '.' || at(i + 1, j) !== '.' || at(i, j - 1) !== '.' || at(i, j + 1) !== '.') L.set(X, R, 3);
      continue;
    }
    let c;
    if (ch === 'w') {
      const d = ((i - N / 2) + (j - N / 2)) / N;
      c = dpick([7, 8, 9, 10], 0.78 - d * 0.7 + (vnoise(X * 0.3, R * 0.3) - 0.5) * 0.25, X, R);
    } else if (ch === 't') {
      c = (at(i + 1, j) === 'w' || at(i, j + 1) === 'w') ? 33 : (at(i - 1, j) === 'w' || at(i, j - 1) === 'w') ? 35 : 34;
    } else if (ch === 'd') c = 33;
    else c = 1;
    if (hash2(X * 3, R * 7) > 0.965) c = DARK[c];
    L.set(X, R, lit(c, T.amb * 0.9, X, R));
  }
}
