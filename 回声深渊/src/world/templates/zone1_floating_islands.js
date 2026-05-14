// 浮岛小径（Floating Islands）— Zone 1 第三个模板
// 几何：连续地面被切成 3-4 段，每段间 2-3 tile 小坑
// 坑底有低一格的 PLATFORM 兜底（落下不必死，可踩回上层），降低教学挫败感
// 单跳（5.5 tile 横、3 tile 上）轻松通过
import {
  clearInterior, placeFloor, placePlatform, placeSpikes,
  placeEnemy, placeFlask, setSpawn
} from './_primitives.js';

export const floatingIslands = {
  id: 'floating_islands',
  name: '浮岛小径',
  zone: 1,
  kinds: ['normal'],
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;

    // 把房间宽度切成 3-4 段，每段地面 6-9 tile，中间 2-3 tile 缺口
    const segments = [];
    let cur = 1;
    while (cur < r.w - 4) {
      const segLen = rng.int(6, 9);
      const end = Math.min(r.w - 2, cur + segLen);
      segments.push([cur, end]);
      cur = end + rng.int(2, 3) + 1;
    }
    // 第一段必须包含 spawn 列（3-5）
    if (segments[0][0] > 3) segments[0][0] = 1;

    for (const [x0, x1] of segments) placeFloor(r, x0, x1, floorY);

    // 缺口里铺一段 PLATFORM（低 1 tile）当兜底，掉下去也能爬回来
    for (let i = 0; i < segments.length - 1; i++) {
      const gapStart = segments[i][1] + 1;
      const gapEnd = segments[i + 1][0] - 1;
      if (gapEnd > gapStart) {
        // 兜底平台位于缺口正中、floorY+1 行（比主地面低一格）
        const cx = Math.floor((gapStart + gapEnd) / 2);
        placePlatform(r, cx - 1, cx + 1, floorY + 1, 'platform');
      }
    }

    // 一两个高一点的浮岛装饰（鼓励玩家跳跃）
    const islandX = Math.floor(r.w * 0.4);
    placePlatform(r, islandX, islandX + 3, floorY - 3, 'solid');
    if (r.w > 32) {
      const islandX2 = Math.floor(r.w * 0.7);
      placePlatform(r, islandX2, islandX2 + 3, floorY - 3, 'solid');
    }

    // 敌人散布在不同段的地面上
    if (segments.length >= 2 && segments[1][1] - segments[1][0] >= 3) {
      placeEnemy(r, 'slime', segments[1][0] + 2, floorY - 1);
    }
    if (segments.length >= 3) {
      placeEnemy(r, 'slime', segments[2][0] + 1, floorY - 1);
    }

    // 治疗瓶在最后一座小岛上
    const lastSeg = segments[segments.length - 1];
    placeFlask(r, lastSeg[1] - 1, floorY - 1);

    setSpawn(r, 3, floorY);
  }
};
