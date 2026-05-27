import {
  CAPSULE_W,
  CAPSULE_H,
  CAPSULE_FALL_SPEED,
  FIELD_BOTTOM,
  POWERUP_COLORS,
  POWERUP_TYPES,
} from '../constants.js';

const LABELS = {
  [POWERUP_TYPES.BIG]: 'B',
  [POWERUP_TYPES.BIG_BALL]: 'O',
  [POWERUP_TYPES.LASER]: 'L',
  [POWERUP_TYPES.TRIPLE]: 'T',
  [POWERUP_TYPES.SMALL]: 'S',
  [POWERUP_TYPES.DROP]: 'D',
  [POWERUP_TYPES.SHIELD_BRICK]: 'G',
};

export class Capsule {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.w = CAPSULE_W;
    this.h = CAPSULE_H;
    this.alive = true;
  }

  update(dt) {
    if (!this.alive) return;
    this.y += CAPSULE_FALL_SPEED * dt;
    if (this.y - this.h / 2 > FIELD_BOTTOM) this.alive = false;
  }

  get rect() {
    return {
      x: this.x - this.w / 2,
      y: this.y - this.h / 2,
      w: this.w,
      h: this.h
    };
  }

  draw(ctx) {
    if (!this.alive) return;
    const x = this.x - this.w / 2;
    const y = this.y - this.h / 2;
    const color = POWERUP_COLORS[this.type] || '#ccc';
    ctx.fillStyle = color;
    const r = this.h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + this.w - r, y);
    ctx.quadraticCurveTo(x + this.w, y, x + this.w, y + r);
    ctx.lineTo(x + this.w, y + this.h - r);
    ctx.quadraticCurveTo(x + this.w, y + this.h, x + this.w - r, y + this.h);
    ctx.lineTo(x + r, y + this.h);
    ctx.quadraticCurveTo(x, y + this.h, x, y + this.h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LABELS[this.type] || '?', this.x, this.y);
  }
}
