import { VIRTUAL_W, VIRTUAL_H, FIELD_LEFT, FIELD_RIGHT, FIELD_TOP, POWERUP_COLORS } from './constants.js';

export class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this._shake = 0;
    this._shakeT = 0;
    this._dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    this._resize();
    window.addEventListener('resize', () => this._resize());

    this._hud = {
      score: document.getElementById('hud-score'),
      high: document.getElementById('hud-high'),
      level: document.getElementById('hud-level'),
      lives: document.getElementById('hud-lives'),
      effects: document.getElementById('hud-effects'),
    };
  }

  /** Backing store is always VIRTUAL_W×VIRTUAL_H (× dpr), independent of CSS layout timing. */
  _resize() {
    const w = Math.max(1, Math.round(VIRTUAL_W * this._dpr));
    const h = Math.max(1, Math.round(VIRTUAL_H * this._dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  beginFrame(game) {
    this._resize();
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const sx = w / VIRTUAL_W;
    const sy = h / VIRTUAL_H;
    const s = Math.min(sx, sy);
    const ox = (w - VIRTUAL_W * s) / 2;
    const oy = (h - VIRTUAL_H * s) / 2;

    let shakeX = 0, shakeY = 0;
    if (this._shakeT > 0) {
      this._shakeT -= 1 / 60;
      shakeX = (Math.random() - 0.5) * this._shake;
      shakeY = (Math.random() - 0.5) * this._shake;
      if (this._shakeT <= 0) { this._shake = 0; }
    }

    ctx.setTransform(s, 0, 0, s, ox + shakeX * s, oy + shakeY * s);

    this._drawBackground(ctx);
  }

  _drawBackground(ctx) {
    ctx.fillStyle = '#04060f';
    ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = '#3a6cff';
    ctx.lineWidth = 1;
    for (let x = 0; x < VIRTUAL_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIRTUAL_H); ctx.stroke();
    }
    for (let y = 0; y < VIRTUAL_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIRTUAL_W, y); ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(120, 180, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(FIELD_LEFT - 4, FIELD_TOP - 4, (FIELD_RIGHT - FIELD_LEFT) + 8, VIRTUAL_H - FIELD_TOP - 4);
    ctx.restore();
  }

  drawHud(game) {
    if (!this._hud.score) return;
    this._hud.score.textContent = String(game.score).padStart(6, '0');
    this._hud.high.textContent = String(game.highScore).padStart(6, '0');
    this._hud.level.textContent = `${game.levelIndex + 1} / 8`;
    this._hud.lives.textContent = '\u25A0'.repeat(Math.max(0, game.lives));

    const eff = this._hud.effects;
    eff.innerHTML = '';
    for (const a of game.powerups.getActive()) {
      const node = document.createElement('div');
      node.className = 'hud-effect';
      node.style.color = POWERUP_COLORS[a.type] || '#fff';
      const ratio = a.duration > 0 ? Math.max(0, a.remaining / a.duration) : 0;
      node.innerHTML = `${a.type}<span class="bar"><i style="transform:scaleX(${ratio})"></i></span>`;
      eff.appendChild(node);
    }
  }

  shake(intensity, durationS) {
    this._shake = Math.max(this._shake, intensity);
    this._shakeT = Math.max(this._shakeT, durationS);
  }

  endFrame() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}
