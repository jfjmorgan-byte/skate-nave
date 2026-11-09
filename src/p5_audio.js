
// =====================================================================
//  Sonido sintetizado con WebAudio + música generativa lo-fi
// =====================================================================
const SND = (() => {
  let ac = null, master, sfx, mus, musIn, noiseBuf, brownBuf;
  let rollW, rollC, rollWF, grindG, brakeG, crackleG;
  let muted = false;
  const M = { step: 0, next: 0, bar: 0, prog: 0, bpm: 84, on: false };
  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.85;
    master.connect(comp); comp.connect(ac.destination);
    sfx = ac.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
    mus = ac.createGain(); mus.gain.value = 0.38; mus.connect(master);
    const warm = ac.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 4200; warm.Q.value = 0.4;
    musIn = ac.createGain(); musIn.connect(warm); warm.connect(mus);
    // búferes de ruido
    const n = ac.sampleRate * 2;
    noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
    brownBuf = ac.createBuffer(1, n, ac.sampleRate);
    const d = noiseBuf.getChannelData(0), b = brownBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { d[i] = Math.random() * 2 - 1; last = (last + 0.02 * d[i]) / 1.02; b[i] = last * 3.5; }
    // bucles: rodar en madera / cemento, grind metálico, freno, crujido de vinilo
    rollWF = filt('lowpass', 320, 0.7);
    rollW = loop(brownBuf, [rollWF, filt('peaking', 140, 1.2, 6)]);
    rollC = loop(noiseBuf, [filt('bandpass', 1100, 0.5), filt('lowpass', 2600, 0.5)]);
    grindG = loop(noiseBuf, [filt('bandpass', 2900, 5), filt('highpass', 900, 0.7)]);
    const sq = ac.createOscillator(); sq.type = 'sawtooth'; sq.frequency.value = 1180;
    const sqf = filt('bandpass', 2360, 8); const sqg = ac.createGain(); sqg.gain.value = 0.25;
    sq.connect(sqf); sqf.connect(sqg); sqg.connect(grindG); sq.start();
    brakeG = loop(noiseBuf, [filt('bandpass', 1500, 1.1)]);
    crackleG = ac.createGain(); crackleG.gain.value = 0.018;
    const cs = ac.createBufferSource(); cs.buffer = noiseBuf; cs.loop = true;
    const cf = filt('highpass', 3500, 0.7); cs.connect(cf); cf.connect(crackleG); crackleG.connect(musIn); cs.start();
    M.next = ac.currentTime + 0.15; M.on = true;
  }
  function filt(type, f, q, gain) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; if (gain) b.gain.value = gain; return b; }
  function loop(buf, fs) {
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    src.loopStart = Math.random(); let node = src;
    for (const f of fs) { node.connect(f); node = f; }
    const g = ac.createGain(); g.gain.value = 0; node.connect(g); g.connect(sfx); src.start(0, Math.random());
    return g;
  }
  function setG(g, v, tc) { if (ac && g) g.gain.setTargetAtTime(v, ac.currentTime, tc || 0.05); }
  function burst(t, dur, vol, fs, dest) {
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    let node = src; for (const f of fs) { node.connect(f); node = f; }
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    node.connect(g); g.connect(dest || sfx); src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.02);
  }
  function tone(t, type, f0, f1, dur, vol, dest, att) {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
    const g = ac.createGain();
    if (att) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); }
    else g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest || sfx); o.start(t); o.stop(t + dur + 0.02);
    return o;
  }
  const ok = () => ac && ac.state === 'running';
  const now = () => ac.currentTime;
  // ---------------- música lo-fi ----------------
  const PROGS = [
    [[38, [53, 57, 60, 64]], [43, [53, 59, 64, 69]], [36, [52, 55, 59, 62]], [45, [55, 59, 60, 64]]],
    [[41, [53, 57, 60, 64]], [40, [52, 55, 59, 62]], [38, [50, 53, 57, 60]], [36, [52, 55, 59, 64]]],
    [[45, [55, 60, 64, 67]], [38, [53, 57, 60, 64]], [43, [53, 59, 62, 65]], [36, [52, 55, 59, 62]]],
    [[40, [55, 59, 62, 67]], [45, [55, 60, 64, 67]], [41, [53, 57, 60, 64]], [43, [53, 59, 62, 65]]]
  ];
  const PENTA = [72, 74, 76, 79, 81, 84];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  let melDelay = null;
  function musicStep(st, t) {
    const s16 = 60 / M.bpm / 4;
    const bar16 = st % 16;
    if (bar16 === 0) {
      if (M.bar % 8 === 0) M.prog = Math.floor(Math.random() * PROGS.length);
      M.bar++;
    }
    const ch = PROGS[M.prog][(M.bar - 1) % 4];
    // batería
    if (bar16 === 0 || bar16 === 10 || (bar16 === 7 && Math.random() < 0.3)) {
      tone(t, 'sine', 150, 42, 0.34, 0.9, musIn);
      burst(t, 0.03, 0.15, [filt('lowpass', 900)], musIn);
    }
    if (bar16 === 4 || bar16 === 12) {
      burst(t, 0.2, 0.42, [filt('bandpass', 1900, 0.8), filt('highpass', 500)], musIn);
      tone(t, 'triangle', 190, 160, 0.1, 0.22, musIn);
    }
    if (bar16 % 2 === 0) burst(t, bar16 === 14 && Math.random() < 0.5 ? 0.16 : 0.04, 0.05 + Math.random() * 0.07, [filt('highpass', 7200)], musIn);
    if (Math.random() < 0.08) burst(t + Math.random() * s16, 0.008, 0.06, [filt('highpass', 2000)], musIn);
    // bajo
    if (bar16 === 0 || bar16 === 10 || (bar16 === 6 && Math.random() < 0.5)) {
      const f = mtof(ch[0] + (bar16 === 6 ? 7 : 0));
      const o = tone(t, 'triangle', f, f, s16 * 5, 0.32, musIn, 0.01);
      o.detune.value = (Math.random() - 0.5) * 10;
    }
    // acordes (piano eléctrico)
    if (bar16 === 0 || (bar16 === 10 && Math.random() < 0.45)) {
      const dur = bar16 === 0 ? s16 * 9 : s16 * 5;
      const lp = filt('lowpass', 1500, 0.5); lp.connect(musIn);
      ch[1].forEach((m, i) => {
        const tt = t + i * 0.012;
        const o1 = tone(tt, 'sine', mtof(m), 0, dur, 0.085, lp, 0.02);
        const o2 = tone(tt, 'triangle', mtof(m) * 2, 0, dur * 0.6, 0.018, lp, 0.01);
        o1.detune.value = o2.detune.value = (Math.random() - 0.5) * 14;
      });
    }
    // melodía dispersa
    if (bar16 % 2 === 0 && Math.random() < 0.17) {
      const m = PENTA[Math.floor(Math.random() * PENTA.length)] - (Math.random() < 0.3 ? 12 : 0);
      if (!melDelay) {
        melDelay = ac.createDelay(1); melDelay.delayTime.value = s16 * 3;
        const fb = ac.createGain(); fb.gain.value = 0.32; const dl = filt('lowpass', 2200);
        melDelay.connect(dl); dl.connect(fb); fb.connect(melDelay); dl.connect(musIn);
      }
      const g = ac.createGain(); g.gain.value = 1; g.connect(musIn); g.connect(melDelay);
      const o = tone(t, 'sine', mtof(m), 0, s16 * 3.5, 0.06, g, 0.02);
      o.detune.value = (Math.random() - 0.5) * 18;
    }
  }
  function tick() {
    if (!ok() || !M.on) return;
    const s16 = 60 / M.bpm / 4;
    if (M.next < now() - 0.5) M.next = now() + 0.05;
    while (M.next < now() + 0.22) {
      musicStep(M.step, M.next);
      M.next += s16 * (M.step % 2 === 0 ? 1.17 : 0.83);
      M.step++;
    }
  }
  return {
    unlock() { try { if (!ac) init(); if (ac && ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; } },
    tick,
    get muted() { return muted; },
    setMuted(m) { muted = m; if (ac) master.gain.setTargetAtTime(m ? 0 : 0.85, ac.currentTime, 0.03); },
    toggle() { this.setMuted(!muted); return muted; },
    roll(speed, wood, on) {
      if (!ok()) return;
      const v = on ? clamp(speed / 380, 0, 1) : 0;
      setG(rollW, wood ? v * 0.75 : 0, 0.04); setG(rollC, wood ? 0 : v * 0.33, 0.04);
      rollWF.frequency.setTargetAtTime(220 + speed * 1.1, ac.currentTime, 0.05);
    },
    grind(speed) { if (ok()) setG(grindG, speed > 0 ? clamp(0.12 + speed / 900, 0, 0.42) : 0, 0.03); },
    brake(on) { if (ok()) setG(brakeG, on ? 0.22 : 0, 0.04); },
    pop(ch) { if (!ok()) return; const t = now(); burst(t, 0.06, 0.6, [filt('bandpass', 1300, 1.2)]); tone(t, 'sine', 160, 55, 0.14, 0.7); tone(t, 'triangle', 760, 600, 0.05, 0.3); },
    land(v) {
      if (!ok()) return; const t = now(), k = clamp(v / 300, 0.15, 1);
      tone(t, 'sine', 120, 40, 0.2, 0.8 * k); burst(t, 0.12, 0.5 * k, [filt('lowpass', 1400)]); burst(t, 0.04, 0.35 * k, [filt('bandpass', 2400, 2)]);
    },
    coping() { if (!ok()) return; const t = now(); tone(t, 'square', 640, 610, 0.14, 0.12); tone(t, 'square', 957, 930, 0.12, 0.08); burst(t, 0.03, 0.35, [filt('highpass', 2500)]); },
    grindStart() { if (!ok()) return; const t = now(); tone(t, 'square', 820, 790, 0.18, 0.12); burst(t, 0.06, 0.4, [filt('bandpass', 3200, 3)]); },
    push() { if (!ok()) return; const t = now(); burst(t, 0.2, 0.32, [filt('lowpass', 900), filt('highpass', 150)]); },
    click(v) { if (!ok()) return; burst(now(), 0.025, clamp(v / 400, 0.05, 0.35), [filt('bandpass', 1800, 2)]); },
    pump() { if (!ok()) return; tone(now(), 'sine', 70, 130, 0.22, 0.25, sfx, 0.03); },
    flip() { if (!ok()) return; burst(now(), 0.05, 0.3, [filt('highpass', 2600)]); },
    catchB() { if (!ok()) return; const t = now(); burst(t, 0.05, 0.4, [filt('bandpass', 1700, 1.5)]); tone(t, 'triangle', 300, 260, 0.05, 0.2); },
    boardHit() { if (!ok()) return; const t = now(); burst(t, 0.06, 0.45, [filt('bandpass', 1500, 1.5)]); tone(t, 'triangle', 420, 300, 0.06, 0.2); },
    fall() {
      if (!ok()) return; const t = now();
      tone(t, 'sine', 90, 38, 0.35, 0.9); burst(t, 0.3, 0.55, [filt('lowpass', 500)]);
      for (let i = 0; i < 3; i++) burst(t + 0.09 + i * 0.11, 0.05, 0.35 / (i + 1), [filt('bandpass', 1600 - i * 200, 1.6)]);
    },
    ui() { if (!ok()) return; tone(now(), 'square', 880, 880, 0.05, 0.06); },
    uiOk() { if (!ok()) return; const t = now(); tone(t, 'square', 660, 660, 0.05, 0.06); tone(t + 0.06, 'square', 990, 990, 0.08, 0.06); },
    uiNo() { if (!ok()) return; tone(now(), 'square', 220, 180, 0.12, 0.07); },
    win() { if (!ok()) return; const t = now(); [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.09, 'square', f, f, 0.16, 0.07)); },
    coin() { if (!ok()) return; const t = now(); tone(t, 'square', 988, 988, 0.06, 0.05); tone(t + 0.06, 'square', 1319, 1319, 0.12, 0.05); }
  };
})();
