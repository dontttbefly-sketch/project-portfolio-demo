// 单个房间数据结构
import { TILES } from './tile.js';
import { TILE } from '../config.js';

export class Room {
  constructor(id, w, h) {
    this.id = id;
    this.w = w;
    this.h = h;
    this.tiles = new Uint8Array(w * h);
    this.spawn = { x: 32, y: 32 };
    this.exits = []; // {dir:'left'|'right'|'up'|'down', x, y, target:roomId, targetSpawn:{x,y}}
    this.entitiesInit = []; // 待生成的实体描述
    this.props = [];        // 篝火/拾取/装饰
    this.biome = 'forest';
    this.kind = 'normal';   // start | normal | elite | boss | bonfire | secret
    this.cleared = false;
    this.visitedFlag = false;
    this.bossDefeated = false;
  }

  set(tx, ty, t) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return;
    this.tiles[ty * this.w + tx] = t;
  }
  get(tx, ty) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return TILES.SOLID;
    return this.tiles[ty * this.w + tx];
  }
  fillRect(x, y, w, h, t) {
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) this.set(x + i, y + j, t);
  }
  border(t) {
    for (let x = 0; x < this.w; x++) { this.set(x, 0, t); this.set(x, this.h - 1, t); }
    for (let y = 0; y < this.h; y++) { this.set(0, y, t); this.set(this.w - 1, y, t); }
  }
  // 把出口位置打成可通行通道（保证玩家能走到/从对面来）
  carveExits() {
    for (const ex of this.exits) {
      if (ex.dir === 'left' || ex.dir === 'right') {
        const bx = ex.dir === 'left' ? 0 : this.w - 1;
        const inX = ex.dir === 'left' ? 1 : this.w - 2;
        // 找地面"顶部"（自上而下第一格 SOLID）— 不能从底向上找，否则会挖穿厚地板顶
        let groundY = this.h - 2;
        for (let ty = 1; ty < this.h - 1; ty++) {
          if (this.get(inX, ty) === TILES.SOLID) { groundY = ty; break; }
        }
        ex.y = groundY - 1;
        // 通道：地面顶部以上 3 格全空（不挖穿地板本身）
        for (let ty = groundY - 3; ty <= groundY - 1; ty++) {
          this.set(bx, ty, TILES.EMPTY);
          this.set(inX, ty, TILES.EMPTY);
        }
        // 地面延伸到墙边
        this.set(bx, groundY, TILES.SOLID);
        this.set(inX, groundY, TILES.SOLID);
      } else if (ex.dir === 'up' || ex.dir === 'down') {
        const by = ex.dir === 'up' ? 0 : this.h - 1;
        const inY = ex.dir === 'up' ? 1 : this.h - 2;
        // 在 ex.x 列上确保可以穿过
        for (let tx = ex.x - 1; tx <= ex.x + 1; tx++) {
          this.set(tx, by, TILES.EMPTY);
          this.set(tx, inY, TILES.EMPTY);
        }
        this.clearVerticalExitShaft(ex);
      }
    }
  }

  clearVerticalExitShaft(ex) {
    if (ex.dir === 'up') {
      const maxY = Math.min(this.h - 2, 5);
      for (let tx = ex.x - 1; tx <= ex.x + 1; tx++) {
        for (let ty = 0; ty <= maxY; ty++) this.set(tx, ty, TILES.EMPTY);
      }
      const launchY = 6;
      if (launchY < this.h - 1) {
        for (let tx = ex.x - 1; tx <= ex.x + 1; tx++) this.set(tx, launchY, TILES.PLATFORM);
      }
    } else if (ex.dir === 'down') {
      const minY = Math.max(1, this.h - 6);
      for (let tx = ex.x - 1; tx <= ex.x + 1; tx++) {
        for (let ty = minY; ty <= this.h - 1; ty++) this.set(tx, ty, TILES.EMPTY);
      }
    }
  }
}

// 调试用：手工示例房间（Phase 1 先用它跑通管线）
export function makeStarterRoom() {
  const r = new Room('starter', 40, 22);
  r.biome = 'forest';
  r.kind = 'start';

  // 边界
  r.border(TILES.SOLID);
  // 上方屋顶留空（透气）
  for (let x = 1; x < r.w - 1; x++) r.set(x, 0, TILES.EMPTY);

  // 主地面
  for (let x = 1; x < r.w - 1; x++) r.set(x, r.h - 2, TILES.SOLID);

  // 几个平台
  // 矮台
  r.fillRect(6, r.h - 5, 4, 1, TILES.PLATFORM_SOLID);
  // 中台
  r.fillRect(13, r.h - 8, 5, 1, TILES.PLATFORM);
  // 高台
  r.fillRect(22, r.h - 11, 4, 1, TILES.PLATFORM_SOLID);
  // 阶梯
  r.fillRect(28, r.h - 4, 3, 1, TILES.PLATFORM_SOLID);
  r.fillRect(31, r.h - 6, 3, 1, TILES.PLATFORM_SOLID);
  r.fillRect(34, r.h - 8, 3, 1, TILES.PLATFORM_SOLID);

  // 一段尖刺
  for (let i = 0; i < 3; i++) r.set(18 + i, r.h - 3, TILES.SPIKES);

  // 出生点
  r.spawn = { x: 3 * TILE, y: (r.h - 4) * TILE };

  // 几个史莱姆（演示）
  r.entitiesInit.push({ type: 'slime', x: 14 * TILE, y: (r.h - 9) * TILE });
  r.entitiesInit.push({ type: 'slime', x: 32 * TILE, y: (r.h - 9) * TILE });

  return r;
}
