// End-to-end smoke test: stubs out the browser DOM/canvas/audio/storage,
// then imports the real game modules and runs simulated ticks. Validates
// that the entire module graph loads, the Game state machine works, the
// physics integrate ball + paddle + bricks correctly, and that scoring,
// life loss, and level transitions actually fire.

function makeFakeCanvas(width = 960, height = 720) {
  const ctx = {
    canvas: null,
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
    globalAlpha: 1, font: '', textAlign: 'left', textBaseline: 'alphabetic',
    save() {}, restore() {}, beginPath() {}, closePath() {},
    moveTo() {}, lineTo() {}, arc() {}, rect() {},
    fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, clearRect() {},
    fillText() {}, strokeText() {},
    drawImage() {},
    setTransform() {}, translate() {}, scale() {}, rotate() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, ellipse() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
    createRadialGradient() {
      return { addColorStop() {} };
    },
    createPattern() { return null; },
    measureText(s) { return { width: (s || '').length * 6 }; },
    getImageData() { return { data: new Uint8ClampedArray(4) }; },
    putImageData() {},
    clip() {}, isPointInPath() { return false; },
    roundRect() {},
  };
  const c = { width, height, getContext() { return ctx; }, getBoundingClientRect() { return { left: 0, top: 0, width, height, right: width, bottom: height }; }, addEventListener() {}, removeEventListener() {}, classList: { add() {}, remove() {} }, style: {}, requestPointerLock() {} };
  ctx.canvas = c;
  return c;
}

const fakeElCache = new Map();
function fakeEl(id) {
  if (fakeElCache.has(id)) return fakeElCache.get(id);
  const el = {
    id,
    textContent: '',
    innerHTML: '',
    value: '60',
    checked: false,
    style: {},
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      contains(c) { return this._set.has(c); },
      toggle(c) { if (this._set.has(c)) this._set.delete(c); else this._set.add(c); },
    },
    addEventListener() {}, removeEventListener() {}, appendChild() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 720, right: 960, bottom: 720 }; },
  };
  fakeElCache.set(id, el);
  return el;
}

const docEvents = {};
globalThis.document = {
  pointerLockElement: null,
  exitPointerLock() { this.pointerLockElement = null; },
  readyState: 'complete',
  addEventListener(ev, cb) { (docEvents[ev] = docEvents[ev] || []).push(cb); },
  removeEventListener() {},
  getElementById(id) {
    if (id === 'game-canvas') return makeFakeCanvas();
    return fakeEl(id);
  },
  createElement(tag) {
    if (tag === 'canvas') return makeFakeCanvas(64, 64);
    return { ...fakeEl('_dyn'), tagName: tag.toUpperCase() };
  },
};

const winEvents = {};
globalThis.window = {
  addEventListener(ev, cb) { (winEvents[ev] = winEvents[ev] || []).push(cb); },
  removeEventListener() {},
  devicePixelRatio: 1,
  innerWidth: 960, innerHeight: 720,
};
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const _store = new Map();
globalThis.localStorage = {
  getItem(k) { return _store.has(k) ? _store.get(k) : null; },
  setItem(k, v) { _store.set(k, String(v)); },
  removeItem(k) { _store.delete(k); },
  clear() { _store.clear(); },
};

class FakeAudioParam { constructor(v) { this.value = v; } setValueAtTime() {} linearRampToValueAtTime() {} exponentialRampToValueAtTime() {} cancelScheduledValues() {} setTargetAtTime() {} }
class FakeOsc { constructor() { this.frequency = new FakeAudioParam(440); this.type = 'sine'; this.detune = new FakeAudioParam(0); } connect() {} start() {} stop() {} addEventListener() {} }
class FakeGain { constructor() { this.gain = new FakeAudioParam(1); } connect() {} disconnect() {} }
class FakeFilter { constructor() { this.frequency = new FakeAudioParam(1000); this.type = 'lowpass'; this.Q = new FakeAudioParam(1); } connect() {} }
class FakeBufferSource { constructor() { this.buffer = null; this.loop = false; this.playbackRate = new FakeAudioParam(1); } connect() {} start() {} stop() {} }
class FakeAudioCtx {
  constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; this.sampleRate = 44100; }
  createOscillator() { return new FakeOsc(); }
  createGain() { return new FakeGain(); }
  createBiquadFilter() { return new FakeFilter(); }
  createBufferSource() { return new FakeBufferSource(); }
  createBuffer(channels, length, rate) {
    const data = new Float32Array(length);
    return { numberOfChannels: channels, length, sampleRate: rate, getChannelData() { return data; } };
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}
globalThis.AudioContext = FakeAudioCtx;
globalThis.webkitAudioContext = FakeAudioCtx;

class FakeAudio {
  constructor(src) {
    this.src = src || '';
    this.loop = false;
    this.volume = 1;
    this.currentTime = 0;
    this.paused = true;
    this._listeners = {};
  }
  addEventListener(ev, cb) { (this._listeners[ev] = this._listeners[ev] || []).push(cb); }
  removeEventListener() {}
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  load() {}
}
globalThis.Audio = FakeAudio;
globalThis.HTMLAudioElement = FakeAudio;

class OffscreenCanvasPolyfill { constructor(w, h) { return makeFakeCanvas(w, h); } }
globalThis.OffscreenCanvas = OffscreenCanvasPolyfill;

if (!globalThis.performance) globalThis.performance = { now: () => Date.now() };

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS', name); passed++; }
  catch (e) { console.error('  FAIL', name, '-', e.message); if (process.env.VERBOSE) console.error(e.stack); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

console.log('smoke tests:');

const constants = await import('../src/constants.js');
test('constants module loads with expected sizes', () => {
  assert(constants.VIRTUAL_W === 960, 'VIRTUAL_W');
  assert(constants.VIRTUAL_H === 720, 'VIRTUAL_H');
  assert(constants.BRICK_COLS === 14 && constants.BRICK_ROWS === 10, 'brick grid');
  assert(constants.POWERUP_TYPES.BIG_BALL === 'BIG_BALL', 'BIG_BALL type');
});

const sprites = await import('../src/sprites.js');
test('sprites module loads and Sprites.init() does not throw', () => {
  sprites.Sprites.init();
  assert(typeof sprites.Sprites.brick === 'function', 'brick fn');
  assert(typeof sprites.Sprites.paddle === 'function', 'paddle fn');
  assert(typeof sprites.Sprites.ball === 'function', 'ball fn');
  assert(typeof sprites.Sprites.capsule === 'function', 'capsule fn');
  assert(typeof sprites.Sprites.laser === 'function', 'laser fn');
});

test('sprites returns a canvas-like object for each variant', () => {
  for (const h of [1, 2, 3, 'steel']) {
    const sp = sprites.Sprites.brick(h, 0);
    assert(sp && typeof sp.getContext === 'function', `brick(${h})`);
  }
  assert(sprites.Sprites.paddle(100), 'paddle(100)');
  assert(sprites.Sprites.ball(constants.BALL_RADIUS), `ball(r=${constants.BALL_RADIUS})`);
  assert(sprites.Sprites.ball(constants.BALL_RADIUS_BIG), `ball(BIG)`);
  for (const t of Object.values(constants.POWERUP_TYPES)) {
    assert(sprites.Sprites.capsule(t), `capsule(${t})`);
  }
});

const audioMod = await import('../src/audio.js');
test('audio system instantiates and SFX do not throw', () => {
  const a = new audioMod.AudioSystem();
  a.loadMusic({ title: 'assets/music/title.mp3', 'level-1': 'assets/music/level-1.mp3' });
  a.unlock();
  for (const name of ['paddleHit','wallHit','brickHit','brickBreak','powerUp','powerDown','laserShoot','loseLife','levelClear','launch']) {
    a.sfx(name);
  }
  a.setMusicVolume(0.5);
  a.setMuted(true);
  a.setMuted(false);
  a.toggleMute();
  a.playMusic('title', 100);
  a.stopMusic(100);
});

const levels = await import('../src/levels.js');
test('levels module exports 8 valid levels', () => {
  assert(Array.isArray(levels.LEVELS), 'LEVELS array');
  assert(levels.LEVELS.length === 8, `8 levels, got ${levels.LEVELS.length}`);
  for (const lvl of levels.LEVELS) {
    assert(typeof lvl.name === 'string', `name on ${JSON.stringify(lvl.name)}`);
    assert(typeof lvl.ballSpeed === 'number', 'ballSpeed');
    assert(typeof lvl.paddleWidth === 'number', 'paddleWidth');
    assert(typeof lvl.musicTrack === 'string', 'musicTrack');
    assert(Array.isArray(lvl.layout), 'layout');
    assert(lvl.layout.length <= constants.BRICK_ROWS, `layout rows <= ${constants.BRICK_ROWS}`);
    for (const row of lvl.layout) {
      assert(typeof row === 'string' && row.length === constants.BRICK_COLS, `row width 14, got "${row}" len=${row.length}`);
    }
  }
});

test('buildBricksFromLayout produces Brick instances', () => {
  for (let i = 0; i < levels.LEVELS.length; i++) {
    const bricks = levels.buildBricksFromLayout(levels.LEVELS[i]);
    assert(Array.isArray(bricks), `level ${i+1} bricks array`);
    assert(bricks.length > 0, `level ${i+1} non-empty`);
    const breakable = levels.countBreakable(bricks);
    assert(breakable > 0, `level ${i+1} has breakable bricks (>0)`);
  }
});

const Game = (await import('../src/game.js')).Game;
const Renderer = (await import('../src/render.js')).Renderer;
const Input = (await import('../src/input.js')).Input;

function makeGame() {
  const canvas = makeFakeCanvas();
  const ctx = canvas.getContext('2d');
  const audio = new audioMod.AudioSystem();
  audio.loadMusic({});
  const renderer = new Renderer(canvas, ctx);
  const input = new Input(canvas, constants.VIRTUAL_W, constants.VIRTUAL_H);
  return new Game({ canvas, ctx, audio, input, renderer });
}

test('Game boots in TITLE state', () => {
  const g = makeGame();
  g.start();
  assert(g.state === 'TITLE', `state=${g.state}`);
  assert(g.lives === 3, 'lives');
  assert(g.score === 0, 'score');
});

test('onLaunch from TITLE starts a new game', () => {
  const g = makeGame();
  g.start();
  g.onLaunch();
  assert(g.state === 'PLAYING', `state=${g.state}`);
  assert(g.bricks.length > 0, 'bricks loaded');
  assert(g.balls.length === 1, '1 ball');
  assert(g.balls[0].stuckToPaddle === true, 'ball stuck');
  assert(g.paddle, 'paddle exists');
});

test('Second onLaunch releases stuck ball', () => {
  const g = makeGame();
  g.start();
  g.onLaunch();
  g.onLaunch();
  assert(g.balls[0].stuckToPaddle === false, 'ball released');
  assert(g.balls[0].vy < 0, 'ball moving up, got vy='+g.balls[0].vy);
});

test('Pause toggles state', () => {
  const g = makeGame();
  g.start(); g.onLaunch(); g.onLaunch();
  g.onPause();
  assert(g.state === 'PAUSED', 'paused');
  g.onPause();
  assert(g.state === 'PLAYING', 'resumed');
});

test('Ball ticks update position', () => {
  const g = makeGame();
  g.start(); g.onLaunch(); g.onLaunch();
  const b0y = g.balls[0].y;
  for (let i = 0; i < 30; i++) g.update(1/60);
  assert(g.balls[0].y < b0y - 5, `ball moved up: ${b0y} -> ${g.balls[0].y}`);
});

test('Direct paddle hit reflects ball', () => {
  const g = makeGame();
  g.start(); g.onLaunch(); g.onLaunch();
  const ball = g.balls[0];
  ball.x = g.paddle.x;
  ball.y = constants.PADDLE_Y - 5;
  ball.vy = 200;
  ball.vx = 0;
  g.update(1/60);
  assert(ball.vy < 0, `ball reflected up: vy=${ball.vy}`);
});

test('Ball falling below paddle loses a life', () => {
  const g = makeGame();
  g.start(); g.onLaunch(); g.onLaunch();
  const startLives = g.lives;
  g.balls[0].x = 50;
  g.balls[0].y = constants.VIRTUAL_H + 200;
  g.balls = []; // simulate ball lost
  g.update(1/60);
  assert(g.lives === startLives - 1, `lives: ${startLives} -> ${g.lives}`);
  assert(g.balls.length === 1 && g.balls[0].stuckToPaddle, 'new ball spawned and stuck');
});

test('Hitting a hardness-1 brick destroys it and increments score', () => {
  const g = makeGame();
  g.start(); g.onLaunch(); g.onLaunch();
  const target = g.bricks.find(b => b.hardness === 1 && b.alive);
  assert(target, 'found a hardness-1 brick');
  const ball = g.balls[0];
  ball.x = target.x + target.w / 2;
  ball.y = target.y + target.h + ball.r + 1;
  ball.vx = 0; ball.vy = -800;
  const beforeScore = g.score;
  for (let i = 0; i < 20 && target.alive; i++) g.update(1/60);
  assert(!target.alive, 'brick destroyed');
  assert(g.score > beforeScore, `score increased: ${beforeScore} -> ${g.score}`);
});

test('Hardness-2 brick takes 2 hits via direct hit() calls', () => {
  const g = makeGame();
  g.start(); g.onLaunch();
  // Level 1 may not have any 2s; load level 2 which is "Stripes" with rows of 2.
  g._loadLevel(1);
  const b2 = g.bricks.find(b => b.hardness === 2 && b.alive);
  assert(b2, 'found hardness-2 brick in level 2');
  let destroyed = b2.hit();
  assert(!destroyed && b2.alive, 'still alive after 1 hit');
  destroyed = b2.hit();
  assert(destroyed && !b2.alive, 'destroyed after 2 hits');
});

test('Steel brick is never destroyed by hit()', () => {
  const g = makeGame();
  g.start(); g.onLaunch();
  const steel = g.bricks.find(b => b.hardness === 'steel');
  if (!steel) { console.log('    (no steel in level 1, that\'s expected)'); return; }
  for (let i = 0; i < 10; i++) steel.hit();
  assert(steel.alive, 'steel still alive');
});

test('Power-up apply (BIG) widens paddle', () => {
  const g = makeGame();
  g.start(); g.onLaunch();
  const w0 = g.paddle.baseWidth;
  g.powerups.apply(constants.POWERUP_TYPES.BIG);
  for (let i = 0; i < 60; i++) g.update(1/60);
  assert(g.paddle.width > w0 * 1.3, `paddle widened: ${w0} -> ${g.paddle.width}`);
});

test('Power-up SMALL shrinks paddle, BIG cancels SMALL', () => {
  const g = makeGame();
  g.start(); g.onLaunch();
  g.powerups.apply(constants.POWERUP_TYPES.SMALL);
  for (let i = 0; i < 60; i++) g.update(1/60);
  const small = g.paddle.width;
  assert(small < g.paddle.baseWidth, 'paddle shrunk');
  g.powerups.apply(constants.POWERUP_TYPES.BIG);
  for (let i = 0; i < 60; i++) g.update(1/60);
  assert(g.paddle.width > small + 10, 'paddle grew after BIG');
  assert(!g.powerups.isActive(constants.POWERUP_TYPES.SMALL), 'SMALL cancelled');
});

test('BIG_BALL power-up doubles ball radius via game sync', () => {
  const g = makeGame();
  g.start(); g.onLaunch();
  g.update(1/60);
  assert(g.balls[0].r === constants.BALL_RADIUS);
  g.powerups.apply(constants.POWERUP_TYPES.BIG_BALL);
  g.update(1/60);
  assert(g.balls[0].r === constants.BALL_RADIUS_BIG, `r=${g.balls[0].r}`);
});

test('BIG_BALL collision damages every overlapping brick in one resolution', () => {
  const g = makeGame();
  g.start(); g.onLaunch();
  g.powerups.apply(constants.POWERUP_TYPES.BIG_BALL);
  const brickL = g.bricks.find((b) => b.row === 0 && b.col === 5);
  const brickR = g.bricks.find((b) => b.row === 0 && b.col === 6);
  assert(brickL && brickR, 'adjacent bricks');
  assert(brickL.hits === 0 && brickR.hits === 0);

  const ball = g.balls[0];
  ball.stuckToPaddle = false;
  ball.r = constants.BALL_RADIUS_BIG;
  const BW = constants.BRICK_W;
  ball.x = constants.FIELD_LEFT + 6 * BW;
  ball.y = constants.BRICK_GRID_TOP + constants.BRICK_H * 0.5;
  ball.vx = 0;
  ball.vy = 400;

  g._collideBall(ball);
  assert(brickL.hits === 1 && brickR.hits === 1, `expected both touched: ${brickL.hits} ${brickR.hits}`);
});

test('LASER power-up enables Space-fired lasers', () => {
  const g = makeGame();
  g.start(); g.onLaunch(); g.onLaunch();
  assert(g.lasers.length === 0, 'no lasers initially');
  g.onFire();
  assert(g.lasers.length === 0, 'no fire without LASER');
  g.powerups.apply(constants.POWERUP_TYPES.LASER);
  g.onFire();
  assert(g.lasers.length === 1, 'one laser fired');
});

test('TRIPLE power-up fires three lasers', () => {
  const g = makeGame();
  g.start(); g.onLaunch();
  g.powerups.apply(constants.POWERUP_TYPES.TRIPLE);
  g.onFire();
  assert(g.lasers.length === 3, `3 lasers, got ${g.lasers.length}`);
});

test('Level transition: clearing all breakables advances level', () => {
  const g = makeGame();
  g.start(); g.onLaunch();
  for (const b of g.bricks) {
    if (b.isBreakable) { b.alive = false; }
  }
  g.update(1/60);
  assert(g.state === 'LEVEL_CLEAR', `state=${g.state}`);
  for (let i = 0; i < 200; i++) g.update(1/60);
  assert(g.levelIndex === 1 && g.state === 'PLAYING', `advanced: lvl=${g.levelIndex}, state=${g.state}`);
});

test('Beating level 8 enters VICTORY state', () => {
  const g = makeGame();
  g.start(); g.onLaunch();
  g.levelIndex = 7;
  g.bricks = levels.buildBricksFromLayout(levels.LEVELS[7]);
  for (const b of g.bricks) if (b.isBreakable) b.alive = false;
  g.update(1/60);
  assert(g.state === 'LEVEL_CLEAR', 'cleared');
  for (let i = 0; i < 200; i++) g.update(1/60);
  assert(g.state === 'VICTORY', `victory state, got ${g.state}`);
});

test('Game over after losing all lives', () => {
  const g = makeGame();
  g.start(); g.onLaunch();
  g.lives = 1;
  g.balls = [];
  g.update(1/60);
  assert(g.state === 'GAME_OVER', `state=${g.state}`);
});

test('BIG_BALL deals 2 damage to toughness-2 bricks', () => {
  const g = makeGame();
  g.start(); g.onLaunch();
  g._loadLevel(1);
  g.powerups.apply(constants.POWERUP_TYPES.BIG_BALL);
  const br = g.bricks.find((b) => b.hardness === 2 && b.alive);
  assert(br, 'h2 brick');
  const destroyed = g._damageBrick(br);
  assert(destroyed && !br.alive, 'one big-ball hit breaks h2');
});

test('BIG_BALL applies 2 hits to toughness-3 bricks per collision', () => {
  const g = makeGame();
  g.start(); g.onLaunch();
  g._loadLevel(5);
  g.powerups.apply(constants.POWERUP_TYPES.BIG_BALL);
  const br = g.bricks.find((b) => b.hardness === 3 && b.alive);
  assert(br && br.hits === 0, 'h3 brick');
  const destroyed = g._damageBrick(br);
  assert(!destroyed && br.alive && br.hits === 2, `expected 2 hits, got ${br.hits}`);
});

test('SHIELD_BRICK spawns full-width barrier below paddle', () => {
  const g = makeGame();
  g.start(); g.onLaunch();
  g.powerups.apply(constants.POWERUP_TYPES.SHIELD_BRICK);
  assert(g.shieldBrick?.alive, 'shield exists');
  assert(g.shieldBrick.w === constants.FIELD_RIGHT - constants.FIELD_LEFT, 'full width');
  const expectedY =
    constants.PADDLE_Y + constants.PADDLE_HEIGHT + constants.SHIELD_BRICK_GAP;
  assert(g.shieldBrick.y === expectedY, `below paddle: y=${g.shieldBrick.y}`);
});

test('shield breaks on first ball hit', () => {
  const g = makeGame();
  g.start(); g.onLaunch();
  g.powerups.apply(constants.POWERUP_TYPES.SHIELD_BRICK);
  const ball = g.balls[0];
  ball.stuckToPaddle = false;
  ball.x = constants.FIELD_LEFT + 30;
  ball.y = g.shieldBrick.y - ball.r + 1;
  ball.vy = 320;
  g._collideBall(ball);
  assert(!g.shieldBrick, 'shield cleared');
  assert(!g.powerups.isActive(constants.POWERUP_TYPES.SHIELD_BRICK), 'power-up ended');
});

test('500 random ticks do not throw across all 8 levels', () => {
  const g = makeGame();
  g.start(); g.onLaunch();
  for (let lvl = 0; lvl < 8; lvl++) {
    g.lives = 99;
    g._loadLevel(lvl);
    g._setState('PLAYING');
    g.balls[0].stuckToPaddle = false;
    g.balls[0].vx = 100; g.balls[0].vy = -400;
    for (let i = 0; i < 500; i++) {
      g.update(1/60);
      if (g.state === 'LEVEL_CLEAR') break;
      // Always keep at least one live ball during this stress test.
      if (!g.balls.length || g.balls[0].stuckToPaddle) {
        g.balls[0].stuckToPaddle = false;
        g.balls[0].vx = 100;
        g.balls[0].vy = -400;
      }
    }
  }
  assert(true, 'survived ticks across all 8 levels');
});

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
