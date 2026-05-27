import {
  VIRTUAL_W, VIRTUAL_H, PADDLE_Y, PADDLE_SPEED,
  POWERUP_TYPES, POWERUP_COLORS,
  FIELD_LEFT, FIELD_RIGHT, FIELD_TOP, BALL_RADIUS, BALL_RADIUS_BIG, BIG_BALL_BRICK_PENETRATE,
  BALL_SPEED_MAX_MULT, BALL_SPEED_RAMP_AIRTIME_FULL, BIG_BALL_TOUGH_HIT_DAMAGE,
  SCORE_PER_HIT, SCORE_PER_BREAK, SCORE_PER_CAPSULE, LEVEL_CLEAR_BONUS
} from './constants.js';
import { Paddle } from './entities/paddle.js';
import { Ball } from './entities/ball.js';
import { Capsule } from './entities/capsule.js';
import { Laser } from './entities/laser.js';
import { Particle } from './entities/particle.js';
import { ShieldBrick } from './entities/shieldBrick.js';
import { LEVELS, buildBricksFromLayout, countBreakable } from './levels.js';
import { PowerupManager } from './powerups.js';
import { circleVsAABB, reflectBySide, applyPaddleEnglish, rectsIntersect } from './physics.js';

const STATES = Object.freeze({
  TITLE: 'TITLE',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  LEVEL_CLEAR: 'LEVEL_CLEAR',
  GAME_OVER: 'GAME_OVER',
  VICTORY: 'VICTORY',
});

const HS_KEY = 'brickgame.highScore';

const FIRE_COOLDOWN = 0.15;

const DROP_TABLE = [
  { type: POWERUP_TYPES.BIG_BALL, weight: 43 },
  { type: POWERUP_TYPES.BIG, weight: 15 },
  { type: POWERUP_TYPES.LASER, weight: 13 },
  { type: POWERUP_TYPES.TRIPLE, weight: 8 },
  { type: POWERUP_TYPES.SMALL, weight: 11 },
  { type: POWERUP_TYPES.DROP, weight: 5 },
  { type: POWERUP_TYPES.SHIELD_BRICK, weight: 4 },
];
const DROP_TOTAL = DROP_TABLE.reduce((s, d) => s + d.weight, 0);

function pickDrop() {
  let r = Math.random() * DROP_TOTAL;
  for (const d of DROP_TABLE) { r -= d.weight; if (r <= 0) return d.type; }
  return DROP_TABLE[0].type;
}

function dropChanceFor(hardness) {
  if (hardness === 1) return 0.30;
  if (hardness === 2) return 0.20;
  if (hardness === 3) return 0.10;
  return 0;
}

function pushBallOutAlongSide(ball, side, distance) {
  const d = Math.max(0.05, distance);
  switch (side) {
    case 'left':
      ball.x -= d;
      break;
    case 'right':
      ball.x += d;
      break;
    case 'top':
      ball.y -= d;
      break;
    case 'bottom':
      ball.y += d;
      break;
    default:
      break;
  }
}

export class Game {
  constructor({ canvas, ctx, audio, input, renderer }) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.audio = audio;
    this.input = input;
    this.renderer = renderer;

    this.state = STATES.TITLE;
    this.levelIndex = 0;
    this.score = 0;
    this.lives = 3;
    this.highScore = Number(localStorage.getItem(HS_KEY) || 0);

    this.paddle = null;
    this.balls = [];
    this.bricks = [];
    this.capsules = [];
    this.lasers = [];
    this.particles = [];
    this.shieldBrick = null;

    this.powerups = new PowerupManager(this);

    this._fireCooldown = 0;
    this._levelClearTimer = 0;
    this._ballRampAirSec = 0;

    this._screens = {
      title: document.getElementById('screen-title'),
      pause: document.getElementById('screen-pause'),
      levelClear: document.getElementById('screen-level-clear'),
      gameOver: document.getElementById('screen-game-over'),
      victory: document.getElementById('screen-victory'),
    };
  }

  start() {
    this._setState(STATES.TITLE);
    this.audio.playMusic('title', 200);
  }

  startNewGame() {
    this.score = 0;
    this.lives = 3;
    this.levelIndex = 0;
    this.powerups.reset();
    this._loadLevel(0);
    this._setState(STATES.PLAYING);
  }

  _loadLevel(idx) {
    this.levelIndex = idx;
    const lvl = LEVELS[idx];
    this.bricks = buildBricksFromLayout(lvl);
    this.capsules = [];
    this.lasers = [];
    this.particles = [];
    this.clearShieldBrick();
    this.powerups.reset();
    this._ballRampAirSec = 0;
    this.paddle = new Paddle(VIRTUAL_W / 2, PADDLE_Y, lvl.paddleWidth);
    this.balls = [new Ball(this.paddle.centerX, PADDLE_Y - BALL_RADIUS - 1, lvl.ballSpeed)];
    this.balls[0].r = this._ballRadius();
    this.balls[0].stuckToPaddle = true;
    this._fireCooldown = 0;
    this.audio.playMusic(lvl.musicTrack, 600);
  }

  _setState(s) {
    this.state = s;
    const app = document.getElementById('app');
    if (app) {
      if (s === STATES.PLAYING) app.classList.add('playing');
      else app.classList.remove('playing');
    }
    for (const el of Object.values(this._screens)) {
      if (el) el.classList.remove('visible');
    }
    if (s === STATES.TITLE) this._screens.title?.classList.add('visible');
    else if (s === STATES.PAUSED) this._screens.pause?.classList.add('visible');
    else if (s === STATES.LEVEL_CLEAR) this._screens.levelClear?.classList.add('visible');
    else if (s === STATES.GAME_OVER) {
      const el = document.getElementById('go-score');
      if (el) el.textContent = String(this.score);
      this._screens.gameOver?.classList.add('visible');
    } else if (s === STATES.VICTORY) {
      const el = document.getElementById('vc-score');
      if (el) el.textContent = String(this.score);
      this._screens.victory?.classList.add('visible');
    }
  }

  onLaunch() {
    if (this.state === STATES.TITLE) {
      this.startNewGame();
      return;
    }
    if (this.state === STATES.PLAYING) {
      for (const b of this.balls) {
        if (b.stuckToPaddle) {
          b.stuckToPaddle = false;
          b.vx = 0;
          b.vy = -b.speed;
          this.audio.sfx('launch');
        }
      }
    }
  }

  onFire() {
    if (this.state !== STATES.PLAYING) return;
    if (this._fireCooldown > 0) return;
    if (!this.paddle) return;
    const triple = this.powerups.isActive(POWERUP_TYPES.TRIPLE);
    const single = this.powerups.isActive(POWERUP_TYPES.LASER);
    if (!triple && !single) return;
    const py = this.paddle.y;
    const px = this.paddle.centerX;
    if (triple) {
      this.lasers.push(new Laser(px - this.paddle.width * 0.35, py));
      this.lasers.push(new Laser(px, py));
      this.lasers.push(new Laser(px + this.paddle.width * 0.35, py));
    } else {
      this.lasers.push(new Laser(px, py));
    }
    this.audio.sfx('laserShoot');
    this._fireCooldown = FIRE_COOLDOWN;
  }

  onPause() {
    if (this.state === STATES.PLAYING) this._setState(STATES.PAUSED);
    else if (this.state === STATES.PAUSED) this._setState(STATES.PLAYING);
  }

  onMute() {
    const muted = this.audio.toggleMute();
    const cb = document.getElementById('title-mute');
    if (cb) cb.checked = muted;
  }

  onRestart() {
    if (this.state === STATES.GAME_OVER || this.state === STATES.VICTORY) {
      this.audio.playMusic('title', 200);
      this._setState(STATES.TITLE);
    }
  }

  loseLife() {
    this.lives -= 1;
    this.audio.sfx('loseLife');
    this.renderer.shake(8, 0.3);
    if (this.lives <= 0) {
      this._endGame(false);
      return;
    }
    this.powerups.reset();
    this._ballRampAirSec = 0;
    const lvl = LEVELS[this.levelIndex];
    this.paddle.setWidth(lvl.paddleWidth);
    this.balls = [new Ball(this.paddle.centerX, PADDLE_Y - BALL_RADIUS - 1, lvl.ballSpeed)];
    this.balls[0].r = this._ballRadius();
    this.balls[0].stuckToPaddle = true;
    this.capsules = [];
    this.lasers = [];
    this.clearShieldBrick();
  }

  spawnShieldBrick() {
    this.shieldBrick = new ShieldBrick();
  }

  clearShieldBrick() {
    if (this.shieldBrick) this.shieldBrick.alive = false;
    this.shieldBrick = null;
  }

  _brickHitDamage(brick) {
    if (!this.powerups.isActive(POWERUP_TYPES.BIG_BALL)) return 1;
    if (brick.hardness === 2 || brick.hardness === 3) return BIG_BALL_TOUGH_HIT_DAMAGE;
    return 1;
  }

  _damageBrick(brick) {
    const dmg = this._brickHitDamage(brick);
    const destroyed = brick.hit(dmg);
    const perHit = SCORE_PER_HIT * dmg;
    if (destroyed) {
      this.score += SCORE_PER_BREAK + perHit - SCORE_PER_HIT;
    } else {
      this.score += perHit;
    }
    return destroyed;
  }

  _breakShield() {
    if (!this.shieldBrick?.alive) return false;
    this.shieldBrick.hit();
    this.clearShieldBrick();
    this.powerups.cancel(POWERUP_TYPES.SHIELD_BRICK);
    this.audio.sfx('brickBreak');
    this.renderer.shake(2, 0.06);
    return true;
  }

  _endGame(victory) {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try { localStorage.setItem(HS_KEY, String(this.highScore)); } catch (e) { /* noop */ }
    }
    this._setState(victory ? STATES.VICTORY : STATES.GAME_OVER);
    this.audio.playMusic(victory ? 'victory' : 'title', 400);
  }

  _checkLevelClear() {
    const remaining = countBreakable(this.bricks);
    if (remaining === 0) {
      const bonus = LEVEL_CLEAR_BONUS + this.lives * 250;
      this.score += bonus;
      const lcBonus = document.getElementById('lc-bonus');
      const lcTitle = document.getElementById('lc-title');
      if (lcBonus) lcBonus.textContent = `+${bonus} bonus`;
      if (lcTitle) lcTitle.textContent = `LEVEL ${this.levelIndex + 1} COMPLETE`;
      this.audio.sfx('levelClear');
      this._setState(STATES.LEVEL_CLEAR);
      this._levelClearTimer = 2.0;
      return true;
    }
    return false;
  }

  update(dt) {
    this.input.setGameplayPointerActive(this.state === STATES.PLAYING);

    if (this.state === STATES.LEVEL_CLEAR) {
      this._levelClearTimer -= dt;
      if (this._levelClearTimer <= 0) {
        if (this.levelIndex + 1 >= LEVELS.length) {
          this._endGame(true);
        } else {
          if (this.lives < 5) this.lives += 1;
          this._loadLevel(this.levelIndex + 1);
          this._setState(STATES.PLAYING);
        }
      }
      return;
    }
    if (this.state !== STATES.PLAYING) return;

    if (this._fireCooldown > 0) this._fireCooldown -= dt;

    const targetX = this.input.getPaddleTargetX(this.paddle.x, dt, PADDLE_SPEED);
    this.paddle.x = targetX;
    this.paddle.update(dt, this);

    const lvl = LEVELS[this.levelIndex];
    const baseSpeed = lvl.ballSpeed;
    const anyFlying = this.balls.some((b) => !b.stuckToPaddle);
    if (anyFlying) this._ballRampAirSec += dt;
    const rampU = Math.min(1, this._ballRampAirSec / BALL_SPEED_RAMP_AIRTIME_FULL);
    const targetSpd =
      baseSpeed + (baseSpeed * BALL_SPEED_MAX_MULT - baseSpeed) * rampU;
    for (const b of this.balls) b.setSpeed(targetSpd);

    const rBall = this._ballRadius();
    for (const b of this.balls) {
      b.r = rBall;
      if (b.stuckToPaddle) {
        b.x = this.paddle.centerX;
        b.y = PADDLE_Y - b.r - 1;
      } else {
        b.update(dt, this);
        this._collideBall(b);
      }
    }
    this.balls = this.balls.filter(b => b.y - b.r <= VIRTUAL_H + 50);

    if (!this.balls.length) {
      this.loseLife();
      return;
    }

    for (const c of this.capsules) c.update(dt);
    for (const c of this.capsules) {
      if (!c.alive) continue;
      if (rectsIntersect(c.rect, this.paddle.rect)) {
        c.alive = false;
        this.score += SCORE_PER_CAPSULE;
        this.powerups.apply(c.type);
        const isPositive =
          c.type === POWERUP_TYPES.BIG ||
          c.type === POWERUP_TYPES.BIG_BALL ||
          c.type === POWERUP_TYPES.LASER ||
          c.type === POWERUP_TYPES.TRIPLE ||
          c.type === POWERUP_TYPES.SHIELD_BRICK;
        this.audio.sfx(isPositive ? 'powerUp' : 'powerDown');
      }
    }
    this.capsules = this.capsules.filter(c => c.alive);

    for (const l of this.lasers) {
      l.update(dt);
      if (!l.alive) continue;
      if (this.shieldBrick?.alive && rectsIntersect(l.rect, this.shieldBrick.rect)) {
        this._breakShield();
        l.alive = false;
        continue;
      }
      for (const br of this.bricks) {
        if (!br.alive) continue;
        if (rectsIntersect(l.rect, br.rect)) {
          if (br.isBreakable) {
            const destroyed = this._damageBrick(br);
            this.audio.sfx(destroyed ? 'brickBreak' : 'brickHit');
            if (destroyed) {
              this._maybeDropCapsule(br);
              this._spawnParticles(br);
            }
          }
          l.alive = false;
          break;
        }
      }
    }
    this.lasers = this.lasers.filter(l => l.alive);

    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter(p => p.alive);

    this.powerups.update(dt);

    if (this._checkLevelClear()) return;
  }

  _ballRadius() {
    return this.powerups.isActive(POWERUP_TYPES.BIG_BALL) ? BALL_RADIUS_BIG : BALL_RADIUS;
  }

  _collideBall(ball) {
    if (ball.x - ball.r < FIELD_LEFT) {
      ball.x = FIELD_LEFT + ball.r;
      reflectBySide(ball, 'right');
      this.audio.sfx('wallHit');
    } else if (ball.x + ball.r > FIELD_RIGHT) {
      ball.x = FIELD_RIGHT - ball.r;
      reflectBySide(ball, 'left');
      this.audio.sfx('wallHit');
    }
    if (ball.y - ball.r < FIELD_TOP) {
      ball.y = FIELD_TOP + ball.r;
      reflectBySide(ball, 'bottom');
      this.audio.sfx('wallHit');
    }

    const paddleRect = this.paddle.rect;
    const hitPaddle = circleVsAABB({ x: ball.x, y: ball.y, r: ball.r }, paddleRect);
    if (hitPaddle && ball.vy > 0) {
      ball.y = paddleRect.y - ball.r - 0.1;
      applyPaddleEnglish(ball, this.paddle.centerX, this.paddle.width / 2);
      this.audio.sfx('paddleHit');
    }

    if (this.shieldBrick?.alive && ball.vy > 0) {
      const shieldHit = circleVsAABB({ x: ball.x, y: ball.y, r: ball.r }, this.shieldBrick.rect);
      if (shieldHit) {
        if (shieldHit.side === 'left') ball.x = this.shieldBrick.x - ball.r - 0.1;
        else if (shieldHit.side === 'right') ball.x = this.shieldBrick.x + this.shieldBrick.w + ball.r + 0.1;
        else if (shieldHit.side === 'top') ball.y = this.shieldBrick.y - ball.r - 0.1;
        else if (shieldHit.side === 'bottom') ball.y = this.shieldBrick.y + this.shieldBrick.h + ball.r + 0.1;
        reflectBySide(ball, shieldHit.side);
        this._breakShield();
        return;
      }
    }

    const bigBall = this.powerups.isActive(POWERUP_TYPES.BIG_BALL);
    const circle = { x: ball.x, y: ball.y, r: ball.r };
    const overlaps = [];
    for (const br of this.bricks) {
      if (!br.alive) continue;
      const col = circleVsAABB(circle, br.rect);
      if (col) overlaps.push({ br, col });
    }
    if (!overlaps.length) return;

    if (bigBall) {
      let primary = overlaps[0];
      for (const o of overlaps) {
        if (o.col.overlap > primary.col.overlap) primary = o;
      }

      let anyBreakDestroyed = false;
      let anyBreakHit = false;
      for (const { br } of overlaps) {
        if (!br.isBreakable || !br.alive) continue;
        anyBreakHit = true;
        const destroyed = this._damageBrick(br);
        if (destroyed) {
          anyBreakDestroyed = true;
          this._maybeDropCapsule(br);
          this._spawnParticles(br);
        }
      }
      if (anyBreakHit) {
        this.audio.sfx(anyBreakDestroyed ? 'brickBreak' : 'brickHit');
        this.renderer.shake(3, 0.08);
      } else {
        this.audio.sfx('wallHit');
      }

      const { br: pBr, col } = primary;
      let pushDist = col.overlap;
      if (bigBall && pBr.isBreakable) {
        pushDist = Math.max(0, col.overlap - BIG_BALL_BRICK_PENETRATE);
      }
      pushBallOutAlongSide(ball, col.side, pushDist);
      reflectBySide(ball, col.side);
      return;
    }

    for (const br of this.bricks) {
      if (!br.alive) continue;
      const hit = circleVsAABB({ x: ball.x, y: ball.y, r: ball.r }, br.rect);
      if (!hit) continue;
      if (hit.side === 'left') ball.x = br.x - ball.r - 0.1;
      else if (hit.side === 'right') ball.x = br.x + br.w + ball.r + 0.1;
      else if (hit.side === 'top') ball.y = br.y - ball.r - 0.1;
      else if (hit.side === 'bottom') ball.y = br.y + br.h + ball.r + 0.1;
      reflectBySide(ball, hit.side);
      if (br.isBreakable) {
        const destroyed = this._damageBrick(br);
        this.audio.sfx(destroyed ? 'brickBreak' : 'brickHit');
        if (destroyed) {
          this._maybeDropCapsule(br);
          this._spawnParticles(br);
          this.renderer.shake(3, 0.08);
        }
      } else {
        this.audio.sfx('wallHit');
      }
      break;
    }
  }

  _maybeDropCapsule(brick) {
    const lvl = LEVELS[this.levelIndex];
    const chance = dropChanceFor(brick.hardness) * (lvl.capsuleDropMultiplier || 1);
    if (Math.random() < chance) {
      const type = pickDrop();
      this.capsules.push(new Capsule(brick.x + brick.w / 2, brick.y + brick.h / 2, type));
    }
  }

  _spawnParticles(brick) {
    const colorByHardness = { 1: '#36d6ff', 2: '#ffd23f', 3: '#ff4c5b' };
    const color = colorByHardness[brick.hardness] || '#cccccc';
    for (let i = 0; i < 10; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 180;
      this.particles.push(new Particle(
        brick.x + brick.w / 2,
        brick.y + brick.h / 2,
        Math.cos(ang) * sp,
        Math.sin(ang) * sp - 40,
        color,
        0.6
      ));
    }
  }

  draw() {
    this.renderer.beginFrame(this);
    const ctx = this.ctx;

    if (this.state === STATES.TITLE) {
      this.renderer.endFrame();
      this.renderer.drawHud(this);
      return;
    }

    if (!this.bricks?.length || !this.paddle) {
      this.renderer.endFrame();
      this.renderer.drawHud(this);
      return;
    }

    for (const br of this.bricks) br.draw(ctx);
    if (this.paddle) this.paddle.draw(ctx);
    if (this.shieldBrick?.alive) this.shieldBrick.draw(ctx);
    for (const b of this.balls) b.draw(ctx);
    for (const c of this.capsules) c.draw(ctx);
    for (const l of this.lasers) l.draw(ctx);
    for (const p of this.particles) p.draw(ctx);

    this.renderer.endFrame();
    this.renderer.drawHud(this);
  }
}
