import { BALL_RADIUS } from '../constants.js';

export class Ball {
  constructor(x, y, speed) {
    this.x = x;
    this.y = y;
    this.r = BALL_RADIUS;
    this.speed = speed;
    this.vx = 0;
    this.vy = -speed;
    this.stuckToPaddle = true;
  }

  setSpeed(s) {
    const cur = Math.hypot(this.vx, this.vy);
    if (cur > 0) {
      this.vx = (this.vx / cur) * s;
      this.vy = (this.vy / cur) * s;
    } else {
      this.vy = -s;
    }
    this.speed = s;
  }

  update(dt, game) {
    if (this.stuckToPaddle) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx) {
    const grad = ctx.createRadialGradient(
      this.x - this.r * 0.35,
      this.y - this.r * 0.35,
      0,
      this.x,
      this.y,
      this.r
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#8ec4ff');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
