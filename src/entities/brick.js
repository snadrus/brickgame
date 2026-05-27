import { BRICK_W, BRICK_H, FIELD_LEFT, BRICK_GRID_TOP } from '../constants.js';

const FILL = {
  1: '#36d6ff',
  2: '#ffd23f',
  3: '#ff4c5b',
  steel: '#7a8494',
};

const FILL_DAMAGED = {
  2: '#ff8a3d',
  3: ['#ff4c5b', '#c8323f', '#7a1a22'],
};

function drawBrickShape(ctx, x, y, w, h, color) {
  const r = 4;
  ctx.fillStyle = color;
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
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function brickColor(hardness, hits) {
  if (hardness === 'steel') return FILL.steel;
  if (hardness === 2 && hits >= 1) return FILL_DAMAGED[2];
  if (hardness === 3) {
    const palette = FILL_DAMAGED[3];
    return palette[Math.min(hits, palette.length - 1)];
  }
  return FILL[hardness] || '#888';
}

export class Brick {
  constructor(col, row, hardness) {
    this.col = col;
    this.row = row;
    this.hardness = hardness;
    this.hits = 0;
    this.alive = true;
    this.x = FIELD_LEFT + col * BRICK_W;
    this.y = BRICK_GRID_TOP + row * BRICK_H;
    this.w = BRICK_W;
    this.h = BRICK_H;
  }

  get isBreakable() {
    return this.hardness !== 'steel';
  }

  get rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /** @param {number} damage hits to apply (default 1) */
  hit(damage = 1) {
    if (!this.alive) return false;
    if (!this.isBreakable) return false;
    const d = Math.max(1, damage | 0);
    this.hits += d;
    if (this.hits >= this.hardness) {
      this.alive = false;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (!this.alive) return;
    drawBrickShape(ctx, this.x, this.y, this.w, this.h, brickColor(this.hardness, this.hits));
    if (this.hardness === 'steel') {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      const rivet = 3;
      ctx.beginPath();
      ctx.arc(this.x + rivet, this.y + rivet, rivet, 0, Math.PI * 2);
      ctx.arc(this.x + this.w - rivet, this.y + rivet, rivet, 0, Math.PI * 2);
      ctx.arc(this.x + rivet, this.y + this.h - rivet, rivet, 0, Math.PI * 2);
      ctx.arc(this.x + this.w - rivet, this.y + this.h - rivet, rivet, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
