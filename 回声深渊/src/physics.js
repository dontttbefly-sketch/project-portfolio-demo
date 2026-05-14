// 物理：AABB 与瓦片碰撞，分离轴扫描
import { GRAVITY, MAX_FALL, TILE } from './config.js';
import { TILES } from './world/tile.js';

// entity 接口：x, y, w, h, vx, vy, onGround, againstWall, isPlayer
export function applyPhysics(ent, dt, room) {
  ent.vy = Math.min(MAX_FALL, ent.vy + (ent.gravityScale ?? 1) * GRAVITY * dt);
  // X
  ent.x += ent.vx * dt;
  resolveX(ent, room);
  // Y
  ent.y += ent.vy * dt;
  resolveY(ent, room);
}

function isSolid(tile) {
  return tile === TILES.SOLID
      || tile === TILES.PLATFORM_SOLID
      || tile === TILES.WALL_FRAGILE
      || tile === TILES.CRUMBLING;
}
function isHazard(tile) {
  return tile === TILES.SPIKES || tile === TILES.LAVA;
}
function isOneWay(tile) {
  return tile === TILES.PLATFORM;
}

function tileAt(room, tx, ty) {
  if (!room) return TILES.SOLID;
  if (tx < 0 || tx >= room.w || ty < 0 || ty >= room.h) return TILES.SOLID;
  return room.tiles[ty * room.w + tx];
}

function resolveX(ent, room) {
  const minTx = Math.floor(ent.x / TILE);
  const maxTx = Math.floor((ent.x + ent.w - 1) / TILE);
  const minTy = Math.floor(ent.y / TILE);
  const maxTy = Math.floor((ent.y + ent.h - 1) / TILE);
  ent.againstWall = 0;
  ent.touchingHazard = ent.touchingHazard || false;

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const t = tileAt(room, tx, ty);
      if (isSolid(t)) {
        if (ent.vx > 0) {
          ent.x = tx * TILE - ent.w;
          ent.againstWall = 1;
          ent.vx = 0;
        } else if (ent.vx < 0) {
          ent.x = (tx + 1) * TILE;
          ent.againstWall = -1;
          ent.vx = 0;
        }
        return;
      } else if (isHazard(t)) {
        ent.touchingHazard = t;
      }
    }
  }
}

function resolveY(ent, room) {
  const minTx = Math.floor(ent.x / TILE);
  const maxTx = Math.floor((ent.x + ent.w - 1) / TILE);
  const minTy = Math.floor(ent.y / TILE);
  const maxTy = Math.floor((ent.y + ent.h - 1) / TILE);
  const wasOnGround = ent.onGround;
  ent.onGround = false;

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const t = tileAt(room, tx, ty);
      if (isSolid(t)) {
        if (ent.vy > 0) {
          ent.y = ty * TILE - ent.h;
          ent.onGround = true;
          ent.vy = 0;
        } else if (ent.vy < 0) {
          ent.y = (ty + 1) * TILE;
          ent.vy = 0;
        }
        return;
      } else if (isOneWay(t)) {
        // 单向平台 — 仅当从上方下落且非主动下穿
        if (ent.vy > 0 && !ent.dropThrough) {
          const platformTopY = ty * TILE;
          // entity 的脚必须刚好越过 platformTopY 才视为落上去
          const prevBottom = ent.y + ent.h - ent.vy * 0.0167;
          if (prevBottom <= platformTopY + 1) {
            ent.y = platformTopY - ent.h;
            ent.onGround = true;
            ent.vy = 0;
            return;
          }
        }
      } else if (isHazard(t)) {
        ent.touchingHazard = t;
      }
    }
  }
  // 落地缓冲检测：如果 onGround 仍然 false，但脚下一格是地，也算 onGround（防抖）
  if (!ent.onGround && wasOnGround && ent.vy === 0) {
    const footY = Math.floor((ent.y + ent.h) / TILE);
    for (let tx = minTx; tx <= maxTx; tx++) {
      const t = tileAt(room, tx, footY);
      if (isSolid(t) || isOneWay(t)) {
        ent.onGround = true;
        break;
      }
    }
  }
}

// 简易点 vs 矩形测试 (用于子弹)
export function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}
