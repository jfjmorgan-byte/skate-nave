
// =====================================================================
//  Objetos sobre el suelo de cada mapa (sin graffitis)
// =====================================================================
const PROP_MAPS = {
  pack: { k: 0, R: 18, r: 17, D: 26, d: 1, y: 21 },
  pack2: { k: 0, R: 27, r: 26, D: 21, d: 20, y: 9 },
  bottle: { k: 0, B: 28, b: 27, w: 10, c: 9 },
  board: { k: 0, A: 19, B: 20, C: 21, g: 1, t: 7, w: 9 },
  radio: { k: 0, G: 4, g: 3, s: 1, S: 6, h: 2, l: 19 },
  cone: { k: 0, O: 19, o: 18, w: 10 },
  bin: { k: 0, G: 23, g: 22, L: 24, m: 5 },
  ring: { k: 0, R: 18, W: 10, r: 17 },
  towel: { k: 0, B: 28, b: 27, W: 10 },
  stop: { k: 0, Y: 21, y: 20, C: 6, c: 4 }
};
const PROP_SPR = {
  pack: ['..kkkkk..', '.kRRRRRk.', 'kRRRRRRRk', 'kRryyyrRk', 'kRRRRRRRk', 'kRDDDDDRk', 'kRDdddDRk', 'kRDDDDDRk', 'kRRRRRRRk', '.kkkkkkk.'],
  bottle: ['.kk.', 'kwwk', 'kBbk', 'kBbk', 'kBbk', 'kBbk', 'kBbk', 'kkkk'],
  board: ['.kkk.', 'kAAAk', 'kBBBk', 'kCCCk', 'kAAAk', 'kBBBk', 'kCCCk', 'kAAAk', 'kBBBk', 'kCCCk', 'kAAAk', 'kBBBk', 'kCCCk', 'kAAAk', 'kBBBk', 'kCCCk', 'kAAAk', 'kBBBk', 'kCCCk', 'kAAAk', 'kBBBk', 'kCCCk', 'kAAAk', '.kkk.'],
  radio: ['...khhhhhhhhhhk...', '...k..........k...', 'kkkkkkkkkkkkkkkkkk', 'kGGGGGGGGGGGGGGGGk', 'kGsssGGlGGGGGsssGk', 'ksSSSsGGgGgGsSSSsk', 'ksSsSsGGGGGGsSsSsk', 'ksSSSsGgggggsSSSsk', 'kGsssGGGGGGGGsssGk', 'kggggggggggggggggk', 'kkkkkkkkkkkkkkkkkk'],
  cone: ['...k...', '..kOk..', '..kOk..', '.kwwwk.', '.kOOOk.', '.kOOOk.', 'kwwwwwk', 'kOOOOOk', 'koooooo', 'kkkkkkk'],
  bin: ['kkkkkkkkk', 'kmmmmmmmk', 'kLLLLLLLk', 'kGGgGGgGk', 'kGGgGGgGk', 'kGGgGGgGk', 'kGGgGGgGk', 'kGGgGGgGk', 'kGGgGGgGk', 'kgggggggk', '.kkkkkkk.'],
  ring: ['...kkkkk...', '.kkWWRRRkk.', 'kRRk...kWWk', 'kWWk...kRRk', '.kkRRWWWkk.', '...kkkkk...'],
  towel: ['kkkkkkkkkkkkkk', 'kBBWWBBWWBBWWk', 'kbbWWbbWWbbWWk', 'kkkkkkkkkkkkkk'],
  stop: ['.kkkkkkkkkkkk.', 'kYYyyYYyyYYyyk', 'kCCCCCCCCCCCCk', 'kcccccccccccck', 'kkkkkkkkkkkkkk']
};
const RADIO = { x: 150, z: -31 };
function drawFloorProps(L, T) {
  const t = theme();
  const at = (x, z, y) => [Math.round(x * ZM), Math.round(LY(y || 0, z))];
  const sh = (x, z) => floorLight(x, z) * 0.8;
  const shadow = (px, py, wd) => { for (let i = -1; i <= wd; i++) if (bay(px + i, py) < 0.7) L.shade(px + i, py, -1); };
  const spr = (name, mapName, x, z, y) => { const [px, py] = at(x, z, y); const s = PROP_SPR[name]; L.sprite(s, px, py - s.length, PROP_MAPS[mapName || name], sh(x, z)); shadow(px, py, s[0].length); };
  const bench = (x, z, wood, metal) => {
    const [bx, by] = at(x, z), len = Math.round(70 * ZM), sh0 = sh(x + 30, z);
    const top = by - Math.round(15 * COSE * ZM);
    for (const lx of [bx + 3, bx + len - 5]) { L.rect(lx, top + 3, 2, by - top - 3, lit(metal, sh0, lx, by)); L.set(lx + 2, by - 1, 0); }
    for (let j = 0; j < 4; j++) for (let i = 0; i < len; i++) L.set(bx + i, top + j, lit(j === 0 ? wood[3] : (i % 9 === 0 ? wood[0] : j === 3 ? wood[1] : wood[2]), sh0, bx + i, top + j));
    L.rect(bx, top - 1, len, 1, 0); L.rect(bx, top + 4, len, 1, 0);
    shadow(bx, by, len);
  };
  if (t === 'nave') {
    bench(600, -32, [12, 13, 14, 15], 3);
    spr('pack', 'pack', 680, -30); spr('pack', 'pack2', 588, -30); spr('bottle', 'bottle', 692, -29);
    { const [x, y] = at(792, -35); L.sprite(PROP_SPR.board, x, y - 24, PROP_MAPS.board, sh(792, -35)); L.rect(x - 1, y - 20, 1, 3, 9); L.rect(x + 5, y - 20, 1, 3, 9); L.rect(x - 1, y - 6, 1, 3, 9); L.rect(x + 5, y - 6, 1, 3, 9); }
    spr('radio', 'radio', RADIO.x, RADIO.z); spr('cone', 'cone', 872, -31);
  } else if (t === 'park') {
    bench(600, -32, [12, 13, 14, 15], 2); bench(150, -32, [12, 13, 14, 15], 2);
    spr('bin', 'bin', 700, -31); spr('pack', 'pack2', 262, -30); spr('bottle', 'bottle', 276, -29);
  } else if (t === 'pool') {
    spr('ring', 'ring', BIG.lip + 18, -24, BIG.H); spr('towel', 'towel', 6, -20, MINI.H);
  } else if (t === 'parking') {
    for (let x = 110; x < WORLD_W - 60; x += 110) { if (groundY(x + 40) > 0.3 || groundY(x) > 0.3) continue; spr('stop', 'stop', x + 46, -33); }
    spr('cone', 'cone', 300, -28); spr('cone', 'cone', 318, -24); spr('cone', 'cone', 900, -27);
    spr('pack', 'pack', 230, -30);
  }
}
