import { MUSIC_TRACKS, degreeToFreq } from './musicTracks.js';

/** Looping chiptune background music via Web Audio (no MP3 required). */
export class MusicSynth {
  constructor(ctx, destination) {
    this._ctx = ctx;
    this._dest = destination;
    this._gain = ctx.createGain();
    this._gain.gain.value = 0;
    this._gain.connect(destination);
    this._timer = null;
    this._step = 0;
    this._key = null;
    this._track = null;
  }

  get playing() {
    return this._key != null;
  }

  play(key, fadeMs = 600) {
    const track = MUSIC_TRACKS[key];
    if (!track) return false;
    this.stop(0);
    this._key = key;
    this._track = track;
    this._step = 0;
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const fadeSec = Math.max(0.05, fadeMs / 1000);
    this._gain.gain.cancelScheduledValues(now);
    this._gain.gain.setValueAtTime(this._gain.gain.value, now);
    this._gain.gain.linearRampToValueAtTime(1, now + fadeSec);

    const stepSec = 60 / track.bpm / 4;
    this._timer = setInterval(() => this._tick(), stepSec * 1000);
    this._tick();
    return true;
  }

  stop(fadeMs = 400) {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const fadeSec = Math.max(0.01, fadeMs / 1000);
    this._gain.gain.cancelScheduledValues(now);
    this._gain.gain.setValueAtTime(this._gain.gain.value, now);
    this._gain.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
    this._key = null;
    this._track = null;
    this._step = 0;
  }

  _tick() {
    const track = this._track;
    if (!track) return;
    const ctx = this._ctx;
    const t = ctx.currentTime + 0.02;
    const step = this._step;
    const melLen = track.melody.length;
    const bassLen = track.bass.length;

    const melDeg = track.melody[step % melLen];
    if (melDeg >= 0) {
      const f = degreeToFreq(track.root, melDeg, 1);
      this._blip(t, f, 'square', 0.11, track.leadVol ?? 0.06);
    }

    const bassStep = Math.floor(step / 2) % bassLen;
    const bassDeg = track.bass[bassStep];
    if (bassDeg >= 0) {
      const f = degreeToFreq(track.root, bassDeg, 0);
      this._blip(t, f, 'triangle', 0.14, track.bassVol ?? 0.08);
    }

    if (step % 2 === 0) {
      this._hat(t, 0.018);
    }

    this._step += 1;
  }

  _blip(time, freq, type, duration, peak) {
    if (!freq || !peak) return;
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(g).connect(this._gain);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  _hat(time, peak) {
    const ctx = this._ctx;
    const sr = ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * 0.04));
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6000;
    g.gain.setValueAtTime(peak, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
    src.connect(f).connect(g).connect(this._gain);
    src.start(time);
    src.stop(time + 0.05);
  }
}
