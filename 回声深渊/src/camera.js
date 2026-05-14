// 跟随相机 + 屏幕震动 + 房间约束
import { W, H, TILE, CAMERA } from './config.js';
import { lerp } from './util.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.shakeT = 0;
    this.shakeMag = 0;
    this.fadeAlpha = 0;
    this.fadeTarget = 0;
    this.fadeSpeed = 4;
  }

  follow(ent) {
    const lookahead = (ent.facing || 0) * CAMERA.LOOKAHEAD;
    this.targetX = ent.x + ent.w / 2 - W / 2 + lookahead;
    this.targetY = ent.y + ent.h / 2 - H * CAMERA.VERTICAL_BIAS;
  }

  shake(mag, dur = 0.25) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeT = Math.max(this.shakeT, dur);
  }

  fadeTo(a, speed = 4) {
    this.fadeTarget = a;
    this.fadeSpeed = speed;
  }

  update(dt, room) {
    // 平滑跟随
    this.x = lerp(this.x, this.targetX, 1 - Math.pow(0.0001, dt));
    this.y = lerp(this.y, this.targetY, 1 - Math.pow(0.0001, dt));

    // 房间约束
    if (room) {
      const maxX = Math.max(0, room.w * TILE - W);
      const maxY = Math.max(0, room.h * TILE - H);
      this.x = Math.max(0, Math.min(maxX, this.x));
      this.y = Math.max(0, Math.min(maxY, this.y));
    }

    if (this.shakeT > 0) {
      this.shakeT -= dt;
      this.shakeMag *= 0.85;
      if (this.shakeT <= 0) { this.shakeMag = 0; }
    }

    if (this.fadeAlpha < this.fadeTarget) {
      this.fadeAlpha = Math.min(this.fadeTarget, this.fadeAlpha + this.fadeSpeed * dt);
    } else if (this.fadeAlpha > this.fadeTarget) {
      this.fadeAlpha = Math.max(this.fadeTarget, this.fadeAlpha - this.fadeSpeed * dt);
    }
  }

  applyShake() {
    if (this.shakeT > 0) {
      return [
        (Math.random() - 0.5) * this.shakeMag,
        (Math.random() - 0.5) * this.shakeMag
      ];
    }
    return [0, 0];
  }

  snap(ent, room) {
    this.targetX = ent.x + ent.w / 2 - W / 2;
    this.targetY = ent.y + ent.h / 2 - H / 2;
    this.x = this.targetX;
    this.y = this.targetY;
    if (room) {
      const maxX = Math.max(0, room.w * TILE - W);
      const maxY = Math.max(0, room.h * TILE - H);
      this.x = Math.max(0, Math.min(maxX, this.x));
      this.y = Math.max(0, Math.min(maxY, this.y));
      this.targetX = this.x;
      this.targetY = this.y;
    }
  }
}
