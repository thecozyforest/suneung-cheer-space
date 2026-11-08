/**
 * 소리는 모두 Web Audio로 합성한다(음원 파일 없음 → 저작권 걱정 없음).
 * 첫 터치(입장 버튼) 전에는 소리를 만들지 않는다.
 */
let ctx = null, master = null, ambientGain = null, volume = 0.7, muted = false;
let noiseBuf = null;
const ambient = { timer: null, kind: null };

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : volume;
  // 부드러운 공간감: 짧은 피드백 딜레이
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 3;
  master.connect(comp).connect(ctx.destination);
  ambientGain = ctx.createGain();
  ambientGain.gain.value = 0.5;
  ambientGain.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function setVolume(v) { volume = v; if (master) master.gain.setTargetAtTime(muted ? 0 : v, ctx.currentTime, 0.05); }
export function getVolume() { return volume; }
export function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : volume, ctx.currentTime, 0.05); }
export function isMuted() { return muted; }

function now() { return ctx.currentTime; }
function env(g, t0, a, peak, dec) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dec);
}
function partial(freq, peak, dec, t0, type = 'sine', dest = master) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  env(g, t0, 0.005, peak, dec);
  o.connect(g).connect(dest);
  o.start(t0); o.stop(t0 + dec + 0.1);
  return o;
}
function noise(t0, dur, { type = 'bandpass', freq = 1200, q = 1, peak = 0.3, attack = 0.005, dest = master } = {}) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  env(g, t0, attack, peak, dur);
  s.connect(f).connect(g).connect(dest);
  s.start(t0, Math.random()); s.stop(t0 + dur + 0.1);
  return { s, f, g };
}

const SFX = {
  /** 처마 풍경: 높은 비조화 배음이 길게 */
  chime() {
    const t = now();
    const base = 1180 + Math.random() * 300;
    [1, 2.76, 5.4, 8.93].forEach((r, i) => partial(base * r, 0.12 / (i + 1), 2.6 - i * 0.4, t + Math.random() * 0.02));
  },
  /** 범종: 낮고 긴 울림 + 맥놀이 */
  templeBell() {
    const t = now();
    const f = 98;
    [[1, 0.5, 9], [1.007, 0.35, 9], [2.0, 0.18, 6], [2.74, 0.12, 4.5], [4.1, 0.06, 3], [5.8, 0.03, 2]].forEach(([r, p, d]) => partial(f * r, p, d, t));
    noise(t, 0.12, { type: 'lowpass', freq: 400, peak: 0.25 });
  },
  /** 교회 종: 중간 높이 종소리 */
  churchBell() {
    const t = now();
    const f = 330;
    [[0.5, 0.25, 4], [1, 0.4, 3.2], [1.19, 0.18, 2.4], [1.5, 0.14, 2], [2.0, 0.12, 1.8], [2.51, 0.07, 1.2], [3.0, 0.05, 1]].forEach(([r, p, d]) => partial(f * r, p, d, t));
  },
  bead() { const t = now(); partial(880, 0.08, 0.25, t, 'triangle'); partial(1320, 0.04, 0.18, t); },
  beadDecade() { const t = now(); [784, 988, 1175].forEach((f, i) => partial(f, 0.08, 0.9, t + i * 0.08)); },
  /** 절: 방석 스치는 소리 */
  bow() { const t = now(); noise(t, 0.35, { type: 'lowpass', freq: 600, peak: 0.12, attack: 0.08 }); },
  /** 블록 부수기 */
  shatter() {
    const t = now();
    noise(t, 0.25, { type: 'highpass', freq: 2500, peak: 0.45 });
    noise(t, 0.18, { type: 'bandpass', freq: 600, q: 0.8, peak: 0.35 });
    for (let i = 0; i < 5; i++) partial(2000 + Math.random() * 3000, 0.05, 0.12, t + i * 0.03 + Math.random() * 0.03, 'square');
  },
  thud() { const t = now(); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.25); env(g, t, 0.005, 0.6, 0.3); o.connect(g).connect(master); o.start(t); o.stop(t + 0.4); },
  pop() { const t = now(); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(500, t); o.frequency.exponentialRampToValueAtTime(1400, t + 0.08); env(g, t, 0.003, 0.25, 0.12); o.connect(g).connect(master); o.start(t); o.stop(t + 0.2); },
  firework() {
    const t = now();
    noise(t, 0.9, { type: 'lowpass', freq: 900, peak: 0.5 });
    for (let i = 0; i < 14; i++) noise(t + 0.15 + Math.random() * 0.8, 0.05, { type: 'highpass', freq: 3000, peak: 0.12 });
  },
  whistle() { const t = now(); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(1800, t + 0.9); env(g, t, 0.05, 0.05, 0.9); o.connect(g).connect(master); o.start(t); o.stop(t + 1); },
  applause(dur = 2.4) {
    const t = now();
    for (let i = 0; i < dur * 70; i++) {
      const tt = t + Math.random() * dur;
      const fade = 1 - (tt - t) / dur;
      noise(tt, 0.03, { type: 'bandpass', freq: 1200 + Math.random() * 1600, q: 1.2, peak: 0.05 + 0.08 * fade });
    }
  },
  sparkle() { const t = now(); [1568, 1976, 2349, 3136].forEach((f, i) => partial(f, 0.06, 0.6, t + i * 0.07)); },
  soft() { const t = now(); [523, 659, 784].forEach((f, i) => partial(f, 0.07, 1.4, t + i * 0.12, 'sine')); },
  warm() { const t = now(); [392, 494, 587, 784].forEach((f, i) => partial(f, 0.06, 1.8, t + i * 0.15, 'triangle')); },
  shout() { const t = now(); [196, 247, 294].forEach((f) => partial(f, 0.08, 0.35, t, 'sawtooth')); },
  rustle() { const t = now(); for (let i = 0; i < 6; i++) noise(t + i * 0.035, 0.06, { type: 'highpass', freq: 2600 + Math.random() * 2000, peak: 0.08 }); },
  step() { const t = now(); noise(t, 0.05, { type: 'lowpass', freq: 500, peak: 0.05 }); },
  leafStep() { const t = now(); for (let i = 0; i < 3; i++) noise(t + i * 0.025, 0.05, { type: 'highpass', freq: 3000 + Math.random() * 2000, peak: 0.05 }); },
  bird() {
    const t = now();
    const o = ctx.createOscillator(), g = ctx.createGain();
    const f0 = 2400 + Math.random() * 1500;
    o.type = 'sine';
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const tt = t + i * 0.12;
      o.frequency.setValueAtTime(f0, tt);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.5, tt + 0.05);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.9, tt + 0.1);
    }
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < n; i++) { const tt = t + i * 0.12; g.gain.exponentialRampToValueAtTime(0.06, tt + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.1); }
    o.connect(g).connect(ambientGain || master); o.start(t); o.stop(t + n * 0.12 + 0.1);
  },
  frog() { const t = now(); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(220, t); o.frequency.linearRampToValueAtTime(140, t + 0.12); env(g, t, 0.01, 0.06, 0.14); o.connect(g).connect(master); o.start(t); o.stop(t + 0.2); },
  breathIn() { const t = now(); noise(t, 3.6, { type: 'bandpass', freq: 500, q: 0.6, peak: 0.05, attack: 1.8 }); },
  breathOut() { const t = now(); noise(t, 5.4, { type: 'bandpass', freq: 380, q: 0.6, peak: 0.05, attack: 0.4 }); },
  tick() { const t = now(); partial(1800, 0.03, 0.04, t, 'square'); },
  timerDone() { const t = now(); [659, 784, 1047, 784, 1047].forEach((f, i) => partial(f, 0.1, 0.5, t + i * 0.16, 'triangle')); },
  shootingStar() { const t = now(); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(2600, t); o.frequency.exponentialRampToValueAtTime(900, t + 1.1); env(g, t, 0.05, 0.05, 1.1); o.connect(g).connect(master); o.start(t); o.stop(t + 1.3); this.sparkle(); },
  stack() { const t = now(); partial(420 + Math.random() * 80, 0.18, 0.18, t, 'triangle'); noise(t, 0.05, { type: 'bandpass', freq: 900, peak: 0.12 }); },
  stick() { const t = now(); noise(t, 0.08, { type: 'lowpass', freq: 300, peak: 0.25 }); partial(180, 0.1, 0.12, t); },
  click() { const t = now(); partial(1200, 0.03, 0.05, t, 'triangle'); },
  door() { const t = now(); noise(t, 0.3, { type: 'lowpass', freq: 700, peak: 0.08, attack: 0.05 }); partial(220, 0.04, 0.2, t + 0.22, 'triangle'); },
  balloon() { const t = now(); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.6); env(g, t, 0.05, 0.04, 0.6); o.connect(g).connect(master); o.start(t); o.stop(t + 0.7); },
  pat() { const t = now(); noise(t, 0.06, { type: 'lowpass', freq: 400, peak: 0.12 }); noise(t + 0.25, 0.06, { type: 'lowpass', freq: 400, peak: 0.12 }); },
  pour() { const t = now(); noise(t, 0.7, { type: 'lowpass', freq: 700, q: 0.7, peak: 0.07, attack: 0.08 }); partial(2637, 0.03, 0.2, t + 0.65); },
  sip() { const t = now(); noise(t, 0.16, { type: 'bandpass', freq: 900, q: 1.4, peak: 0.07, attack: 0.02 }); noise(t + 0.12, 0.1, { type: 'bandpass', freq: 1300, q: 2, peak: 0.05 }); },
  clink() { const t = now(); partial(2637, 0.05, 0.25, t); partial(3520, 0.035, 0.18, t + 0.07); partial(2093, 0.03, 0.2, t + 0.13); },
  candle() { const t = now(); noise(t, 0.4, { type: 'bandpass', freq: 800, q: 0.5, peak: 0.06, attack: 0.05 }); partial(1047, 0.04, 0.8, t + 0.1); },
};

export function play(name, ...args) {
  if (!ctx || muted) return;
  if (ctx.state === 'suspended') ctx.resume();
  try { SFX[name]?.(...args); } catch (e) { /* 소리 실패는 무시 */ }
}

/** 공간 분위기 소리: 일정 간격으로 짧은 소리를 띄운다 */
export function setAmbient(kind) {
  if (ambient.kind === kind) return;
  clearTimeout(ambient.timer);
  ambient.kind = kind;
  if (!kind) return;
  const plan = {
    forest: [['bird', 2.5, 6]],
    annex: [['bird', 5, 10], ['rustle', 3, 7]],
    temple: [['chime', 7, 14]],
    field: [['bird', 8, 16]],
    roof: [],
  }[kind] || [];
  const loop = () => {
    if (ambient.kind !== kind) return;
    for (const [name, a, b] of plan) if (Math.random() < 0.6) play(name);
    const [, a, b] = plan[0] || [null, 8, 12];
    ambient.timer = setTimeout(loop, (a + Math.random() * (b - a)) * 1000);
  };
  if (plan.length) ambient.timer = setTimeout(loop, 1500);
}
