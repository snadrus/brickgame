import {
  BRICK_W,
  BRICK_H,
  BALL_RADIUS,
  BALL_RADIUS_BIG,
  CAPSULE_W,
  CAPSULE_H,
  LASER_W,
  LASER_H,
  PADDLE_HEIGHT,
  POWERUP_TYPES,
  POWERUP_COLORS
} from './constants.js';

const SPRITE_SCALE = 2;

const brickCache = new Map();
const paddleCache = new Map();
const capsuleCache = new Map();
/** @type {Map<number, HTMLCanvasElement>} */
const ballCache = new Map();
let laserSprite = null;

const POWERUP_LETTERS = {
  [POWERUP_TYPES.BIG]: 'B',
  [POWERUP_TYPES.BIG_BALL]: 'O',
  [POWERUP_TYPES.LASER]: 'L',
  [POWERUP_TYPES.TRIPLE]: 'T',
  [POWERUP_TYPES.SMALL]: 'S',
  [POWERUP_TYPES.DROP]: 'D'
};

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function roundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function lighten(hex, amt) {
  const c = hex.replace('#', '');
  const r = Math.min(255, parseInt(c.slice(0, 2), 16) + amt);
  const g = Math.min(255, parseInt(c.slice(2, 4), 16) + amt);
  const b = Math.min(255, parseInt(c.slice(4, 6), 16) + amt);
  return `rgb(${r}, ${g}, ${b})`;
}

function darken(hex, amt) {
  const c = hex.replace('#', '');
  const r = Math.max(0, parseInt(c.slice(0, 2), 16) - amt);
  const g = Math.max(0, parseInt(c.slice(2, 4), 16) - amt);
  const b = Math.max(0, parseInt(c.slice(4, 6), 16) - amt);
  return `rgb(${r}, ${g}, ${b})`;
}

function brickKey(hardness, hits) {
  if (hardness === 'steel') return 'steel';
  return `${hardness}:${Math.max(0, hits | 0)}`;
}

function brickBaseColor(hardness, hits) {
  if (hardness === 'steel') return '#8a94a6';
  if (hardness === 1) return '#36d6ff';
  if (hardness === 2) {
    return hits >= 1 ? '#ff8a3d' : '#ffd23f';
  }
  if (hardness === 3) {
    if (hits >= 2) return '#7a1a22';
    if (hits >= 1) return '#c8323f';
    return '#ff4c5b';
  }
  return '#888888';
}

function drawBrickSprite(hardness, hits) {
  const w = BRICK_W;
  const h = BRICK_H;
  const cw = Math.round(w * SPRITE_SCALE);
  const ch = Math.round(h * SPRITE_SCALE);
  const canvas = makeCanvas(cw, ch);
  const ctx = canvas.getContext('2d');
  ctx.scale(SPRITE_SCALE, SPRITE_SCALE);

  const radius = 4;
  const inset = 0.5;
  const rx = inset;
  const ry = inset;
  const rw = w - inset * 2;
  const rh = h - inset * 2;

  ctx.save();
  roundedRectPath(ctx, rx, ry, rw, rh, radius);
  ctx.clip();

  const base = brickBaseColor(hardness, hits);

  if (hardness === 'steel') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#a8b3c4');
    grad.addColorStop(1, '#5b6678');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, lighten(base, 30));
    grad.addColorStop(1, darken(base, 35));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  const gloss = ctx.createLinearGradient(0, 0, 0, h * 0.35);
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
  gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, w, h * 0.35);

  if (hardness === 'steel') {
    ctx.fillStyle = 'rgba(40, 48, 60, 0.85)';
    const rivetR = 3;
    const pad = 5;
    const corners = [
      [pad, pad],
      [w - pad, pad],
      [pad, h - pad],
      [w - pad, h - pad]
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, rivetR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(cx - 0.6, cy - 0.6, rivetR - 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (hardness === 2 && hits >= 1) {
    ctx.strokeStyle = 'rgba(60, 20, 0, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.25, h * 0.3);
    ctx.lineTo(w * 0.45, h * 0.55);
    ctx.lineTo(w * 0.6, h * 0.4);
    ctx.lineTo(w * 0.78, h * 0.7);
    ctx.stroke();
  } else if (hardness === 3 && hits === 1) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h * 0.25);
    ctx.lineTo(w * 0.82, h * 0.78);
    ctx.stroke();
  } else if (hardness === 3 && hits >= 2) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.2);
    ctx.lineTo(w * 0.5, h * 0.5);
    ctx.lineTo(w * 0.3, h * 0.85);
    ctx.moveTo(w * 0.5, h * 0.5);
    ctx.lineTo(w * 0.9, h * 0.35);
    ctx.moveTo(w * 0.5, h * 0.5);
    ctx.lineTo(w * 0.78, h * 0.88);
    ctx.moveTo(w * 0.55, h * 0.15);
    ctx.lineTo(w * 0.5, h * 0.5);
    ctx.stroke();
  }

  ctx.restore();

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  const r2 = radius;
  ctx.moveTo(rx + rw - r2, ry + 0.5);
  ctx.lineTo(rx + r2, ry + 0.5);
  ctx.quadraticCurveTo(rx + 0.5, ry + 0.5, rx + 0.5, ry + r2);
  ctx.lineTo(rx + 0.5, ry + rh - r2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.moveTo(rx + rw - 0.5, ry + r2);
  ctx.lineTo(rx + rw - 0.5, ry + rh - r2);
  ctx.quadraticCurveTo(rx + rw - 0.5, ry + rh - 0.5, rx + rw - r2, ry + rh - 0.5);
  ctx.lineTo(rx + r2, ry + rh - 0.5);
  ctx.stroke();

  return canvas;
}

function drawPaddleSprite(width) {
  const w = Math.max(20, Math.round(width));
  const h = PADDLE_HEIGHT;
  const cw = Math.round(w * SPRITE_SCALE);
  const ch = Math.round(h * SPRITE_SCALE);
  const canvas = makeCanvas(cw, ch);
  const ctx = canvas.getContext('2d');
  ctx.scale(SPRITE_SCALE, SPRITE_SCALE);

  const radius = 8;
  const inset = 0.5;

  ctx.save();
  roundedRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, radius);
  ctx.clip();

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#4f7cff');
  grad.addColorStop(1, '#1d3aa8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const chipW = Math.max(12, w * 0.22);
  const chipH = Math.max(4, h * 0.45);
  const chipX = (w - chipW) / 2;
  const chipY = (h - chipH) / 2;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  roundedRectPath(ctx, chipX, chipY, chipW, chipH, Math.min(3, chipH / 2));
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.fillRect(0, 0, w, 1);

  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  ctx.fillRect(0, h - 2, w, 2);

  ctx.restore();

  return canvas;
}

function drawBallSprite(r) {
  r = Math.max(4, Number(r));
  const size = r * 2 + 2;
  const cw = Math.round(size * SPRITE_SCALE);
  const ch = Math.round(size * SPRITE_SCALE);
  const canvas = makeCanvas(cw, ch);
  const ctx = canvas.getContext('2d');
  ctx.scale(SPRITE_SCALE, SPRITE_SCALE);

  const cx = size / 2;
  const cy = size / 2;

  const grad = ctx.createRadialGradient(
    cx - r * 0.35,
    cy - r * 0.35,
    r * 0.1,
    cx,
    cy,
    r * 2
  );
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#b9d8ff');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}

function drawCapsuleSprite(type) {
  const w = CAPSULE_W;
  const h = CAPSULE_H;
  const cw = Math.round(w * SPRITE_SCALE);
  const ch = Math.round(h * SPRITE_SCALE);
  const canvas = makeCanvas(cw, ch);
  const ctx = canvas.getContext('2d');
  ctx.scale(SPRITE_SCALE, SPRITE_SCALE);

  const baseColor = POWERUP_COLORS[type] || '#cccccc';
  const radius = h / 2;
  const inset = 0.5;

  ctx.save();
  roundedRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, radius);
  ctx.clip();

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, lighten(baseColor, 40));
  grad.addColorStop(1, darken(baseColor, 30));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const gloss = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
  gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, w, h * 0.5);

  ctx.restore();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 1;
  roundedRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, radius);
  ctx.stroke();

  const letter = POWERUP_LETTERS[type] || '?';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.strokeText(letter, w / 2, h / 2 + 0.5);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(letter, w / 2, h / 2 + 0.5);

  return canvas;
}

function drawLaserSprite() {
  const w = LASER_W;
  const h = LASER_H;
  const cw = Math.round(w * SPRITE_SCALE);
  const ch = Math.round(h * SPRITE_SCALE);
  const canvas = makeCanvas(cw, ch);
  const ctx = canvas.getContext('2d');
  ctx.scale(SPRITE_SCALE, SPRITE_SCALE);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#ff3344');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

  return canvas;
}

function roundPaddleWidth(width) {
  const w = Math.max(20, Math.round(width / 5) * 5);
  return w;
}

export const Sprites = {
  init() {
    brickCache.clear();
    paddleCache.clear();
    capsuleCache.clear();
    ballCache.clear();
    ballCache.set(BALL_RADIUS, drawBallSprite(BALL_RADIUS));
    ballCache.set(BALL_RADIUS_BIG, drawBallSprite(BALL_RADIUS_BIG));
    laserSprite = drawLaserSprite();

    const hardnessStates = [
      [1, 0],
      [2, 0],
      [2, 1],
      [3, 0],
      [3, 1],
      [3, 2],
      ['steel', 0]
    ];
    for (const [hardness, hits] of hardnessStates) {
      const key = brickKey(hardness, hits);
      brickCache.set(key, drawBrickSprite(hardness, hits));
    }

    for (const type of Object.values(POWERUP_TYPES)) {
      capsuleCache.set(type, drawCapsuleSprite(type));
    }
  },

  brick(hardness, hits) {
    const key = brickKey(hardness, hits);
    let sprite = brickCache.get(key);
    if (!sprite) {
      sprite = drawBrickSprite(hardness, hits);
      brickCache.set(key, sprite);
    }
    return sprite;
  },

  paddle(width) {
    const key = roundPaddleWidth(width);
    let sprite = paddleCache.get(key);
    if (!sprite) {
      sprite = drawPaddleSprite(key);
      paddleCache.set(key, sprite);
    }
    return sprite;
  },

  ball(radius) {
    const r = Number(radius) || BALL_RADIUS;
    let sprite = ballCache.get(r);
    if (!sprite) {
      sprite = drawBallSprite(r);
      ballCache.set(r, sprite);
    }
    return sprite;
  },

  capsule(type) {
    let sprite = capsuleCache.get(type);
    if (!sprite) {
      sprite = drawCapsuleSprite(type);
      capsuleCache.set(type, sprite);
    }
    return sprite;
  },

  laser() {
    if (!laserSprite) {
      laserSprite = drawLaserSprite();
    }
    return laserSprite;
  },

  drawParticle(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }
};
