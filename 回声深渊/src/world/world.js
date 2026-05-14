// 世界管理器：持有所有房间、当前房间、回声等
import { generateLevel } from './generator.js';
import { Room, makeStarterRoom } from './room.js';
import { TILES } from './tile.js';
import { TILE, ECHO } from '../config.js';
import { hashStr } from '../util.js';
import { writeSave } from '../save.js';
import { spawnEchoData, Echo } from '../entities/echo.js';
import { palettes } from '../art/palette.js';
import { initRoomMechanic, teardownRoomMechanic } from './roomMechanics.js';

export class World {
  constructor(persist) {
    this.persist = persist;
    if (!persist.seed) {
      persist.seed = (Math.random() * 1e9) | 0;
    }
    const lvl = generateLevel(persist.seed);
    this.rooms = lvl.rooms;
    this.layout = lvl.layout;
    this.startId = lvl.startId;
    this.bossId = lvl.bossId;
    this.currentRoom = null;
    this.persist.lastVisited = persist.lastVisited || {};
  }

  getPalette(roomId) {
    const r = this.rooms.get(roomId);
    if (!r) return palettes.forest;
    return palettes[r.biome] || palettes.forest;
  }

  // 进入房间
  enterRoom(roomId, ctx) {
    const r = this.rooms.get(roomId);
    if (!r) return;
    // 离开旧房间：清理动态机制状态
    if (this.currentRoom && this.currentRoom !== r) {
      teardownRoomMechanic(this.currentRoom, ctx);
    }
    this.currentRoom = r;
    this.persist.lastVisited[r.id] = Date.now();

    // 清空当前实体
    ctx.entities.length = 0;
    ctx.enemies.length = 0;
    ctx.projectiles.length = 0;
    if (ctx.player) ctx.entities.push(ctx.player);

    // 检查并腐蚀过期回声
    this.maybeCorruptEchoes(ctx);

    // 重新生成实体（除非已击败 boss 等）
    for (const ei of r.entitiesInit) {
      if (r.cleared && r.kind === 'boss') continue;
      const e = ctx.makeEnemy(ei.type, ei.x, ei.y, this.getPalette(r.id));
      if (!e) continue;
      ctx.entities.push(e);
      ctx.enemies.push(e);
    }

    // 道具与篝火
    for (const prop of r.props) {
      if (prop.kind === 'flask' && prop.collected) continue;
      if (prop.kind === 'shrine' && this.persist.pickedUps.includes(`${r.id}:shrine`)) {
        // 已拿过
        continue;
      }
      const e = ctx.makeProp(prop, r);
      if (e) ctx.entities.push(e);
    }

    // 把所属此房间的回声放进去
    const echoEntsForDarkness = [];
    for (const e of this.persist.echoes) {
      if (e.roomId === r.id && !e.summoning) {
        const echoEnt = new Echo(e);
        ctx.entities.push(echoEnt);
        echoEntsForDarkness.push(echoEnt);
      }
    }
    r._echoEntities = echoEntsForDarkness;

    // 初始化新房间的动态机制
    initRoomMechanic(r);
  }

  // 死亡 → 留下回声
  recordEcho(player, room) {
    const data = spawnEchoData(player, room);
    this.persist.echoes.push(data);
    // 同房间限制回声数量：超出删除最老的非腐蚀回声
    const inRoom = this.persist.echoes.filter(e => e.roomId === room.id);
    if (inRoom.length > ECHO.MAX_PER_ROOM) {
      // 删除最老的
      const sorted = inRoom.sort((a, b) => a.timestamp - b.timestamp);
      const drop = sorted[0];
      this.persist.echoes = this.persist.echoes.filter(e => e.id !== drop.id);
    }
    this.save();
    return data;
  }

  removeEcho(echoOrData) {
    const id = echoOrData.id || (echoOrData.data && echoOrData.data.id);
    if (!id) return;
    this.persist.echoes = this.persist.echoes.filter(e => e.id !== id);
    this.save();
  }

  maybeCorruptEchoes(ctx) {
    const now = Date.now();
    for (const e of this.persist.echoes) {
      if (e.corrupted) continue;
      const lastVisit = e.lastVisit || e.timestamp;
      if (now - lastVisit > ECHO.CORRUPT_AGE) {
        e.corrupted = true;
      }
    }
  }

  respawnAllEnemies() {
    // 标记所有非 boss 房间需要重新生成敌人
    for (const r of this.rooms.values()) {
      if (r.kind !== 'boss') r.cleared = false;
    }
  }

  save() {
    writeSave(this.persist);
  }

  isAtBossRoom() {
    return this.currentRoom?.id === this.bossId;
  }
}
