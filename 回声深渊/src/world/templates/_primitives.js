// 模板共享原语：清空内部、铺地板、放平台、放陷阱、放敌人、放道具
import { TILES } from '../tile.js';
import { TILE } from '../../config.js';

// 清空房间内部（保留 1 像素边框）
export function clearInterior(r) {
  for (let y = 1; y < r.h - 1; y++) {
    for (let x = 1; x < r.w - 1; x++) {
      r.set(x, y, TILES.EMPTY);
    }
  }
}

// 铺一段连续地面：[x0, x1] 列，地表在 floorY（floorY 行及以下都是 SOLID）
export function placeFloor(r, x0, x1, floorY) {
  for (let x = x0; x <= x1; x++) {
    for (let y = floorY; y < r.h - 1; y++) r.set(x, y, TILES.SOLID);
  }
}

// 平台：水平条，y 处一行，[x0, x1] 列
// kind: 'platform'（单向）| 'solid'（双向）
export function placePlatform(r, x0, x1, y, kind = 'solid') {
  const t = kind === 'solid' ? TILES.PLATFORM_SOLID : TILES.PLATFORM;
  for (let x = x0; x <= x1; x++) {
    if (x > 0 && x < r.w - 1 && y > 0 && y < r.h - 1) r.set(x, y, t);
  }
}

// 尖刺：[x0, x1] 列在 y 行
export function placeSpikes(r, x0, x1, y) {
  for (let x = x0; x <= x1; x++) {
    if (x > 0 && x < r.w - 1) r.set(x, y, TILES.SPIKES);
  }
}

// 脆弱墙：从 (x, y) 向上 h 格
export function placeFragileWall(r, x, y, h = 2) {
  for (let i = 0; i < h; i++) r.set(x, y - i, TILES.WALL_FRAGILE);
}

// 熔岩坑：[x0, x1] 列在 y 行
export function placeLava(r, x0, x1, y) {
  for (let x = x0; x <= x1; x++) r.set(x, y, TILES.LAVA);
}

// 实体：tile 坐标 → 像素 + 类型
export function placeEnemy(r, type, tx, ty) {
  r.entitiesInit.push({ type, x: tx * TILE, y: ty * TILE });
}

// 道具：篝火 / 治疗瓶 / 圣坛 / lore 石
export function placeBonfire(r, tx, ty) {
  r.props.push({ kind: 'bonfire', x: tx * TILE, y: ty * TILE });
}
export function placeFlask(r, tx, ty) {
  r.props.push({ kind: 'flask', x: tx * TILE, y: ty * TILE });
}
export function placeShrine(r, tx, ty, ability) {
  const prop = { kind: 'shrine', x: tx * TILE, y: ty * TILE };
  if (ability) prop.ability = ability;
  r.props.push(prop);
}
export function placeLore(r, tx, ty, text) {
  r.props.push({ kind: 'lore', x: tx * TILE, y: ty * TILE, text });
}

// 出生点（标准在某 tile 上 1-2 格）
export function setSpawn(r, tx, ty) {
  r.spawn = { x: tx * TILE, y: (ty - 1) * TILE };
}

// 找一段连续地面的中点
export function findFloorTop(r, tx) {
  for (let ty = 2; ty < r.h - 1; ty++) {
    if (r.tiles[ty * r.w + tx] === TILES.SOLID) return ty;
  }
  return r.h - 2;
}
