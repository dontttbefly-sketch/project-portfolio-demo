// 熔岩冲刺（Lava Sprint）— Zone 2
// 几何：前半安全拿冲刺，后半用低平台和熔岩坑做追逐跑酷。
// gimmick：熔岩从左向右吞掉后半段坑位，玩家必须用新学到的冲刺保持节奏。
import {
  clearInterior, placeFloor, placePlatform,
  placeEnemy, placeFlask, setSpawn
} from './_primitives.js';

export const lavaSprint = {
  id: 'lava_sprint',
  name: '熔岩冲刺',
  zone: 2,
  kinds: ['normal', 'elite'],
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;

    // 前半安全区：dash 圣坛会被 placeShrineOnHighest 放到最高的前段平台。
    const safeEnd = Math.floor(r.w * 0.38);
    placeFloor(r, 1, safeEnd, floorY);
    placePlatform(r, 8, 12, floorY - 5, 'solid');
    placePlatform(r, 4, 7, floorY - 2, 'platform');

    // 后半追逐区：三段地面 + 两个坑，冲刺后能舒服地串起来。
    const runA = [safeEnd + 3, Math.floor(r.w * 0.58)];
    const runB = [Math.floor(r.w * 0.66), Math.floor(r.w * 0.78)];
    const runC = [Math.floor(r.w * 0.86), r.w - 2];
    for (const [x0, x1] of [runA, runB, runC]) placeFloor(r, x0, x1, floorY);

    placePlatform(r, runA[0] + 3, runA[0] + 6, floorY - 3, 'platform');
    placePlatform(r, runB[0] + 1, runB[0] + 4, floorY - 4, 'platform');
    placePlatform(r, runC[0] + 1, runC[0] + 4, floorY - 3, 'platform');

    // 终点奖励
    placeFlask(r, r.w - 4, floorY - 1);

    // 熔岩追逐：只吞后半段坑位和空气，不破坏实心地形。
    r.mechanic = {
      kind: 'horizontal_lava_chase',
      startX: safeEnd + 1,
      endX: r.w - 2,
      speed: 34,
      y0: floorY,
      y1: r.h - 2
    };

    setSpawn(r, 4, floorY);
    // 后半远程骚扰，前半保持安全学习空间。
    placeEnemy(r, 'eye', Math.floor(r.w * 0.66), floorY - 6);
    placeEnemy(r, 'eye', Math.floor(r.w * 0.82), floorY - 6);
    if (r.kind === 'elite') placeEnemy(r, 'knight', Math.floor(r.w * 0.85), floorY - 1);
  }
};
