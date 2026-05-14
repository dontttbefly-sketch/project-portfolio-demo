// 程序化关卡生成 — 保证可达性
//
// 玩家能力：
//   • 跳高 ~3 格 (peak 40px / TILE 12px)
//   • 跳远 ~5 格 (滞空 0.6s × 速度 110 = 66px)
//   • 冲刺 ~4 格水平 (DASH_VEL 280 × 0.18s = 50px)
//   • 起跳到达 +3 高的平台水平距离 ~3 格
//
// 设计规则：
//   • 主地面：平滑变化（每数列 ±1 高度），方便横向通行
//   • 平台：成"台阶链" — 每级 ≤+3 高、≤+3 跨距，玩家可从地面拾级而上
//   • 冲刺缺口：仅 depth ≥ 2 出现；缺口 5-7 格，需冲刺跳
//   • 上行出口：自动加台阶链通往顶部开口

import { Room } from './room.js';
import { TILES } from './tile.js';
import { GEN, TILE, ZONES, ABILITY_SHRINES, ROOM_TEMPLATES, SECRET_TEMPLATE_POOL } from '../config.js';
import { RNG } from '../util.js';
import { validate } from './reachability.js';
import { pickTemplate, getTemplateById } from './templates/index.js';

function zoneOf(roomIndex) {
  for (const z of ZONES) {
    if (roomIndex >= z.rooms[0] && roomIndex <= z.rooms[1]) return z;
  }
  return ZONES[ZONES.length - 1];
}

// 主线房间索引：从 'room-N' 提取 N，用于 zone 查询；秘密房从其父 'room-N' 继承
function indexOf(id) {
  const m = /^room-(\d+)/.exec(id);
  if (m) return parseInt(m[1], 10);
  const m2 = /^room-secret-(\d+)/.exec(id);
  if (m2) return parseInt(m2[1], 10);
  return 0;
}

// 可达常量（块为单位，留出余裕）
const REACH = {
  JUMP_UP: 3,        // 安全上跳高度
  JUMP_ACROSS: 4,    // 安全跨度
  DASH_GAP_MIN: 5,   // 冲刺缺口下限
  DASH_GAP_MAX: 7    // 冲刺缺口上限
};

export function generateLevel(seed) {
  const rng = new RNG(seed);
  const layout = sketchGraph(rng);
  const rooms = new Map();
  for (const node of layout.nodes) {
    const z = zoneOf(indexOf(node.id));
    rooms.set(node.id, generateRoom(rng, node, z));
  }
  wireExits(rooms, layout, rng);
  // 按主线顺序 finalize，让"上一间是不是 echo 房 / 上一间用了什么模板"可以传递下去
  const sortedIds = [...rooms.keys()].sort((a, b) => indexOf(a) - indexOf(b));
  let prevEcho = false;
  let prevId = null;
  for (const id of sortedIds) {
    const r = rooms.get(id);
    r._prevTemplateRequiresEcho = prevEcho;
    r._prevTemplateId = prevId;
    finalize(rng, r);
    if (!id.startsWith('room-secret')) {
      prevEcho = !!r.templateRequiresEcho;
      if (r.templateId) prevId = r.templateId;
    }
  }

  // 可达性校验：发现不可达就尝试修复（标记需要 echo / wall-climb 的模板跳过）
  for (const r of rooms.values()) {
    if (r.templateRequiresEcho || r.templateRequiresWallClimb) continue;
    const result = validate(r, r.zoneAbilities || ZONES[0].abilities);
    if (!result.ok) {
      repairUnreachable(r, result.missing);
      r.repaired = true;
    }
  }

  // 校验跨房间 targetSpawn 落点：尽量保留空间连续性
  // —— 不安全时先在 ±5 tile 内找最近的天然落脚点；都没有再就地建 catch 平台
  for (const r of rooms.values()) {
    for (const ex of r.exits) {
      if (!ex.targetSpawn) continue;
      const tr = rooms.get(ex.target);
      if (!tr) continue;
      if (isSpawnSafe(tr, ex.targetSpawn)) continue;
      const near = findSafeSpawnNearby(tr, ex.targetSpawn);
      if (near) {
        ex.targetSpawn = near;
      } else {
        buildCatchPlatform(tr, ex.targetSpawn, ex.dir);
      }
    }
  }
  for (const r of rooms.values()) {
    for (const ex of r.exits) {
      if (ex.dir === 'up' || ex.dir === 'down') r.clearVerticalExitShaft(ex);
    }
  }

  return { rooms, startId: layout.startId, bossId: layout.bossId, seed, layout };
}

// 秘密房通关奖励：圣坛 + flask + 一块叙事石碑（每个秘密房一句独特 lore）
const SECRET_LORE = [
  '"我在这里看见了真正的自己…然后逃走了。"',
  '"深井之底有人在等。是我，也是你。"',
  '"重力是骗局。规则之下还有规则。"',
  '"墙不是终点，是另一个我。"',
  '"回声从不会真正消散，它只是换了载体。"'
];
function addSecretReward(r, rng) {
  const entryExit = r.exits[0];
  let farX = 4;
  if (entryExit && entryExit.dir === 'left') {
    farX = r.w - 5;
  } else if (entryExit && (entryExit.dir === 'up' || entryExit.dir === 'down')) {
    const dir = entryExit.x < r.w / 2 ? 1 : -1;
    farX = clamp(entryExit.x + dir * 5, 4, r.w - 5);
  }
  let gy = -1;
  for (let y = 2; y < r.h - 1; y++) {
    if (r.tiles[y * r.w + farX] === TILES.SOLID) { gy = y; break; }
  }
  if (gy < 0) gy = r.h - 3;
  const ability = rng.chance(0.5) ? 'maxHp' : 'flask';
  r.props.push({ kind: 'shrine', x: farX * TILE, y: (gy - 1) * TILE, ability });
  r.props.push({ kind: 'flask', x: (farX + 2) * TILE, y: (gy - 1) * TILE });
  // 叙事石碑
  const text = SECRET_LORE[rng.int(0, SECRET_LORE.length - 1)];
  const loreX = (entryExit && entryExit.dir === 'left') ? farX - 3 : farX + 3;
  r.props.push({ kind: 'lore', x: loreX * TILE, y: (gy - 1) * TILE, text });
}

// 模板清空内部后水平出口可能悬空。
// 把出口锚定到 spawn 同层，从墙边铺一段 SOLID 通到屋内最近实心，保证站立连通
function ensureSideExitPlatforms(r) {
  const spawnFloorY = r.spawn ? Math.floor(r.spawn.y / TILE) + 1 : (r.h - 3);
  for (const ex of r.exits) {
    if (ex.dir !== 'left' && ex.dir !== 'right') continue;
    const supportY = Math.min(r.h - 2, Math.max(3, spawnFloorY));
    const isLeft = ex.dir === 'left';
    // 沿 supportY 行从墙边向内扫，遇到 SOLID/PLATFORM_SOLID 停；中间空段用 SOLID 填
    const wallX = isLeft ? 1 : r.w - 2;
    const step = isLeft ? 1 : -1;
    for (let x = wallX; x > 0 && x < r.w - 1; x += step) {
      const cur = r.tiles[supportY * r.w + x];
      if (cur === TILES.SOLID || cur === TILES.PLATFORM_SOLID) break;
      if (cur === TILES.EMPTY || cur === TILES.PLATFORM) {
        r.set(x, supportY, TILES.SOLID);
      }
    }
    // 下方一格也补 SOLID 让站台不像浮空线
    const below = supportY + 1;
    if (below < r.h - 1) {
      for (let x = wallX; x > 0 && x < r.w - 1; x += step) {
        const cur = r.tiles[supportY * r.w + x];
        const cb = r.tiles[below * r.w + x];
        if (cur !== TILES.SOLID) break;
        if (cb === TILES.EMPTY || cb === TILES.PLATFORM) {
          r.set(x, below, TILES.SOLID);
        }
      }
    }
    ex.y = supportY - 1;
  }
}

// 下出口：保证 ex.x 邻列有地面可以走到洞边
function ensureDownExitFloor(r, exitX) {
  const yFloor = r.h - 4;
  for (const dx of [-4, -3, -2, 2, 3, 4]) {
    const cx = exitX + dx;
    if (cx < 1 || cx >= r.w - 1) continue;
    const cur = r.tiles[yFloor * r.w + cx];
    if (cur === TILES.EMPTY || cur === TILES.PLATFORM) {
      r.set(cx, yFloor, TILES.PLATFORM_SOLID);
    }
  }
}

// 在 spawn 周围 ±5 tile 内找一个天然安全落脚（保持 y 不变）
function findSafeSpawnNearby(room, spawn) {
  const ty = Math.floor(spawn.y / TILE);
  const baseTx = Math.floor((spawn.x + 4) / TILE);
  for (let radius = 0; radius <= 5; radius++) {
    for (const offset of [0, -radius, radius]) {
      if (radius > 0 && offset === 0) continue;
      const tx = baseTx + offset;
      if (tx < 2 || tx >= room.w - 2) continue;
      const here = room.tiles[ty * room.w + tx];
      if (here !== TILES.EMPTY) continue;
      const belowY = ty + 1;
      if (belowY >= room.h) continue;
      const below = room.tiles[belowY * room.w + tx];
      if (below === TILES.SOLID || below === TILES.PLATFORM_SOLID || below === TILES.PLATFORM) {
        return { x: tx * TILE, y: ty * TILE };
      }
    }
  }
  return null;
}

// 在落点正下方建 3-tile 宽 PLATFORM_SOLID 接住玩家，不破坏空间连续性
function buildCatchPlatform(room, spawn, fromDir) {
  const tx = Math.floor((spawn.x + 4) / TILE);
  const ty = Math.floor(spawn.y / TILE);
  // 平台位置：玩家站立 tile 正下方那一行
  const py = Math.min(room.h - 2, ty + 1);
  const x0 = Math.max(1, tx - 1);
  const x1 = Math.min(room.w - 2, tx + 1);
  for (let x = x0; x <= x1; x++) {
    const cur = room.tiles[py * room.w + x];
    // 不破坏 SOLID 边界，只填 EMPTY/SPIKES/LAVA 等危险或空地
    if (cur === TILES.EMPTY || cur === TILES.SPIKES || cur === TILES.LAVA) {
      room.set(x, py, TILES.PLATFORM_SOLID);
    }
  }
  // 站立 tile 自身要清空，避免玩家 spawn 在实心里
  for (let x = x0; x <= x1; x++) {
    const cur = room.tiles[ty * room.w + x];
    if (cur === TILES.SPIKES || cur === TILES.LAVA) {
      room.set(x, ty, TILES.EMPTY);
    }
  }
}

// 落点安全：起始位置正下方 ≤ 12 tile 内必须有 SOLID/PLATFORM_SOLID/PLATFORM 接住
function isSpawnSafe(room, spawn) {
  const tx = Math.floor((spawn.x + 4) / TILE);
  const ty = Math.floor(spawn.y / TILE);
  if (tx < 1 || tx >= room.w - 1) return false;
  // 起始 tile 本身不能是 SOLID/SPIKE/LAVA
  const here = room.tiles[ty * room.w + tx];
  if (here === TILES.SOLID || here === TILES.SPIKES || here === TILES.LAVA) return false;
  // 下方 12 tile 内必须能接住，且中间不能是 SPIKE/LAVA
  for (let py = ty + 1; py < Math.min(ty + 14, room.h); py++) {
    const t = room.tiles[py * room.w + tx];
    if (t === TILES.SPIKES || t === TILES.LAVA) return false;
    if (t === TILES.SOLID || t === TILES.PLATFORM_SOLID || t === TILES.PLATFORM) return true;
  }
  return false;
}

// 当出口/圣坛/拾取无法从 spawn 抵达时，强行垫一段平台让它能上去
function repairUnreachable(r, missing) {
  for (const t of missing) {
    const targetX = t.tx;
    const targetY = t.ty;
    // 从地面到目标 y 之间，每 3 tile 高放一段 4 tile 宽的 PLATFORM_SOLID
    const groundY = (() => {
      for (let y = r.h - 2; y > 1; y--) {
        if (r.tiles[y * r.w + targetX] === TILES.SOLID) return y;
      }
      return r.h - 2;
    })();
    let py = groundY - 3;
    let dir = targetX > r.w / 2 ? -1 : 1;
    while (py > targetY) {
      const px = clamp(targetX + dir * 2, 2, r.w - 5);
      for (let j = 0; j < 4; j++) {
        if (r.tiles[py * r.w + px + j] === TILES.EMPTY) {
          r.set(px + j, py, TILES.PLATFORM_SOLID);
        }
      }
      py -= 3;
      dir *= -1;
    }
  }
}

// ============= 抽象房间图 =============
function sketchGraph(rng) {
  const nodes = [];
  const edges = [];
  const total = GEN.ROOMS;
  let prevId = null;
  for (let i = 0; i < total; i++) {
    const id = `room-${i}`;
    let kind = 'normal';
    if (i === 0) kind = 'start';
    else if (i === total - 1) kind = 'boss';
    else if (i % 4 === 3) kind = 'bonfire';
    else if (i % 5 === 4) kind = 'elite';
    nodes.push({ id, kind, depth: Math.floor(i / 3) });
    // 主线全部用水平连接 — 确保模板（crumbling_path 等）的水平设计逻辑总成立
    // 玩家始终从左走到右，预期清晰；垂直探索留给秘密房与某些 zone 3 模板内部
    if (prevId) edges.push([prevId, id, 'h']);
    prevId = id;
  }
  // 秘密房：每 2 个主线房分支一个 — 鼓励"探索成瘾"
  // 秘密房用挑战性强的模板（echo_bridge / mirror_hall 等）+ maxHp/flask 奖励
  for (let i = 1; i < total - 1; i += 2) {
    const sid = `room-secret-${i}`;
    nodes.push({ id: sid, kind: 'secret', depth: Math.floor(i / 3) });
    // 一半秘密房在主线下方，一半在上方 — 鼓励垂直探索
    const dir = i % 4 === 1 ? 'd' : 'u';
    edges.push([`room-${i}`, sid, dir]);
  }
  return { nodes, edges, startId: 'room-0', bossId: `room-${total - 1}` };
}

// ============= 单个房间生成 =============
function generateRoom(rng, node, zone) {
  const w = rng.int(GEN.ROOM_W_MIN, GEN.ROOM_W_MAX);
  const h = rng.int(GEN.ROOM_H_MIN, GEN.ROOM_H_MAX);
  const r = new Room(node.id, w, h);
  r.biome = zone.biome;
  r.zone = zone.id;
  r.zoneAbilities = zone.abilities;
  r.kind = node.kind;
  r.border(TILES.SOLID);
  generateTerrain(rng, r);
  return r;
}

// 平滑地面：高度每 3-6 列 ±1，主线连贯易走
function generateTerrain(rng, r) {
  let h = rng.int(2, 4);
  let nextChange = rng.int(3, 6);
  for (let x = 1; x < r.w - 1; x++) {
    if (x >= nextChange) {
      h = clamp(h + rng.pick([-1, 0, 1, 0]), 2, 5);
      nextChange = x + rng.int(3, 6);
    }
    for (let y = r.h - 1 - h; y < r.h - 1; y++) {
      r.set(x, y, TILES.SOLID);
    }
  }
}

// ============= finalize: 内容布置 =============
function finalize(rng, r) {
  const dlevel = (r.zone || 1) === 1 ? 0 : (r.zone === 2) ? 2 : 4;

  // 所有 kind 都允许走模板（如果 ROOM_TEMPLATES 表里有指定）；secret 用 SECRET_TEMPLATE_POOL
  let usedTemplate = false;
  if (r.kind === 'normal' || r.kind === 'elite' || r.kind === 'secret'
      || r.kind === 'start' || r.kind === 'bonfire') {
    // 主线房间：先查 ROOM_TEMPLATES 编排表 — 每间房固定模板，保证体验连贯
    let tpl = null;
    const hasVerticalExit = r.exits.some(ex => ex.dir === 'up' || ex.dir === 'down');
    const forcedId = ROOM_TEMPLATES[r.id];
    if (forcedId) {
      const candidate = getTemplateById(forcedId);
      if (candidate
          && candidate.kinds.includes(r.kind)
          && (!candidate.requiresVerticalExit || hasVerticalExit)) {
        tpl = candidate;
      }
    }
    // 秘密房：从 SECRET_TEMPLATE_POOL 抽（高难/挑战型）
    if (!tpl && r.kind === 'secret') {
      const pool = SECRET_TEMPLATE_POOL.map(getTemplateById)
        .filter(t => t && (!t.requiresVerticalExit || hasVerticalExit));
      if (pool.length > 0) tpl = pool[rng.int(0, pool.length - 1)];
    }
    // 兜底：随机抽
    if (!tpl) {
      const idx = indexOf(r.id);
      const isZoneEntrance = ZONES.some(z => idx === z.rooms[0]);
      const prevIsEcho = r._prevTemplateRequiresEcho;
      tpl = pickTemplate(rng, r.zone || 1, r.kind === 'secret' ? 'normal' : r.kind, {
        avoidRequiresEcho: isZoneEntrance || prevIsEcho,
        avoidId: r._prevTemplateId,
        hasVerticalExit
      });
    }
    if (tpl) {
      tpl.build(rng, r);
      r.templateId = tpl.id;
      r.templateName = tpl.name;
      r.templateRequiresEcho = !!tpl.requiresEcho;
      r.templateRequiresWallClimb = !!tpl.requiresWallClimb;
      usedTemplate = true;
      // 模板清空了内部 — 给水平出口铺一段连入站台，再让 carveExits 打通
      ensureSideExitPlatforms(r);
      r.carveExits();
      for (const ex of r.exits) {
        if (ex.dir === 'up') addStairwayToCeiling(rng, r, ex.x);
        if (ex.dir === 'down') ensureDownExitFloor(r, ex.x);
        if (ex.dir === 'up' || ex.dir === 'down') r.clearVerticalExitShaft(ex);
      }
      // 秘密房 = 挑战房：通过模板挑战后给奖励（maxHp 圣坛 + 治疗瓶 + 几枚碎片）
      if (r.kind === 'secret') addSecretReward(r, rng);
    }
  }

  if (!usedTemplate) {
    // 上行出口先加台阶（保证可上）
    for (const ex of r.exits) {
      if (ex.dir === 'up') addStairwayToCeiling(rng, r, ex.x);
      if (ex.dir === 'down') ensureDownExitFloor(r, ex.x);
      if (ex.dir === 'up' || ex.dir === 'down') r.clearVerticalExitShaft(ex);
    }
    if (r.kind === 'start') furnitureStart(rng, r);
    else if (r.kind === 'normal') furnitureNormal(rng, r, dlevel);
    else if (r.kind === 'elite') furnitureElite(rng, r, dlevel);
    else if (r.kind === 'bonfire') furnitureBonfire(rng, r);
    else if (r.kind === 'boss') furnitureBoss(rng, r);
    else if (r.kind === 'secret') furnitureSecret(rng, r);
  }

  // 主线圣坛硬编码：按 ABILITY_SHRINES 强制放置
  const forcedAbility = ABILITY_SHRINES[r.id];
  if (forcedAbility) {
    r.props = r.props.filter(p => p.kind !== 'shrine');
    placeShrineOnHighest(r, forcedAbility);
  }

  // 模板已自行设置 spawn；其他 kind 用 findSpawn 找一个有地面的列
  if (!r.templateId) r.spawn = findSpawn(r);
}

// ============= 平台链 =============
// 从指定起点放置一串台阶平台，每段 +up 高、+across 跨距
// 返回链的最高/最远点，方便外部接续
function placePlatformChain(rng, r, startX, startY, dir, steps, opts = {}) {
  let curX = startX, curY = startY;
  const placed = [];
  for (let i = 0; i < steps; i++) {
    const up = opts.fixedUp ?? rng.int(2, REACH.JUMP_UP);
    const across = opts.fixedAcross ?? rng.int(2, REACH.JUMP_ACROSS);
    const nextX = curX + dir * across;
    const nextY = curY - up;
    if (nextX < 2 || nextX > r.w - 5 || nextY < 2) break;
    const pw = opts.platW ?? rng.int(3, 5);
    const tile = opts.solid ? TILES.PLATFORM_SOLID : TILES.PLATFORM;
    for (let j = 0; j < pw; j++) {
      const tx = nextX + (dir > 0 ? j : -j);
      if (tx < 1 || tx >= r.w - 1) break;
      r.set(tx, nextY, tile);
    }
    placed.push({ x: nextX, y: nextY, w: pw });
    curX = nextX + dir * Math.floor(pw / 2);
    curY = nextY;
  }
  return placed;
}

// 上行出口：从地面拾级而上至 ceiling 开口
// 每级垂直 -3、水平 ±2~3，左右交替，且始终围绕 exitX，确保顶端可一跳进出口
function addStairwayToCeiling(rng, r, exitX) {
  const groundY = findFloorY(r, exitX);
  if (groundY < 0) return;
  let curY = groundY;
  let side = exitX > r.w / 2 ? -1 : 1;
  const pw = 3;
  while (curY > 5) {
    const nextY = Math.max(4, curY - REACH.JUMP_UP);
    const offset = rng.int(2, 3);
    const px = clamp(exitX + side * offset - 1, 2, r.w - pw - 2);
    for (let j = 0; j < pw; j++) {
      r.set(px + j, nextY, TILES.PLATFORM_SOLID);
    }
    curY = nextY;
    side *= -1;
  }
}

// ============= 各房间内容 =============
function furnitureStart(rng, r) {
  // 启程：篝火 + 一个低台让玩家试跳
  const bx = 4;
  const fy = findFloorY(r, bx);
  r.props.push({ kind: 'bonfire', x: bx * TILE, y: (fy - 1) * TILE });
  // 低台
  const px = 10;
  const py = findFloorY(r, px) - 2;
  for (let j = 0; j < 4; j++) r.set(px + j, py, TILES.PLATFORM);
  // 提示性第二台（更高一格）
  const px2 = 16;
  const py2 = findFloorY(r, px2) - 4;
  for (let j = 0; j < 4; j++) r.set(px2 + j, py2, TILES.PLATFORM);
}

function furnitureNormal(rng, r, depth) {
  // 1-2 条平台链
  const chains = depth >= 2 ? 2 : rng.int(1, 2);
  for (let c = 0; c < chains; c++) {
    const sx = rng.int(4, r.w - 10);
    const sy = findFloorY(r, sx);
    if (sy < 0) continue;
    const dir = rng.chance(0.5) ? 1 : -1;
    placePlatformChain(rng, r, sx, sy, dir, rng.int(2, 3));
  }
  // 深关：可能加一个冲刺缺口
  if (depth >= 2 && rng.chance(0.6)) addDashGate(rng, r);

  // 敌人放在地面上
  const table = depth === 0 ? ['slime']
              : depth === 1 ? ['slime', 'slime', 'eye']
              : depth === 2 ? ['slime', 'eye', 'knight']
                            : ['eye', 'knight', 'knight'];
  const cnt = Math.min(3, 1 + Math.floor(depth / 2) + rng.int(0, 1));
  spawnEnemies(rng, r, table, cnt);

  // 尖刺：在地面上小段
  if (rng.chance(0.7)) placeSpikePatch(rng, r);

  // 治疗瓶
  if (rng.chance(0.35)) placeFlask(rng, r);

  // 脆弱墙（指向秘密）
  if (rng.chance(0.35)) {
    const wx = rng.chance(0.5) ? 1 : r.w - 2;
    const wy = r.h - rng.int(3, 5);
    for (let i = 0; i < 2; i++) r.set(wx, wy - i, TILES.WALL_FRAGILE);
  }
}

function furnitureElite(rng, r, depth) {
  // 复杂：2-3 条链 + 必有冲刺缺口
  for (let c = 0; c < 2; c++) {
    const sx = rng.int(4, r.w - 10);
    const sy = findFloorY(r, sx);
    if (sy < 0) continue;
    placePlatformChain(rng, r, sx, sy, rng.chance(0.5) ? 1 : -1, rng.int(2, 4));
  }
  if (depth >= 2) addDashGate(rng, r);

  // Knight + 远程眼
  const ex = (r.w / 2) | 0;
  const ey = findFloorY(r, ex);
  if (ey > 0) r.entitiesInit.push({ type: 'knight', x: ex * TILE, y: (ey - 2) * TILE });
  for (let i = 0; i < 2; i++) {
    const sx = rng.int(3, r.w - 4);
    const sy = findFloorY(r, sx);
    if (sy > 0) r.entitiesInit.push({ type: 'eye', x: sx * TILE, y: Math.max(2, sy - 6) * TILE });
  }

  // 主线圣坛由 finalize 按 ABILITY_SHRINES 强制放置；elite 不再自动放
}

function furnitureBonfire(rng, r) {
  const bx = (r.w / 2) | 0;
  const by = findFloorY(r, bx);
  r.props.push({ kind: 'bonfire', x: bx * TILE, y: (by - 1) * TILE });
  // 安静的休息间，不放敌人，给 1-2 个治疗瓶
  for (let i = 0; i < 2; i++) {
    if (rng.chance(0.6)) placeFlask(rng, r);
  }
}

function furnitureBoss(rng, r) {
  // 清空中央
  for (let x = 2; x < r.w - 2; x++) {
    for (let y = 1; y < r.h - 4; y++) r.set(x, y, TILES.EMPTY);
  }
  for (let x = 1; x < r.w - 1; x++) {
    for (let y = r.h - 4; y < r.h - 1; y++) r.set(x, y, TILES.SOLID);
  }

  const cx = (r.w / 2) | 0;
  const floorY = r.h - 4;

  // 4 根残柱（破败神殿氛围）— 高 5-7 tile，分布在场边
  const pillars = [
    { x: 4, h: 6 },
    { x: 8, h: 4 },
    { x: r.w - 9, h: 4 },
    { x: r.w - 5, h: 6 }
  ];
  for (const p of pillars) {
    for (let dy = 0; dy < p.h; dy++) {
      r.set(p.x, floorY - 1 - dy, TILES.SOLID);
    }
    // 柱顶残破：在最顶 1 tile 留缺口（视觉破败）
    if (p.h > 4) r.set(p.x, floorY - p.h, TILES.EMPTY);
  }

  // 中央高台 — Boss 本体所在的"祭坛"
  for (let dx = -2; dx <= 2; dx++) {
    r.set(cx + dx, floorY - 4, TILES.PLATFORM_SOLID);
  }

  // 两侧低台 — 玩家躲避用的中转
  for (let j = 0; j < 4; j++) r.set(8 + j, floorY - 3, TILES.PLATFORM_SOLID);
  for (let j = 0; j < 4; j++) r.set(r.w - 12 + j, floorY - 3, TILES.PLATFORM_SOLID);

  // 顶部装饰 PLATFORM（更高一层，可作绝境救命）
  for (let j = 0; j < 5; j++) r.set(cx - 2 + j, floorY - 9, TILES.PLATFORM);

  // Boss 起始位置：中央高台正上方
  r.entitiesInit.push({ type: 'boss', x: cx * TILE, y: (floorY - 6) * TILE });
}

function furnitureSecret(rng, r) {
  // 小宝库：祭坛 + 治疗瓶 + 一两个史莱姆守卫
  const sx = (r.w / 2) | 0;
  const sy = findFloorY(r, sx);
  r.props.push({ kind: 'shrine', x: sx * TILE, y: (sy > 0 ? sy - 1 : r.h - 4) * TILE });
  for (let i = 0; i < 2; i++) {
    if (rng.chance(0.6)) placeFlask(rng, r);
  }
  for (let i = 0; i < 1 + rng.int(0, 1); i++) {
    const ex = rng.int(4, r.w - 5);
    const ey = findFloorY(r, ex);
    if (ey > 0) r.entitiesInit.push({ type: 'slime', x: ex * TILE, y: (ey - 2) * TILE });
  }
}

// ============= 工具：放陷阱 / 道具 / 敌人 =============
function spawnEnemies(rng, r, table, count) {
  for (let i = 0; i < count; i++) {
    const ex = rng.int(4, r.w - 5);
    const ey = findFloorY(r, ex);
    if (ey <= 0) continue;
    r.entitiesInit.push({
      type: rng.pick(table),
      x: ex * TILE,
      y: Math.max(2, ey - 2) * TILE
    });
  }
}

function placeSpikePatch(rng, r) {
  const sx = rng.int(4, r.w - 6);
  const sw = rng.int(1, 3);
  const sy = findFloorY(r, sx);
  if (sy <= 0) return;
  for (let i = 0; i < sw; i++) r.set(sx + i, sy - 1, TILES.SPIKES);
}

function placeFlask(rng, r) {
  const fx = rng.int(4, r.w - 5);
  const fy = findFloorY(r, fx);
  if (fy <= 0) return;
  r.props.push({ kind: 'flask', x: fx * TILE, y: (fy - 1) * TILE });
}

function placeShrineOnHighest(r, ability) {
  let bestY = r.h, bestX = (r.w / 2) | 0;
  for (let ty = 2; ty < r.h - 2; ty++) {
    for (let tx = 2; tx < r.w - 2; tx++) {
      const t = r.tiles[ty * r.w + tx];
      if (t === TILES.PLATFORM || t === TILES.PLATFORM_SOLID) {
        if (ty < bestY) { bestY = ty; bestX = tx + 1; }
      }
    }
  }
  if (bestY === r.h) bestY = findFloorY(r, bestX);
  const prop = { kind: 'shrine', x: bestX * TILE, y: (bestY - 1) * TILE };
  if (ability) prop.ability = ability;
  r.props.push(prop);
}

// 冲刺缺口：在主地面挖一段深坑，对面放着陆点
function addDashGate(rng, r) {
  const startX = rng.int(8, r.w - REACH.DASH_GAP_MAX - 6);
  const gap = rng.int(REACH.DASH_GAP_MIN, REACH.DASH_GAP_MAX);
  const groundY = findFloorY(r, startX);
  if (groundY <= 0) return;
  // 把这段地面挖空 + 下面填熔岩或尖刺
  for (let dx = 0; dx < gap; dx++) {
    for (let dy = 0; dy < r.h - 1 - groundY; dy++) {
      r.set(startX + dx, groundY + dy, TILES.EMPTY);
    }
    // 底部一行尖刺给死亡惩罚
    if (rng.chance(0.7)) r.set(startX + dx, r.h - 2, TILES.SPIKES);
  }
  // 对面落点：与起点同高
  for (let i = 0; i < 3; i++) {
    r.set(startX + gap + i, groundY, TILES.SOLID);
  }
}

function findFloorY(r, tx) {
  for (let ty = 2; ty < r.h - 1; ty++) {
    if (r.tiles[ty * r.w + tx] === TILES.SOLID) return ty;
  }
  return -1;
}

function findSpawn(r) {
  for (let tx = 3; tx < r.w - 3; tx++) {
    const fy = findFloorY(r, tx);
    if (fy > 4 && fy < r.h - 1) return { x: tx * TILE, y: (fy - 2) * TILE };
  }
  return { x: 4 * TILE, y: (r.h - 5) * TILE };
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// ============= 出入口连接 =============
function wireExits(rooms, layout, rng) {
  for (const [aId, bId, dir] of layout.edges) {
    const a = rooms.get(aId);
    const b = rooms.get(bId);
    if (!a || !b) continue;
    // 标记秘密房入口 — 绘制时高亮显示，让玩家发现
    const aToSecret = bId.startsWith('room-secret');
    const bToSecret = aId.startsWith('room-secret');
    if (dir === 'h') {
      const ay = findExitY(a), by = findExitY(b);
      a.exits.push({ dir: 'right', x: a.w - 1, y: ay, target: bId, toSecret: aToSecret, targetSpawn: { x: 2 * TILE, y: (by - 1) * TILE } });
      b.exits.push({ dir: 'left', x: 0, y: by, target: aId, toSecret: bToSecret, targetSpawn: { x: (a.w - 3) * TILE, y: (ay - 1) * TILE } });
    } else if (dir === 'u') {
      const ax = findExitX(a), bx = findExitX(b);
      a.exits.push({ dir: 'up', x: ax, y: 0, target: bId, toSecret: aToSecret, targetSpawn: { x: bx * TILE, y: (b.h - 4) * TILE } });
      b.exits.push({ dir: 'down', x: bx, y: b.h - 1, target: aId, toSecret: bToSecret, targetSpawn: topReturnSpawn(a, ax) });
    } else if (dir === 'd') {
      const ax = findExitX(a), bx = findExitX(b);
      a.exits.push({ dir: 'down', x: ax, y: a.h - 1, target: bId, toSecret: aToSecret, targetSpawn: { x: bx * TILE, y: 2 * TILE } });
      b.exits.push({ dir: 'up', x: bx, y: 0, target: aId, toSecret: bToSecret, targetSpawn: lowerReturnSpawn(a, ax) });
    }
    a.carveExits();
    b.carveExits();
  }
}

function lowerReturnSpawn(room, exitX) {
  const side = exitX < room.w / 2 ? 1 : -1;
  const tx = clamp(exitX + side * 3, 2, room.w - 3);
  return { x: tx * TILE, y: (room.h - 5) * TILE };
}

function topReturnSpawn(room, exitX) {
  const side = exitX < room.w / 2 ? 1 : -1;
  const tx = clamp(exitX + side * 3, 2, room.w - 3);
  return { x: tx * TILE, y: 4 * TILE };
}

function findExitY(r) {
  return Math.max(3, r.h - 4);
}

function findExitX(r) {
  // 找一列已经有地面（避免出口悬空）
  for (let tx = 4; tx < r.w - 4; tx += 3) {
    if (findFloorY(r, tx) > 0) return tx;
  }
  return (r.w / 2) | 0;
}
