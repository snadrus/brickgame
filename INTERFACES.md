# Module Interface Contract

All workers MUST follow these signatures EXACTLY. The integration layer (game.js, loop.js, main.js, render.js, powerups.js, input.js) is being written in parallel against these contracts.

Engine = vanilla ES modules in modern browsers. NO build step. NO TypeScript. NO external runtime dependencies. Plain `import`/`export`.

## Constants (shared)

`src/constants.js`:

```js
export const VIRTUAL_W = 960;
export const VIRTUAL_H = 720;

export const BRICK_COLS = 14;
export const BRICK_ROWS = 10;

// Playfield brick area: leave room for HUD at top
export const FIELD_TOP = 80;        // px below top of canvas where bricks start
export const FIELD_LEFT = 40;
export const FIELD_RIGHT = VIRTUAL_W - 40;
export const FIELD_BOTTOM = VIRTUAL_H;

export const BRICK_W = (FIELD_RIGHT - FIELD_LEFT) / BRICK_COLS; // ~62.85
export const BRICK_H = 28;

// Capsule / laser sizes
export const CAPSULE_W = 40;
export const CAPSULE_H = 18;
export const CAPSULE_FALL_SPEED = 140; // px/sec

export const LASER_W = 4;
export const LASER_H = 14;
export const LASER_SPEED = 700;

export const BALL_RADIUS = 8;

export const POWERUP_TYPES = Object.freeze({
  BIG: 'BIG',
  LASER: 'LASER',
  TRIPLE: 'TRIPLE',
  SMALL: 'SMALL',
  DROP: 'DROP'
});

export const POWERUP_DURATIONS = Object.freeze({
  BIG: 15,     // seconds
  LASER: 12,
  TRIPLE: 12,
  SMALL: 15,
  DROP: 0      // instant
});
```

## src/sprites.js

```js
// Pre-renders all sprites to offscreen canvases.
// Call init() once after DOM is ready. Then use the getters.
export const Sprites = {
  init(): void,
  // hardness: 1 | 2 | 3 | 'steel'  hits: number of hits taken so far (0..hardness-1, ignored for steel)
  brick(hardness, hits): HTMLCanvasElement,
  // width is in virtual px; cached per width to nearest 5px
  paddle(width): HTMLCanvasElement,
  ball(): HTMLCanvasElement,
  // type: one of POWERUP_TYPES values
  capsule(type): HTMLCanvasElement,
  laser(): HTMLCanvasElement,
  // Particle is just a small colored square; helper drawer
  drawParticle(ctx, x, y, size, color): void
};
```

Brick visuals: rounded rect, gradient fill keyed by hardness, top/left highlight, bottom/right shadow, gloss band. Cracks added for damaged states.
- hardness 1 → cyan
- hardness 2 → yellow → orange (after 1 hit)
- hardness 3 → red → dark red (1 hit) → maroon cracked (2 hits)
- 'steel'   → cool gray with rivets

## src/physics.js (pure functions, easily unit-testable in node)

```js
// AABB rect: { x, y, w, h }   Circle: { x, y, r }
// Returns { side: 'left'|'right'|'top'|'bottom', overlap: number } or null
export function circleVsAABB(circle, rect): {side, overlap} | null;

// Apply paddle "english": adjusts ball.vx/vy based on offset of ball.x from paddle center.
// paddleCenterX, paddleHalfW. Mutates ball in place. Preserves total speed.
export function applyPaddleEnglish(ball, paddleCenterX, paddleHalfW): void;

// Reflect ball velocity by side. Mutates ball.
export function reflectBySide(ball, side): void;

// AABB vs AABB intersect (for capsule/paddle, laser/brick)
export function rectsIntersect(a, b): boolean;
```

## src/levels.js

```js
export const LEVELS: Array<{
  name: string,
  ballSpeed: number,           // px/sec, base
  paddleWidth: number,         // px
  capsuleDropMultiplier: number, // 1.0 default
  musicTrack: string,          // key matched in audio manifest
  // Each row is exactly BRICK_COLS chars (14). Rows length <= BRICK_ROWS (10).
  // '.' empty, '1'/'2'/'3' hardness, 'S' steel
  layout: string[]
}>;

// Helper to build brick instances from a level
export function buildBricksFromLayout(level): Brick[];
```

8 levels total. Difficulty curve described in the plan.

## src/entities/

Each entity has `update(dt, game)` and `draw(ctx)`.

### paddle.js
```js
export class Paddle {
  constructor(x, y, width);
  x; y; width; height;
  baseWidth;                // remembers level default for power-ups
  setWidth(w);              // smooth visual, but instant logic
  update(dt, game);
  draw(ctx);
  get rect();               // { x: x - width/2, y, w: width, h: height }
  get centerX();
}
```

### ball.js
```js
export class Ball {
  constructor(x, y, speed);
  x; y; vx; vy; r;
  speed;                    // current scalar speed
  stuckToPaddle;            // bool: pre-launch
  setSpeed(s);              // preserves direction, updates vx/vy
  update(dt, game);
  draw(ctx);
}
```

### brick.js
```js
export class Brick {
  // hardness: 1|2|3|'steel'
  constructor(col, row, hardness);
  col; row; x; y; w; h;
  hardness; hits;           // hits taken so far
  alive;
  get isBreakable();        // false for steel
  get rect();
  hit();                    // returns true if destroyed
  draw(ctx);
}
```

### capsule.js
```js
export class Capsule {
  constructor(x, y, type);  // type from POWERUP_TYPES
  x; y; w; h; type;
  alive;
  update(dt);
  draw(ctx);
  get rect();
}
```

### laser.js
```js
export class Laser {
  constructor(x, y);
  x; y; w; h; alive;
  update(dt);
  draw(ctx);
  get rect();
}
```

### particle.js
```js
export class Particle {
  constructor(x, y, vx, vy, color, life);
  alive;
  update(dt);
  draw(ctx);
}
```

## src/audio.js

```js
export class AudioSystem {
  constructor();
  // manifest: { trackKey: 'assets/music/file.mp3', ... }. Loads <audio> elements lazily.
  loadMusic(manifest): void;
  // crossfade in ms (default 600). Safe to call before user gesture; will start once allowed.
  playMusic(trackKey, fadeMs?): void;
  stopMusic(fadeMs?): void;
  setMusicVolume(v01): void;     // 0..1
  setMuted(bool): void;
  toggleMute(): boolean;
  // Synthesized SFX. Names:
  //  'paddleHit','wallHit','brickHit','brickBreak','powerUp','powerDown','laserShoot','loseLife','levelClear','launch'
  sfx(name): void;
  // Resume web audio context after first user gesture
  unlock(): void;
}
```

Music files may be missing — system MUST degrade gracefully (silent music, no errors). SFX must always work via Web Audio.

## src/powerups.js

```js
export class PowerupManager {
  constructor(game);
  // capsule arrives at paddle
  apply(type): void;
  update(dt): void;
  reset(): void;            // called on life lost / level change
  // For HUD: Array<{ type, remaining, duration }>
  getActive(): Array<object>;
  isActive(type): boolean;
}
```

Rules:
- BIG cancels SMALL and vice versa.
- LASER and TRIPLE are mutually exclusive (TRIPLE wins if both present).
- Re-catching a power-up refreshes its duration.
- DROP is instant: shifts every brick down by `BRICK_H`. If any **breakable** brick crosses `paddle.y`, lose a life immediately.

## src/input.js

```js
export class Input {
  constructor(canvas, virtualWidth, virtualHeight);
  // Sets callbacks: { onMove(virtualX), onLaunch(), onFire(), onPause(), onMute(), onRestart() }
  bind(callbacks): void;
  isDown(key): boolean;       // key e.g. 'ArrowLeft'
  // Read paddle target X (virtual pixels) from latest pointer or keyboard
  getPaddleTargetX(currentX, dt, paddleSpeed): number;
}
```

## src/render.js

```js
export class Renderer {
  constructor(canvas, ctx);
  beginFrame();              // clears, applies dpr, draws background
  drawHud(game);             // score/lives/level/active powerups
  shake(intensity, durationMs): void;
  endFrame();                // pops transforms
}
```

## src/loop.js

```js
// Fixed-timestep loop at 60Hz internal updates with rAF render.
export function startLoop(game): void;
```

## src/game.js

Orchestrator. Owns: paddle, balls, bricks, capsules, lasers, particles, level index, score, lives, high score, state.

```js
export class Game {
  constructor({ canvas, ctx, audio, input, renderer });
  state;     // 'TITLE'|'PLAYING'|'PAUSED'|'LEVEL_CLEAR'|'GAME_OVER'|'VICTORY'
  start();   // boot, show title
  startNewGame();
  loadLevel(idx);
  update(dt);
  draw();
  // events from input
  onLaunch();
  onFire();
  onPause();
  onMute();
  onRestart();
}
```

## DOM Contract (index.html)

The integration layer expects these element IDs:

- `#game-canvas` — main canvas
- `#hud` — overlay container
- `#hud-score`, `#hud-high`, `#hud-level`, `#hud-lives`, `#hud-effects`
- `#screen-title`, `#screen-pause`, `#screen-level-clear`, `#screen-game-over`, `#screen-victory` — overlay panels
- `#title-volume`, `#title-mute` — controls
- `.screen` — base CSS class for panels (hidden by default)
