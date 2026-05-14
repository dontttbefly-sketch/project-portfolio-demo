// 投射物：玩家魔法弹 / 敌人弹幕
import { Entity } from './entity.js';
import { applyPhysics } from '../physics.js';
import { getOrbSprite, getEnemyBulletSprite } from '../art/pixelart.js';
import { palettes, withAlpha } from '../art/palette.js';
import { TILES } from '../world/tile.js';

export class Projectile extends Entity {
  constructor(x, y, vx, vy, opts = {}) {
    super(x, y, opts.w || 5, opts.h || 5);
    this.vx = vx;
    this.vy = vy;
    this.team = opts.team || 'enemy';
    this.dmg = opts.dmg || 1;
    this.gravityScale = 0;
    this.life = opts.life || 2.0;
    this.kind = opts.kind || 'orb';     // orb | bullet | spirit
    this.pierce = opts.pierce || 0;
    this.color = opts.color || '#cba0d6';
    this.tail = [];
    this.spin = 0;
  }

  update(dt, ctx) {
    super.update(dt, ctx);
    this.life -= dt;
    if (this.life <= 0) { this.removeMe = true; return; }

    this.tail.push({ x: this.centerX(), y: this.centerY(), t: 0.18 });
    if (this.tail.length > 8) this.tail.shift();
    for (const p of this.tail) p.t -= dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.spin += dt * 8;

    // 撞地图
    const room = ctx.room;
    const cx = this.centerX(), cy = this.centerY();
    const tx = (cx / 12) | 0;
    const ty = (cy / 12) | 0;
    if (tx < 0 || tx >= room.w || ty < 0 || ty >= room.h) {
      this.removeMe = true; return;
    }
    const t = room.tiles[ty * room.w + tx];
    if (t === TILES.SOLID || t === TILES.PLATFORM_SOLID) {
      this.removeMe = true;
      ctx.particles.burst(cx, cy, 6, { color: this.color, speedMin: 30, speedMax: 80, life: 0.25 });
      return;
    }
    if (t === TILES.WALL_FRAGILE && this.kind === 'orb') {
      // 玩家的魔法弹不会破墙；保留物理为实墙
      this.removeMe = true; return;
    }
  }

  render(ctx, camX, camY) {
    // 拖尾
    for (let i = 0; i < this.tail.length; i++) {
      const p = this.tail[i];
      if (p.t <= 0) continue;
      const a = (i / this.tail.length) * 0.6;
      ctx.fillStyle = withAlpha(this.color, a);
      ctx.fillRect((p.x - camX) | 0, (p.y - camY) | 0, 2, 2);
    }
    // 主体
    const sprite = this.team === 'player'
      ? getOrbSprite(palettes.player)
      : getEnemyBulletSprite(palettes.lava);
    ctx.drawImage(sprite, (this.x - camX) | 0, (this.y - camY) | 0);
  }
}
