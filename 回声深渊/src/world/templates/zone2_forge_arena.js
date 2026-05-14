// 炼铸竞技场（Forge Arena）— Zone 2 综合终章
// 设计理念："三条路线自由切换"
//   • 地面线：4 段平台 + 3 个容错坑，稳妥但要处理守卫
//   • 中层线：PLATFORM 单向飞石阵，双跳路线
//   • 顶层线：PLATFORM_SOLID 屋顶通道，高速奖励路线
// 战斗：1 knight + 2 eye，压力清楚但不遮蔽路线判断
// 探索：终点前一道脆墙藏治疗瓶（蓄力重击 → 隐藏奖励）
// 不设房间机制 — 纯静态几何让玩家有"安静思考"的空间，节奏由玩家选路控制
import {
  clearInterior, placeFloor, placePlatform, placeSpikes, placeFragileWall,
  placeEnemy, placeFlask, setSpawn
} from './_primitives.js';

export const forgeArena = {
  id: 'forge_arena',
  name: '炼铸竞技场',
  zone: 2,
  kinds: ['normal', 'elite'],
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;
    const W = r.w;

    // ============ 1. 地面线：4 段地面 + 3 个尖刺坑（4 tile 宽，单跳过） ============
    // 段宽至少 6 tile 让玩家有起跳助跑空间
    const segs = [
      [1, Math.floor(W * 0.18)],
      [Math.floor(W * 0.27), Math.floor(W * 0.45)],
      [Math.floor(W * 0.55), Math.floor(W * 0.73)],
      [Math.floor(W * 0.82), W - 2]
    ];
    for (const [x0, x1] of segs) placeFloor(r, x0, x1, floorY);

    // 坑底尖刺（中间 2 tile 是尖刺，边缘留 1 tile 容差给落点）
    for (let i = 0; i < segs.length - 1; i++) {
      const gapStart = segs[i][1] + 1;
      const gapEnd = segs[i + 1][0] - 1;
      const mid = Math.floor((gapStart + gapEnd) / 2);
      placeSpikes(r, mid - 1, mid, r.h - 2);
      // 兜底 PLATFORM（坑底浮一片救命台 — 失误也能爬回来）
      placePlatform(r, gapStart, gapEnd, floorY + 1, 'platform');
    }

    // ============ 2. 中层飞石（PLATFORM 单向）：双跳路线 ============
    // 每段地面正中央有一块中层飞石，双跳能上到顶层
    for (const [x0, x1] of segs) {
      const mid = Math.floor((x0 + x1) / 2);
      placePlatform(r, mid - 1, mid + 2, floorY - 4, 'platform');
    }

    // ============ 3. 顶层通道（PLATFORM_SOLID）：跑酷路线 ============
    // 在每个坑的正上方有一块 SOLID 顶台，可以从中层蹦上去
    // 顶台之间相距 5-6 tile，刚好双跳够（10 tile 极限）
    for (let i = 0; i < segs.length - 1; i++) {
      const gapStart = segs[i][1] + 1;
      const gapEnd = segs[i + 1][0] - 1;
      const mid = Math.floor((gapStart + gapEnd) / 2);
      placePlatform(r, mid - 1, mid + 1, floorY - 8, 'solid');
    }

    // ============ 战斗：1 knight + 2 eye，保留压力但降低第一眼混乱 ============
    const knightX = Math.floor((segs[1][0] + segs[1][1]) / 2);
    placeEnemy(r, 'knight', knightX, floorY - 1);
    if (r.kind === 'elite') {
      placeEnemy(r, 'knight', Math.floor((segs[2][0] + segs[2][1]) / 2), floorY - 1);
    }
    placeEnemy(r, 'eye', Math.floor(W * 0.28), 5);
    placeEnemy(r, 'eye', Math.floor(W * 0.78), 5);

    // ============ 探索：脆墙藏治疗瓶 ============
    // 最后一段地面靠右处一个隐藏脆墙，破墙得 flask
    const wallX = W - 6;
    placeFragileWall(r, wallX, floorY - 1, 1);
    placeFlask(r, wallX - 2, floorY - 1);

    // 终点小奖励
    placeFlask(r, W - 3, floorY - 1);

    setSpawn(r, 3, floorY);
  }
};
