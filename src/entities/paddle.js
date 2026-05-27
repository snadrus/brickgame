import { PADDLE_HEIGHT, FIELD_LEFT, FIELD_RIGHT } from '../constants.js';

export class Paddle {
  constructor(x, y, width) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = PADDLE_HEIGHT;
    this.baseWidth = width;
    this._targetWidth = width;
  }

  setWidth(w) {
    this._targetWidth = w;
  }

  get rect() {
    return {
      x: this.x - this.width / 2,
      y: this.y,
      w: this.width,
      h: this.height
    };
  }

  get centerX() {
    return this.x;
  }

  update(dt, game) {
    const k = Math.min(1, dt * 12);
    this.width += (this._targetWidth - this.width) * k;

    const half = this.width / 2;
    if (this.x - half < FIELD_LEFT) this.x = FIELD_LEFT + half;
    if (this.x + half > FIELD_RIGHT) this.x = FIELD_RIGHT - half;
  }

  draw(ctx) {
    const x = this.x - this.width / 2;
    const y = this.y;
    const w = this.width;
    const h = this.height;
    const r = 8;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#5a8cff');
    grad.addColorStop(1, '#1d3aa8');
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
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + w * 0.35, y + 2, w * 0.3, h - 4);
  }
}
