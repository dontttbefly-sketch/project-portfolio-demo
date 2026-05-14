// 图块类型与渲染
import { TILE, W, H } from '../config.js';
import { withAlpha } from '../art/palette.js';

export const TILES = {
  EMPTY: 0,
  SOLID: 1,
  PLATFORM: 2,
  PLATFORM_SOLID: 3,
  SPIKES: 4,
  WALL_FRAGILE: 5,
  LAVA: 6,
  GRASS: 7,
  CHECKPOINT: 8,
  EXIT_LEFT: 9,
  EXIT_RIGHT: 10,
  EXIT_UP: 11,
  EXIT_DOWN: 12,
  CRUMBLING: 13   // 踩上后 0.5s 消失，0.8s 后恢复（坠落平台）
};

// 每生物群落的前景调色板索引：必须明显区别于（紫色）背景
const FG_INDICES = {
  forest: { body: 13, bodyAlt: 12, topLight: 14, topMid: 13, sideHi: 14, shadow: 12, accent: 10 },
  lava:   { body:  5, bodyAlt:  4, topLight:  7, topMid:  6, sideHi:  7, shadow:  3, accent:  8 },
  temple: { body: 13, bodyAlt: 12, topLight: 14, topMid: 13, sideHi: 14, shadow: 12, accent:  7 }
};

// 各群落顶部装饰的相对绘制点 [dx, dy, w, h]
const ACCENT_DOTS = {
  forest: [[1, -1, 1, 1], [4, -1, 1, 1], [7, -2, 1, 2], [10, -1, 1, 1]],
  lava:   [[2, -1, 1, 1], [8, -1, 1, 1]],
  temple: [[0, -1, TILE, 1]]
};

// foregroundColors 缓存：避免每帧每瓦片重新分配 ~36k 个对象
const _fgCache = new Map();
function foregroundColors(biome, palette) {
  const key = biome + '|' + palette[0] + palette[5];
  let fg = _fgCache.get(key);
  if (fg) return fg;
  const idx = FG_INDICES[biome] || FG_INDICES.temple;
  fg = {
    body: palette[idx.body],
    bodyAlt: palette[idx.bodyAlt],
    topLight: palette[idx.topLight],
    topMid: palette[idx.topMid],
    sideHi: palette[idx.sideHi],
    shadow: palette[idx.shadow],
    accent: palette[idx.accent]
  };
  _fgCache.set(key, fg);
  return fg;
}

// 渲染单个图块。fg 由调用方（drawRoom）一次性算好传入，省每瓦片分配
export function drawTile(ctx, room, tx, ty, palette, biome, t, fg) {
  if (t === undefined) t = room.tiles[ty * room.w + tx];
  if (t === TILES.EMPTY) return;
  if (!fg) fg = foregroundColors(biome, palette);
  const x = tx * TILE;
  const y = ty * TILE;
  const rowBase = ty * room.w;

  switch (t) {
    case TILES.SOLID:
    case TILES.PLATFORM_SOLID: {
      ctx.fillStyle = fg.body; ctx.fillRect(x, y, TILE, TILE);

      const above = (ty > 0) ? room.tiles[rowBase - room.w + tx] : TILES.EMPTY;
      const below = (ty < room.h - 1) ? room.tiles[rowBase + room.w + tx] : TILES.SOLID;
      const isTop = (above === TILES.EMPTY || above === TILES.PLATFORM);

      if (isTop) {
        ctx.fillStyle = fg.topLight; ctx.fillRect(x, y, TILE, 1);
        ctx.fillStyle = fg.topMid;   ctx.fillRect(x, y + 1, TILE, 2);
        if (fg.accent) {
          ctx.fillStyle = fg.accent;
          const dots = ACCENT_DOTS[biome] || ACCENT_DOTS.temple;
          for (let i = 0; i < dots.length; i++) {
            const d = dots[i];
            ctx.fillRect(x + d[0], y + d[1], d[2], d[3]);
          }
        }
      }

      if (below === TILES.EMPTY || below === TILES.PLATFORM) {
        ctx.fillStyle = fg.shadow; ctx.fillRect(x, y + TILE - 2, TILE, 2);
      } else {
        ctx.fillStyle = fg.shadow; ctx.fillRect(x, y + TILE - 1, TILE, 1);
      }

      const left = (tx > 0) ? room.tiles[rowBase + tx - 1] : TILES.SOLID;
      const right = (tx < room.w - 1) ? room.tiles[rowBase + tx + 1] : TILES.SOLID;
      const leftEmpty = (left === TILES.EMPTY || left === TILES.PLATFORM);
      const rightEmpty = (right === TILES.EMPTY || right === TILES.PLATFORM);
      if (leftEmpty)  { ctx.fillStyle = fg.sideHi; ctx.fillRect(x, isTop ? y + 3 : y, 1, isTop ? TILE - 5 : TILE - 2); }
      if (rightEmpty) { ctx.fillStyle = fg.sideHi; ctx.fillRect(x + TILE - 1, isTop ? y + 3 : y, 1, isTop ? TILE - 5 : TILE - 2); }

      const noise = ((tx * 31 + ty * 17) ^ (tx + ty * 7)) & 0x7;
      if (noise < 3) {
        ctx.fillStyle = fg.bodyAlt;
        ctx.fillRect(x + 2 + (noise & 3), y + 4 + ((tx ^ ty) & 3), 2, 1);
      }
      break;
    }
    case TILES.PLATFORM: {
      ctx.fillStyle = fg.topLight; ctx.fillRect(x, y, TILE, 1);
      ctx.fillStyle = fg.topMid;   ctx.fillRect(x, y + 1, TILE, 2);
      ctx.fillStyle = fg.shadow;   ctx.fillRect(x, y + 3, TILE, 1);
      break;
    }
    case TILES.CRUMBLING: {
      // 危险红裂纹覆盖在普通 PLATFORM 上，闪烁警示
      ctx.fillStyle = fg.topMid;   ctx.fillRect(x, y, TILE, 3);
      ctx.fillStyle = '#cf6877';   // 红色裂纹
      const blink = Math.floor(Date.now() / 180) & 1;
      ctx.fillRect(x + 2, y + 1, 1, 1);
      ctx.fillRect(x + 5, y + 1, 1, 1);
      ctx.fillRect(x + 8, y + 1, 1, 1);
      if (blink) {
        ctx.fillStyle = '#fde9a8';
        ctx.fillRect(x + 4, y, 1, 1);
        ctx.fillRect(x + 7, y + 2, 1, 1);
      }
      break;
    }
    case TILES.SPIKES: {
      const base = palette[5];
      const tip = palette[7] || palette[6];
      ctx.fillStyle = base; ctx.fillRect(x, y + TILE - 3, TILE, 3);
      ctx.fillStyle = tip;
      for (let i = 0; i < 3; i++) {
        const sx = x + i * 4 + 1;
        ctx.fillRect(sx, y + 3, 1, TILE - 5);
        ctx.fillRect(sx - 1, y + 6, 3, TILE - 8);
        ctx.fillRect(sx, y + 1, 1, 2);
      }
      break;
    }
    case TILES.WALL_FRAGILE: {
      ctx.fillStyle = palette[4]; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = palette[6]; ctx.fillRect(x, y, TILE, 1);
      ctx.fillStyle = palette[3]; ctx.fillRect(x, y + TILE - 1, TILE, 1);
      ctx.fillStyle = palette[2];
      ctx.fillRect(x + 3, y + 2, 1, 4);
      ctx.fillRect(x + 4, y + 5, 1, 3);
      ctx.fillRect(x + 7, y + 4, 1, 5);
      ctx.fillRect(x + 8, y + 8, 1, 2);
      break;
    }
    case TILES.LAVA: {
      const a = palette[7] || palette[6], b = palette[6];
      ctx.fillStyle = b; ctx.fillRect(x, y, TILE, TILE);
      const ph = (Date.now() / 350 + tx * 0.7) % 1;
      ctx.fillStyle = a;
      ctx.fillRect(x, y + Math.floor(ph * 2), TILE, 2);
      ctx.fillRect(x + ((tx + ty) & 3) * 3, y + 4, 2, 1);
      break;
    }
    case TILES.CHECKPOINT:
      break;
  }
}

// 视域裁剪 + 相机平移（瓦片绘制使用世界坐标，靠 translate 转屏幕）
export function drawRoom(ctx, room, camX, camY, palette, biome) {
  const minTx = Math.max(0, Math.floor(camX / TILE));
  const minTy = Math.max(0, Math.floor(camY / TILE));
  const maxTx = Math.min(room.w - 1, Math.ceil((camX + W) / TILE));
  const maxTy = Math.min(room.h - 1, Math.ceil((camY + H) / TILE));
  const fg = foregroundColors(biome, palette);
  ctx.save();
  ctx.translate(-Math.round(camX), -Math.round(camY));
  for (let ty = minTy; ty <= maxTy; ty++) {
    const rowBase = ty * room.w;
    for (let tx = minTx; tx <= maxTx; tx++) {
      const t = room.tiles[rowBase + tx];
      if (t === TILES.EMPTY) continue;
      drawTile(ctx, room, tx, ty, palette, biome, t, fg);
    }
  }
  ctx.restore();
}

// 背景：天空渐变 + 视差山脉 + 颗粒
export function drawBackground(ctx, camX, camY, palette, biome, room) {
  // 渐变缓存到 room 上：每房间生成一次而非每帧
  let grad = room?._skyGrad;
  if (!grad || room._skyGradKey !== palette[0] + palette[1]) {
    grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, palette[0]);
    grad.addColorStop(0.6, palette[0]);
    grad.addColorStop(1, palette[1]);
    if (room) { room._skyGrad = grad; room._skyGradKey = palette[0] + palette[1]; }
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const seed = ((room?.id || 0) * 7919);
  for (let i = 0; i < 50; i++) {
    const sx = ((seed + i * 137) % W);
    const sy = ((seed + i * 223) % 180);
    const par = ((sx - camX * 0.10) % W + W) % W;
    const pyy = ((sy - camY * 0.10) % 180 + 180) % 180;
    ctx.fillStyle = withAlpha(palette[6], 0.10 + (i & 3) * 0.03);
    ctx.fillRect(par | 0, pyy | 0, 1, 1);
  }

  ctx.fillStyle = withAlpha(palette[1], 0.85);
  for (let i = 0; i < 10; i++) {
    const baseX = i * 60 - (camX * 0.18) % 60;
    const h = 36 + ((i * 41) % 22);
    ctx.fillRect(baseX, H - h, 36, h);
  }
  ctx.fillStyle = withAlpha(palette[1], 0.95);
  for (let i = 0; i < 7; i++) {
    const baseX = i * 80 - (camX * 0.30) % 80;
    const h = 60 + ((i * 53) % 30);
    ctx.fillRect(baseX, H - h, 50, h);
  }
}
