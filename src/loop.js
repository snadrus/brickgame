const STEP = 1 / 60;
const MAX_FRAME = 0.25;

export function startLoop(game) {
  let last = performance.now();
  let acc = 0;

  function frame(now) {
    let dt = (now - last) / 1000;
    if (dt > MAX_FRAME) dt = MAX_FRAME;
    last = now;
    acc += dt;
    while (acc >= STEP) {
      try {
        game.update(STEP);
      } catch (err) {
        console.error('[brickgame] update error:', err);
      }
      acc -= STEP;
    }
    try {
      game.draw();
    } catch (err) {
      console.error('[brickgame] draw error:', err);
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
