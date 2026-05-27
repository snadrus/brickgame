import {
  FIELD_LEFT, FIELD_RIGHT, BRICK_H, PADDLE_Y, PADDLE_HEIGHT, SHIELD_BRICK_GAP,
} from '../constants.js';

/** Full-width protective row below the paddle (last-chance bumper). One hit destroys it. */
export class ShieldBrick {
  constructor() {
    this.alive = true;
    this.x = FIELD_LEFT;
    this.y = PADDLE_Y + PADDLE_HEIGHT + SHIELD_BRICK_GAP;
    this.w = FIELD_RIGHT - FIELD_LEFT;
    this.h = BRICK_H;
  }

  get rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /** Always destroyed on first valid hit. */
  hit() {
    if (!this.alive) return false;
    this.alive = false;
    return true;
  }

  draw(ctx) {
    if (!this.alive) return;
    const { x, y, w, h } = this;
    const r = 4;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#c8e8ff');
    grad.addColorStop(0.5, '#6eb8f0');
    grad.addColorStop(1, '#2a6aa8');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Segment lines so it reads as a row of bricks
    ctx.strokeStyle = 'rgba(0,40,80,0.35)';
    ctx.lineWidth = 1;
    const seg = w / 14;
    for (let i = 1; i < 14; i++) {
      const sx = x + i * seg;
      ctx.beginPath();
      ctx.moveTo(sx, y + 2);
      ctx.lineTo(sx, y + h - 2);
      ctx.stroke();
    }
  }
}
