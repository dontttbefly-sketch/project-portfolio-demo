// 敌人基类 + 多种子类
// 每个敌人都有：HP, AI, 攻击 telegraph, 受击/死亡反馈
import { Entity } from './entity.js';
import { applyPhysics } from '../physics.js';
import { Projectile } from './projectile.js';
import { getSlimeSprite, getEyeSprite, getKnightSprite, fillRect } from '../art/pixelart.js';
import { palettes, withAlpha } from '../art/palette.js';
import { approach, sign, dist2 } from '../util.js';
import { TILES } from '../world/tile.js';
import { SHAKE } from '../config.js';

// ============== Slime（基础近战） ==============
export class Slime extends Entity {
  constructor(x, y, palette = palettes.forest) {
    super(x, y, 12, 12);
    this.hp = 3;
    this.maxHp = 3;
    this.dmgTouch = 1;
    this.team = 'enemy';
    this.palette = palette;
    this.dirTimer = 0;
    this.facing = Math.random() < 0.5 ? -1 : 1;
    this.hopTimer = 0.5 + Math.random();
    this.kind = 'slime';
    this.givesFragments = 4;
  }

  update(dt, ctx) {
    super.update(dt, ctx);
    if (this.dead) {
      this.vx = approach(this.vx, 0, 600 * dt);
      applyPhysics(this, dt, ctx.room);
      this.removeMe = this.removeMe || false;
      return;
    }

    this.dirTimer -= dt;
    if (this.onGround) {
      // 决定下一跳方向：朝玩家
      const dx = ctx.player ? ctx.player.x - this.x : 0;
      const towards = sign(dx);
      if (Math.abs(dx) > 8) this.facing = towards || this.facing;
      this.hopTimer -= dt;
      if (this.hopTimer <= 0) {
        this.vy = -180;
        this.vx = this.facing * 70;
        this.hopTimer = 0.6 + Math.random() * 0.4;
      } else {
        this.vx = approach(this.vx, 0, 200 * dt);
      }
    }

    // 应用击退
    if (this.knockbackVx !== 0) {
      this.vx = this.knockbackVx;
      this.knockbackVx = approach(this.knockbackVx, 0, 1500 * dt);
    }

    applyPhysics(this, dt, ctx.room);
    this.checkHazard(ctx);

    // 接触玩家造成伤害
    this.touchPlayer(ctx);
  }

  checkHazard(ctx) {
    if (this.touchingHazard && this.invuln <= 0) {
      this.hurt(99, 0, 0);
    }
    this.touchingHazard = false;
  }

  touchPlayer(ctx) {
    const p = ctx.player;
    if (!p || p.dead) return;
    if (p.x < this.x + this.w && p.x + p.w > this.x && p.y < this.y + this.h && p.y + p.h > this.y) {
      const dir = p.x < this.x ? -1 : 1;
      p.takeDamage(this.dmgTouch, dir * 140, -120, 'enemy:slime', ctx);
    }
  }

  kill(source) {
    super.kill(source);
    this.vy = -80;
  }

  render(ctx, camX, camY) {
    const hurtFlash = this.flash > 0 && (Math.floor(this.flash * 30) & 1) === 0;
    const sprite = getSlimeSprite(this.palette, hurtFlash);
    const sx = (this.x - camX) | 0;
    const sy = (this.y - camY) | 0;
    if (this.dead) {
      ctx.globalAlpha = Math.max(0, 1 - (this.invuln < 0 ? 1 : 0));
    }
    ctx.drawImage(sprite, sx, sy);
    ctx.globalAlpha = 1;
    drawHpBar(ctx, this, camX, camY);
  }
}

// ============== FlyingEye（飞行远程） ==============
export class FlyingEye extends Entity {
  constructor(x, y, palette = palettes.lava) {
    super(x, y, 8, 12);
    this.hp = 2;
    this.maxHp = 2;
    this.dmgTouch = 1;
    this.team = 'enemy';
    this.palette = palette;
    this.gravityScale = 0;
    this.t = 0;
    this.attackCd = 1.5 + Math.random();
    this.telegraph = 0;
    this.targetX = x;
    this.targetY = y;
    this.kind = 'eye';
    this.givesFragments = 6;
  }

  update(dt, ctx) {
    super.update(dt, ctx);
    if (this.dead) {
      this.vx = approach(this.vx, 0, 200 * dt);
      this.vy += 600 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return;
    }

    this.t += dt;
    const p = ctx.player;
    if (!p) return;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    // 悬浮于玩家斜上方
    this.targetX = p.x - 20 * sign(dx);
    this.targetY = p.y - 50;
    const tx = approach(this.x, this.targetX, 60 * dt);
    const ty = approach(this.y, this.targetY, 50 * dt);
    this.x = tx + Math.sin(this.t * 4) * 0.5;
    this.y = ty + Math.cos(this.t * 3) * 1.5;
    this.facing = sign(dx) || this.facing;

    if (this.knockbackVx !== 0) {
      this.x += this.knockbackVx * dt;
      this.knockbackVx = approach(this.knockbackVx, 0, 1500 * dt);
    }

    // 攻击：先 telegraph 后开火
    this.attackCd -= dt;
    if (this.attackCd <= 0 && this.telegraph <= 0) {
      this.telegraph = 0.45;
    }
    if (this.telegraph > 0) {
      this.telegraph -= dt;
      if (this.telegraph <= 0) {
        // 开火
        const sx = this.centerX(), sy = this.centerY();
        const px = ctx.player.centerX(), py = ctx.player.centerY();
        const a = Math.atan2(py - sy, px - sx);
        const sp = 110;
        ctx.spawnEnemyProjectile(sx, sy, Math.cos(a) * sp, Math.sin(a) * sp, { dmg: 1, kind: 'bullet' });
        this.attackCd = 1.6 + Math.random() * 0.6;
      }
    }

    // 接触
    if (p.x < this.x + this.w && p.x + p.w > this.x && p.y < this.y + this.h && p.y + p.h > this.y) {
      const dir = p.x < this.x ? -1 : 1;
      p.takeDamage(this.dmgTouch, dir * 140, -100, 'enemy:eye', ctx);
    }
  }

  render(ctx, camX, camY) {
    const sprite = getEyeSprite(this.palette);
    const sx = (this.x - camX) | 0;
    const sy = (this.y - camY) | 0;
    // telegraph 红圈
    if (this.telegraph > 0) {
      const r = 6 + (1 - this.telegraph / 0.45) * 4;
      ctx.strokeStyle = `rgba(255,80,90,${0.7})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.centerX() - camX, this.centerY() - camY, r, 0, Math.PI * 2);
      ctx.stroke();
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
    drawHpBar(ctx, this, camX, camY);
  }
}

// ============== Knight（重甲近战） ==============
export class Knight extends Entity {
  constructor(x, y, palette = palettes.temple) {
    super(x, y, 14, 16);
    this.hp = 7;
    this.maxHp = 7;
    this.dmgTouch = 0;
    this.dmgAttack = 2;
    this.team = 'enemy';
    this.palette = palette;
    this.facing = -1;
    this.aiState = 'patrol';
    this.aiTime = 0;
    this.attackCd = 1.0;
    this.telegraph = 0;
    this.attackPhase = 0;
    this.kind = 'knight';
    this.givesFragments = 14;
  }

  update(dt, ctx) {
    super.update(dt, ctx);
    if (this.dead) {
      this.vx = approach(this.vx, 0, 800 * dt);
      applyPhysics(this, dt, ctx.room);
      return;
    }
    this.aiTime += dt;
    const p = ctx.player;
    if (!p) return;
    const dx = p.x - this.x;
    const adx = Math.abs(dx);
    const ady = Math.abs(p.y - this.y);

    if (this.knockbackVx !== 0) {
      this.vx = this.knockbackVx;
      this.knockbackVx = approach(this.knockbackVx, 0, 1500 * dt);
    } else {
      // 视野内追击
      if (adx < 90 && ady < 30) {
        const dir = sign(dx);
        if (adx > 22) {
          this.vx = approach(this.vx, dir * 50, 400 * dt);
          this.facing = dir;
        } else {
          // 攻击范围内
          this.vx = approach(this.vx, 0, 600 * dt);
          this.attackCd -= dt;
          if (this.attackCd <= 0 && this.telegraph <= 0 && this.attackPhase === 0) {
            this.telegraph = 0.45;
          }
        }
      } else {
        // 巡逻
        this.vx = approach(this.vx, this.facing * 25, 200 * dt);
      }
    }

    if (this.telegraph > 0) {
      this.telegraph -= dt;
      if (this.telegraph <= 0) {
        // 出手
        this.attackPhase = 0.25;
      }
    }

    if (this.attackPhase > 0) {
      this.attackPhase -= dt;
      // 攻击窗口在这区间内
      if (this.attackPhase > 0.10 && this.attackPhase < 0.20) {
        // 命中检测
        const reach = 18;
        const hx = this.facing > 0 ? this.x + this.w : this.x - reach;
        const hw = reach;
        if (p.x < hx + hw && p.x + p.w > hx && Math.abs(p.y - this.y) < 16) {
          p.takeDamage(this.dmgAttack, this.facing * 180, -120, 'enemy:knight', ctx);
        }
      }
      if (this.attackPhase <= 0) {
        this.attackCd = 1.4 + Math.random() * 0.5;
      }
    }

    applyPhysics(this, dt, ctx.room);
    if (this.againstWall !== 0) this.facing = -this.facing;
  }

  render(ctx, camX, camY) {
    const sprite = getKnightSprite(this.palette);
    const sx = (this.x - camX) | 0;
    const sy = (this.y - camY) | 0;
    if (this.telegraph > 0) {
      // 红光预警
      const a = 0.5 + (1 - this.telegraph / 0.45) * 0.4;
      ctx.fillStyle = `rgba(255,60,60,${a * 0.4})`;
      const reach = 18;
      const hx = this.facing > 0 ? this.x + this.w : this.x - reach;
      ctx.fillRect(hx - camX, this.y - camY, reach, this.h);
    }
    if (this.attackPhase > 0) {
      const reach = 18;
      const hx = this.facing > 0 ? this.x + this.w : this.x - reach;
      ctx.fillStyle = `rgba(255,160,160,0.7)`;
      ctx.fillRect(hx - camX, this.y - camY + 2, reach, this.h - 4);
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
    drawHpBar(ctx, this, camX, camY);
  }
}

// 通用 HP 条
export function drawHpBar(ctx, ent, camX, camY) {
  if (ent.hp >= ent.maxHp || ent.dead) return;
  const w = Math.max(8, ent.w);
  const x = (ent.x + ent.w / 2 - w / 2 - camX) | 0;
  const y = (ent.y - 4 - camY) | 0;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x, y, w, 2);
  const ratio = Math.max(0, ent.hp / ent.maxHp);
  ctx.fillStyle = '#cf6877';
  ctx.fillRect(x, y, Math.ceil(w * ratio), 2);
}

// 工厂
export function makeEnemy(type, x, y, palette) {
  if (type === 'slime') return new Slime(x, y, palette);
  if (type === 'eye') return new FlyingEye(x, y, palette);
  if (type === 'knight') return new Knight(x, y, palette);
  return null;
}
