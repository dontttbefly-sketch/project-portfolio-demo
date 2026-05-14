// 风蚀峡谷（Erosion Gorge）— Zone 2
// 几何：水平长走廊，地面有 2-3 个深坑
// gimmick：风向每 2s 切换一次（左/右），逆风跳得短、顺风跳得远
import {
  clearInterior, placeFloor, placePlatform, placeSpikes,
  placeEnemy, setSpawn
} from './_primitives.js';

export const erosionGorge = {
  id: 'erosion_gorge',
  name: '风蚀峡谷',
  zone: 2,
  kinds: ['normal', 'elite'],
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;

    // 主地面分段：3 大段，缺口 4 tile（即使没双跳也能单跳跨 5.5 tile 上限内）
    const gap1 = Math.floor(r.w * 0.30);
    const gap2 = Math.floor(r.w * 0.55);
    const gap3 = Math.floor(r.w * 0.78);
    const gapW = 4;

    placeFloor(r, 1, gap1 - 1, floorY);
    placeFloor(r, gap1 + gapW, gap2 - 1, floorY);
    placeFloor(r, gap2 + gapW, gap3 - 1, floorY);
    placeFloor(r, gap3 + gapW, r.w - 2, floorY);

    // 坑底尖刺只覆盖中间 2 tile，留出缘上落脚容差
    placeSpikes(r, gap1 + 1, gap1 + gapW - 2, r.h - 2);
    placeSpikes(r, gap2 + 1, gap2 + gapW - 2, r.h - 2);
    placeSpikes(r, gap3 + 1, gap3 + gapW - 2, r.h - 2);

    // 上方有几个 PLATFORM（方便顺风时跳得高一点跨过）
    placePlatform(r, gap1 - 1, gap1 + 2, floorY - 4, 'platform');
    placePlatform(r, gap2 + gapW - 2, gap2 + gapW + 2, floorY - 5, 'platform');

    // 难度提升：双远程眼 + 风更猛 + 中段地面放史莱姆增加战斗压力
    placeEnemy(r, 'eye', Math.floor(r.w * 0.35), 4);
    placeEnemy(r, 'eye', Math.floor(r.w * 0.65), 4);
    placeEnemy(r, 'slime', Math.floor((gap1 + gapW + gap2) / 2), floorY - 1);
    if (r.kind === 'elite') {
      placeEnemy(r, 'knight', Math.floor(r.w * 0.85), floorY - 1);
      placeEnemy(r, 'slime', gap2 + gapW + 2, floorY - 1);
    }

    // 风机制：强度上调 — 跳跃节奏要算入风向
    r.mechanic = {
      kind: 'wind',
      strength: 38,    // 25→38（更明显的横向推力，但仍不足以吹下平台）
      period: 2.2,
    };

    setSpawn(r, 3, floorY);
  }
};
