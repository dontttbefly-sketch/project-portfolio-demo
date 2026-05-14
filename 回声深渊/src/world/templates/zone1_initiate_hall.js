// 入门走廊（Initiate's Hall）— Zone 1 第一个机制 gimmick：纯跳跃节奏
// 几何：宽阔水平走廊 + 低/中/高三拍跳台；敌人只用于试攻击，不阻路。
import {
  clearInterior, placeFloor, placePlatform,
  placeEnemy, placeFlask, setSpawn
} from './_primitives.js';

export const initiateHall = {
  id: 'initiate_hall',
  name: '入门走廊',
  zone: 1,
  kinds: ['normal'],
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;
    placeFloor(r, 1, r.w - 2, floorY);

    // 三拍跳台：第一块低，第二块略远，第三块高但仍在单跳范围内。
    const baseX = 6;
    placePlatform(r, baseX, baseX + 3, floorY - 2, 'solid');
    placePlatform(r, baseX + 5, baseX + 8, floorY - 3, 'platform');
    placePlatform(r, baseX + 10, baseX + 13, floorY - 5, 'solid');
    placePlatform(r, r.w - 10, r.w - 7, floorY - 2, 'platform');

    // 史莱姆在地面空段，玩家可以打，也可以从上方跳过。
    placeEnemy(r, 'slime', baseX + 8, floorY - 1);

    // 治疗瓶奖励放最高台，明确告诉玩家“上方有东西”。
    if (rng.chance(0.6)) {
      placeFlask(r, baseX + 11, floorY - 6);
    }

    setSpawn(r, 3, floorY);
  }
};
