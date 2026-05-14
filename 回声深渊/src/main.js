// 主游戏循环 + 场景状态机 + 全局上下文
import { W, H, DT, TILE, PLAYER, ECHO, SHAKE } from './config.js';
import { Input } from './input.js';
import { Camera } from './camera.js';
import { ParticleSystem } from './art/particles.js';
import { palettes, withAlpha } from './art/palette.js';
import { drawRoom, drawBackground } from './world/tile.js';
import { TILES } from './world/tile.js';
import { World } from './world/world.js';
import { initRoomMechanic, updateRoomMechanic, renderRoomMechanic, teardownRoomMechanic } from './world/roomMechanics.js';
import { canEnterExit } from './world/transitions.js';
import { loadSave, writeSave } from './save.js';
import { Player, PlayerState } from './entities/player.js';
import { Projectile } from './entities/projectile.js';
import { makeEnemy } from './entities/enemy.js';
import { Echo, GhostAlly } from './entities/echo.js';
import { CorruptedEcho } from './entities/corruptedEcho.js';
import { AbyssLord } from './entities/boss.js';
import { Bonfire, FlaskPickup, Fragment, AbilityShrine } from './entities/pickup.js';
import { LoreStone } from './entities/loreStone.js';
import { HUD } from './ui/hud.js';
import { EchoDialog } from './ui/dialog.js';
import { TitleMenu, PauseMenu, DeathScreen, VictoryScreen, HelpScreen, ConfirmReset } from './ui/menu.js';
import { Minimap } from './ui/minimap.js';
import { RoomBanner } from './ui/roomBanner.js';
import { initAudio, SFX } from './audio.js';
import { dist2 } from './util.js';

// ============== Scene 常量 ==============
const SCENE = {
  TITLE: 'title',
  GAME: 'game',
  PAUSE: 'pause',
  DEATH: 'death',
  VICTORY: 'victory',
  HELP: 'help',
  CONFIRM_RESET: 'confirmReset'
};

// 模板进房间时显示的副标题（gimmick 提示）
const TEMPLATE_HINTS = {
  start_room: '篝火点亮 — 在底部 E 互动',
  initiate_hall: '基础跳跃 — 找到落脚的节奏',
  crumbling_path: '前方有脆弱墙 · 走近按住 J 蓄力重击',
  floating_islands: '小心缺口 · 跌落也有兜底',
  leap_of_faith: '碎裂的踏板 — 别在上面停留',
  first_bonfire: '篝火 + 治疗瓶 · 休整一下',
  echo_bridge: '鸿沟太宽 — 留下点什么作为桥梁吧',
  pulsing_lava: '熔岩在呼吸 · 算准时机',
  erosion_gorge: '风在切换方向 · 借势腾跃',
  lava_surge: '熔岩涌进 · 召唤回声当落脚',
  bullet_corridor: '两端的弹幕 · 用冲刺穿过',
  forge_arena: '三条路线自选 — 地面跳坑 / 中层飞石 / 顶层跑酷',
  lava_sprint: '熔岩从右涌来 · 不停向左冲刺',
  second_bonfire: '篝火 + 蹬墙圣坛 · 休整一下',
  mirror_hall: '镜像幽灵将复刻你的轨迹',
  dark_shaft: '回声会发光 · 用它点亮深井',
  inverted_tower: '前行触发重力翻转',
  sheer_cliff: '撞墙时按 K 反弹 — 蹬墙跳爬升',
  wall_bounce: '柱子之间蹬墙 · 一气呵成',
  reflecting_hall: '冲刺穿敌 · 蹬柱反弹背刺',
  wall_canyon: '柱顶藏着秘密 · 蹬墙跳到最高'
};

const KIND_LABEL = {
  start: '起点 · 篝火',
  bonfire: '篝火',
  boss: '深渊之主',
  secret: '秘室'
};
function roomKindLabel(kind) { return KIND_LABEL[kind] || ''; }

// 圣坛能力中文名 — banner 提示用
const ABILITY_LABELS = {
  doubleJump: '二段跳',
  dash: '冲刺',
  wallClimb: '蹬墙跳',
  downStrike: '下劈破墙',
  maxHp: '生命上限 +1',
  flask: '治疗瓶上限 +1'
};

// ============== 启动 ==============
const canvas = document.getElementById('game');
const gctx = canvas.getContext('2d');
gctx.imageSmoothingEnabled = false;

let game = null;

class Game {
  constructor() {
    this.persist = loadSave();
    this.world = new World(this.persist);
    this.cam = new Camera();
    this.particles = new ParticleSystem();
    this.hud = new HUD();
    this.dialog = new EchoDialog();
    this.titleMenu = new TitleMenu();
    this.pauseMenu = new PauseMenu();
    this.deathScreen = new DeathScreen();
    this.victoryScreen = new VictoryScreen();
    this.helpScreen = new HelpScreen();
    this.confirmResetScreen = new ConfirmReset();
    this.minimap = new Minimap(this.world);
    this.banner = new RoomBanner();
    this.titleMenu.setPersist(this.persist);
    this.hitPause = 0;

    this.entities = [];
    this.enemies = [];
    this.projectiles = [];
    this.player = null;
    this.scene = SCENE.TITLE;
    this.transition = null; // { fromRoomId, toRoomId, targetSpawn, fadeOut, fadeIn }

    this.canvas = canvas;
    this.acc = 0;
    this.last = performance.now();

    // 触发用户首次交互后启用音频
    const enableAudio = () => {
      initAudio();
      window.removeEventListener('keydown', enableAudio);
      window.removeEventListener('mousedown', enableAudio);
    };
    window.addEventListener('keydown', enableAudio, { once: true });
    window.addEventListener('mousedown', enableAudio, { once: true });
  }

  // ============== 游戏开始 ==============
  startGame() {
    SFX.uiConfirm();
    this.persist.totalRuns = (this.persist.totalRuns || 0) + 1;
    writeSave(this.persist);

    let startRoom = this.world.startId;
    let spawn = null;
    if (this.persist.bonfireRoom && this.world.rooms.has(this.persist.bonfireRoom)) {
      startRoom = this.persist.bonfireRoom;
      spawn = this.persist.bonfireSpawn;
    }
    const room = this.world.rooms.get(startRoom);
    if (!spawn) spawn = room.spawn;
    this.player = new Player(spawn.x, spawn.y, this.world);
    this.world.enterRoom(startRoom, this.makeCtx());
    this.cam.snap(this.player, this.world.currentRoom);
    this.showRoomBanner(this.world.currentRoom);
    this.scene = SCENE.GAME;
    this.cam.fadeAlpha = 1.0;
    this.cam.fadeTo(0, 4);
  }

  showRoomBanner(room) {
    if (!room) return;
    const isBoss = room.kind === 'boss';
    const text = isBoss ? '深 渊 之 主'
                : (room.templateName || roomKindLabel(room.kind));
    if (!text) return;
    let sub = TEMPLATE_HINTS[room.templateId] || '';
    if (isBoss) sub = '回声深处的诅咒之主 — 终结它';
    const shrine = (room.props || []).find(p => p.kind === 'shrine' && p.ability);
    if (!isBoss && shrine && !this.persist.pickedUps.includes(`${room.id}:shrine`)) {
      const label = ABILITY_LABELS[shrine.ability];
      if (label) sub = `本房间有圣坛 — ${label}`;
    }
    this.banner.show(room.id, text, sub, isBoss);
  }

  rebuildWorld() {
    this.world = new World(this.persist);
    this.minimap = new Minimap(this.world);
    this.player = null;
    this.entities = [];
    this.enemies = [];
    this.projectiles = [];
  }

  toTitle() {
    SFX.uiConfirm();
    this.scene = SCENE.TITLE;
    this.titleMenu.setPersist(this.persist);
  }

  resumeGame() {
    SFX.uiMove();
    this.scene = SCENE.GAME;
  }

  confirmReset() {
    SFX.uiConfirm();
    this.scene = SCENE.CONFIRM_RESET;
  }

  openHelp() {
    SFX.uiConfirm();
    this.scene = SCENE.HELP;
  }

  // ============== ctx：暴露给 entities ==============
  makeCtx() {
    return {
      player: this.player,
      room: this.world.currentRoom,
      cam: this.cam,
      particles: this.particles,
      entities: this.entities,
      enemies: this.enemies,
      projectiles: this.projectiles,
      world: this.world,
      hud: this.hud,
      dialog: this.dialog,
      onPlayerDeath: cause => this.handlePlayerDeath(cause),
      onParrySuccess: (player, kx, ky) => this.handleParry(player, kx, ky),
      spawnPlayerProjectile: p => this.spawnPlayerProjectile(p),
      spawnEnemyProjectile: (x, y, vx, vy, opts) => this.spawnEnemyProjectile(x, y, vx, vy, opts),
      makeEnemy: (type, x, y, palette) => makeEnemyOrSpecial(type, x, y, palette),
      makeProp: (prop, room) => this.makeProp(prop, room),
      findInteractable: p => this.findInteractable(p),
      openEchoDialog: e => this.openEchoDialog(e),
      tryRevive: p => this.tryRevive(p),
      showToast: (t, l) => { this.hud.showToast(t, l); },
      flashHazards: t => this.hud.flashHazards(t),
      requestHitPause: dur => { this.hitPause = Math.max(this.hitPause || 0, dur); },
      sfx: SFX
    };
  }

  // ============== Helpers ==============
  spawnPlayerProjectile(p) {
    SFX.ranged();
    const proj = new Projectile(
      p.facing > 0 ? p.x + p.w + 1 : p.x - 6,
      p.y + p.h / 2 - 2,
      p.facing * 240, 0,
      { team: 'player', dmg: PLAYER.RANGED_DMG, kind: 'orb', color: '#cba0d6', life: 1.4 }
    );
    this.projectiles.push(proj);
    this.entities.push(proj);
  }

  spawnEnemyProjectile(x, y, vx, vy, opts = {}) {
    const proj = new Projectile(x - 2, y - 2, vx, vy,
      Object.assign({ team: 'enemy', kind: 'bullet', color: '#cf6877', life: 2.0 }, opts));
    this.projectiles.push(proj);
    this.entities.push(proj);
  }

  makeProp(prop, room) {
    if (prop.kind === 'bonfire') return new Bonfire(prop.x, prop.y, room.id);
    if (prop.kind === 'flask') return new FlaskPickup(prop.x, prop.y);
    if (prop.kind === 'lore') return new LoreStone(prop.x, prop.y, prop.text);
    if (prop.kind === 'shrine') {
      const id = `${room.id}:shrine`;
      // 优先使用关卡硬编码的能力（主线圣坛），否则按未解锁优先级动态选
      let ability = prop.ability;
      if (!ability) {
        ability = 'maxHp';
        if (!this.persist.unlockedDoubleJump) ability = 'doubleJump';
        else if (!this.persist.unlockedDash) ability = 'dash';
        else if (!this.persist.unlockedWallClimb) ability = 'wallClimb';
        else if (Math.random() < 0.5) ability = 'flask';
      }
      return new AbilityShrine(prop.x, prop.y, ability, id);
    }
    return null;
  }

  findInteractable(player) {
    // 在玩家附近的所有 entity 中找有 interact 方法的，最近优先
    let best = null, bestD = ECHO.INTERACT_DIST * ECHO.INTERACT_DIST;
    for (const e of this.entities) {
      if (!e || !e.alive || !e.interact) continue;
      const d = dist2(player.centerX(), player.centerY(), e.centerX(), e.centerY());
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  openEchoDialog(echo) {
    SFX.echoOpen();
    this.dialog.show(echo);
    Input.consume('interact');
  }

  // F 键：直接召唤最近的回声
  tryRevive(player) {
    if (player.summonedGhost && player.summonedGhost.alive) {
      this.hud.showToast('已有一个幽灵在战斗中', 1.4);
      return;
    }
    let best = null, bestD = 80 * 80;
    for (const e of this.entities) {
      if (e instanceof Echo && e.alive) {
        const d = dist2(player.centerX(), player.centerY(), e.centerX(), e.centerY());
        if (d < bestD) { bestD = d; best = e; }
      }
    }
    if (best) {
      best.resolveSummon(this.makeCtx());
    } else {
      this.hud.showToast('附近没有回声…', 1.2);
    }
  }

  // 完美格挡成功
  handleParry(player, kx, ky) {
    SFX.parry();
    this.particles.burst(player.centerX() + player.facing * 8, player.centerY(), 14, {
      color: '#fde9a8', speedMin: 80, speedMax: 180, life: 0.4
    });
    // 把附近敌人击退一下
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d2 = dist2(player.centerX(), player.centerY(), e.centerX(), e.centerY());
      if (d2 < 30 * 30) {
        e.knockbackVx = player.facing * 200;
        e.flash = 0.18;
        // 中断 telegraph
        if (e.telegraph !== undefined) e.telegraph = 0;
        if (e.attackPhase !== undefined) e.attackPhase = 0;
        if (e.aiState && e.aiState.startsWith && e.aiState.startsWith('tele_')) {
          e.aiState = 'wait';
          e.aiTimer = 1.0;
        }
      }
    }
  }

  // 玩家死亡处理 — 蔚蓝式：当前房间即时重生，无碎片惩罚
  handlePlayerDeath(cause) {
    SFX.death();
    this.persist.totalDeaths = (this.persist.totalDeaths || 0) + 1;
    // 在死亡地点留下回声（仅装饰 / 后续叙事 — 不掠夺碎片）
    this.world.recordEcho(this.player, this.world.currentRoom);
    this.player.syncPersist();
    writeSave(this.persist);
    // 切换到 DEATH 画面（短动画，自动重生）
    this.deathScreen.show(cause);
    this.scene = SCENE.DEATH;
  }

  respawnPlayer() {
    SFX.uiConfirm();
    // 蔚蓝式：复活在 *当前房间* 的 spawn 点，不退回篝火，让玩家可以快速重试
    const currentRoom = this.world.currentRoom || this.world.rooms.get(this.world.startId);
    const spawn = currentRoom.spawn;
    this.player = new Player(spawn.x, spawn.y, this.world);
    // 玩家碎片不归零（之前 handlePlayerDeath 已不再清零，这里只是确保 syncPersist）
    this.player.syncPersist();
    this.world.enterRoom(currentRoom.id, this.makeCtx());
    this.cam.snap(this.player, this.world.currentRoom);
    this.banner.lastShownRoomId = null;
    this.showRoomBanner(this.world.currentRoom);
    this.scene = SCENE.GAME;
    this.cam.fadeAlpha = 1.0;
    this.cam.fadeTo(0, 5);
    // 仅当前房间敌人重生（不影响其他房间状态）
    if (currentRoom.kind !== 'boss') currentRoom.cleared = false;
  }

  // ============== Update / Render ==============
  update(dt) {
    // 击中定格：仅冻结游戏内逻辑，UI/输入仍正常推进
    if (this.scene === SCENE.GAME && this.hitPause > 0) {
      this.hitPause -= dt;
      // 相机震动 + 粒子继续推进让定格期间也有反馈
      this.particles.update(dt);
      this.cam.update(dt, this.world.currentRoom);
      Input.endFrame(dt);
      return;
    }
    if (this.scene === SCENE.TITLE) {
      this.titleMenu.update(dt, this);
    } else if (this.scene === SCENE.PAUSE) {
      this.pauseMenu.update(dt, this);
    } else if (this.scene === SCENE.DEATH) {
      this.deathScreen.update(dt, this);
    } else if (this.scene === SCENE.VICTORY) {
      this.victoryScreen.update(dt, this);
    } else if (this.scene === SCENE.HELP) {
      this.helpScreen.update(dt, this);
    } else if (this.scene === SCENE.CONFIRM_RESET) {
      this.confirmResetScreen.update(dt, this);
    } else if (this.scene === SCENE.GAME) {
      this.updateGame(dt);
    }
    // 共享系统更新
    this.particles.update(dt);
    this.hud.update(dt);
    this.cam.update(dt, this.world.currentRoom);
    // 始终在帧末清空 just-pressed 状态，避免重复触发
    Input.endFrame(dt);
  }

  updateGame(dt) {
    if (Input.pressed('pause')) {
      this.scene = SCENE.PAUSE;
      SFX.uiMove();
      return;
    }

    const ctx = this.makeCtx();
    ctx._dt = dt;

    // 对话框打开时：暂停游戏更新
    if (this.dialog.open) {
      this.dialog.update(dt, ctx);
      return;
    }

    // 主题房间机制（脉动熔岩 / 风 / 镜像 / 重力 等）
    updateRoomMechanic(this.world.currentRoom, dt, ctx);
    this.banner.update(dt);

    // 玩家与全部 entity update
    if (this.player) this.player.update(dt, ctx);
    for (const e of this.entities) {
      if (e === this.player) continue;
      if (typeof e.update === 'function') e.update(dt, ctx);
    }
    // 移除标记
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (e === this.player) continue; // 玩家死亡时保留显示
      if (e.removeMe) {
        this.entities.splice(i, 1);
        continue;
      }
      if (e.dead) {
        e.deadTimer = (e.deadTimer || 0) + dt;
        if (e.deadTimer > 0.8) {
          this.dropFragments(e);
          this.entities.splice(i, 1);
        }
      }
    }
    // 同步 enemies / projectiles 列表
    this.enemies = this.entities.filter(e => e && e.team === 'enemy');
    this.projectiles = this.entities.filter(e => e instanceof Projectile);

    // 投射物 vs 玩家
    for (const proj of this.projectiles) {
      if (proj.team === 'enemy' && this.player && !this.player.dead) {
        if (proj.x < this.player.x + this.player.w && proj.x + proj.w > this.player.x
            && proj.y < this.player.y + this.player.h && proj.y + proj.h > this.player.y) {
          const dir = proj.vx > 0 ? 1 : -1;
          this.player.takeDamage(proj.dmg, dir * 80, -60, 'enemy:bullet', ctx);
          proj.removeMe = true;
          this.particles.burst(proj.centerX(), proj.centerY(), 8, {
            color: proj.color, speedMin: 30, speedMax: 80, life: 0.3
          });
        }
      }
      // 玩家投射物 vs 敌人
      if (proj.team === 'player') {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (proj.x < e.x + e.w && proj.x + proj.w > e.x
              && proj.y < e.y + e.h && proj.y + proj.h > e.y) {
            e.hurt(proj.dmg, proj.vx * 0.6, -40, this.player);
            proj.removeMe = true;
            this.particles.burst(proj.centerX(), proj.centerY(), 6, {
              color: '#cba0d6', speedMin: 30, speedMax: 80, life: 0.3
            });
            break;
          }
        }
      }
    }

    // GhostAlly 被敌人投射物击中
    for (const proj of this.projectiles) {
      if (proj.team !== 'enemy') continue;
      for (const ally of this.entities) {
        if (ally instanceof GhostAlly) {
          if (proj.x < ally.x + ally.w && proj.x + proj.w > ally.x
              && proj.y < ally.y + ally.h && proj.y + proj.h > ally.y) {
            ally.hurt(proj.dmg);
            proj.removeMe = true;
          }
        }
      }
    }

    // 玩家与回声/篝火"渡桥" Commune 处理
    if (this.player && this.player.commune) {
      if (this.player.communeTimer >= ECHO.COMMUNE_TIME) {
        // 成功
        this.player.commune.activateBridge(ctx);
        this.player.setState(PlayerState.IDLE);
        this.player.commune = null;
        this.player.communeTimer = 0;
      }
    }

    // 玩家落入虚空
    if (this.player && !this.player.dead && this.world.currentRoom) {
      if (this.player.y > (this.world.currentRoom.h + 4) * TILE) {
        this.player.die('fall', ctx);
      }
    }

    // 房间过渡：玩家走到边界 + 在某出口位置
    if (this.player && !this.player.dead && !this.transition) {
      this.checkRoomTransition();
    }

    // 小地图开关
    this.minimap.update(dt, this);

    // 跳跃音效
    if (Input.pressed('jump') && this.player && this.player.onGround) {
      SFX.jump();
    }
    if (Input.pressed('jump') && this.player && !this.player.onGround
        && this.player.usedDoubleJump
        && this.player.coyote <= 0) {
      // 已经用了二段跳
    }

    // Boss 打败
    for (const e of this.enemies) {
      if (e instanceof AbyssLord && e.dead && !this.world.currentRoom.bossDefeated) {
        this.world.currentRoom.bossDefeated = true;
        this.world.currentRoom.cleared = true;
        this.persist.defeatedBosses.push(this.world.currentRoom.id);
        writeSave(this.persist);
        // 通关
        this.victoryScreen.show();
        this.scene = SCENE.VICTORY;
      }
    }

    // 相机跟随
    if (this.player) this.cam.follow(this.player);
  }

  // 死亡敌人掉落碎片
  dropFragments(enemy) {
    if (!enemy.givesFragments) return;
    const total = enemy.givesFragments;
    const cx = enemy.x + (enemy.w || 8) / 2;
    const cy = enemy.y + (enemy.h || 8) / 2;
    const pieces = Math.min(20, total);
    const perPiece = Math.max(1, Math.ceil(total / pieces));
    for (let i = 0; i < pieces; i++) {
      this.entities.push(new Fragment(cx, cy, perPiece));
    }
    SFX.enemyDie();
    if (enemy instanceof CorruptedEcho) {
      this.world.removeEcho({ id: enemy.echoData.id });
      this.hud.showToast('回声彻底消散，碎片已归还', 2);
    }
  }

  checkRoomTransition() {
    const room = this.world.currentRoom;
    if (!room) return;
    for (const ex of room.exits) {
      if (canEnterExit(this.player, room, ex)) {
        this.beginTransition(ex);
        break;
      }
    }
  }

  beginTransition(ex) {
    this.transition = { exit: ex, t: 0 };
    this.cam.fadeTo(1, 6);
  }

  // ============== Render ==============
  render() {
    gctx.fillStyle = '#000';
    gctx.fillRect(0, 0, W, H);

    if (this.scene === SCENE.TITLE) {
      this.renderTitleBackdrop();
      this.titleMenu.render(gctx);
      return;
    }

    // 渲染游戏世界（即使在 PAUSE/DEATH 时也作底）
    if (this.world.currentRoom && this.player) {
      this.renderWorld();
    }

    if (this.scene === SCENE.PAUSE) {
      this.pauseMenu.render(gctx);
    } else if (this.scene === SCENE.DEATH) {
      this.deathScreen.render(gctx);
    } else if (this.scene === SCENE.VICTORY) {
      this.victoryScreen.render(gctx);
    } else if (this.scene === SCENE.HELP) {
      this.helpScreen.render(gctx);
    } else if (this.scene === SCENE.CONFIRM_RESET) {
      this.confirmResetScreen.render(gctx);
    } else if (this.scene === SCENE.GAME) {
      this.dialog.render(gctx);
    }
  }

  renderTitleBackdrop() {
    // 简单粒子背景：缓慢漂浮的暗紫颗粒
    if (!this._titleParticles) {
      this._titleParticles = [];
      for (let i = 0; i < 80; i++) {
        this._titleParticles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 2,
          vy: -2 - Math.random() * 4,
          size: 1 + (Math.random() < 0.2 ? 1 : 0)
        });
      }
    }
    const grad = gctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#000');
    grad.addColorStop(1, '#1c1830');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, W, H);
    for (const p of this._titleParticles) {
      gctx.fillStyle = `rgba(207,160,214,${0.10 + (p.size === 2 ? 0.15 : 0)})`;
      gctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
      p.x += p.vx * 0.3;
      p.y += p.vy * 0.3;
      if (p.y < -2) { p.y = H + 2; p.x = Math.random() * W; }
    }
  }

  renderWorld() {
    const [shx, shy] = this.cam.applyShake();
    const camX = this.cam.x + shx;
    const camY = this.cam.y + shy;
    const palette = this.world.getPalette(this.world.currentRoom.id);
    const biome = this.world.currentRoom.biome;

    // 背景
    drawBackground(gctx, camX, camY, palette, biome, this.world.currentRoom);

    // 危险高亮（短暂）— 限制在视口内
    if (this.hud.shouldFlashHazards()) {
      const r = this.world.currentRoom;
      gctx.fillStyle = `rgba(255,80,80,${0.25 + Math.sin(Date.now() / 80) * 0.1})`;
      const minTx = Math.max(0, Math.floor(camX / TILE));
      const minTy = Math.max(0, Math.floor(camY / TILE));
      const maxTx = Math.min(r.w - 1, Math.ceil((camX + W) / TILE));
      const maxTy = Math.min(r.h - 1, Math.ceil((camY + H) / TILE));
      for (let ty = minTy; ty <= maxTy; ty++) {
        const rowBase = ty * r.w;
        for (let tx = minTx; tx <= maxTx; tx++) {
          const t = r.tiles[rowBase + tx];
          if (t === TILES.SPIKES || t === TILES.LAVA) {
            gctx.fillRect(tx * TILE - camX, ty * TILE - camY, TILE, TILE);
          }
        }
      }
    }

    // tiles
    drawRoom(gctx, this.world.currentRoom, camX, camY, palette, biome);

    // 实体（按 y 排序，让背景先画）
    const sorted = this.entities.slice().sort((a, b) => (a.y || 0) - (b.y || 0));
    for (const e of sorted) {
      if (e === this.player) continue;
      if (typeof e.render === 'function') {
        try { e.render(gctx, camX, camY); } catch (err) { console.error(err, e); }
      }
    }
    // 玩家最后画（除非他死了，让尸体在敌人之下）
    if (this.player) this.player.render(gctx, camX, camY);

    // 粒子
    this.particles.render(gctx, camX, camY);

    // 房间机制视觉叠加（黑暗 / 风向提示等）
    renderRoomMechanic(gctx, this.world.currentRoom, camX, camY, this.player);

    // 互动提示
    const inter = this.findInteractable(this.player);
    if (inter) {
      const sx = (inter.centerX() - camX) | 0;
      const sy = (inter.y - camY - 8) | 0;
      gctx.fillStyle = '#fde9a8';
      gctx.font = '6px monospace';
      gctx.textAlign = 'center';
      gctx.fillText('E', sx, sy);
      gctx.textAlign = 'left';
    }

    // 渡桥进度
    if (this.player && this.player.commune) {
      const t = this.player.communeTimer / ECHO.COMMUNE_TIME;
      const cx = this.player.centerX() - camX;
      const cy = this.player.y - camY - 6;
      gctx.fillStyle = 'rgba(0,0,0,0.6)';
      gctx.fillRect(cx - 14, cy, 28, 3);
      gctx.fillStyle = '#cba0d6';
      gctx.fillRect(cx - 14, cy, Math.ceil(28 * t), 3);
      gctx.fillStyle = '#a47bb1';
      gctx.font = '6px monospace';
      gctx.textAlign = 'center';
      gctx.fillText('渡桥中… 松开 E 中断', cx, cy - 2);
      gctx.textAlign = 'left';
    }

    // 秘密房入口标记 — 通向 secret 的出口位置画发光箭头
    if (this.world.currentRoom) {
      const tnow = Date.now() / 240;
      for (const ex of this.world.currentRoom.exits) {
        if (!ex.toSecret) continue;
        const sx = ex.x * TILE - camX + TILE / 2;
        const sy = ex.y * TILE - camY + TILE / 2;
        const pulse = 0.6 + Math.sin(tnow * 2) * 0.4;
        gctx.fillStyle = `rgba(253, 233, 168, ${pulse})`;
        gctx.font = 'bold 8px monospace';
        gctx.textAlign = 'center';
        const arrow = ex.dir === 'up' ? '↑' : ex.dir === 'down' ? '↓' : ex.dir === 'left' ? '←' : '→';
        const offY = ex.dir === 'up' ? 6 : ex.dir === 'down' ? -6 : 0;
        gctx.fillText(arrow + ' 秘室', sx, sy + offY);
        gctx.textAlign = 'left';
      }
    }

    // HUD
    this.hud.render(gctx, this.player, this.world);
    // 进房间时短暂显示房间名 / 提示
    this.banner.render(gctx);
    // 角落小地图
    this.minimap.renderCorner(gctx);
    // TAB 展开全图
    if (this.minimap.expanded) this.minimap.renderFull(gctx);

    // 淡入淡出
    if (this.cam.fadeAlpha > 0) {
      gctx.fillStyle = `rgba(0,0,0,${this.cam.fadeAlpha})`;
      gctx.fillRect(0, 0, W, H);
    }

    // 处理过渡阶段：fade 到 1 后切换房间
    if (this.transition && this.cam.fadeAlpha >= 0.98) {
      const ex = this.transition.exit;
      // 把玩家移到目标位置
      this.player.x = ex.targetSpawn.x;
      this.player.y = ex.targetSpawn.y;
      this.player.vx = 0;
      this.player.vy = 0;
      this.world.enterRoom(ex.target, this.makeCtx());
      this.cam.snap(this.player, this.world.currentRoom);
      this.showRoomBanner(this.world.currentRoom);
      this.transition = null;
      this.cam.fadeTo(0, 6);
    }
  }

  // ============== 主循环 ==============
  step() {
    const now = performance.now();
    let dtRaw = (now - this.last) / 1000;
    if (dtRaw > 0.25) dtRaw = 0.25; // 防止页面切回时一次跳过太多
    this.last = now;
    this.acc += dtRaw;
    while (this.acc >= DT) {
      this.update(DT);
      this.acc -= DT;
    }
    this.render();
    requestAnimationFrame(() => this.step());
  }
}

// 适配特殊 enemy/特殊实体（boss、corruptedEcho）
function makeEnemyOrSpecial(type, x, y, palette) {
  if (type === 'boss') return new AbyssLord(x, y, palette);
  if (type === 'corrupted') return new CorruptedEcho(x, y, palette);
  return makeEnemy(type, x, y, palette);
}

// 启动
window.addEventListener('load', () => {
  game = new Game();
  window.__game = game;
  game.step();
});
