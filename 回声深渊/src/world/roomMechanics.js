// 主题房间的动态机制：pulsing_lava / wind / rising_lava / mirror_ghost / darkness / inverted_gravity
// 还有全房间通用的 crumbling 平台机制
import { TILES } from './tile.js';
import { TILE, W, H } from '../config.js';
import { withAlpha } from '../art/palette.js';

const CRUMBLE_DELAY = 0.5;
const CRUMBLE_RESTORE = 0.8;

// 进入房间时初始化机制运行时状态
export function initRoomMechanic(room) {
  if (!room.mechanic) return;
  const m = room.mechanic;
  m.t = 0;
  if (m.kind === 'pulsing_lava') {
    // 备份 base 状态范围内的原瓦片，以便涨落时可逆
    m._snapshot = snapshotRows(room, Math.min(m.peakY, m.baseY) - 1, Math.max(m.peakY, m.baseY) + 1, m.x0, m.x1);
  } else if (m.kind === 'rising_lava') {
    m.curY = m.startY;
    m._snapshot = snapshotRows(room, Math.min(m.startY, m.endY), Math.max(m.startY, m.endY), m.x0, m.x1);
  } else if (m.kind === 'inverted_gravity') {
    m.activated = false;
  }
}

// 每帧 tick：返回 player 应受的额外 vx/vy/状态修改
export function updateRoomMechanic(room, dt, ctx) {
  if (!room) return;
  // 通用：CRUMBLING 平台总是 tick（不依赖 mechanic 配置）
  tickCrumbling(room, dt, ctx);
  if (!room.mechanic) return;
  const m = room.mechanic;
  m.t = (m.t || 0) + dt;
  if (m.kind === 'pulsing_lava') tickPulsingLava(room, m);
  else if (m.kind === 'rising_lava') tickRisingLava(room, m, dt);
  else if (m.kind === 'wind') tickWind(room, m, ctx);
  else if (m.kind === 'mirror_ghost') tickMirrorGhost(room, m, ctx);
  else if (m.kind === 'inverted_gravity') tickInvertedGravity(room, m, ctx);
  else if (m.kind === 'horizontal_lava_chase') tickHorizontalLava(room, m, dt, ctx);
  else if (m.kind === 'bullet_curtain') tickBulletCurtain(room, m, dt, ctx);
}

// ================ crumbling 平台 ================
// 玩家踩上后 0.5s 消失，0.8s 后恢复（原地是 CRUMBLING tile）
function tickCrumbling(room, dt, ctx) {
  const player = ctx.player;
  if (!player || player.dead) return;
  if (!room._crumbState) room._crumbState = new Map();
  const state = room._crumbState;

  // 玩家脚下 tile —— 检查 player 占据的 2 列下方一行
  const feetY = Math.floor((player.y + player.h) / TILE);
  const px0 = Math.floor(player.x / TILE);
  const px1 = Math.floor((player.x + player.w - 1) / TILE);
  for (let tx = px0; tx <= px1; tx++) {
    const ty = feetY;
    if (ty < 0 || ty >= room.h) continue;
    const t = room.tiles[ty * room.w + tx];
    const key = `${tx},${ty}`;
    if (t === TILES.CRUMBLING && !state.has(key)) {
      state.set(key, { phase: 'shake', timer: 0 });
      ctx.particles?.burst?.(tx * TILE + 6, ty * TILE + 4, 4, {
        color: '#cf6877', speedMin: 10, speedMax: 30, life: 0.3
      });
    }
  }

  // 推进所有触发中的 crumble
  for (const [key, s] of state) {
    s.timer += dt;
    const [tx, ty] = key.split(',').map(Number);
    const idx = ty * room.w + tx;
    if (s.phase === 'shake' && s.timer >= CRUMBLE_DELAY) {
      // 真正消失
      room.tiles[idx] = TILES.EMPTY;
      s.phase = 'broken';
      s.timer = 0;
      ctx.particles?.burst?.(tx * TILE + 6, ty * TILE + 6, 8, {
        color: '#7d5e8a', speedMin: 30, speedMax: 80, life: 0.4, shrink: true
      });
    } else if (s.phase === 'broken' && s.timer >= CRUMBLE_RESTORE) {
      // 恢复
      room.tiles[idx] = TILES.CRUMBLING;
      state.delete(key);
    }
  }
}

// 渲染叠加（黑暗 / 风向指示等）— 在 entity 渲染之后调用
export function renderRoomMechanic(ctx, room, camX, camY, player) {
  if (!room || !room.mechanic) return;
  const m = room.mechanic;
  if (m.kind === 'darkness') drawDarkness(ctx, m, camX, camY, player, room);
  else if (m.kind === 'wind') drawWindHint(ctx, m, room);
}

// ================ pulsing_lava ================
function tickPulsingLava(room, m) {
  // 余弦曲线驱动当前 lava 顶端 Y
  const phase = (m.t / m.period) * Math.PI * 2;
  const wave = (1 - Math.cos(phase)) / 2;  // 0..1
  const topY = Math.round(m.baseY - wave * (m.baseY - m.peakY));
  // 把 baseY..topY 之间的瓦片置为 LAVA；topY 以上恢复为快照
  const minY = Math.min(m.baseY, m.peakY) - 1;
  const maxY = Math.max(m.baseY, m.peakY) + 1;
  for (let y = minY; y <= maxY; y++) {
    for (let x = m.x0; x <= m.x1; x++) {
      const idx = y * room.w + x;
      const orig = m._snapshot[(y - minY) * (m.x1 - m.x0 + 1) + (x - m.x0)];
      if (y >= topY && y <= m.baseY) {
        if (orig === TILES.EMPTY) room.tiles[idx] = TILES.LAVA;
      } else {
        room.tiles[idx] = orig;
      }
    }
  }
}

// ================ horizontal_lava_chase ================
// 熔岩从 startX 向 endX 推进；推进过的列在指定 Y 行变 LAVA
function tickHorizontalLava(room, m, dt, ctx) {
  if (m._snapshot === undefined) {
    m.curX = m.startX;
    m._snapshot = snapshotRows(room, m.y0, m.y1, Math.min(m.startX, m.endX), Math.max(m.startX, m.endX));
  }
  const dir = m.endX < m.startX ? -1 : 1;
  m.curX += dir * (m.speed || 30) * dt;
  const cur = Math.round(m.curX);
  const minX = Math.min(m.startX, m.endX);
  const maxX = Math.max(m.startX, m.endX);
  for (let x = m.startX; dir > 0 ? x <= cur : x >= cur; x += dir) {
    if (x < 1 || x >= room.w - 1) continue;
    for (let y = m.y0; y <= m.y1; y++) {
      const idx = y * room.w + x;
      const orig = m._snapshot[(y - m.y0) * (maxX - minX + 1) + (x - minX)];
      if (orig === TILES.EMPTY || orig === TILES.PLATFORM) {
        room.tiles[idx] = TILES.LAVA;
      }
    }
  }
}

// ================ bullet_curtain ================
// 周期性从两端发射横向弹幕
function tickBulletCurtain(room, m, dt, ctx) {
  m._spawnTimer = (m._spawnTimer || 0) + dt;
  if (m._spawnTimer < (m.period || 1.2)) return;
  m._spawnTimer = 0;
  if (!ctx.spawnEnemyProjectile) return;
  const lanes = m.lanes || [];
  for (const ly of lanes) {
    // 从左端打向右
    ctx.spawnEnemyProjectile(2 * TILE, ly * TILE + 6, m.speed || 100, 0, {
      kind: 'bullet', color: '#cf6877', life: 4
    });
    // 从右端打向左
    ctx.spawnEnemyProjectile((room.w - 2) * TILE, ly * TILE + 6, -(m.speed || 100), 0, {
      kind: 'bullet', color: '#cf6877', life: 4
    });
  }
}

// ================ rising_lava ================
function tickRisingLava(room, m, dt) {
  const ratio = Math.min(1, m.t / m.duration);
  const targetY = Math.round(m.startY - ratio * (m.startY - m.endY));
  if (targetY === m.curY) return;
  m.curY = targetY;
  // 把当前 curY 以下到底部都填 LAVA（保留快照之外的原状）
  for (let y = m.startY; y >= m.curY; y--) {
    for (let x = m.x0; x <= m.x1; x++) {
      const orig = m._snapshot[(y - Math.min(m.startY, m.endY)) * (m.x1 - m.x0 + 1) + (x - m.x0)];
      if (orig === TILES.EMPTY) room.tiles[y * room.w + x] = TILES.LAVA;
    }
  }
}

// ================ wind ================
function tickWind(room, m, ctx) {
  // 由 t 推导风向
  const dirCycles = Math.floor(m.t / m.period);
  m.direction = dirCycles % 2 === 0 ? 1 : -1;
  // 给玩家在此房间一个横向附加速度
  if (ctx.player && !ctx.player.dead) {
    ctx.player.vx += m.direction * m.strength * (ctx._dt || 1 / 60);
  }
}

function drawWindHint(ctx, m, room) {
  // 屏幕角落标识当前风向
  const dir = m.direction || 1;
  ctx.font = '8px monospace';
  ctx.fillStyle = withAlpha('#cba0d6', 0.7);
  ctx.fillText(dir > 0 ? '风 →' : '← 风', W / 2 - 12, 14);
}

// ================ mirror_ghost ================
function tickMirrorGhost(room, m, ctx) {
  m.spawnTimer = (m.spawnTimer || 0) + (ctx._dt || 1 / 60);
  if (m.spawnTimer >= m.period) {
    m.spawnTimer = 0;
    if (ctx.player && !ctx.player.dead) {
      // 从房间中央朝玩家发射一道镜像幽灵投射物
      const cx = (room.w / 2) * TILE;
      const cy = ctx.player.y;
      const dx = ctx.player.x - cx;
      const dy = ctx.player.y - cy;
      const d = Math.max(1, Math.hypot(dx, dy));
      ctx.spawnEnemyProjectile?.(cx, cy, (dx / d) * 90, (dy / d) * 90, {
        kind: 'mirror', color: '#cba0d6', life: 3.0, dmg: m.damage || 1
      });
    }
  }
}

// ================ darkness ================
function drawDarkness(ctx, m, camX, camY, player, room) {
  if (!player) return;
  const cx = player.centerX() - camX;
  const cy = player.centerY() - camY;
  const r = m.radius || 80;
  // 全屏黑色，挖一个圆形可见区
  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${1 - (m.ambient || 0)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // 回声发光：扫描 entities 找 echo 类，画光圈
  ctx.globalCompositeOperation = 'lighter';
  for (const e of (room._echoEntities || [])) {
    const ex = e.centerX() - camX;
    const ey = e.centerY() - camY;
    const lr = 28;
    const lg = ctx.createRadialGradient(ex, ey, 0, ex, ey, lr);
    lg.addColorStop(0, 'rgba(203, 160, 214, 0.8)');
    lg.addColorStop(1, 'rgba(203, 160, 214, 0)');
    ctx.fillStyle = lg;
    ctx.fillRect(ex - lr, ey - lr, lr * 2, lr * 2);
  }
  ctx.restore();
}

// ================ inverted_gravity ================
function tickInvertedGravity(room, m, ctx) {
  if (m.activated) return;
  if (ctx.player && ctx.player.x / TILE > m.triggerX) {
    m.activated = true;
    if (ctx.player) ctx.player.gravityScale = -1;
    ctx.showToast?.('重力翻转！', 2.0);
    ctx.cam?.shake?.(8, 0.6);
  }
}

// 离开房间时复原（player gravity etc.）
export function teardownRoomMechanic(room, ctx) {
  if (!room || !room.mechanic) return;
  const m = room.mechanic;
  if (m.kind === 'inverted_gravity' && ctx.player) {
    ctx.player.gravityScale = 1;
  }
  if (m.kind === 'pulsing_lava' && m._snapshot) restoreSnapshot(room, m, m._snapshot);
  if (m.kind === 'rising_lava' && m._snapshot) restoreSnapshot(room, m, m._snapshot);
}

// ================ utils ================
function snapshotRows(room, y0, y1, x0, x1) {
  const buf = new Uint8Array((y1 - y0 + 1) * (x1 - x0 + 1));
  let i = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      buf[i++] = room.tiles[y * room.w + x];
    }
  }
  return buf;
}

function restoreSnapshot(room, m, buf) {
  const minY = m.kind === 'pulsing_lava' ? Math.min(m.baseY, m.peakY) - 1 : Math.min(m.startY, m.endY);
  const maxY = m.kind === 'pulsing_lava' ? Math.max(m.baseY, m.peakY) + 1 : Math.max(m.startY, m.endY);
  let i = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = m.x0; x <= m.x1; x++) {
      room.tiles[y * room.w + x] = buf[i++];
    }
  }
}
