// 玩家：状态机 + 输入响应 + 动画 + 战斗
import { Entity } from './entity.js';
import { Input } from '../input.js';
import { PLAYER, SHAKE } from '../config.js';
import { applyPhysics } from '../physics.js';
import { getPlayerSprite, getSlashSprite, fillRect } from '../art/pixelart.js';
import { palettes } from '../art/palette.js';
import { approach, sign, clamp } from '../util.js';
import { TILES } from '../world/tile.js';
import { meleeHitbox, meleeTileTargets, overlaps } from './melee.js';

export const PlayerState = {
  IDLE: 'idle',
  WALK: 'walk',
  JUMP: 'jump',
  FALL: 'fall',
  ATTACK: 'attack',
  HEAVY_CHARGE: 'heavyCharge',
  HEAVY_RELEASE: 'heavyRelease',
  RANGED: 'ranged',
  DASH: 'dash',
  PARRY: 'parry',
  HURT: 'hurt',
  DEAD: 'dead',
  HEAL: 'heal',
  WALL_SLIDE: 'wallSlide',
  COMMUNE: 'commune' // 与回声对话中
};

export class Player extends Entity {
  constructor(x, y, world) {
    super(x, y, PLAYER.W, PLAYER.H);
    this.world = world;
    this.team = 'player';
    this.isPlayer = true;
    this.hp = world.persist.maxHp;
    this.maxHp = world.persist.maxHp;
    this.mana = PLAYER.MANA_MAX;
    this.maxMana = PLAYER.MANA_MAX;
    this.stamina = PLAYER.STAMINA_MAX;
    this.maxStamina = PLAYER.STAMINA_MAX;
    this.flasks = world.persist.flasks;
    this.maxFlasks = world.persist.maxFlasks;
    this.fragments = world.persist.fragments;
    this.state = PlayerState.IDLE;
    this.stateTime = 0;
    this.animFrame = 0;
    this.animTime = 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.dashTime = 0;
    this.dashCooldown = 0;
    this.dashIframe = 0;
    this.attackChain = 0;       // 0..2 第几连击
    this.attackChainTimer = 0;
    this.attackHitDone = false;
    this.heavyCharged = 0;
    this.parryTimer = 0;
    this.healTimer = 0;
    this.lastDamageSource = null;
    this.deathCause = null;
    this.summonedGhost = null;
    this.absorbedBuffs = [];     // {type, time}
    this.commune = null;          // 当前正在对话的回声
    this.communeTimer = 0;
    this.platformEcho = null;    // 站在它上面变实体
    this.respawning = false;
    this.heavyCharging = false;
  }

  setState(s) {
    if (this.state === s) return;
    this.state = s;
    this.stateTime = 0;
    this.animTime = 0;
    this.animFrame = 0;
  }

  // 基于状态返回 sprite frame 数与速度
  animInfo() {
    switch (this.state) {
      case PlayerState.WALK: return { frames: 4, speed: 0.10 };
      case PlayerState.IDLE: return { frames: 2, speed: 0.50 };
      case PlayerState.JUMP: return { frames: 1, speed: 1 };
      case PlayerState.FALL: return { frames: 1, speed: 1 };
      case PlayerState.ATTACK: return { frames: 1, speed: 1 };
      case PlayerState.HEAVY_RELEASE: return { frames: 1, speed: 1 };
      case PlayerState.RANGED: return { frames: 1, speed: 1 };
      case PlayerState.DASH: return { frames: 1, speed: 1 };
      case PlayerState.PARRY: return { frames: 1, speed: 1 };
      case PlayerState.HURT: return { frames: 1, speed: 1 };
      case PlayerState.DEAD: return { frames: 1, speed: 1 };
      case PlayerState.HEAL: return { frames: 2, speed: 0.25 };
      case PlayerState.WALL_SLIDE: return { frames: 1, speed: 1 };
      case PlayerState.COMMUNE: return { frames: 2, speed: 0.5 };
      case PlayerState.HEAVY_CHARGE: return { frames: 2, speed: 0.20 };
    }
    return { frames: 1, speed: 1 };
  }

  spriteState() {
    switch (this.state) {
      case PlayerState.ATTACK:
        return ['attack1', 'attack2', 'attack3'][this.attackChain] || 'attack1';
      case PlayerState.HEAVY_RELEASE: return 'attack3';
      case PlayerState.RANGED: return 'attack2';
      case PlayerState.HEAVY_CHARGE: return 'idle';
      case PlayerState.HEAL: return 'idle';
      case PlayerState.DEAD: return 'dead';
      case PlayerState.HURT: return 'hurt';
      case PlayerState.WALK: return 'walk';
      case PlayerState.JUMP: return 'jump';
      case PlayerState.FALL: return 'fall';
      case PlayerState.WALL_SLIDE: return 'jump';
      case PlayerState.DASH: return 'attack2';
      case PlayerState.PARRY: return 'attack1';
      case PlayerState.COMMUNE: return 'idle';
      default: return 'idle';
    }
  }

  // 玩家可控的状态
  canControl() {
    return this.state !== PlayerState.HURT
      && this.state !== PlayerState.DEAD
      && this.state !== PlayerState.HEAL
      && this.state !== PlayerState.COMMUNE
      && this.state !== PlayerState.DASH
      && this.state !== PlayerState.RANGED;
  }

  canAct() {
    return this.state === PlayerState.IDLE
      || this.state === PlayerState.WALK
      || this.state === PlayerState.JUMP
      || this.state === PlayerState.FALL
      || this.state === PlayerState.WALL_SLIDE;
  }

  update(dt, ctx) {
    super.update(dt, ctx);
    this.stateTime += dt;
    this.animTime += dt;
    this.attackChainTimer = Math.max(0, this.attackChainTimer - dt);
    if (this.attackChainTimer === 0) this.attackChain = 0;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.dashIframe > 0) this.dashIframe -= dt;
    this.coyote = Math.max(0, this.coyote - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (this.parryTimer > 0) this.parryTimer -= dt;

    // 动画帧
    const info = this.animInfo();
    while (this.animTime >= info.speed) {
      this.animTime -= info.speed;
      this.animFrame = (this.animFrame + 1) % info.frames;
    }

    // buff 倒计时
    for (let i = this.absorbedBuffs.length - 1; i >= 0; i--) {
      this.absorbedBuffs[i].time -= dt;
      if (this.absorbedBuffs[i].time <= 0) this.absorbedBuffs.splice(i, 1);
    }

    // stamina/mana 自动恢复
    if (this.canAct()) {
      this.stamina = Math.min(this.maxStamina, this.stamina + PLAYER.STAMINA_REGEN * dt);
    }
    this.mana = Math.min(this.maxMana, this.mana + PLAYER.MANA_REGEN * dt);

    // 死亡处理
    if (this.state === PlayerState.DEAD) {
      this.vx = approach(this.vx, 0, 600 * dt);
      applyPhysics(this, dt, ctx.room);
      if (this.stateTime > 1.6 && !this.respawning) {
        this.respawning = true;
        ctx.onPlayerDeath(this.deathCause || 'unknown');
      }
      return;
    }

    // 治疗状态
    if (this.state === PlayerState.HEAL) {
      this.vx = approach(this.vx, 0, 800 * dt);
      this.healTimer -= dt;
      if (this.healTimer <= 0) {
        this.hp = Math.min(this.maxHp, this.hp + PLAYER.HEAL_AMOUNT);
        this.flasks -= 1;
        this.world.persist.flasks = this.flasks;
        this.setState(PlayerState.IDLE);
      }
      applyPhysics(this, dt, ctx.room);
      return;
    }

    // 受伤硬直
    if (this.state === PlayerState.HURT) {
      if (this.stateTime > 0.18) {
        this.setState(PlayerState.IDLE);
      } else {
        this.vx = approach(this.vx, 0, 800 * dt);
      }
      applyPhysics(this, dt, ctx.room);
      return;
    }

    // 与回声对话
    if (this.state === PlayerState.COMMUNE) {
      this.vx = 0;
      this.communeTimer += dt;
      applyPhysics(this, dt, ctx.room);
      // 中断检测
      const interactHeld = Input.held('interact') || Input.held('jump');
      if (!interactHeld) {
        // 释放 → 中断对话
        this.setState(PlayerState.IDLE);
        if (this.commune) this.commune.communeBy = null;
        this.commune = null;
        this.communeTimer = 0;
      }
      return;
    }

    // 冲刺
    if (this.state === PlayerState.DASH) {
      this.vy = 0;
      this.dashTime -= dt;
      if (this.dashTime <= 0) {
        this.setState(this.onGround ? PlayerState.IDLE : PlayerState.FALL);
      }
      applyPhysics(this, dt, ctx.room);
      // 冲刺粒子
      if (Math.random() < 0.6) {
        ctx.particles.spawn({
          x: this.centerX(), y: this.centerY() + 2,
          vx: -this.facing * 30 * Math.random(),
          vy: -10 - Math.random() * 20,
          life: 0.25,
          size: 1 + Math.random() * 1.5,
          color: '#cba0d6',
          shrink: true
        });
      }
      this.checkHazard(ctx);
      return;
    }

    // 远程后摇
    if (this.state === PlayerState.RANGED) {
      this.vx = approach(this.vx, 0, 600 * dt);
      if (this.stateTime > 0.22) this.setState(PlayerState.IDLE);
      applyPhysics(this, dt, ctx.room);
      return;
    }

    // 攻击中
    if (this.state === PlayerState.ATTACK) {
      this.vx = approach(this.vx, 0, 1100 * dt);
      if (!this.attackHitDone && this.stateTime > 0.04) {
        this.attackHitDone = true;
        this.doMeleeHit(ctx, false);
      }
      // 在攻击中再次按 J → 队列一次连击
      if (Input.pressed('attack')) this.queuedAttack = true;
      if (this.stateTime > PLAYER.ATTACK_TIME) {
        if (this.queuedAttack && this.stamina >= PLAYER.ATTACK_COST) {
          // 连击下一段
          this.queuedAttack = false;
          this.attackHitDone = false;
          this.stamina -= PLAYER.ATTACK_COST;
          this.attackChain = (this.attackChain + 1) % 3;
          this.setState(PlayerState.ATTACK);
          this.attackChainTimer = PLAYER.COMBO_WINDOW;
        } else if (Input.held('attack')
                   && Input.heldTime('attack') > PLAYER.ATTACK_TIME
                   && this.stamina >= PLAYER.HEAVY_COST) {
          // 一直按住未松开 → 蓄力
          this.setState(PlayerState.HEAVY_CHARGE);
          this.heavyCharged = 0;
        } else {
          this.setState(PlayerState.IDLE);
        }
      }
      applyPhysics(this, dt, ctx.room);
      return;
    }

    // 重斩蓄力
    if (this.state === PlayerState.HEAVY_CHARGE) {
      this.vx = approach(this.vx, 0, 800 * dt);
      this.heavyCharged = Math.min(PLAYER.HEAVY_CHARGE, this.heavyCharged + dt);
      const stillHolding = Input.held('attack');
      if (!stillHolding) {
        // 释放
        if (this.heavyCharged >= PLAYER.HEAVY_CHARGE && this.stamina >= PLAYER.HEAVY_COST) {
          this.stamina -= PLAYER.HEAVY_COST;
          this.setState(PlayerState.HEAVY_RELEASE);
          this.attackHitDone = false;
          ctx.cam.shake(SHAKE.HEAVY, 0.18);
        } else {
          this.setState(PlayerState.IDLE);
        }
        this.heavyCharged = 0;
      }
      applyPhysics(this, dt, ctx.room);
      return;
    }
    if (this.state === PlayerState.HEAVY_RELEASE) {
      this.vx = approach(this.vx, this.facing * 60, 600 * dt);
      if (!this.attackHitDone && this.stateTime > 0.06) {
        this.attackHitDone = true;
        this.doMeleeHit(ctx, true);
      }
      if (this.stateTime > 0.32) this.setState(PlayerState.IDLE);
      applyPhysics(this, dt, ctx.room);
      return;
    }

    // 格挡
    if (this.state === PlayerState.PARRY) {
      this.vx = approach(this.vx, 0, 800 * dt);
      if (this.stateTime > 0.30) this.setState(PlayerState.IDLE);
      applyPhysics(this, dt, ctx.room);
      return;
    }

    // ------- 普通可控状态 -------
    this.handleInput(dt, ctx);
    applyPhysics(this, dt, ctx.room);
    this.checkHazard(ctx);
    this.updateStateAfterPhysics(dt, ctx);
  }

  handleInput(dt, ctx) {
    const ax = Input.axisX();

    // 治疗触发（必须在地面，可在空闲/行走/跳跃）
    if (Input.pressed('heal') && this.flasks > 0 && this.hp < this.maxHp && this.onGround) {
      this.healTimer = PLAYER.HEAL_TIME;
      this.setState(PlayerState.HEAL);
      ctx.particles.burst(this.centerX(), this.centerY(), 8, {
        color: '#cf6877', speedMin: 20, speedMax: 50, life: 0.4
      });
      return;
    }

    // 远程
    if (Input.pressed('ranged') && this.mana >= PLAYER.RANGED_COST && this.canAct()) {
      this.mana -= PLAYER.RANGED_COST;
      this.setState(PlayerState.RANGED);
      ctx.spawnPlayerProjectile(this);
      return;
    }

    // 冲刺
    if (Input.pressed('dash') && this.dashCooldown <= 0
        && this.stamina >= PLAYER.DASH_COST
        && this.world.persist.unlockedDash) {
      this.stamina -= PLAYER.DASH_COST;
      this.dashTime = PLAYER.DASH_TIME;
      this.dashIframe = PLAYER.DASH_IFRAMES;
      this.dashCooldown = PLAYER.DASH_COOLDOWN;
      // 方向：优先输入方向，否则面朝
      const dir = ax !== 0 ? sign(ax) : this.facing;
      this.facing = dir;
      this.vx = dir * PLAYER.DASH_VEL;
      this.vy = 0;
      this.setState(PlayerState.DASH);
      ctx.cam.shake(2, 0.1);
      return;
    }

    // 格挡
    if (Input.pressed('parry') && this.stamina >= PLAYER.PARRY_COST && this.canAct()) {
      this.stamina -= PLAYER.PARRY_COST;
      this.parryTimer = PLAYER.PARRY_WINDOW;
      this.setState(PlayerState.PARRY);
      return;
    }

    // 攻击
    if (Input.pressed('attack') && this.stamina >= PLAYER.ATTACK_COST && this.canAct()) {
      this.stamina -= PLAYER.ATTACK_COST;
      this.attackHitDone = false;
      this.queuedAttack = false;
      this.setState(PlayerState.ATTACK);
      if (ax !== 0) this.facing = sign(ax);
      this.attackChainTimer = PLAYER.COMBO_WINDOW;
      return;
    }

    // 互动（与回声、篝火等）
    if (Input.pressed('interact')) {
      const target = ctx.findInteractable(this);
      if (target) {
        target.interact(this, ctx);
      }
    }

    // 召唤幽灵
    if (Input.pressed('summon')) {
      ctx.tryRevive(this);
    }

    // 跳跃缓冲
    if (Input.pressed('jump')) this.jumpBuffer = PLAYER.JUMP_BUFFER;

    // 移动
    const target = ax * PLAYER.MOVE_SPEED;
    const accel = this.onGround ? PLAYER.ACCEL : PLAYER.ACCEL * 0.7;
    this.vx = approach(this.vx, target, accel * dt);
    if (ax !== 0) this.facing = sign(ax);

    // 抓墙下滑
    if (!this.onGround && this.againstWall !== 0 && this.world.persist.unlockedWallClimb) {
      const into = (this.againstWall === 1 && ax > 0) || (this.againstWall === -1 && ax < 0);
      if (into && this.vy > 0) {
        this.vy = Math.min(this.vy, PLAYER.WALL_SLIDE);
        this.setState(PlayerState.WALL_SLIDE);
      }
    }

    // 跳跃
    if (this.jumpBuffer > 0 && (this.onGround || this.coyote > 0 || this.state === PlayerState.WALL_SLIDE)) {
      if (this.state === PlayerState.WALL_SLIDE && !this.onGround) {
        // 墙跳
        this.vx = -this.againstWall * PLAYER.WALL_JUMP_VX;
        this.vy = PLAYER.WALL_JUMP_VY;
        this.facing = -this.againstWall;
      } else {
        this.vy = PLAYER.JUMP_VEL;
      }
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.onGround = false;
      this.usedDoubleJump = false;
    } else if (this.jumpBuffer > 0
               && !this.onGround
               && this.world.persist.unlockedDoubleJump
               && !this.usedDoubleJump) {
      // 二段跳
      this.vy = PLAYER.JUMP_VEL * 0.92;
      this.usedDoubleJump = true;
      this.jumpBuffer = 0;
      ctx.particles.burst(this.centerX(), this.y + this.h, 8, {
        color: '#a47bb1', speedMin: 30, speedMax: 70, life: 0.3
      });
    }

    // 短跳：松开 jump 时若上升中，加速重力
    if (!Input.held('jump') && this.vy < 0) {
      this.vy += PLAYER.JUMP_HOLD_GRAVITY * dt;
    }

    // 主动下穿单向平台
    this.dropThrough = Input.held('down') && Input.held('jump');
  }

  updateStateAfterPhysics(dt, ctx) {
    // 仅在普通移动态下覆盖；动作态（攻击/冲刺/格挡等）不被打断
    const overridable = (
      this.state === PlayerState.IDLE ||
      this.state === PlayerState.WALK ||
      this.state === PlayerState.JUMP ||
      this.state === PlayerState.FALL ||
      this.state === PlayerState.WALL_SLIDE
    );
    if (!overridable) {
      // 仍要刷新地面相关数据
      if (this.onGround) {
        this.usedDoubleJump = false;
        this.coyote = PLAYER.COYOTE;
      }
      return;
    }
    if (this.onGround) {
      this.usedDoubleJump = false;
      this.coyote = PLAYER.COYOTE;
      if (Math.abs(this.vx) > 12) this.setState(PlayerState.WALK);
      else this.setState(PlayerState.IDLE);
    } else {
      if (this.againstWall !== 0 && this.vy > 0 && this.world.persist.unlockedWallClimb) {
        this.setState(PlayerState.WALL_SLIDE);
      } else if (this.vy < 0) {
        this.setState(PlayerState.JUMP);
      } else {
        this.setState(PlayerState.FALL);
      }
    }
  }

  checkHazard(ctx) {
    if (this.touchingHazard && this.invuln <= 0 && this.dashIframe <= 0) {
      const cause = this.touchingHazard === TILES.SPIKES ? 'spike' :
                    this.touchingHazard === TILES.LAVA ? 'lava' : 'hazard';
      this.takeDamage(99, this.facing > 0 ? -150 : 150, -200, cause, ctx);
    }
    this.touchingHazard = false;
  }

  doMeleeHit(ctx, heavy) {
    const hitbox = meleeHitbox(this);

    let anyHit = false;
    for (const e of ctx.enemies) {
      if (!e.alive) continue;
      if (overlaps(hitbox, e)) {
        const dmg = (heavy ? PLAYER.HEAVY_DMG : PLAYER.ATTACK_DMG) * (this.attackChain === 2 ? 2 : 1);
        const kx = this.facing * (heavy ? 220 : 130);
        e.hurt(dmg, kx, -50, this);
        anyHit = true;
        // 主血色粒子（红橙）
        ctx.particles.burst(this.facing > 0 ? e.x : e.x + e.w, e.centerY(), heavy ? 20 : 12, {
          color: heavy ? '#fde9a8' : '#cf6877',
          speedMin: 80, speedMax: 200, life: 0.35, shrink: true
        });
        // 重击额外冲击波环（白色，向四周扩散）
        if (heavy) {
          ctx.particles.burst(e.centerX(), e.centerY(), 14, {
            color: '#ffffff', speedMin: 140, speedMax: 240, life: 0.18, shrink: true
          });
        }
      }
    }
    // 投射物反弹
    for (const proj of ctx.projectiles) {
      if (proj.team === 'enemy' && overlaps(hitbox, proj)) {
        proj.team = 'player';
        proj.vx *= -1.5;
        anyHit = true;
      }
    }
    if (heavy) {
      this.tryBreakWall(ctx);
    }
    if (anyHit) {
      ctx.cam.shake(heavy ? SHAKE.HEAVY : SHAKE.HIT, heavy ? 0.22 : 0.15);
      this.attackChainTimer = PLAYER.COMBO_WINDOW;
      this.stamina = Math.min(this.maxStamina, this.stamina + 6);
      // hit pause / hit stop —— 通过 ctx 暴露给 main loop
      if (ctx.requestHitPause) ctx.requestHitPause(heavy ? 0.08 : 0.04);
    }
  }

  tryBreakWall(ctx) {
    const room = ctx.room;
    if (!room) return;
    let broke = false;
    for (const { tx, ty } of meleeTileTargets(this)) {
      if (tx < 0 || tx >= room.w || ty < 0 || ty >= room.h) continue;
      if (room.tiles[ty * room.w + tx] === TILES.WALL_FRAGILE) {
        room.tiles[ty * room.w + tx] = TILES.EMPTY;
        broke = true;
        ctx.particles.burst(tx * 12 + 6, ty * 12 + 6, 16, {
          color: '#7d5e8a', speedMin: 40, speedMax: 110, life: 0.5, shrink: true
        });
      }
    }
    if (broke) {
      ctx.cam.shake(SHAKE.HIT, 0.15);
    }
  }

  // 受到伤害的统一入口
  takeDamage(dmg, kx, ky, cause, ctx) {
    if (this.dead || this.invuln > 0 || this.dashIframe > 0) return false;
    // 完美格挡
    if (this.state === PlayerState.PARRY && this.parryTimer > 0) {
      // 反震
      ctx.onParrySuccess(this, kx, ky);
      this.stamina = Math.min(this.maxStamina, this.stamina + 30);
      ctx.cam.shake(SHAKE.HIT * 1.5, 0.2);
      return false;
    }
    // 抗性 buff
    let actual = dmg;
    for (const b of this.absorbedBuffs) {
      if (b.type === cause + '_resist') actual *= 0.5;
    }
    this.hp -= Math.max(1, Math.ceil(actual));
    this.invuln = PLAYER.HIT_IFRAMES;
    this.flash = 0.18;
    this.knockbackVx = kx;
    this.vx = kx;
    this.vy = ky;
    this.lastDamageSource = cause;
    ctx.cam.shake(SHAKE.HIT, 0.2);
    if (this.hp <= 0) {
      this.die(cause, ctx);
    } else {
      this.setState(PlayerState.HURT);
    }
    return true;
  }

  die(cause, ctx) {
    this.hp = 0;
    this.dead = true;
    this.deathCause = cause;
    this.setState(PlayerState.DEAD);
    ctx.cam.shake(SHAKE.DEATH, 0.5);
    ctx.particles.burst(this.centerX(), this.centerY(), 28, {
      color: '#cf6877', speedMin: 60, speedMax: 180, life: 0.7, shrink: true, gravity: 200
    });
  }

  render(ctx, camX, camY) {
    if (!this.alive && this.state !== PlayerState.DEAD) return;
    const sx = Math.floor(this.x - camX) - 1; // sprite 是 9px 宽，比 hitbox 略宽
    const sy = Math.floor(this.y - camY);

    // 闪烁：受伤无敌期间，每 6 帧透明一次
    if (this.invuln > 0 && (Math.floor(this.invuln * 24) & 1) === 0) {
      // 跳过渲染产生闪烁
    } else {
      const sprite = getPlayerSprite(this.spriteState(), this.animFrame);
      const flip = this.facing < 0;
      ctx.save();
      if (flip) {
        ctx.translate(sx + sprite.width, sy);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0);
      } else {
        ctx.drawImage(sprite, sx, sy);
      }
      ctx.restore();
      // 闪光
      if (this.flash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = this.flash * 4;
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx, sy, sprite.width, sprite.height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // 攻击挥砍特效 — lighter 混合 + 略偏 y 让弧形覆盖敌人身体高度
    if (this.state === PlayerState.ATTACK || this.state === PlayerState.HEAVY_RELEASE) {
      const slashKind = this.state === PlayerState.HEAVY_RELEASE ? 'heavy' : 'light';
      const slash = getSlashSprite(slashKind, palettes.player, 0.95);
      const sxx = this.facing > 0 ? sx + this.w - 2 : sx - slash.width + 4;
      const syy = sy + (this.h - slash.height) / 2;
      const totalT = this.state === PlayerState.HEAVY_RELEASE ? 0.32 : PLAYER.ATTACK_TIME;
      const phase = this.stateTime / totalT;
      // 三段曲线：起势(0-0.3)→ peak(0.3-0.6) → 渐隐(0.6-1)
      const alpha = phase < 0.3 ? phase / 0.3
                  : phase < 0.6 ? 1
                  : Math.max(0, 1 - (phase - 0.6) / 0.4);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.9;
      if (this.facing < 0) {
        ctx.translate(sxx + slash.width, syy);
        ctx.scale(-1, 1);
        ctx.drawImage(slash, 0, 0);
      } else {
        ctx.drawImage(slash, sxx, syy);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // 蓄力光环
    if (this.state === PlayerState.HEAVY_CHARGE) {
      const t = this.heavyCharged / PLAYER.HEAVY_CHARGE;
      const r = 8 + t * 8;
      ctx.strokeStyle = `rgba(253,233,168,${0.3 + t * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.centerX() - camX, this.centerY() - camY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 治疗特效
    if (this.state === PlayerState.HEAL) {
      const t = 1 - this.healTimer / PLAYER.HEAL_TIME;
      ctx.fillStyle = `rgba(207,104,119,${0.5 - t * 0.4})`;
      ctx.fillRect(sx, sy + this.h - t * this.h, this.w + 2, t * this.h);
    }

    // 格挡盾光
    if (this.state === PlayerState.PARRY && this.parryTimer > 0) {
      ctx.strokeStyle = `rgba(255,255,255,0.85)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.centerX() - camX, this.centerY() - camY, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 永久持久化字段同步到 world.persist
  syncPersist() {
    this.world.persist.fragments = this.fragments;
    this.world.persist.flasks = this.flasks;
  }
}
