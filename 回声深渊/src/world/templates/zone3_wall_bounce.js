// 弹墙竞速（Wall-Bounce Race）— Zone 3
// 几何：横向走廊，地面有 4 个大坑（8-10 tile 宽，单跳冲刺过不去）
// gimmick：每个坑两侧立柱用蹬墙跳过 — 跳上柱→蹬墙跳→落下个柱
import {
  clearInterior, placeFloor, placeSpikes, placeLava,
  placeEnemy, placeFlask, setSpawn
} from './_primitives.js';
import { TILES } from '../tile.js';

export const wallBounce = {
  id: 'wall_bounce',
  name: '弹墙竞速',
  zone: 3,
  kinds: ['normal', 'elite'],
  requiresWallClimb: true,   // 设计性需要蹬墙跳，验证器跳过
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;

    // 起点小段地面
    placeFloor(r, 1, 6, floorY);
    // 终点小段地面
    placeFloor(r, r.w - 8, r.w - 2, floorY);

    // 中段做 3 个柱+坑组合
    const pitW = 4;       // 坑宽
    const pillarW = 2;    // 立柱宽
    const pillarH = 6;    // 立柱高
    const cycleW = pillarW + pitW;  // 6 tile 一个周期
    const startCycle = 8;
    for (let i = 0; i < 3; i++) {
      const colX = startCycle + i * cycleW;
      // 立柱（从 floorY 顶上 6 tile 高度）
      for (let dy = 0; dy < pillarH; dy++) {
        for (let dx = 0; dx < pillarW; dx++) {
          r.set(colX + dx, floorY - dy, TILES.SOLID);
        }
      }
      // 立柱右侧的坑底放熔岩
      placeLava(r, colX + pillarW, colX + pillarW + pitW - 1, r.h - 2);
    }

    // 终点奖励
    placeFlask(r, r.w - 4, floorY - 1);

    // elite 加一个 knight 在终点
    if (r.kind === 'elite') placeEnemy(r, 'knight', r.w - 5, floorY - 1);

    setSpawn(r, 3, floorY);
  }
};
