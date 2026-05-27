import { LASER_W, LASER_H, LASER_SPEED } from '../constants.js';

export class Laser {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = LASER_W;
    this.h = LASER_H;
    this.alive = true;
  }

  update(dt) {
    if (!this.alive) return;
    this.y -= LASER_SPEED * dt;
    if (this.y + this.h < 0) this.alive = false;
  }

  get rect() {
    return {
      x: this.x - this.w / 2,
      y: this.y,
      w: this.w,
      h: this.h
    };
  }

  draw(ctx) {
    if (!this.alive) return;
    const x = this.x - this.w / 2;
    const grad = ctx.createLinearGradient(x, this.y, x, this.y + this.h);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#ff3344');
    ctx.fillStyle = grad;
    ctx.fillRect(x, this.y, this.w, this.h);
  }
}
