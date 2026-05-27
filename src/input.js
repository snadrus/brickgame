import { FIELD_LEFT, FIELD_RIGHT } from './constants.js';

function pointerLockElement() {
  try {
    return document.pointerLockElement;
  } catch (_) {
    return null;
  }
}

function supportsPointerLock() {
  return typeof document !== 'undefined' && 'pointerLockElement' in document;
}

export class Input {
  constructor(canvas, virtualWidth, virtualHeight) {
    this.canvas = canvas;
    this.vw = virtualWidth;
    this.vh = virtualHeight;
    this._keys = new Set();
    this._cb = {};
    this._pointerX = null;
    this._installed = false;
    this._gameplayActive = false;
    this._lockAccumDX = 0;
    this._capturedPointerId = null;
    this._onLockChange = this._onPointerLockChange.bind(this);
  }

  bind(callbacks) {
    this._cb = callbacks || {};
    if (this._installed) return;
    this._installed = true;
    this._installHandlers();
  }

  isDown(key) { return this._keys.has(key); }

  /** Call every frame — capture/release pointer while PLAYING. */
  setGameplayPointerActive(active) {
    if (!active) {
      this._releaseCapture();
      this._exitPointerLock();
      this._lockAccumDX = 0;
      this._pointerX = null;
    }
    this._gameplayActive = !!active;
  }

  _exitPointerLock() {
    if (!supportsPointerLock()) return;
    try {
      if (pointerLockElement() === this.canvas) {
        document.exitPointerLock();
      }
    } catch (_) { /* noop */ }
  }

  _releaseCapture() {
    const id = this._capturedPointerId;
    if (id == null) return;
    try {
      if (this.canvas.hasPointerCapture?.(id)) {
        this.canvas.releasePointerCapture(id);
      }
    } catch (_) { /* noop */ }
    this._capturedPointerId = null;
  }

  _onPointerLockChange() {
    if (pointerLockElement() !== this.canvas) {
      this._lockAccumDX = 0;
    }
  }

  _virtualXFromClientX(clientX) {
    const rect = this.canvas.getBoundingClientRect();
    const rw = rect.width > 0 ? rect.width : this.canvas.clientWidth || this.vw;
    const cssX = clientX - rect.left;
    const x = (cssX / rw) * this.vw;
    if (!Number.isFinite(x)) return this.vw * 0.5;
    return x;
  }

  _clampVirtualX(x) {
    if (!Number.isFinite(x)) return this.vw * 0.5;
    return Math.max(FIELD_LEFT, Math.min(FIELD_RIGHT, x));
  }

  _installHandlers() {
    const c = this.canvas;
    if (supportsPointerLock()) {
      document.addEventListener('pointerlockchange', this._onLockChange);
    }

    window.addEventListener('keydown', (e) => {
      const k = e.key;
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) {
        e.preventDefault();
      }
      if (this._keys.has(k)) return;
      this._keys.add(k);
      if (k === ' ') {
        this._cb.onLaunch && this._cb.onLaunch();
        this._cb.onFire && this._cb.onFire();
      } else if (k === 'p' || k === 'P') {
        this._cb.onPause && this._cb.onPause();
      } else if (k === 'm' || k === 'M') {
        this._cb.onMute && this._cb.onMute();
      } else if (k === 'r' || k === 'R') {
        this._cb.onRestart && this._cb.onRestart();
      }
    }, { passive: false });

    window.addEventListener('keyup', (e) => { this._keys.delete(e.key); });

    c.addEventListener('pointermove', (e) => {
      if (this._gameplayActive && pointerLockElement() === this.canvas) {
        this._lockAccumDX += e.movementX || 0;
        return;
      }
      if (
        this._gameplayActive &&
        this._capturedPointerId != null &&
        e.pointerId === this._capturedPointerId
      ) {
        this._pointerX = this._virtualXFromClientX(e.clientX);
        return;
      }
      this._pointerX = this._virtualXFromClientX(e.clientX);
      if (this._cb.onMove) this._cb.onMove(this._pointerX);
    });

    c.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this._pointerX = this._virtualXFromClientX(e.clientX);

      if (this._gameplayActive) {
        try {
          c.setPointerCapture?.(e.pointerId);
          this._capturedPointerId = e.pointerId;
        } catch (_) { /* noop */ }
        if (supportsPointerLock() && pointerLockElement() !== c) {
          try {
            c.requestPointerLock?.();
          } catch (_) { /* noop */ }
        }
      }

      if (this._cb.onLaunch) this._cb.onLaunch();
      if (this._cb.onFire) this._cb.onFire();
    });

    c.addEventListener('pointerup', (e) => {
      if (this._capturedPointerId === e.pointerId) {
        this._releaseCapture();
      }
    });

    c.addEventListener('lostpointercapture', () => {
      this._capturedPointerId = null;
    });

    window.addEventListener('blur', () => {
      this._keys.clear();
      this._releaseCapture();
      this._lockAccumDX = 0;
    });
  }

  getPaddleTargetX(currentX, dt, paddleSpeed) {
    let target = Number.isFinite(currentX) ? currentX : this.vw * 0.5;

    if (this._gameplayActive && pointerLockElement() === this.canvas) {
      const scale = this.vw / 880;
      target = target + this._lockAccumDX * scale;
      this._lockAccumDX = 0;
      return this._clampVirtualX(target);
    }

    if (this._pointerX !== null && Number.isFinite(this._pointerX)) {
      return this._clampVirtualX(this._pointerX);
    }

    const left = this._keys.has('ArrowLeft') || this._keys.has('a') || this._keys.has('A');
    const right = this._keys.has('ArrowRight') || this._keys.has('d') || this._keys.has('D');
    if (left || right) {
      const dir = (right ? 1 : 0) - (left ? 1 : 0);
      target = currentX + dir * paddleSpeed * dt;
      this._pointerX = null;
    }
    return this._clampVirtualX(target);
  }
}
