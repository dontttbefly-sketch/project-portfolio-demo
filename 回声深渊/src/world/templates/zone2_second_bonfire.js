// 第二篝火 + 蹬墙圣坛（Second Bonfire）— Room 7
// Zone 2 末。蹬墙圣坛由 ABILITY_SHRINES['room-7'] = 'wallClimb' 自动放在最高平台上
// 这里只负责布置篝火 + 装饰 + 治疗瓶，让圣坛有平台可放
import {
  clearInterior, placeFloor, placePlatform,
  placeBonfire, placeFlask, placeLore, setSpawn
} from './_primitives.js';
import { TILES } from '../tile.js';

export const secondBonfire = {
  id: 'second_bonfire',
  name: '第二篝火',
  zone: 2,
  kinds: ['bonfire'],
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;
    placeFloor(r, 1, r.w - 2, floorY);

    // 篝火居左
    placeBonfire(r, 4, floorY - 1);

    // 中央高台 — 蹬墙圣坛会被自动放这（最高 PLATFORM_SOLID），双跳可达。
    const cx = Math.floor(r.w / 2);
    placePlatform(r, cx - 2, cx + 2, floorY - 4, 'solid');

    // 拿到蹬墙后，右侧两面短墙让玩家马上碰一次新能力。
    for (let dy = 0; dy < 5; dy++) {
      r.set(cx + 7, floorY - dy, TILES.SOLID);
      r.set(cx + 12, floorY - 1 - dy, TILES.SOLID);
    }

    // 装饰兼练习起跳：两侧矮台
    placePlatform(r, 8, 10, floorY - 2, 'platform');
    placePlatform(r, r.w - 11, r.w - 9, floorY - 3, 'platform');

    // 治疗瓶
    placeFlask(r, cx + 4, floorY - 1);

    // Lore 石：神殿入口
    placeLore(r, cx - 4, floorY - 1, '"墙是规则。打破它的人，才能听见真相。"');

    setSpawn(r, 4, floorY);
  }
};
