// 起点 · 觉醒（Awakening）— Room 0
// 玩家睁开眼的第一个房间。无敌人、无危险，用低台和奖励做安全练习场。
// 篝火点亮即为存档点（同时是世界 spawn 点）。
import {
  clearInterior, placeFloor, placePlatform,
  placeBonfire, placeFlask, placeLore, setSpawn
} from './_primitives.js';

export const startRoom = {
  id: 'start_room',
  name: '起点 · 觉醒',
  zone: 1,
  kinds: ['start'],
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;
    placeFloor(r, 1, r.w - 2, floorY);

    // 安全 playground：低台 → 中台 → 高台，最后一跳稍远但不惩罚。
    placePlatform(r, 8, 11, floorY - 2, 'solid');
    placePlatform(r, 14, 17, floorY - 3, 'platform');
    placePlatform(r, 20, 23, floorY - 5, 'solid');
    placePlatform(r, 27, 30, floorY - 3, 'platform');

    // 篝火（左侧，spawn 旁）
    placeBonfire(r, 4, floorY - 1);

    // 可见奖励：玩家不用读教程也会自然试跳。
    placeFlask(r, 22, floorY - 7);

    // Lore 石：起点叙事
    placeLore(r, 7, floorY - 1, '"我曾跌入这里…和你一样。"');

    setSpawn(r, 5, floorY);
  }
};
