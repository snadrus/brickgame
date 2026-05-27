export const VIRTUAL_W = 960;
export const VIRTUAL_H = 720;

export const BRICK_COLS = 14;
export const BRICK_ROWS = 10;

export const FIELD_TOP = 80;
export const FIELD_LEFT = 40;
export const FIELD_RIGHT = VIRTUAL_W - 40;
export const FIELD_BOTTOM = VIRTUAL_H;

/** Empty rows-worth of gap above layout row 0 so the ceiling is clear of bricks. */
export const BRICK_TOP_GAP_ROWS = 3;

export const BRICK_W = (FIELD_RIGHT - FIELD_LEFT) / BRICK_COLS;
export const BRICK_H = 28;

/** World Y where layout row 0 starts (below top wall + HUD lane). */
export const BRICK_GRID_TOP = FIELD_TOP + BRICK_TOP_GAP_ROWS * BRICK_H;

export const CAPSULE_W = 40;
export const CAPSULE_H = 18;
export const CAPSULE_FALL_SPEED = 140;

export const LASER_W = 4;
export const LASER_H = 14;
export const LASER_SPEED = 700;

export const BALL_RADIUS = 8;

/** Radius while BIG_BALL power-up is active (~2× visual / hit area). */
export const BALL_RADIUS_BIG = BALL_RADIUS * 2;

/** When BIG_BALL is active, bounce resolution may leave this much overlap (brick width %) so neighboring bricks stay in range. */
export const BIG_BALL_BRICK_PENETRATE = BRICK_W * 0.1;

export const PADDLE_Y = VIRTUAL_H - 60;
export const PADDLE_HEIGHT = 16;
/** Gap between paddle bottom and the shield floor brick. */
export const SHIELD_BRICK_GAP = 6;
export const PADDLE_SPEED = 720;

export const POWERUP_TYPES = Object.freeze({
  BIG: 'BIG',
  BIG_BALL: 'BIG_BALL',
  LASER: 'LASER',
  TRIPLE: 'TRIPLE',
  SMALL: 'SMALL',
  DROP: 'DROP',
  /** Full-width barrier row below the paddle; long duration, breaks on first hit. */
  SHIELD_BRICK: 'SHIELD_BRICK',
});

export const POWERUP_DURATIONS = Object.freeze({
  BIG: 15,
  BIG_BALL: 15,
  LASER: 12,
  TRIPLE: 12,
  SMALL: 15,
  DROP: 0,
  SHIELD_BRICK: 22,
});

export const POWERUP_COLORS = Object.freeze({
  BIG: '#3ddc84',
  BIG_BALL: '#ffe066',
  LASER: '#3ea0ff',
  TRIPLE: '#b56bff',
  SMALL: '#ff8a3d',
  DROP: '#ff3d5b',
  SHIELD_BRICK: '#9ad4ff',
});

/** Big ball deals this much damage to hardness 2 and 3 bricks per hit. */
export const BIG_BALL_TOUGH_HIT_DAMAGE = 2;

/** After this many seconds of active (unstuck) ball, extra speed reaches its cap — slow ramp. */
export const BALL_SPEED_RAMP_AIRTIME_FULL = 95;

/** Max multiplier over the level base speed (applied via ramp). */
export const BALL_SPEED_MAX_MULT = 1.52;

export const SCORE_PER_HIT = 10;
export const SCORE_PER_BREAK = 50;
export const SCORE_PER_CAPSULE = 100;
export const LEVEL_CLEAR_BONUS = 1000;
