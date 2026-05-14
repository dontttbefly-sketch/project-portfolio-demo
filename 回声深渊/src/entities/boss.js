// 深渊之王：多阶段 Boss
// 阶段 1：行走砸地 + 突进
// 阶段 2 (HP < 50%)：增加圆弧弹幕
// 阶段 3 (HP < 25%)：召唤小怪 + 持续追踪弹

import { Entity } from './entity.js';
import { applyPhysics } from '../physics.js';
import { getBossSprite } from '../art/pixelart.js';
import { palettes, withAlpha } from '../art/palette.js';
import { approach, sign, dist2 } from '../util.js';
import { Slime } from './enemy.js';
import { SHAKE } from '../config.js';

export class AbyssLord extends Entity {
  constructor(x, y, palette) {
    super(x, y, 17, 23);
    this.team = 'enemy';
    this.kind = 'boss';
    this.maxHp = 50;
    this.hp = 50;
    this.palette = palette || palettes.temple;
    this.facing = -1;
    this.aiState = 'wait';
    this.aiTimer = 1.0;
    this.attackCd = 0;
    this.dmgTouch = 2;
    this.phase = 1;
    this.givesFragments = 80;
    this.summons = 0;
    this.maxSummons = 0;
    this.t = 0;
    this.dashing = false;
    this.dashTime = 0;
    this.volleyCount = 0;
  }

  takePhase() {
    if (this.phase === 1 && this.hp < this.maxHp * 0.5) {
      this.phase = 2;
      return true;
    }
    if (this.phase === 2 && this.hp < this.maxHp * 0.25) {
      this.phase = 3;
      return true;
    }
    return false;
  }

  update(dt, ctx) {
    super.update(dt, ctx);
    this.t += dt;
    if (this.dead) {
      this.vx = approach(this.vx, 0, 800 * dt);
      applyPhysics(this, dt, ctx.room);
      return;
    }

    const phaseShift = this.takePhase();
    if (phaseShift) {
      ctx.cam.shake(SHAKE.EXPLOSION, 0.4);
      ctx.particles.burst(this.centerX(), this.centerY(), 40, {
        color: '#cf6877', speedMin: 80, speedMax: 200, life: 0.7
      });
      this.aiState = 'wait';
      this.aiTimer = 0.7;
    }

    const p = ctx.player;
    if (!p) return;
    const dx = p.x - this.x;
    this.facing = sign(dx) || this.facing;

    if (this.knockbackVx !== 0) {
      this.vx = this.knockbackVx;
      this.knockbackVx = approach(this.knockbackVx, 0, 1200 * dt);
    } else if (this.aiState === 'wait') {
      this.vx = approach(this.vx, 0, 600 * dt);
      this.aiTimer -= dt;
      if (this.aiTimer <= 0) this.pickAttack(ctx);
    } else if (this.aiState === 'walk') {
      this.vx = approach(this.vx, this.facing * 50, 400 * dt);
      this.aiTimer -= dt;
      if (this.aiTimer <= 0) {
        this.aiState = 'wait';
        this.aiTimer = 0.4 + Math.random() * 0.5;
      }
    } else if (this.aiState === 'tele_dash') {
      this.aiTimer -= dt;
      if (this.aiTimer <= 0) {
        this.aiState = 'dash';
        this.aiTimer = 0.55;
        this.vx = this.facing * 280;
        this.dashing = true;
      }
    } else if (this.aiState === 'dash') {
      this.aiTimer -= dt;
      if (Math.random() < 0.6) {
        ctx.particles.spawn({
          x: this.centerX() - this.facing * 6, y: this.centerY() + 4,
          vx: -this.facing * 30 * Math.random(), vy: -10 - Math.random() * 20,
          life: 0.3, size: 1 + Math.random() * 2, color: '#7a5fa0', shrink: true
        });
      }
      if (this.aiTimer <= 0) {
        this.aiState = 'wait';
        this.aiTimer = 0.6;
        this.dashing = false;
      }
    } else if (this.aiState === 'tele_slam') {
      this.aiTimer -= dt;
      this.vx = approach(this.vx, 0, 800 * dt);
      if (this.aiTimer <= 0) {
        this.aiState = 'slam';
        this.aiTimer = 0.4;
        this.vy = -200;
      }
    } else if (this.aiState === 'slam') {
      this.aiTimer -= dt;
      if (this.onGround && this.aiTimer < 0.25) {
        ctx.cam.shake(SHAKE.EXPLOSION, 0.4);
        ctx.particles.burst(this.centerX(), this.y + this.h, 30, {
          color: '#a82a2a', speedMin: 100, speedMax: 240, life: 0.5, shrink: true
        });
        for (let i = -3; i <= 3; i++) {
          const a = Math.PI * (1 + 0.10 * i) - Math.PI / 2;
          const sp = 130;
          ctx.spawnEnemyProjectile(this.centerX(), this.y + this.h - 4,
            Math.cos(a) * sp, Math.sin(a) * sp, { dmg: 1, kind: 'bullet', color: '#cf6877' });
        }
        this.aiState = 'wait';
        this.aiTimer = 0.8;
      }
    } else if (this.aiState === 'tele_volley') {
      this.aiTimer -= dt;
      this.vx = approach(this.vx, 0, 800 * dt);
      if (this.aiTimer <= 0) {
        this.aiState = 'volley';
        this.aiTimer = 1.0;
        this.volleyCount = 6;
      }
    } else if (this.aiState === 'volley') {
      this.aiTimer -= dt;
      if ((this.volleyCount > 0) && Math.random() < 0.2) {
        const sx = this.centerX(), sy = this.y + 6;
        const px = p.centerX(), py = p.centerY();
        const a = Math.atan2(py - sy, px - sx) + (Math.random() - 0.5) * 0.4;
        const sp = 130;
        ctx.spawnEnemyProjectile(sx, sy, Math.cos(a) * sp, Math.sin(a) * sp,
          { dmg: 1, kind: 'bullet', color: '#ed8030' });
        this.volleyCount--;
      }
      if (this.aiTimer <= 0) {
        this.aiState = 'wait';
        this.aiTimer = 0.6;
      }
    } else if (this.aiState === 'tele_summon') {
      this.aiTimer -= dt;
      this.vx = approach(this.vx, 0, 600 * dt);
      if (this.aiTimer <= 0) {
        this.aiState = 'summon';
        this.aiTimer = 0.4;
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const sx = this.centerX() + (Math.random() - 0.5) * 60;
          const sy = this.y + 16;
          const slime = new Slime(sx, sy, this.palette);
          slime.hp = 4;
          slime.maxHp = 4;
          ctx.entities.push(slime);
          ctx.particles.burst(sx, sy, 12, { color: '#a82a2a', speedMin: 30, speedMax: 80, life: 0.4 });
        }
      }
    } else if (this.aiState === 'summon') {
      this.aiTimer -= dt;
      if (this.aiTimer <= 0) {
        this.aiState = 'wait';
        this.aiTimer = 0.7;
      }
    }

    applyPhysics(this, dt, ctx.room);

    if (p.x < this.x + this.w && p.x + p.w > this.x && p.y < this.y + this.h && p.y + p.h > this.y) {
      const dir = p.x < this.x ? -1 : 1;
      p.takeDamage(this.dmgTouch, dir * 220, -150, 'enemy:boss', ctx);
    }
  }

  pickAttack(ctx) {
    const p = ctx.player;
    if (!p) return;
    const dx = Math.abs(p.x - this.x);
    const choices = [];
    if (dx > 50) choices.push('dash', 'walk');
    if (dx < 100) choices.push('slam');
    if (this.phase >= 2) choices.push('volley');
    if (this.phase >= 3) choices.push('summon', 'volley');
    const c = choices[Math.floor(Math.random() * choices.length)] || 'walk';
    if (c === 'walk') { this.aiState = 'walk'; this.aiTimer = 0.8 + Math.random() * 0.6; }
    else if (c === 'dash') { this.aiState = 'tele_dash'; this.aiTimer = 0.55; }
    else if (c === 'slam') { this.aiState = 'tele_slam'; this.aiTimer = 0.55; }
    else if (c === 'volley') { this.aiState = 'tele_volley'; this.aiTimer = 0.5; }
    else if (c === 'summon') { this.aiState = 'tele_summon'; this.aiTimer = 0.6; }
  }

  kill(source) {
    super.kill(source);
    this.vy = -120;
  }

  render(ctx, camX, camY) {
    const sprite = getBossSprite(this.palette);
    const sx = (this.x - camX) | 0;
    const sy = (this.y - camY) | 0;
    if (this.aiState.startsWith('tele_')) {
      const a = 0.3 + Math.sin(this.t * 18) * 0.2;
      ctx.fillStyle = `rgba(255,80,90,${a})`;
      ctx.fillRect(sx - 1, sy - 1, sprite.width + 2, sprite.height + 2);
    }
    ctx.save();
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
    drawBossBar(ctx, this);
  }
}

function drawBossBar(ctx, boss) {
  const W = 384;
  const barW = 240;
  const x = (W - barW) / 2;
  const y = 8;
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(x - 1, y - 1, barW + 2, 6);
  ctx.fillStyle = '#5a1418';
  ctx.fillRect(x, y, barW, 4);
  const ratio = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = '#cf6877';
  ctx.fillRect(x, y, Math.ceil(barW * ratio), 4);
  ctx.fillStyle = '#cba0d6';
  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('深  渊  之  王', W / 2, y + 14);
  ctx.textAlign = 'left';
}
