// Web Audio 程序化音效（8-bit 风格）
// 仅在用户首次交互后启用 AudioContext，避免浏览器警告。
let actx = null;
let muted = false;

export function initAudio() {
  if (actx) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    actx = new Ctx();
  } catch (e) {
    console.warn('AudioContext init failed', e);
  }
}

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function envelope(gain, time, attack, decay, sustain, release, peak = 1) {
  gain.setValueAtTime(0, time);
  gain.linearRampToValueAtTime(peak, time + attack);
  gain.linearRampToValueAtTime(peak * sustain, time + attack + decay);
  gain.linearRampToValueAtTime(0, time + attack + decay + release);
}

function tone({ freq = 440, type = 'square', duration = 0.1, peak = 0.18, slide = 0, vib = 0, vibFreq = 0 }) {
  if (!actx || muted) return;
  const t = actx.currentTime;
  const osc = actx.createOscillator();
  const gain = actx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t + duration);
  if (vib) {
    const lfo = actx.createOscillator();
    const lfoGain = actx.createGain();
    lfo.frequency.setValueAtTime(vibFreq, t);
    lfoGain.gain.setValueAtTime(vib, t);
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + duration);
  }
  envelope(gain.gain, t, 0.005, duration * 0.3, 0.6, duration * 0.5, peak);
  osc.connect(gain).connect(actx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function noise({ duration = 0.1, peak = 0.12, hp = 1500, lp = 4000 }) {
  if (!actx || muted) return;
  const t = actx.currentTime;
  const buf = actx.createBuffer(1, Math.max(1, (actx.sampleRate * duration) | 0), actx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = actx.createBufferSource();
  src.buffer = buf;
  const gain = actx.createGain();
  envelope(gain.gain, t, 0.005, duration * 0.3, 0.5, duration * 0.5, peak);
  const filter = actx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = (hp + lp) / 2;
  src.connect(filter).connect(gain).connect(actx.destination);
  src.start(t);
  src.stop(t + duration + 0.05);
}

export const SFX = {
  jump() { tone({ freq: 380, type: 'square', duration: 0.13, peak: 0.10, slide: 280 }); },
  doubleJump() { tone({ freq: 620, type: 'square', duration: 0.16, peak: 0.10, slide: 240 }); },
  attack() { noise({ duration: 0.07, peak: 0.10, hp: 800, lp: 4500 }); tone({ freq: 540, type: 'square', duration: 0.05, peak: 0.06, slide: -200 }); },
  heavy() { noise({ duration: 0.12, peak: 0.18 }); tone({ freq: 240, type: 'sawtooth', duration: 0.18, peak: 0.10, slide: -160 }); },
  hit() { noise({ duration: 0.08, peak: 0.20 }); tone({ freq: 200, type: 'square', duration: 0.05, peak: 0.10, slide: -150 }); },
  hurt() { tone({ freq: 180, type: 'square', duration: 0.18, peak: 0.18, slide: -100 }); noise({ duration: 0.10, peak: 0.10 }); },
  death() { tone({ freq: 220, type: 'sawtooth', duration: 0.6, peak: 0.20, slide: -200 }); },
  ranged() { tone({ freq: 720, type: 'square', duration: 0.18, peak: 0.10, slide: 200, vib: 30, vibFreq: 12 }); },
  parry() { tone({ freq: 1040, type: 'sine', duration: 0.10, peak: 0.18 }); tone({ freq: 1340, type: 'sine', duration: 0.10, peak: 0.10, slide: 200 }); },
  dash() { tone({ freq: 220, type: 'sawtooth', duration: 0.10, peak: 0.10, slide: 380 }); noise({ duration: 0.08, peak: 0.06 }); },
  pickup() { tone({ freq: 980, type: 'square', duration: 0.08, peak: 0.10 }); tone({ freq: 1320, type: 'square', duration: 0.10, peak: 0.10 }); },
  heal() { tone({ freq: 600, type: 'sine', duration: 0.16, peak: 0.10 }); tone({ freq: 800, type: 'sine', duration: 0.20, peak: 0.10, slide: 200 }); },
  echoOpen() { tone({ freq: 360, type: 'sine', duration: 0.18, peak: 0.10 }); tone({ freq: 540, type: 'sine', duration: 0.22, peak: 0.08, slide: 200 }); },
  echoAbsorb() { tone({ freq: 540, type: 'sine', duration: 0.30, peak: 0.10, slide: 400 }); },
  bonfire() { tone({ freq: 440, type: 'sine', duration: 0.4, peak: 0.10 }); tone({ freq: 660, type: 'sine', duration: 0.50, peak: 0.07, slide: 100 }); },
  uiMove() { tone({ freq: 880, type: 'square', duration: 0.04, peak: 0.06 }); },
  uiConfirm() { tone({ freq: 1100, type: 'square', duration: 0.08, peak: 0.08, slide: 200 }); },
  unlock() { tone({ freq: 440, type: 'sine', duration: 0.2, peak: 0.10 }); tone({ freq: 660, type: 'sine', duration: 0.25, peak: 0.10, slide: 100 }); tone({ freq: 880, type: 'sine', duration: 0.30, peak: 0.10, slide: 100 }); },
  bossPhase() { tone({ freq: 120, type: 'sawtooth', duration: 0.5, peak: 0.20, slide: -50 }); noise({ duration: 0.4, peak: 0.10 }); },
  enemyDie() { noise({ duration: 0.12, peak: 0.10 }); tone({ freq: 320, type: 'square', duration: 0.10, peak: 0.08, slide: -200 }); }
};
