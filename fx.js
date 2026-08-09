// fx.js — ses, titreşim ve görsel tatmin katmanı.

const prefersReduced = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const settings = {
  sound: localStorage.getItem('tmb.sound') !== '0',
  haptics: localStorage.getItem('tmb.haptics') !== '0',
};

export function setSetting(key, on) {
  settings[key] = on;
  localStorage.setItem('tmb.' + key, on ? '1' : '0');
}

/* ---------- Ses: Web Audio ile üretilir, dosya yok ---------- */
let ctx = null;

export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) ctx = new AC();
}

function tone({ freq = 440, dur = 0.12, type = 'sine', gain = 0.12, slide = 0, delay = 0 }) {
  if (!settings.sound || !ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.08, gain = 0.08, delay = 0 }) {
  if (!settings.sound || !ctx) return;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(g).connect(ctx.destination);
  src.start(ctx.currentTime + delay);
}

export const sfx = {
  tap: () => tone({ freq: 620, dur: 0.05, type: 'triangle', gain: 0.06 }),
  // torbadan çıkan taşın masaya düşüşü
  draw: () => { noise({ dur: 0.06, gain: 0.05 }); tone({ freq: 180, dur: 0.16, type: 'sine', gain: 0.14, slide: -80 }); },
  mark: () => { tone({ freq: 880, dur: 0.06, type: 'square', gain: 0.05 }); noise({ dur: 0.04, gain: 0.04 }); },
  row: () => [0, 0.07, 0.14].forEach((d, i) => tone({ freq: 523 * (1 + i * 0.26), dur: 0.14, type: 'triangle', gain: 0.09, delay: d })),
  cinko: () => [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.28, type: 'sine', gain: 0.11, delay: i * 0.08 })),
  tombala: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 0.45, type: 'triangle', gain: 0.12, delay: i * 0.1 })),
  error: () => tone({ freq: 160, dur: 0.22, type: 'sawtooth', gain: 0.09, slide: -60 }),
};

/* ---------- Titreşim ---------- */
export function buzz(pattern) {
  if (!settings.haptics || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch { /* desteklenmiyor */ }
}
export const haptic = {
  mark: () => buzz(10),
  draw: () => buzz(8),
  cinko: () => buzz(30),
  tombala: () => buzz([50, 30, 50, 30, 90]),
  error: () => buzz([15, 40, 15]),
};

/* ---------- Ekran sarsıntısı ---------- */
export function shake(el = document.body, strength = 'sm') {
  if (prefersReduced()) return;
  const cls = strength === 'lg' ? 'shake-lg' : 'shake-sm';
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 400);
}

/* ---------- Konfeti ---------- */
let canvas, cctx, parts = [], raf = null;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.getElementById('fx-canvas');
  cctx = canvas.getContext('2d');
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener('resize', resize);
}

const CONFETTI_COLORS = ['#FFB43D', '#F0517A', '#34D39A', '#F3EADB', '#6BC5F5'];

export function confetti({ count = 110, origin = { x: 0.5, y: 0.35 }, spread = 1 } = {}) {
  if (prefersReduced()) return;
  ensureCanvas();
  const ox = origin.x * innerWidth;
  const oy = origin.y * innerHeight;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (3 + Math.random() * 9) * spread;
    parts.push({
      x: ox, y: oy,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 4,
      w: 5 + Math.random() * 7,
      h: 8 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
      life: 1,
    });
  }
  if (!raf) raf = requestAnimationFrame(step);
}

function step() {
  cctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
  for (const p of parts) {
    p.vy += 0.35;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= 0.006;
    cctx.save();
    cctx.translate(p.x, p.y);
    cctx.rotate(p.rot);
    cctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
    cctx.fillStyle = p.color;
    cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    cctx.restore();
  }
  if (parts.length) raf = requestAnimationFrame(step);
  else { cctx.clearRect(0, 0, innerWidth, innerHeight); raf = null; }
}

export { prefersReduced };
