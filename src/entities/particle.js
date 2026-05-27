export class Particle {
  constructor(x, y, vx, vy, color, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.alive = true;
    this.size = 4;
  }

  update(dt) {
    if (!this.alive) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 600 * dt;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }

  draw(ctx) {
    if (!this.alive) return;
    const t = Math.max(0, this.life / this.maxLife);
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * t;
    ctx.fillStyle = this.color;
    const s = this.size;
    ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
    ctx.globalAlpha = prev;
  }
}
