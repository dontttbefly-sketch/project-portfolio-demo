// 主题房间模板注册表
//
// 每个模板：
//   { id, name, zone, kinds, build(rng, room) }
//
// • id: 唯一标识（用于 RoomBanner 显示英文名做调试）
// • name: 进房间显示的中文名
// • zone: 1/2/3，决定可用区
// • kinds: 适用的 room.kind（'normal' | 'elite'）；其他 kind（start/boss/bonfire/secret）有自己的固定布局
// • build(rng, room): 具体地形构造，必须保证可达性（在 zone 对应能力下从 spawn 到 exits 都可达）
//
// 模板按 zone 分桶，generator 从适合的桶随机抽取。
// 数量小（每 zone 3 个），所以一定 zone 内的房间间会有重复，但参数化的随机点（位置/装饰/敌人槽）会让感官不同。

import { startRoom } from './zone1_start.js';
import { initiateHall } from './zone1_initiate_hall.js';
import { crumblingPath } from './zone1_crumbling_path.js';
import { floatingIslands } from './zone1_floating_islands.js';
import { leapOfFaith } from './zone1_leap_of_faith.js';
import { firstBonfire } from './zone1_first_bonfire.js';
import { echoBridgeTutorial } from './zone1_echo_bridge.js';   // 现在 zone=2
import { pulsingLavaTower } from './zone2_pulsing_lava.js';
import { erosionGorge } from './zone2_erosion_gorge.js';
import { lavaSurge } from './zone2_lava_surge.js';
import { bulletCorridor } from './zone2_bullet_corridor.js';
import { lavaSprint } from './zone2_lava_sprint.js';
import { forgeArena } from './zone2_forge_arena.js';
import { secondBonfire } from './zone2_second_bonfire.js';
import { mirrorHall } from './zone3_mirror_hall.js';
import { darkShaft } from './zone3_dark_shaft.js';
import { invertedTower } from './zone3_inverted_tower.js';
import { sheerCliff } from './zone3_sheer_cliff.js';
import { wallBounce } from './zone3_wall_bounce.js';
import { reflectingHall } from './zone3_reflecting_hall.js';
import { wallCanyon } from './zone3_wall_canyon.js';

export const TEMPLATES = [
  startRoom,
  initiateHall, crumblingPath, floatingIslands, leapOfFaith, firstBonfire,
  echoBridgeTutorial, pulsingLavaTower, erosionGorge, lavaSurge, bulletCorridor, lavaSprint, forgeArena, secondBonfire,
  mirrorHall, darkShaft, invertedTower, sheerCliff, wallBounce, reflectingHall, wallCanyon
];

export function templatesFor(zone, kind) {
  return TEMPLATES.filter(t => t.zone === zone && t.kinds.includes(kind));
}

export function getTemplateById(id) {
  return TEMPLATES.find(t => t.id === id) || null;
}

// 抽一个适合该 zone/kind 的模板
// preferences:
//   • avoidRequiresEcho — 当前房间想避开 echo-required（zone 入口或紧邻另一个 echo 房）
//   • avoidId — 上一房间用过的模板 id
//   • hasVerticalExit — 房间是否有 up/down 出口（决定是否能用垂直机制模板）
export function pickTemplate(rng, zone, kind, opts = {}) {
  let pool = templatesFor(zone, kind);
  if (pool.length === 0) return null;
  // 硬过滤：垂直机制模板只能用在垂直出口的房间
  if (opts.hasVerticalExit === false) {
    pool = pool.filter(t => !t.requiresVerticalExit);
  }
  if (pool.length === 0) return null;
  if (opts.avoidRequiresEcho) {
    const filtered = pool.filter(t => !t.requiresEcho);
    if (filtered.length > 0) pool = filtered;
  }
  if (opts.avoidId && pool.length > 1) {
    const filtered = pool.filter(t => t.id !== opts.avoidId);
    if (filtered.length > 0) pool = filtered;
  }
  return pool[rng.int(0, pool.length - 1)];
}
