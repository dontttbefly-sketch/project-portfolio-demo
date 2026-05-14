// ⭐ 核心创意：回声系统
// 回声 = 玩家死亡时留下的幽灵。每个回声跨周目持久化（localStorage）。
// 玩家可以选择 4 种互动：倾听 / 吸收 / 召唤 / 渡桥

import { Entity } from './entity.js';
import { applyPhysics } from '../physics.js';
import { Input } from '../input.js';
import { getPlayerSprite } from '../art/pixelart.js';
import { palettes, withAlpha } from '../art/palette.js';
import { ECHO } from '../config.js';
import { uuid, dist2, approach, sign } from '../util.js';
import { TILES } from '../world/tile.js';

export const DEATH_CAUSE_TEXT = {
  spike: '我是被尖刺刺穿的…',
  lava: '熔岩吞没了我…',
  fall: '我从虚空中坠落…',
  'enemy:slime': '一只史莱姆吞噬了我…',
  'enemy:eye': '虚空之眼的视线刺穿了我…',
  'enemy:knight': '腐朽的守卫将我斩落…',
  'enemy:bullet': '不知从何而来的弹幕…',
  'enemy:boss': '深渊之王没有怜悯…',
  unknown: '我已不记得是怎么死的了…',
  hazard: '深渊本身在吞噬我…'
};

export const RESIST_OF = {
  spike: 'spike_resist',
  lava: 'lava_resist',
  'enemy:slime': 'enemy:slime_resist',
  'enemy:eye': 'enemy:eye_resist',
  'enemy:knight': 'enemy:knight_resist',
  'enemy:boss': 'enemy:boss_resist',
  fall: null,
  unknown: null,
  hazard: null
};

const BUFF_TEXT = {
  spike_resist: '尖刺抗性 +50%',
  lava_resist: '熔岩抗性 +50%',
  'enemy:slime_resist': '史莱姆抗性 +50%',
  'enemy:eye_resist': '眼怪抗性 +50%',
  'enemy:knight_resist': '守卫抗性 +50%',
  'enemy:boss_resist': '深渊王抗性 +50%'
};

// ============== Echo 实体（幽灵静止体） ==============
export class Echo extends Entity {
  constructor(data) {
    super(data.x, data.y, 9, 14);
    this.team = 'echo';
    this.gravityScale = 0;
    this.data = data;          // {id, roomId, x, y, deathCause, palette, timestamp, corrupted, fragments}
    this.id = data.id;
    this.bobT = Math.random() * 6.28;
    this.alpha = 0.55;
    this.alive = true;
    this.communeBy = null;     // 是否正被某个玩家"对话"中
    this.platformActive = false;
    this.platformT = 0;
  }

  get roomId() { return this.data.roomId; }

  update(dt, ctx) {
    super.update(dt, ctx);
    this.bobT += dt;
    // 漂浮
    this.y = this.data.y + Math.sin(this.bobT * 1.5) * 1.2;

    // 渡桥：站到回声上时变成实体平台
    const p = ctx.player;
    if (p && !p.dead) {
      const above = (p.y + p.h <= this.y + 2)
                 && (p.x + p.w > this.x - 2)
                 && (p.x < this.x + this.w + 2)
                 && (p.vy >= 0);
      if (above && this.platformActive) {
        // 把玩家顶到上方
        const platTop = this.data.y - 1;
        if (p.y + p.h > platTop && p.y + p.h < platTop + 4) {
          p.y = platTop - p.h;
          p.vy = 0;
          p.onGround = true;
        }
      }
    }

    // 偶尔散发幽灵粒子
    if (Math.random() < 0.04) {
      ctx.particles.spawn({
        x: this.centerX() + (Math.random() - 0.5) * 6,
        y: this.centerY() + (Math.random() - 0.5) * 8,
        vx: 0, vy: -8,
        life: 0.6, size: 1, color: this.data.corrupted ? '#cf6877' : '#a47bb1',
        shrink: true
      });
    }
  }

  // 玩家按 E 时被调用
  interact(player, ctx) {
    ctx.openEchoDialog(this);
  }

  // 4 种互动结算
  resolveListen(ctx) {
    const text = DEATH_CAUSE_TEXT[this.data.deathCause] || DEATH_CAUSE_TEXT.unknown;
    ctx.showToast(text, 2.5);
    this.data.lastVisit = Date.now();
    ctx.world.persist.lastVisited = ctx.world.persist.lastVisited || {};
    ctx.world.persist.lastVisited[this.data.roomId] = Date.now();
    // 高亮：在屏幕短暂显示该房间所有 hazard
    ctx.flashHazards(2.5);
  }

  resolveAbsorb(ctx) {
    const buff = RESIST_OF[this.data.deathCause];
    if (buff) {
      ctx.player.absorbedBuffs.push({ type: buff, time: 90 });
      ctx.showToast('已吸收：' + (BUFF_TEXT[buff] || buff), 2.0);
    } else {
      // 没有抗性则给一点 max stamina 临时 + 治疗
      ctx.player.hp = Math.min(ctx.player.maxHp, ctx.player.hp + 1);
      ctx.showToast('回声治愈了你（+1 HP）', 2.0);
    }
    ctx.particles.burst(this.centerX(), this.centerY(), 24, {
      color: '#cba0d6', speedMin: 30, speedMax: 90, life: 0.6, shrink: true
    });
    this.consume(ctx);
  }

  resolveSummon(ctx) {
    if (ctx.player.summonedGhost && ctx.player.summonedGhost.alive) {
      ctx.showToast('已有一个幽灵在战斗中', 1.4);
      return;
    }
    const ghost = new GhostAlly(this.data.x, this.data.y, this.data, ctx);
    ctx.entities.push(ghost);
    ctx.player.summonedGhost = ghost;
    ctx.showToast('回声化为幽灵，与你并肩作战 (15s)', 2.0);
    ctx.particles.burst(this.centerX(), this.centerY(), 16, {
      color: '#a47bb1', speedMin: 40, speedMax: 100, life: 0.5, shrink: true
    });
    // 暂时隐藏：从场上移除，但 data 仍保留
    this.alive = false;
    this.removeMe = true;
    this.data.summoning = true;
    ctx.world.save();
  }

  resolveCommune(ctx) {
    // 启动渡桥：玩家进入 COMMUNE 状态 ECHO.COMMUNE_TIME 秒
    ctx.player.commune = this;
    ctx.player.communeTimer = 0;
    ctx.player.setState('commune');
    this.communeBy = ctx.player;
  }

  // 渡桥成功后调用 → 变成可踩平台
  activateBridge(ctx) {
    this.platformActive = true;
    this.platformT = 0;
    ctx.showToast('回声化为桥梁', 1.6);
    // 离开当前房间时自动消失（由 world 管理）
  }

  consume(ctx) {
    this.alive = false;
    this.removeMe = true;
    ctx.world.removeEcho(this);
  }

  render(ctx, camX, camY) {
    if (!this.alive) return;
    const sprite = getPlayerSprite('idle', (this.bobT * 0.6) | 0, palettes.player, this.data.corrupted ? 0.65 : 0.45);
    const sx = (this.x - camX - 1) | 0;
    const sy = (this.y - camY) | 0;
    ctx.save();
    if (this.data.corrupted) {
      ctx.globalCompositeOperation = 'lighter';
    }
    ctx.drawImage(sprite, sx, sy);
    ctx.restore();
    // 标记
    if (this.platformActive) {
      ctx.fillStyle = withAlpha('#cba0d6', 0.7);
      ctx.fillRect((this.x - camX) | 0, ((this.data.y - 1) - camY) | 0, this.w, 1);
    }
  }
}

// ============== 召唤的幽灵盟友（限时） ==============
export class GhostAlly extends Entity {
  constructor(x, y, echoData, ctx) {
    super(x, y, 9, 14);
    this.team = 'player';
    this.echoData = echoData;
    this.duration = ECHO.GHOST_DURATION;
    this.dmg = 1;
    this.hp = 3;
    this.maxHp = 3;
    this.attackCd = 0.4;
    this.facing = 1;
    this.gravityScale = 0;
    this.t = 0;
  }

  update(dt, ctx) {
    super.update(dt, ctx);
    this.duration -= dt;
    this.t += dt;
    if (this.duration <= 0 || this.hp <= 0) {
      this.alive = false;
      this.removeMe = true;
      if (this.hp <= 0) {
        // 战斗中阵亡 → 回声永久消失
        ctx.world.removeEcho({ id: this.echoData.id });
        ctx.showToast('幽灵殒灭，回声消散…', 2);
      } else {
        // 时间到 → 把回声放回原处（重新进入房间时可见）
        this.echoData.summoning = false;
        ctx.world.save();
      }
      if (ctx.player) ctx.player.summonedGhost = null;
      ctx.particles.burst(this.centerX(), this.centerY(), 16, {
        color: '#a47bb1', speedMin: 30, speedMax: 90, life: 0.5
      });
      return;
    }
    // 寻找最近敌人
    let target = null, bestDist = Infinity;
    for (const e of ctx.enemies) {
      if (!e.alive) continue;
      const d = dist2(this.x, this.y, e.x, e.y);
      if (d < bestDist) { bestDist = d; target = e; }
    }
    if (target) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.sqrt(bestDist);
      this.facing = sign(dx) || this.facing;
      const sp = 90;
      this.x += (dx / dist) * sp * dt;
      this.y += (dy / dist) * sp * dt;
      // 攻击
      this.attackCd -= dt;
      if (dist < 14 && this.attackCd <= 0) {
        target.hurt(this.dmg, this.facing * 100, -50, this);
        ctx.particles.burst(target.centerX(), target.centerY(), 8, {
          color: '#a47bb1', speedMin: 30, speedMax: 80, life: 0.3
        });
        this.attackCd = 0.55;
      }
    } else {
      // 跟随玩家
      const p = ctx.player;
      if (p) {
        const dx = p.x - this.x - 14 * p.facing;
        const dy = p.y - this.y - 8;
        this.x += dx * 3 * dt;
        this.y += dy * 3 * dt + Math.sin(this.t * 3) * 0.4;
      }
    }
  }

  hurt(dmg) {
    this.hp -= dmg;
    this.flash = 0.18;
  }

  render(ctx, camX, camY) {
    const sprite = getPlayerSprite(this.duration < 3 && (Math.floor(this.t * 8) & 1) ? 'hurt' : 'idle',
                                   (this.t * 2) | 0, palettes.player, 0.55);
    const sx = (this.x - camX - 1) | 0;
    const sy = (this.y - camY) | 0;
    ctx.save();
    if (this.facing < 0) {
      ctx.translate(sx + sprite.width, sy);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, 0, 0);
    } else {
      ctx.drawImage(sprite, sx, sy);
    }
    ctx.restore();
    // 倒计时光环
    const alpha = Math.min(1, this.duration / 5);
    ctx.strokeStyle = `rgba(164,123,177,${alpha})`;
    ctx.beginPath();
    ctx.arc(this.centerX() - camX, this.centerY() - camY, 9, 0, Math.PI * 2 * (this.duration / ECHO.GHOST_DURATION));
    ctx.stroke();
  }
}

// 创建一个新的回声数据（玩家死亡时）
export function spawnEchoData(player, room) {
  return {
    id: uuid(),
    roomId: room.id,
    x: player.x,
    y: player.y,
    deathCause: player.deathCause || 'unknown',
    timestamp: Date.now(),
    corrupted: false,
    fragments: player.fragments,
    summoning: false,
    lastVisit: Date.now()
  };
}
