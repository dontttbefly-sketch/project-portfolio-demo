// 可达性验证：模拟玩家给定能力集能从 spawn 到达哪些 tile
//
// 简化模型：
//   • 只考虑"站立 tile"（脚下是 SOLID/PLATFORM_SOLID/PLATFORM 的空 tile）
//   • 从一个站立 tile 跳到另一个站立 tile，距离上限取决于能力集
//     - 单跳：|dx| ≤ 5、dy ∈ [-3, 任意大]（向下不限）
//     - 双跳：|dx| ≤ 10、dy ∈ [-6, 任意大]
//     - 冲刺跳：|dx| ≤ 9、dy ∈ [-3, 任意大]
//     - 冲刺 + 双跳：|dx| ≤ 11、dy ∈ [-6, 任意大]
//   • 不精确建模跳跃弧线被天花板/墙阻挡的情况；房间手工设计应避开
//   • 横向走动（同高度或台阶 ±1）总能走

import { TILES } from './tile.js';
import { TILE } from '../config.js';

// 可站立判定：tile 本身可占据（EMPTY），下面是支撑
function isStandable(room, tx, ty) {
  if (tx < 0 || tx >= room.w || ty < 0 || ty >= room.h - 1) return false;
  const here = room.tiles[ty * room.w + tx];
  if (here !== TILES.EMPTY) return false;
  const below = room.tiles[(ty + 1) * room.w + tx];
  return below === TILES.SOLID || below === TILES.PLATFORM_SOLID
      || below === TILES.PLATFORM || below === TILES.CRUMBLING;
}

// 同高度水平走动是否畅通（单跳能跨小空隙，简化）
function isWalkable(room, tx, ty) {
  if (tx < 0 || tx >= room.w || ty < 0 || ty >= room.h) return false;
  const here = room.tiles[ty * room.w + tx];
  return here === TILES.EMPTY || here === TILES.PLATFORM;
}

function jumpRange(abilities) {
  const hasJump = !!abilities.jump;
  const hasDouble = !!abilities.doubleJump;
  const hasDash = !!abilities.dash;
  if (!hasJump) return { dxMax: 1, dyUp: 0 };
  let dxMax = 5, dyUp = 3;
  if (hasDouble) { dxMax = 10; dyUp = 6; }
  if (hasDash) { dxMax = Math.max(dxMax, 9); }
  if (hasDouble && hasDash) { dxMax = 11; dyUp = 6; }
  return { dxMax, dyUp };
}

// 把一段水平连续可站立 tile 视作"踏板"（同 y、连续 x），返回 [踏板] 列表
function findFootings(room) {
  const footings = [];
  for (let ty = 1; ty < room.h - 1; ty++) {
    let runStart = -1;
    for (let tx = 0; tx < room.w; tx++) {
      if (isStandable(room, tx, ty)) {
        if (runStart === -1) runStart = tx;
      } else {
        if (runStart !== -1) {
          footings.push({ y: ty, x0: runStart, x1: tx - 1 });
          runStart = -1;
        }
      }
    }
    if (runStart !== -1) footings.push({ y: ty, x0: runStart, x1: room.w - 1 });
  }
  return footings;
}

// BFS 从 spawn 出发，返回所有可达 tile 集合（key = "tx,ty"）
export function reachableTiles(room, spawnTile, abilities) {
  const reach = new Set();
  const queue = [];
  const start = `${spawnTile.tx},${spawnTile.ty}`;
  reach.add(start);
  queue.push({ tx: spawnTile.tx, ty: spawnTile.ty });
  const range = jumpRange(abilities);
  const footings = findFootings(room);
  while (queue.length) {
    const cur = queue.shift();
    // 1) 同踏板水平移动：把整个踏板加入 reach
    for (const f of footings) {
      if (f.y !== cur.ty) continue;
      if (cur.tx < f.x0 - 1 || cur.tx > f.x1 + 1) continue;
      for (let x = f.x0; x <= f.x1; x++) {
        const k = `${x},${f.y}`;
        if (!reach.has(k)) {
          reach.add(k);
          queue.push({ tx: x, ty: f.y });
        }
      }
    }
    // 2) 跳/落到其他踏板
    for (const f of footings) {
      const dy = f.y - cur.ty;
      if (-dy > range.dyUp) continue;        // 跳得太高
      // 横向：找最近的可达 x（限制在 [f.x0, f.x1]）
      const nearestX = Math.max(f.x0, Math.min(f.x1, cur.tx));
      const dx = Math.abs(nearestX - cur.tx);
      if (dx > range.dxMax) continue;
      // 简化：能到这个最近点，就把整段踏板加入
      for (let x = f.x0; x <= f.x1; x++) {
        const k = `${x},${f.y}`;
        if (!reach.has(k)) {
          reach.add(k);
          queue.push({ tx: x, ty: f.y });
        }
      }
    }
    // 3) 直接下落（穿过 platform 例外，简化为：任意低于当前的同列踏板可达）
    for (let ty = cur.ty + 1; ty < room.h - 1; ty++) {
      if (isStandable(room, cur.tx, ty)) {
        const k = `${cur.tx},${ty}`;
        if (!reach.has(k)) { reach.add(k); queue.push({ tx: cur.tx, ty }); }
        break;
      }
      // 中途撞实心则停止（不能穿透）
      const here = room.tiles[ty * room.w + cur.tx];
      if (here === TILES.SOLID || here === TILES.PLATFORM_SOLID) break;
    }
  }
  return reach;
}

// 把世界坐标的 spawn 点（{x,y} 像素）转成站立 tile（向下找最近落脚）
export function spawnToTile(room, spawn) {
  const tx = Math.floor((spawn.x + 4) / TILE);
  let ty = Math.floor(spawn.y / TILE);
  for (let probe = ty; probe < room.h - 1; probe++) {
    if (isStandable(room, tx, probe)) return { tx, ty: probe };
  }
  // 兜底：找最近的可站立 tile
  for (let ty2 = 1; ty2 < room.h - 1; ty2++) {
    if (isStandable(room, tx, ty2)) return { tx, ty: ty2 };
  }
  return { tx, ty: Math.max(1, ty) };
}

// 把"重要点"（出口/圣坛/拾取）转成"玩家需要站到的位置"
// 出口本身是墙洞不可站；找最近的 standable tile：左右出口=邻列，上下出口=同列上下
export function targetsForRoom(room) {
  const targets = [];
  for (const ex of room.exits || []) {
    let tx = ex.x, ty = ex.y;
    if (ex.dir === 'left') tx = 1;
    else if (ex.dir === 'right') tx = room.w - 2;
    if (ex.dir === 'up') {
      // 找出口下方 ≤ 6 tile 内最高的可站立点（玩家从那一跳进入口）
      for (let probe = 2; probe < Math.min(room.h - 1, ty + 8); probe++) {
        if (isStandable(room, tx, probe)) { ty = probe; break; }
      }
    } else if (ex.dir === 'down') {
      // 下出口：玩家在邻列地面走到洞口边缘掉下去；找 ex.x±1 列最近地面
      let found = false;
      for (const dx of [-1, 1, 0, -2, 2]) {
        const cx = ex.x + dx;
        if (cx < 1 || cx >= room.w - 1) continue;
        for (let probe = 1; probe < room.h - 1; probe++) {
          if (isStandable(room, cx, probe)) { tx = cx; ty = probe; found = true; break; }
        }
        if (found) break;
      }
    } else {
      // 左右出口：找该列最近 standable
      for (let probe = ty; probe < room.h - 1; probe++) {
        if (isStandable(room, tx, probe)) { ty = probe; break; }
      }
    }
    targets.push({ tx, ty, kind: 'exit', meta: ex });
  }
  for (const prop of room.props || []) {
    if (prop.kind === 'shrine' || prop.kind === 'flask' || prop.kind === 'bonfire') {
      const tx = Math.floor((prop.x + 4) / TILE);
      let ty = Math.floor(prop.y / TILE);
      for (let probe = ty; probe < room.h - 1; probe++) {
        if (isStandable(room, tx, probe)) { ty = probe; break; }
      }
      targets.push({ tx, ty, kind: prop.kind, meta: prop });
    }
  }
  return targets;
}

// 校验：spawn 到所有重要点都可达
export function validate(room, abilities) {
  if (!room.spawn) return { ok: true, missing: [] };
  const spawnTile = spawnToTile(room, room.spawn);
  const reach = reachableTiles(room, spawnTile, abilities);
  const targets = targetsForRoom(room);
  const missing = [];
  for (const t of targets) {
    let ok = false;
    // 允许周围 1 tile 容差
    for (let dx = -1; dx <= 1 && !ok; dx++) {
      for (let dy = -1; dy <= 1 && !ok; dy++) {
        if (reach.has(`${t.tx + dx},${t.ty + dy}`)) ok = true;
      }
    }
    if (!ok) missing.push(t);
  }
  return { ok: missing.length === 0, missing, reachSize: reach.size };
}
