// Audio subsystem for the brick-breaker game.
// - SFX are synthesized on demand with the Web Audio API (no audio assets).
// - Music uses HTMLAudioElement with crossfade. Missing files degrade silently.
// - The AudioContext is created lazily to avoid autoplay-policy warnings.

export class AudioSystem {
  constructor() {
    this._ctx = null;
    this._masterGain = null;   // master gain for SFX (also gates by mute)
    this._sfxGain = null;      // per-effect bus

    this._muted = false;
    this._musicVolume = 0.7;

    // Music tracks: key -> { audio, gainEl, src, loaded, failed }
    this._tracks = new Map();
    this._currentKey = null;
    this._fadeTimers = new Map(); // key -> intervalId

    // Pending music: if playMusic() called before unlock(), remember the
    // request and start once the user gesture happens.
    this._pendingPlay = null; // { key, fadeMs }

    this._unlocked = false;
  }

  // ---------------- Lifecycle ----------------

  unlock() {
    try {
      this._ensureContext();
      if (this._ctx && typeof this._ctx.resume === 'function') {
        // resume returns a promise; ignore errors
        const p = this._ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
      this._unlocked = true;
      // If a track was queued before unlock, start it now.
      if (this._pendingPlay) {
        const { key, fadeMs } = this._pendingPlay;
        this._pendingPlay = null;
        this.playMusic(key, fadeMs);
      }
    } catch (_) {
      // never throw to caller
    }
  }

  _ensureContext() {
    if (this._ctx) return this._ctx;
    try {
      const Ctor = (typeof window !== 'undefined')
        ? (window.AudioContext || window.webkitAudioContext)
        : null;
      if (!Ctor) return null;
      this._ctx = new Ctor();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = this._muted ? 0 : 1;
      this._sfxGain = this._ctx.createGain();
      this._sfxGain.gain.value = 1;
      this._sfxGain.connect(this._masterGain);
      this._masterGain.connect(this._ctx.destination);
    } catch (_) {
      this._ctx = null;
    }
    return this._ctx;
  }

  // ---------------- Mute / volume ----------------

  setMuted(b) {
    this._muted = !!b;
    try {
      if (this._masterGain && this._ctx) {
        this._masterGain.gain.setTargetAtTime(this._muted ? 0 : 1, this._ctx.currentTime, 0.01);
      }
    } catch (_) {}
    // Apply to currently playing music
    try {
      if (this._currentKey) {
        const track = this._tracks.get(this._currentKey);
        if (track && track.audio) {
          track.audio.volume = this._muted ? 0 : this._musicVolume;
        }
      }
    } catch (_) {}
  }

  toggleMute() {
    this.setMuted(!this._muted);
    return this._muted;
  }

  setMusicVolume(v01) {
    let v = Number(v01);
    if (!isFinite(v)) v = 0;
    if (v < 0) v = 0;
    if (v > 1) v = 1;
    this._musicVolume = v;
    try {
      if (this._currentKey) {
        const track = this._tracks.get(this._currentKey);
        if (track && track.audio) {
          track.audio.volume = this._muted ? 0 : this._musicVolume;
        }
      }
    } catch (_) {}
  }

  // ---------------- Music ----------------

  loadMusic(manifest) {
    if (!manifest || typeof manifest !== 'object') return;
    for (const key of Object.keys(manifest)) {
      const src = manifest[key];
      if (typeof src !== 'string' || !src) continue;
      if (this._tracks.has(key)) continue;
      const entry = { audio: null, src, loaded: false, failed: false };
      try {
        if (typeof Audio !== 'undefined') {
          const a = new Audio();
          a.preload = 'auto';
          a.loop = true;
          a.volume = 0;
          a.src = src;
          a.addEventListener('canplaythrough', () => { entry.loaded = true; }, { once: true });
          a.addEventListener('error', () => { entry.failed = true; }, { once: true });
          // Some browsers throw when assigning bad src; guard the load call too.
          try { a.load(); } catch (_) {}
          entry.audio = a;
        } else {
          entry.failed = true;
        }
      } catch (_) {
        entry.failed = true;
      }
      this._tracks.set(key, entry);
    }
  }

  playMusic(trackKey, fadeMs) {
    const fade = (typeof fadeMs === 'number' && fadeMs >= 0) ? fadeMs : 600;
    if (!this._tracks.has(trackKey)) {
      // Track not loaded — silently ignore so missing files don't crash.
      return;
    }
    if (this._currentKey === trackKey) return;

    // If we don't yet have a user gesture, defer. We'll start on unlock().
    if (!this._unlocked) {
      this._pendingPlay = { key: trackKey, fadeMs: fade };
      return;
    }

    const next = this._tracks.get(trackKey);
    if (!next || !next.audio || next.failed) return;

    // Begin playback of the new track at volume 0, then fade in.
    try {
      next.audio.currentTime = 0;
    } catch (_) {}
    next.audio.volume = 0;
    const playPromise = (() => {
      try { return next.audio.play(); } catch (_) { return null; }
    })();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => { /* autoplay blocked or file missing */ });
    }

    const target = this._muted ? 0 : this._musicVolume;
    this._fadeTo(trackKey, target, fade);

    // Fade out and pause the previous track.
    const prevKey = this._currentKey;
    if (prevKey && prevKey !== trackKey) {
      const prev = this._tracks.get(prevKey);
      if (prev && prev.audio) {
        this._fadeTo(prevKey, 0, fade, () => {
          try { prev.audio.pause(); } catch (_) {}
        });
      }
    }

    this._currentKey = trackKey;
  }

  stopMusic(fadeMs) {
    const fade = (typeof fadeMs === 'number' && fadeMs >= 0) ? fadeMs : 600;
    this._pendingPlay = null;
    const key = this._currentKey;
    this._currentKey = null;
    if (!key) return;
    const track = this._tracks.get(key);
    if (!track || !track.audio) return;
    this._fadeTo(key, 0, fade, () => {
      try { track.audio.pause(); } catch (_) {}
    });
  }

  _fadeTo(key, targetVol, durationMs, onDone) {
    const track = this._tracks.get(key);
    if (!track || !track.audio) {
      if (onDone) onDone();
      return;
    }

    // Cancel any in-flight fade for this key.
    const existing = this._fadeTimers.get(key);
    if (existing) {
      clearInterval(existing);
      this._fadeTimers.delete(key);
    }

    const audio = track.audio;
    const startVol = (typeof audio.volume === 'number') ? audio.volume : 0;
    const delta = targetVol - startVol;

    if (durationMs <= 0 || Math.abs(delta) < 0.0001) {
      try { audio.volume = clamp01(targetVol); } catch (_) {}
      if (onDone) {
        try { onDone(); } catch (_) {}
      }
      return;
    }

    const stepMs = 30;
    const startTime = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();

    const id = setInterval(() => {
      const now = (typeof performance !== 'undefined' && performance.now)
        ? performance.now()
        : Date.now();
      const t = Math.min(1, (now - startTime) / durationMs);
      const v = clamp01(startVol + delta * t);
      try { audio.volume = v; } catch (_) {}
      if (t >= 1) {
        clearInterval(id);
        this._fadeTimers.delete(key);
        if (onDone) {
          try { onDone(); } catch (_) {}
        }
      }
    }, stepMs);
    this._fadeTimers.set(key, id);
  }

  // ---------------- SFX ----------------

  sfx(name) {
    try {
      const ctx = this._ensureContext();
      if (!ctx) return;
      if (this._muted) return;
      switch (name) {
        case 'paddleHit':  return this._sfxPaddleHit();
        case 'wallHit':    return this._sfxWallHit();
        case 'brickHit':   return this._sfxBrickHit();
        case 'brickBreak': return this._sfxBrickBreak();
        case 'powerUp':    return this._sfxArpeggio([523.25, 659.25, 783.99], 0.05, 0.22);
        case 'powerDown':  return this._sfxArpeggio([783.99, 659.25, 523.25], 0.05, 0.22);
        case 'laserShoot': return this._sfxLaserShoot();
        case 'loseLife':   return this._sfxLoseLife();
        case 'levelClear': return this._sfxLevelClear();
        case 'launch':     return this._sfxLaunch();
        default: return;
      }
    } catch (_) {
      // never throw
    }
  }

  // --- individual SFX recipes ---

  _sfxPaddleHit() {
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(330, now + 0.06);
    this._envelope(gain, now, 0.18, 0.005, 0.05);
    osc.connect(gain).connect(this._sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  _sfxWallHit() {
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, now);
    this._envelope(gain, now, 0.12, 0.002, 0.04);
    osc.connect(gain).connect(this._sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  _sfxBrickHit() {
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    this._envelope(gain, now, 0.15, 0.003, 0.05);
    osc.connect(gain).connect(this._sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  _sfxBrickBreak() {
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const peak = 0.22;

    // Voice 1: sawtooth swept down.
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);
    this._envelope(oscGain, now, peak * 0.6, 0.005, 0.25);
    osc.connect(oscGain).connect(this._sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);

    // Voice 2: short white-noise burst.
    const noise = this._makeNoise(0.1);
    if (noise) {
      const noiseGain = ctx.createGain();
      this._envelope(noiseGain, now, peak * 0.5, 0.002, 0.1);
      noise.connect(noiseGain).connect(this._sfxGain);
      noise.start(now);
      noise.stop(now + 0.12);
    }
  }

  _sfxArpeggio(freqs, noteDur, totalGain) {
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const per = totalGain / Math.max(1, freqs.length);
    for (let i = 0; i < freqs.length; i++) {
      const t = now + i * noteDur;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i], t);
      this._envelope(gain, t, per + 0.05, 0.005, noteDur);
      osc.connect(gain).connect(this._sfxGain);
      osc.start(t);
      osc.stop(t + noteDur + 0.05);
    }
  }

  _sfxLaserShoot() {
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.06);
    this._envelope(gain, now, 0.12, 0.002, 0.06);
    osc.connect(gain).connect(this._sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  _sfxLoseLife() {
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.5);
    this._envelope(gain, now, 0.25, 0.01, 0.5);
    osc.connect(gain).connect(this._sfxGain);
    osc.start(now);
    osc.stop(now + 0.55);

    const noise = this._makeNoise(0.2);
    if (noise) {
      const ng = ctx.createGain();
      this._envelope(ng, now, 0.06, 0.005, 0.2);
      noise.connect(ng).connect(this._sfxGain);
      noise.start(now);
      noise.stop(now + 0.22);
    }
  }

  _sfxLevelClear() {
    // C5, E5, G5, C6, E6 over 0.6s → 0.12s per note
    const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const noteDur = 0.6 / freqs.length;
    const per = 0.25 / freqs.length + 0.06;
    for (let i = 0; i < freqs.length; i++) {
      const t = now + i * noteDur;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i], t);
      this._envelope(gain, t, per, 0.005, noteDur * 1.1);
      osc.connect(gain).connect(this._sfxGain);
      osc.start(t);
      osc.stop(t + noteDur * 1.2);
    }
  }

  _sfxLaunch() {
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.08);
    this._envelope(gain, now, 0.18, 0.003, 0.08);
    osc.connect(gain).connect(this._sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // --- helpers ---

  // Simple AD envelope: attack to peak, then exponential-ish decay to ~0.
  _envelope(gainNode, startTime, peak, attack, decay) {
    try {
      const g = gainNode.gain;
      g.cancelScheduledValues(startTime);
      g.setValueAtTime(0.0001, startTime);
      g.linearRampToValueAtTime(peak, startTime + Math.max(0.0005, attack));
      g.exponentialRampToValueAtTime(0.0001, startTime + Math.max(0.005, attack + decay));
    } catch (_) {}
  }

  // Returns an AudioBufferSourceNode of white noise of given duration, or null.
  _makeNoise(durationSec) {
    try {
      const ctx = this._ctx;
      const sr = ctx.sampleRate || 44100;
      const len = Math.max(1, Math.floor(sr * durationSec));
      const buf = ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      return src;
    } catch (_) {
      return null;
    }
  }
}

function clamp01(v) {
  if (!(v >= 0)) return 0;
  if (v > 1) return 1;
  return v;
}
