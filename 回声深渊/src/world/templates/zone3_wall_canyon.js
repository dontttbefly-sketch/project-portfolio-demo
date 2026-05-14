// 绝壁长廊（Wall Canyon）— Zone 3
// 横向场景下的"蹬墙跳考核"，区别于 sheer_cliff 的纯垂直竖井
// 几何：3 根 SOLID 立柱（高 7-8 tile），柱间 2 个熔岩坑 — 必须蹬柱跳过
//      坑里有低位回收平台，失败会痛但不拖长节奏；顶部隐藏 flask。
import {
  clearInterior, placeFloor, placePlatform, placeLava,
  placeEnemy, placeFlask, setSpawn
} from './_primitives.js';
import { TILES } from '../tile.js';

export const wallCanyon = {
  id: 'wall_canyon',
  name: '绝壁长廊',
  zone: 3,
  kinds: ['normal'],
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;
    const W = r.w;

    // 起点小段地面
    placeFloor(r, 1, 6, floorY);
    // 终点小段地面
    placeFloor(r, W - 7, W - 2, floorY);

    // 中段：3 根 2-tile 宽 × 8 tile 高的立柱 + 2 个熔岩坑
    // 柱间距：4 tile（蹬墙跳跨过来）
    const pillarH = 8;
    const pillarW = 2;
    const pitW = 4;
    const startX = 8;
    for (let i = 0; i < 3; i++) {
      const colX = startX + i * (pillarW + pitW);
      // 立柱
      for (let dy = 0; dy < pillarH; dy++) {
        for (let dx = 0; dx < pillarW; dx++) {
          r.set(colX + dx, floorY - dy, TILES.SOLID);
        }
      }
    }

    // 柱间熔岩坑（玩家若失误掉下去会受伤）
    for (let i = 0; i < 2; i++) {
      const colX = startX + i * (pillarW + pitW) + pillarW;
      placeLava(r, colX, colX + pitW - 1, r.h - 2);
      placePlatform(r, colX + 1, colX + pitW - 2, floorY + 1, 'platform');
    }

    // 过渡平台：让墙跳节奏从“学”到“考”逐步变尖。
    placePlatform(r, startX - 3, startX - 1, floorY - 3, 'platform');
    placePlatform(r, startX + pillarW + pitW + 1, startX + pillarW + pitW + 3, floorY - 5, 'platform');

    // 顶部隐藏：最右柱顶上一段 PLATFORM 藏治疗瓶
    const topPillarX = startX + 2 * (pillarW + pitW);
    placePlatform(r, topPillarX - 1, topPillarX + 2, floorY - pillarH - 1, 'platform');
    placeFlask(r, topPillarX, floorY - pillarH - 2);

    // 中段一只 knight 守在第二根柱旁的小台
    placeEnemy(r, 'knight', startX + 2 * (pillarW + pitW) + pillarW, floorY - 1);

    // 终点奖励
    placeFlask(r, W - 4, floorY - 1);

    setSpawn(r, 3, floorY);
  }
};
