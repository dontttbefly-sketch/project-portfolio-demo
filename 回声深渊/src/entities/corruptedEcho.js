// 堕落回声：长时间未访问的回声会被腐蚀，化为敌人
// 击败它可以拿回所有死亡时丢落的碎片
import { Entity } from './entity.js';
import { applyPhysics } from '../physics.js';
import { Projectile } from './projectile.js';
import { getPlayerSprite } from '../art/pixelart.js';
import { palettes, withAlpha } from '../art/palette.js';
import { approach, sign, dist2 } from '../util.js';
import { drawHpBar } from './enemy.js';

export class CorruptedEcho extends Entity {
  constructor(x, y, echoData) {
    super(x, y, 9, 14);
    this.team = 'enemy';
    this.kind = 'corrupted_echo';
    this.echoData = echoData;
    this.hp = 5 + Math.floor((echoData.fragments || 0) / 6);
    this.maxHp = this.hp;
    this.dmgTouch = 1;
    this.facing = -1;
    this.aiState = 'chase';
    this.attackCd = 1.0;
    this.telegraph = 0;
    this.givesFragments = (echoData.fragments || 0) + 8;
  }

  update(dt, ctx) {
    super.update(dt, ctx);
    if (this.dead) {
      this.vx = approach(this.vx, 0, 800 * dt);
      applyPhysics(this, dt, ctx.room);
      return;
    }

    const p = ctx.player;
    if (!p) return;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const adx = Math.abs(dx);

    if (this.knockbackVx !== 0) {
      this.vx = this.knockbackVx;
      this.knockbackVx = approach(this.knockbackVx, 0, 1500 * dt);
    } else {
      const dir = sign(dx);
      this.facing = dir || this.facing;
      // 接近
      if (adx > 24) {
        this.vx = approach(this.vx, dir * 80, 500 * dt);
      } else {
        this.vx = approach(this.vx, 0, 600 * dt);
        this.attackCd -= dt;
        if (this.attackCd <= 0 && this.telegraph <= 0) this.telegraph = 0.35;
      }
      // 跳跃接近
      if (this.onGround && adx < 30 && dy < -10 && Math.random() < 0.06) {
        this.vy = -220;
      }
    }

    if (this.telegraph > 0) {
      this.telegraph -= dt;
      if (this.telegraph <= 0) {
        // 朝玩家发射一发幽灵弹幕
        const sx = this.centerX(), sy = this.centerY();
        const px = p.centerX(), py = p.centerY();
        const a = Math.atan2(py - sy, px - sx);
        const sp = 100;
        ctx.spawnEnemyProjectile(sx, sy, Math.cos(a) * sp, Math.sin(a) * sp,
          { dmg: 1, kind: 'bullet', color: '#cf6877' });
        this.attackCd = 1.4;
      }
    }

    applyPhysics(this, dt, ctx.room);

    // 接触
    if (p.x < this.x + this.w && p.x + p.w > this.x && p.y < this.y + this.h && p.y + p.h > this.y) {
      const dir = p.x < this.x ? -1 : 1;
      p.takeDamage(this.dmgTouch, dir * 140, -100, 'enemy:corrupted_echo', ctx);
    }
  }

  kill(source) {
    super.kill(source);
    this.vy = -100;
  }

  render(ctx, camX, camY) {
    const sprite = getPlayerSprite('idle', 0, palettes.player, 0.7);
    const sx = (this.x - camX - 1) | 0;
    const sy = (this.y - camY) | 0;
    if (this.telegraph > 0) {
      const r = 7 + (1 - this.telegraph / 0.35) * 6;
      ctx.strokeStyle = `rgba(207,104,119,0.8)`;
      ctx.beginPath();
      ctx.arc(this.centerX() - camX, this.centerY() - camY, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (this.facing < 0) {
      ctx.translate(sx + sprite.width, sy);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, 0, 0);
    } else {
      ctx.drawImage(sprite, sx, sy);
    }
    ctx.restore();
    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = this.flash * 4;
      ctx.fillRect(sx, sy, sprite.width, sprite.height);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    drawHpBar(ctx, this, camX, camY);
  }
}
