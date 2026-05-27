// Real-DOM integration test. Loads the actual index.html via jsdom,
// patches canvas + audio (since jsdom has no canvas/audio), then imports
// the real main.js bootstrap. Verifies the page structure matches what
// game.js expects, and that booting + a few frames does not throw.
//
// This test must be run from the repo root (or with cwd anywhere) because
// it builds an absolute file:// URL for jsdom resolveResource.
//
// Requires jsdom installed elsewhere (see /tmp/brickgame-test/node_modules/jsdom).

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

// Locate jsdom — it was installed under /tmp/brickgame-test as a dev sandbox.
const jsdomCandidates = [
  '/tmp/brickgame-test/node_modules/jsdom',
  resolve(REPO_ROOT, 'node_modules/jsdom'),
];
let jsdomPath = null;
for (const p of jsdomCandidates) {
  if (existsSync(p + '/package.json')) { jsdomPath = p; break; }
}
if (!jsdomPath) {
  console.error('  SKIP: jsdom not installed. Install with:');
  console.error('    cd /tmp/brickgame-test && npm install jsdom');
  process.exit(0); // skip, do not fail
}

const localRequire = createRequire(jsdomPath + '/');
const { JSDOM } = localRequire('jsdom');

let passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { console.log('  PASS', name); passed++; })
    .catch((e) => { console.error('  FAIL', name, '-', e.message); if (process.env.VERBOSE) console.error(e.stack); failed++; });
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

console.log('dom integration tests:');

const html = readFileSync(resolve(REPO_ROOT, 'index.html'), 'utf8');

await test('index.html parses and has all required element IDs', () => {
  const dom = new JSDOM(html, { url: pathToFileURL(REPO_ROOT + '/').href, runScripts: 'outside-only' });
  const doc = dom.window.document;
  for (const id of [
    'game-canvas', 'hud', 'hud-score', 'hud-high', 'hud-level', 'hud-lives', 'hud-effects',
    'screen-title', 'screen-pause', 'screen-level-clear', 'screen-game-over', 'screen-victory',
    'title-volume', 'title-mute', 'start-btn', 'go-score', 'vc-score', 'lc-bonus', 'lc-title',
  ]) {
    assert(doc.getElementById(id), `missing #${id}`);
  }
});

// Patch canvas API onto a jsdom window before running main.js
function patchCanvas(window) {
  const HTMLCanvasElement = window.HTMLCanvasElement;
  const Document = window.Document;
  const make2DCtx = (canvas) => ({
    canvas,
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
    globalAlpha: 1, font: '', textAlign: 'left', textBaseline: 'alphabetic',
    save() {}, restore() {}, beginPath() {}, closePath() {},
    moveTo() {}, lineTo() {}, arc() {}, rect() {},
    fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, clearRect() {},
    fillText() {}, strokeText() {},
    drawImage() {},
    setTransform() {}, translate() {}, scale() {}, rotate() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, ellipse() {},
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    createPattern() { return null; },
    measureText(s) { return { width: (s || '').length * 6 }; },
    getImageData() { return { data: new Uint8ClampedArray(4) }; },
    putImageData() {},
    clip() {}, isPointInPath() { return false; },
    roundRect() {},
  });
  HTMLCanvasElement.prototype.getContext = function () { return make2DCtx(this); };
  HTMLCanvasElement.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, width: this.width || 960, height: this.height || 720, right: this.width || 960, bottom: this.height || 720 };
  };

  // Audio + AudioContext
  class FakeAudioParam { constructor(v) { this.value = v; } setValueAtTime() {} linearRampToValueAtTime() {} exponentialRampToValueAtTime() {} cancelScheduledValues() {} setTargetAtTime() {} }
  class FakeOsc { constructor() { this.frequency = new FakeAudioParam(440); this.detune = new FakeAudioParam(0); this.type = 'sine'; } connect() {} start() {} stop() {} addEventListener() {} }
  class FakeGain { constructor() { this.gain = new FakeAudioParam(1); } connect() {} disconnect() {} }
  class FakeFilter { constructor() { this.frequency = new FakeAudioParam(1000); this.Q = new FakeAudioParam(1); this.type = 'lowpass'; } connect() {} }
  class FakeBufSrc { constructor() { this.buffer = null; this.loop = false; this.playbackRate = new FakeAudioParam(1); } connect() {} start() {} stop() {} }
  class FakeAudioCtx {
    constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; this.sampleRate = 44100; }
    createOscillator() { return new FakeOsc(); }
    createGain() { return new FakeGain(); }
    createBiquadFilter() { return new FakeFilter(); }
    createBufferSource() { return new FakeBufSrc(); }
    createBuffer(c, l, r) { const data = new Float32Array(l); return { numberOfChannels: c, length: l, sampleRate: r, getChannelData() { return data; } }; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  }
  window.AudioContext = FakeAudioCtx;
  window.webkitAudioContext = FakeAudioCtx;

  class FakeAudioElem {
    constructor(src) { this.src = src || ''; this.loop = false; this.volume = 1; this.currentTime = 0; this.paused = true; this._ls = {}; }
    addEventListener(ev, cb) { (this._ls[ev] = this._ls[ev] || []).push(cb); }
    removeEventListener() {}
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    load() {}
  }
  window.Audio = FakeAudioElem;
  window.HTMLAudioElement = FakeAudioElem;

  window.requestAnimationFrame = (cb) => setTimeout(() => cb(window.performance.now()), 1);
  window.cancelAnimationFrame = (id) => clearTimeout(id);

  const doc = window.document;
  const Hep = window.HTMLElement && window.HTMLElement.prototype;
  if (Hep && !Hep.requestPointerLock) Hep.requestPointerLock = function () {};
  if (doc.exitPointerLock == null) doc.exitPointerLock = function () {};
  try {
    Object.defineProperty(doc, 'pointerLockElement', { configurable: true, get: () => null });
  } catch (_) { /* already defined */ }

  // localStorage exists on jsdom but may not be writable for file://; fall back to in-memory
  try { window.localStorage.setItem('__probe', '1'); window.localStorage.removeItem('__probe'); }
  catch (e) {
    const store = new Map();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem(k) { return store.has(k) ? store.get(k) : null; },
        setItem(k, v) { store.set(k, String(v)); },
        removeItem(k) { store.delete(k); },
        clear() { store.clear(); },
      },
    });
  }
}

await test('main.js bootstraps in real DOM without throwing', async () => {
  const dom = new JSDOM(html, {
    url: pathToFileURL(REPO_ROOT + '/').href,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  patchCanvas(window);

  // Mirror jsdom globals onto Node so our ESM imports inside Game/Sprites/etc. find them.
  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;
  globalThis.document = window.document;
  globalThis.window = window;
  globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
  globalThis.HTMLAudioElement = window.HTMLAudioElement;
  globalThis.Audio = window.Audio;
  globalThis.AudioContext = window.AudioContext;
  globalThis.localStorage = window.localStorage;
  globalThis.requestAnimationFrame = window.requestAnimationFrame;
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame;
  if (!globalThis.performance) globalThis.performance = window.performance || { now: () => Date.now() };

  // Cache-bust the modules so re-import works on repeated runs
  const cacheBust = '?t=' + Date.now();
  const main = await import('../src/main.js' + cacheBust);

  // Let one rAF tick land
  await new Promise((r) => setTimeout(r, 50));
  // restore doc references later? main.js attached listeners — we'll leave them.
  assert(true, 'no throw');
});

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
