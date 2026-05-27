import { POWERUP_TYPES, POWERUP_DURATIONS, BRICK_H, PADDLE_Y } from './constants.js';

const TIMED = new Set([
  POWERUP_TYPES.BIG,
  POWERUP_TYPES.BIG_BALL,
  POWERUP_TYPES.SMALL,
  POWERUP_TYPES.LASER,
  POWERUP_TYPES.TRIPLE,
  POWERUP_TYPES.SHIELD_BRICK,
]);

export class PowerupManager {
  constructor(game) {
    this.game = game;
    this.active = new Map();
  }

  reset() {
    this.active.clear();
    this._applyPaddleSize();
    this.game.clearShieldBrick?.();
  }

  apply(type) {
    if (type === POWERUP_TYPES.DROP) {
      this._dropAllBricks();
      return;
    }
    if (type === POWERUP_TYPES.BIG) this.active.delete(POWERUP_TYPES.SMALL);
    if (type === POWERUP_TYPES.SMALL) this.active.delete(POWERUP_TYPES.BIG);
    if (type === POWERUP_TYPES.LASER) this.active.delete(POWERUP_TYPES.TRIPLE);
    if (type === POWERUP_TYPES.TRIPLE) this.active.delete(POWERUP_TYPES.LASER);

    const duration = POWERUP_DURATIONS[type] || 0;
    this.active.set(type, { remaining: duration, duration });

    if (type === POWERUP_TYPES.BIG || type === POWERUP_TYPES.SMALL) {
      this._applyPaddleSize();
    }
    if (type === POWERUP_TYPES.SHIELD_BRICK) {
      this.game.spawnShieldBrick?.();
    }
  }

  update(dt) {
    let changedSize = false;
    for (const [type, state] of [...this.active.entries()]) {
      if (!TIMED.has(type)) continue;
      state.remaining -= dt;
      if (state.remaining <= 0) {
        this.active.delete(type);
        if (type === POWERUP_TYPES.BIG || type === POWERUP_TYPES.SMALL) changedSize = true;
        if (type === POWERUP_TYPES.SHIELD_BRICK) this.game.clearShieldBrick?.();
      }
    }
    if (changedSize) this._applyPaddleSize();
  }

  isActive(type) { return this.active.has(type); }

  /** End a timed power-up early (e.g. shield destroyed on hit). */
  cancel(type) {
    if (!this.active.delete(type)) return;
    if (type === POWERUP_TYPES.BIG || type === POWERUP_TYPES.SMALL) this._applyPaddleSize();
    if (type === POWERUP_TYPES.SHIELD_BRICK) this.game.clearShieldBrick?.();
  }

  getActive() {
    const out = [];
    for (const [type, state] of this.active.entries()) {
      out.push({ type, remaining: state.remaining, duration: state.duration });
    }
    return out;
  }

  _applyPaddleSize() {
    const paddle = this.game.paddle;
    if (!paddle) return;
    let mult = 1;
    if (this.active.has(POWERUP_TYPES.BIG)) mult = 1.5;
    else if (this.active.has(POWERUP_TYPES.SMALL)) mult = 0.7;
    paddle.setWidth(paddle.baseWidth * mult);
  }

  _dropAllBricks() {
    const game = this.game;
    if (!game.bricks) return;
    for (const b of game.bricks) {
      if (!b.alive) continue;
      b.y += BRICK_H;
      b.row += 1;
    }
    for (const b of game.bricks) {
      if (b.alive && b.isBreakable && b.y + b.h >= PADDLE_Y) {
        game.loseLife();
        return;
      }
    }
  }
}
