# Brick Breaker

A classic block-breaker game written in vanilla HTML5 Canvas + JavaScript. No build step. Just open it.

## Features

- 8 hand-designed levels with increasing difficulty
- Three brick hardness tiers (1, 2, 3 hits) plus indestructible steel bricks
- 4 power-ups: **BIG_BALL** (~2× ball size; overlaps can damage multiple bricks; may stay embedded ~10% of a brick wide), BIG paddle, LASER (single shooter), TRIPLE (triple shooter)

- 2 power-downs: SMALL paddle, DROP (all bricks shift down)
- Procedurally drawn high-resolution brick sprites (crisp at any size)
- Synthesized chiptune SFX via Web Audio (no asset files needed)
- Bricks sit **below empty space** under the ceiling so you can bounce high before the first row
- Ball **speed ramps slowly** while the ball is in play (up to ~1.5× the level’s base speed); base speeds are a bit quicker than before — **resets** when you lose a life or start a **new level**
- **Pointer lock** while playing: mouse is captured for smooth control; **Esc** exits lock; click the canvas to lock again
- Persistent high score and audio settings

## How to run

The game uses ES modules and loads audio with `fetch`-style URLs, so it must be served from `http://`, not opened from `file://`. Pick any one of these:

```sh
# Python 3 (preinstalled on most systems)
python3 -m http.server 8080

# Node alternative
npx serve -l 8080 .
```

Then open `http://localhost:8080` in any modern browser.

## Controls

- **Move paddle**: Mouse (locks while playing — use **Esc** to show cursor) / `A`/`D` / `Left`/`Right`
- **Launch ball / Fire lasers**: `Space`
- **Pause**: `P`
- **Mute**: `M`
- **Restart** (after game over / victory): `R`

## Project layout

```
brickgame/
  index.html            entry page
  style.css             layout + screens
  src/
    main.js             bootstrap
    constants.js        shared dimensions/durations
    loop.js             fixed-timestep game loop
    game.js             state machine + collisions + scoring
    physics.js          pure collision math (also unit-tested under tests/)
    sprites.js          procedural brick / paddle / ball / capsule sprites
    audio.js            Web Audio SFX synth + music manager
    levels.js           8 hand-designed level layouts
    powerups.js         power-up / power-down state
    input.js            mouse / keyboard / touch
    render.js           canvas scaling + HUD + screen shake
    entities/
      paddle.js
      ball.js
      brick.js
      capsule.js
      laser.js
      particle.js
  assets/music/         drop royalty-free tracks here (see ATTRIBUTION.md)
  tests/                node-runnable unit tests for pure logic
  INTERFACES.md         module contract used during parallel development
  ATTRIBUTION.md        music + asset credits
```

## Tests

Three layers of tests, all runnable from a stock Node install (no test framework dependency):

```sh
npm test                    # runs all three suites in sequence
node tests/physics.test.js  # 17 unit tests for collision / reflection / paddle english
node tests/smoke.test.js    # 24 end-to-end tests against the full Game graph (DOM stubbed)
node tests/dom.test.js      # 2 real-DOM integration tests via jsdom (requires jsdom installed)
```

A real-Chromium headless test (puppeteer) was used during development to confirm the canvas actually paints non-blank pixels and the rAF loop animates a ball; it lives outside the project root since puppeteer is heavy.

## Music

Background music is **built in** (procedural chiptune loops via Web Audio). After you click **Start**, music should play automatically. To use your own MP3s instead, drop files into `assets/music/` (see `assets/music/README.md`); loaded files override the synth for that track.
