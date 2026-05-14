// 反射镜厅（Reflecting Hall）— Zone 3
// 几何：对称大房间，中央立柱 + 双侧台 + 顶部奖励线。
// gimmick：精英敌追玩家。可以绕柱打游击，也可以冲刺穿过敌人 → 蹬柱反弹 → 背刺。
import {
  clearInterior, placeFloor, placePlatform,
  placeEnemy, setSpawn
} from './_primitives.js';
import { TILES } from '../tile.js';

export const reflectingHall = {
  id: 'reflecting_hall',
  name: '反射镜厅',
  zone: 3,
  kinds: ['normal', 'elite'],
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;
    placeFloor(r, 1, r.w - 2, floorY);

    // 中央立柱：既是掩体，也是蹬墙反打的核心物件。
    const cx = Math.floor(r.w / 2);
    for (let dy = 0; dy < 9; dy++) {
      r.set(cx, floorY - 1 - dy, TILES.SOLID);
      r.set(cx + 1, floorY - 1 - dy, TILES.SOLID);
    }

    // 对称侧台：低台打游击，高台接墙跳，顶部线给 maxHp 圣坛落点。
    placePlatform(r, 4, 8, floorY - 4, 'solid');
    placePlatform(r, r.w - 9, r.w - 5, floorY - 4, 'solid');
    placePlatform(r, 9, 12, floorY - 7, 'platform');
    placePlatform(r, r.w - 13, r.w - 10, floorY - 7, 'platform');
    placePlatform(r, cx - 5, cx + 6, floorY - 10, 'platform');

    // Boss 前综合题：一个稳定主敌，elite 再加对称压力。
    placeEnemy(r, 'knight', cx - 5, floorY - 1);
    if (r.kind === 'elite') placeEnemy(r, 'knight', cx + 5, floorY - 1);

    setSpawn(r, 3, floorY);
  }
};
