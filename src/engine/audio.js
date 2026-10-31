/* ============================================================
   Audio engine — fully synthesized via WebAudio.
   No external assets required; graceful when audio unavailable.
   Provides SFX cues + a lightweight procedural ambient music bed
   themed per realm.
   ============================================================ */
import { state } from './store.js';

let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let started = false;
let musicTimer = null;
let currentTheme = null;

function ensure() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    masterGain = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(ctx.destination);
    applyVolumes();
    return true;
  } catch {
    return false;
  }
}

export function applyVolumes() {
  if (!ctx) return;
  const s = state.settings || { musicVolume: 0.5, sfxVolume: 0.7, muted: false };
  masterGain.gain.value = s.muted ? 0 : 1;
  musicGain.gain.value = (s.musicVolume ?? 0.5) * 0.6;
  sfxGain.gain.value = (s.sfxVolume ?? 0.7);
}

/** Must be called from a user gesture to unlock audio on mobile. */
export function unlock() {
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume();
  started = true;
}

/* ---------------- SFX ---------------- */
function tone({ freq = 440, type = 'sine', dur = 0.12, gain = 0.3, attack = 0.005, decay, slideTo, when = 0 }) {
  if (!ensure() || !started) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + (decay ?? dur));
  osc.connect(g);
  g.connect(sfxGain);
  osc.start(t0);
  osc.stop(t0 + (decay ?? dur) + 0.02);
}

function noise({ dur = 0.2, gain = 0.3, when = 0, filterFreq = 1200, type = 'lowpass' }) {
  if (!ensure() || !started) return;
  const t0 = ctx.currentTime + when;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = type; filt.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt); filt.connect(g); g.connect(sfxGain);
  src.start(t0); src.stop(t0 + dur);
}

const SFX = {
  click: () => tone({ freq: 320, type: 'triangle', dur: 0.05, gain: 0.18 }),
  hover: () => tone({ freq: 520, type: 'sine', dur: 0.03, gain: 0.05 }),
  confirm: () => { tone({ freq: 440, type: 'triangle', dur: 0.09, gain: 0.2 }); tone({ freq: 660, type: 'triangle', dur: 0.12, gain: 0.15, when: 0.06 }); },
  back: () => tone({ freq: 260, type: 'sine', dur: 0.09, gain: 0.15, slideTo: 180 }),
  build: () => { noise({ dur: 0.18, gain: 0.25, filterFreq: 800 }); tone({ freq: 180, type: 'square', dur: 0.14, gain: 0.12 }); },
  coin: () => { tone({ freq: 880, type: 'square', dur: 0.06, gain: 0.14 }); tone({ freq: 1180, type: 'square', dur: 0.09, gain: 0.11, when: 0.05 }); },
  levelup: () => [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.18, gain: 0.18, when: i * 0.09 })),
  achievement: () => [659, 831, 988, 1319].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.25, gain: 0.16, when: i * 0.1 })),
  hit: () => { noise({ dur: 0.14, gain: 0.35, filterFreq: 1600 }); tone({ freq: 140, type: 'sawtooth', dur: 0.1, gain: 0.2, slideTo: 60 }); },
  heavy: () => { noise({ dur: 0.24, gain: 0.4, filterFreq: 900 }); tone({ freq: 90, type: 'square', dur: 0.2, gain: 0.28, slideTo: 40 }); },
  block: () => { tone({ freq: 300, type: 'square', dur: 0.08, gain: 0.2 }); noise({ dur: 0.08, gain: 0.2, filterFreq: 2600, type: 'highpass' }); },
  dodge: () => tone({ freq: 700, type: 'sine', dur: 0.14, gain: 0.12, slideTo: 1400 }),
  magic: () => { tone({ freq: 500, type: 'sine', dur: 0.4, gain: 0.16, slideTo: 1500 }); tone({ freq: 750, type: 'triangle', dur: 0.4, gain: 0.1, slideTo: 2200, when: 0.05 }); },
  hurt: () => tone({ freq: 200, type: 'sawtooth', dur: 0.2, gain: 0.22, slideTo: 90 }),
  death: () => [220, 180, 140, 90, 55].forEach((f, i) => tone({ freq: f, type: 'sawtooth', dur: 0.35, gain: 0.2, when: i * 0.14 })),
  victory: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.3, gain: 0.18, when: i * 0.13 })),
  danger: () => { tone({ freq: 160, type: 'sawtooth', dur: 0.5, gain: 0.2 }); tone({ freq: 155, type: 'sawtooth', dur: 0.5, gain: 0.2, when: 0.02 }); },
  reveal: () => { tone({ freq: 600, type: 'sine', dur: 0.2, gain: 0.14 }); tone({ freq: 900, type: 'sine', dur: 0.3, gain: 0.12, when: 0.1 }); },
  wrong: () => { tone({ freq: 200, type: 'square', dur: 0.15, gain: 0.2 }); tone({ freq: 150, type: 'square', dur: 0.25, gain: 0.2, when: 0.12 }); },
  notify: () => tone({ freq: 740, type: 'sine', dur: 0.1, gain: 0.12 }),
  paper: () => noise({ dur: 0.12, gain: 0.1, filterFreq: 3000, type: 'highpass' }),
};

export function sfx(name) {
  try { SFX[name]?.(); } catch {}
}

/* ---------------- Procedural music ---------------- */
const THEMES = {
  hub:      { root: 220.00, scale: [0, 2, 3, 5, 7, 8, 10], tempo: 3.2, wave: 'sine',     mood: 0.5 },
  kingdom:  { root: 196.00, scale: [0, 2, 4, 5, 7, 9, 11], tempo: 3.0, wave: 'triangle', mood: 0.6 },
  mythos:   { root: 233.08, scale: [0, 1, 4, 5, 7, 8, 11], tempo: 2.6, wave: 'sine',     mood: 0.7 },
  crime:    { root: 174.61, scale: [0, 2, 3, 5, 6, 8, 10], tempo: 3.6, wave: 'sine',     mood: 0.3 },
  lastlife: { root: 146.83, scale: [0, 1, 3, 5, 6, 8, 10], tempo: 4.0, wave: 'triangle', mood: 0.25 },
  combat:   { root: 164.81, scale: [0, 2, 3, 5, 7, 8, 10], tempo: 5.5, wave: 'sawtooth', mood: 0.2 },
};

let step = 0;
function scheduleMusic(theme) {
  if (!ensure() || !started) return;
  const th = THEMES[theme] || THEMES.hub;
  const interval = 1000 / (th.tempo / 2);
  const playNote = () => {
    if (!ctx) return;
    const s = state.settings;
    if (!s || (s.musicVolume ?? 0) <= 0.001) return;
    const deg = th.scale[Math.floor(Math.random() * th.scale.length)];
    const octave = Math.random() < 0.35 ? 0 : (Math.random() < 0.5 ? 12 : -12);
    const freq = th.root * Math.pow(2, (deg + octave) / 12);
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = th.wave;
    osc.frequency.value = freq;
    const dur = 1.4 + Math.random() * 1.4;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.14, t0 + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 700 + th.mood * 1400;
    osc.connect(filt); filt.connect(g); g.connect(musicGain);
    osc.start(t0); osc.stop(t0 + dur + 0.1);
    // occasional bass drone
    if (step % 4 === 0) {
      const b = ctx.createOscillator(); const bg = ctx.createGain();
      b.type = 'sine'; b.frequency.value = th.root / 2;
      bg.gain.setValueAtTime(0, t0);
      bg.gain.linearRampToValueAtTime(0.1, t0 + 0.6);
      bg.gain.exponentialRampToValueAtTime(0.0001, t0 + 3);
      b.connect(bg); bg.connect(musicGain); b.start(t0); b.stop(t0 + 3.2);
    }
    step++;
  };
  clearInterval(musicTimer);
  musicTimer = setInterval(playNote, interval);
  playNote();
}

export function playMusic(theme) {
  currentTheme = theme;
  if (!ensure() || !started) return;
  scheduleMusic(theme);
}
export function stopMusic() { clearInterval(musicTimer); musicTimer = null; }

export function resumeMusicIfNeeded() {
  if (started && currentTheme && !musicTimer) scheduleMusic(currentTheme);
}
