// 简易粒子系统 — 数学生成的"美术"效果
import { withAlpha } from './palette.js';

export class ParticleSystem {
  constructor() {
    this.list = [];
  }

  spawn(opts) {
    this.list.push({
      x: opts.x, y: opts.y,
      vx: opts.vx || 0, vy: opts.vy || 0,
      ax: opts.ax || 0, ay: opts.ay || 0,
      drag: opts.drag || 0,
      life: opts.life || 0.5,
      maxLife: opts.life || 0.5,
      size: opts.size || 2,
      color: opts.color || '#ffffff',
      shape: opts.shape || 'square', // square | circle | streak
      fade: opts.fade !== false,
      shrink: opts.shrink || false,
      gravity: opts.gravity || 0
    });
  }

  burst(x, y, count, opts = {}) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (opts.speedMin || 30) + Math.random() * ((opts.speedMax || 90) - (opts.speedMin || 30));
      this.spawn({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        ay: opts.gravity || 0,
        drag: opts.drag || 200,
        life: (opts.life || 0.5) * (0.6 + Math.random() * 0.6),
        size: opts.size || (1 + Math.random() * 2),
        color: opts.color || '#fff',
        shape: opts.shape || 'square',
        shrink: opts.shrink || false
      });
    }
  }

  // 沿弧线扩散的攻击粒子
  arc(x, y, dir, opts = {}) {
    const count = opts.count || 8;
    const spread = opts.spread || 1.0;
    const baseAngle = dir > 0 ? 0 : Math.PI;
    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1);
      const a = baseAngle + (t - 0.5) * spread;
      const s = (opts.speed || 100) * (0.7 + Math.random() * 0.6);
      this.spawn({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        drag: 380,
        life: 0.18 + Math.random() * 0.12,
        size: 1 + Math.random() * 1.5,
        color: opts.color || '#fff',
        shape: 'square'
      });
    }
  }

  trail(x, y, color, life = 0.25) {
    this.spawn({
      x, y, life, color, size: 2, shape: 'square',
      shrink: true
    });
  }

  smoke(x, y, color, count = 4) {
    for (let i = 0; i < count; i++) {
      this.spawn({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 20,
        vy: -10 - Math.random() * 20,
        life: 0.4 + Math.random() * 0.3,
        size: 1 + Math.random() * 2,
        color, shape: 'square', shrink: true
      });
    }
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.vx += p.ax * dt;
      p.vy += (p.ay + p.gravity) * dt;
      // drag
      const dragMag = p.drag * dt;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 0) {
        const factor = Math.max(0, 1 - dragMag / Math.max(speed, 1));
        p.vx *= factor;
        p.vy *= factor;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  render(ctx, camX, camY) {
    for (const p of this.list) {
      const t = p.life / p.maxLife;
      const sz = p.shrink ? Math.max(1, p.size * t) : p.size;
      const col = p.fade ? withAlpha(p.color, Math.min(1, t * 1.4)) : p.color;
      const x = Math.floor(p.x - camX);
      const y = Math.floor(p.y - camY);
      ctx.fillStyle = col;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(x, y, sz, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'streak') {
        ctx.fillRect(x - sz, y, sz * 2, 1);
      } else {
        ctx.fillRect(x - (sz / 2 | 0), y - (sz / 2 | 0), Math.ceil(sz), Math.ceil(sz));
      }
    }
  }

  clear() { this.list.length = 0; }
}
