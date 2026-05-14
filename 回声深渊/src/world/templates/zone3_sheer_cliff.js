// 绝壁回廊（Sheer Cliff Corridor）— Zone 3
// 几何：垂直竖井，两侧 SOLID 墙，中间 6 tile 宽空洞
// gimmick：纯蹬墙跳爬升 — 撞墙→滑落→反向跳→撞对面
import {
  clearInterior, placeFloor,
  placeEnemy, setSpawn
} from './_primitives.js';
import { TILES } from '../tile.js';

export const sheerCliff = {
  id: 'sheer_cliff',
  name: '绝壁回廊',
  zone: 3,
  kinds: ['normal', 'elite'],
  requiresWallClimb: true,    // BFS 验证器不建模蹬墙跳
  requiresVerticalExit: true, // 垂直竖井，水平出口不适合
  build(rng, r) {
    clearInterior(r);

    // 底部小地板（spawn）
    const floorY = r.h - 3;
    placeFloor(r, 1, r.w - 2, floorY);

    // 中央竖井两侧造高 SOLID 墙
    const shaftLeft = Math.floor(r.w / 2) - 4;
    const shaftRight = Math.floor(r.w / 2) + 4;
    // 左墙 — 从 floorY-1 一直到 ceiling
    for (let y = 3; y < floorY; y++) {
      for (let x = 1; x <= shaftLeft; x++) r.set(x, y, TILES.SOLID);
    }
    // 右墙
    for (let y = 3; y < floorY; y++) {
      for (let x = shaftRight; x < r.w - 1; x++) r.set(x, y, TILES.SOLID);
    }

    // 顶部留 3 tile 高的"天井"（容下角色 1.17 tile + 跳跃余地）
    for (let y = 1; y <= 3; y++) {
      for (let x = shaftLeft; x <= shaftRight; x++) r.set(x, y, TILES.EMPTY);
    }

    // 顶部一个 PLATFORM_SOLID 让玩家有地方落脚
    for (let x = shaftLeft + 2; x <= shaftRight - 2; x++) r.set(x, 4, TILES.PLATFORM_SOLID);

    if (r.kind === 'elite') {
      placeEnemy(r, 'eye', Math.floor(r.w / 2), Math.floor(r.h / 2));
    }

    setSpawn(r, Math.floor(r.w / 2), floorY);
  }
};
