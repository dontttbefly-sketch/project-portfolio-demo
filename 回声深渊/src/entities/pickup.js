// 拾取物：碎片 / 治疗瓶 / 能力升级 / 篝火
import { Entity } from './entity.js';
import { applyPhysics } from '../physics.js';
import { getFlaskSprite, getFragmentSprite, getBonfireSprite } from '../art/pixelart.js';
import { palettes, withAlpha } from '../art/palette.js';

export class Fragment extends Entity {
  constructor(x, y, value = 1) {
    super(x, y, 4, 4);
    this.value = value;
    this.team = 'pickup';
    this.t = Math.random() * 6.28;
    this.gravityScale = 0.5;
    this.collected = false;
    // 给一个随机弹起初速度
    this.vx = (Math.random() - 0.5) * 80;
    this.vy = -80 - Math.random() * 60;
  }

  update(dt, ctx) {
    super.update(dt, ctx);
    this.t += dt;
    applyPhysics(this, dt, ctx.room);
    this.vx *= 1 - dt * 4;
    const p = ctx.player;
    if (p && !p.dead) {
      const dx = p.centerX() - this.centerX();
      const dy = p.centerY() - this.centerY();
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 22) {
        // 吸附
        this.x += (dx / d) * 220 * dt;
        this.y += (dy / d) * 220 * dt;
      }
      if (d < 6) {
        p.fragments += this.value;
        p.syncPersist();
        this.removeMe = true;
        ctx.particles.burst(this.centerX(), this.centerY(), 5, {
          color: '#fde9a8', speedMin: 20, speedMax: 60, life: 0.25
        });
      }
    }
  }

  render(ctx, camX, camY) {
    const sprite = getFragmentSprite(palettes.lava);
    const sx = (this.x - camX) | 0;
    const sy = (this.y - camY + Math.sin(this.t * 4)) | 0;
    ctx.drawImage(sprite, sx, sy);
  }
}

export class FlaskPickup extends Entity {
  constructor(x, y) {
    super(x, y, 5, 6);
    this.team = 'pickup';
    this.gravityScale = 0;
    this.t = Math.random() * 6.28;
  }

  update(dt, ctx) {
    super.update(dt, ctx);
    this.t += dt;
    const p = ctx.player;
    if (p && !p.dead) {
      if (p.x < this.x + this.w && p.x + p.w > this.x && p.y < this.y + this.h && p.y + p.h > this.y) {
        if (p.flasks < p.maxFlasks) {
          p.flasks++;
          p.syncPersist();
          this.removeMe = true;
          ctx.particles.burst(this.centerX(), this.centerY(), 12, {
            color: '#cf6877', speedMin: 40, speedMax: 100, life: 0.4
          });
          ctx.showToast('治疗瓶 +1', 1.5);
        }
      }
    }
  }

  render(ctx, camX, camY) {
    const sprite = getFlaskSprite(palettes.player);
    const sx = (this.x - camX) | 0;
    const sy = (this.y - camY + Math.sin(this.t * 2.5)) | 0;
    ctx.drawImage(sprite, sx, sy);
  }
}

// 篝火：检查点 + 满状态 + 重生敌人
export class Bonfire extends Entity {
  constructor(x, y, roomId) {
    super(x, y, 9, 10);
    this.team = 'neutral';
    this.gravityScale = 0;
    this.roomId = roomId;
    this.t = 0;
    this.lit = false;
  }

  interact(player, ctx) {
    this.lit = true;
    player.hp = player.maxHp;
    player.stamina = player.maxStamina;
    player.mana = player.maxMana;
    player.flasks = player.maxFlasks;
    player.syncPersist();
    ctx.world.persist.bonfireRoom = this.roomId;
    ctx.world.persist.bonfireSpawn = { x: this.x, y: this.y };
    ctx.world.respawnAllEnemies();
    ctx.showToast('篝火点亮 — 已休息，敌人再生', 2.0);
    ctx.particles.burst(this.centerX(), this.centerY() - 4, 20, {
      color: '#ed8030', speedMin: 30, speedMax: 80, life: 0.6
    });
    ctx.world.save();
  }

  update(dt, ctx) {
    super.update(dt, ctx);
    this.t += dt;
    if (Math.random() < 0.2) {
      ctx.particles.spawn({
        x: this.centerX() + (Math.random() - 0.5) * 4,
        y: this.y + 2,
        vx: 0, vy: -20 - Math.random() * 25,
        life: 0.5 + Math.random() * 0.4,
        size: 1 + Math.random() * 1.5,
        color: Math.random() < 0.5 ? '#ed8030' : '#fde9a8',
        shrink: true
      });
    }
  }

  render(ctx, camX, camY) {
    const sprite = getBonfireSprite(palettes.lava);
    const sx = (this.x - camX) | 0;
    const sy = (this.y - camY) | 0;
    ctx.drawImage(sprite, sx, sy);
    ctx.fillStyle = withAlpha('#ed8030', 0.18 + Math.sin(this.t * 3) * 0.06);
    ctx.beginPath();
    ctx.arc(this.centerX() - camX, this.centerY() - camY, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 能力升级祭坛
export class AbilityShrine extends Entity {
  constructor(x, y, ability, id) {
    super(x, y, 10, 14);
    this.team = 'neutral';
    this.gravityScale = 0;
    this.ability = ability; // 'doubleJump' | 'wallClimb' | 'downStrike'
    this.id = id;
    this.t = 0;
    this.consumed = false;
  }

  interact(player, ctx) {
    if (this.consumed) return;
    if (this.ability === 'doubleJump') {
      ctx.world.persist.unlockedDoubleJump = true;
      ctx.showToast('习得 — 二段跳', 2.5);
    } else if (this.ability === 'dash') {
      ctx.world.persist.unlockedDash = true;
      ctx.showToast('习得 — 冲刺', 2.5);
    } else if (this.ability === 'wallClimb') {
      ctx.world.persist.unlockedWallClimb = true;
      ctx.showToast('习得 — 抓墙跳', 2.5);
    } else if (this.ability === 'downStrike') {
      ctx.world.persist.unlockedDownStrike = true;
      ctx.showToast('习得 — 下劈破墙', 2.5);
    } else if (this.ability === 'maxHp') {
      ctx.world.persist.maxHp += 1;
      player.maxHp += 1;
      player.hp += 1;
      ctx.showToast('生命上限 +1', 2.5);
    } else if (this.ability === 'flask') {
      ctx.world.persist.maxFlasks += 1;
      player.maxFlasks += 1;
      player.flasks += 1;
      ctx.showToast('治疗瓶上限 +1', 2.5);
    }
    this.consumed = true;
    ctx.world.persist.pickedUps.push(this.id);
    ctx.world.save();
    ctx.particles.burst(this.centerX(), this.centerY(), 30, {
      color: '#cba0d6', speedMin: 40, speedMax: 130, life: 0.7
    });
    ctx.cam.shake(4, 0.4);
  }

  update(dt, ctx) {
    super.update(dt, ctx);
    this.t += dt;
    if (!this.consumed && Math.random() < 0.1) {
      ctx.particles.spawn({
        x: this.centerX() + (Math.random() - 0.5) * 8,
        y: this.y + 8 + Math.random() * 6,
        vx: 0, vy: -15,
        life: 0.6, size: 1, color: '#cba0d6', shrink: true
      });
    }
  }

  render(ctx, camX, camY) {
    const sx = (this.x - camX) | 0;
    const sy = (this.y - camY) | 0;
    if (this.consumed) {
      ctx.fillStyle = withAlpha('#3d2c40', 0.6);
      ctx.fillRect(sx, sy, this.w, this.h);
    } else {
      // 简易程序化渲染：神秘水晶
      const t = this.t;
      ctx.fillStyle = '#1d1018';
      ctx.fillRect(sx, sy + this.h - 4, this.w, 4);
      ctx.fillStyle = withAlpha('#cba0d6', 0.5 + Math.sin(t * 3) * 0.3);
      ctx.beginPath();
      ctx.moveTo(sx + this.w / 2, sy);
      ctx.lineTo(sx + this.w, sy + this.h - 4);
      ctx.lineTo(sx, sy + this.h - 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#e6e8f5';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(t * 4) * 0.3})`;
      ctx.fillRect(sx + this.w / 2 - 1, sy + 3, 2, 2);
    }
  }
}
