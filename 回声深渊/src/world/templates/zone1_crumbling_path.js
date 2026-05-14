// 碎墙之路（Crumbling Path）— Zone 1 教学蓄力重击破墙
// 几何：单层走廊，中段有 2 格高的脆弱墙挡住前路
//        玩家走近，按住 J 蓄力，松开重击 → 砸碎墙继续向前
import {
  clearInterior, placeFloor, placePlatform, placeFragileWall,
  placeEnemy, placeFlask, setSpawn
} from './_primitives.js';
import { TILES } from '../tile.js';

export const crumblingPath = {
  id: 'crumbling_path',
  name: '碎墙之路',
  zone: 1,
  kinds: ['normal'],
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;
    placeFloor(r, 1, r.w - 2, floorY);

    // 脆弱墙：主路径上的小门。破墙是奖励路线，跳台绕行是保底路线。
    const wallX = Math.floor(r.w * 0.40);
    for (let dx = 0; dx < 2; dx++) {
      placeFragileWall(r, wallX + dx, floorY - 1, 2);
    }

    // 绕行台阶：用实心矮台，避免抢走最高 PLATFORM 上的双跳圣坛。
    for (let x = wallX - 5; x <= wallX - 2; x++) r.set(x, floorY - 3, TILES.SOLID);
    for (let x = wallX + 2; x <= wallX + 5; x++) r.set(x, floorY - 3, TILES.SOLID);

    // 墙后"圣坛台"：最高 PLATFORM，双跳圣坛会被强制放在这里。
    // placeShrineOnHighest 会把双跳圣坛放在这台 → 必经位置
    const shrinePX = wallX + 5;
    placePlatform(r, shrinePX, shrinePX + 3, floorY - 3, 'platform');

    // 上方绕行里夹一小段碎裂台，制造“轻微有刺”的第一印象。
    for (let x = wallX + 2; x <= wallX + 4; x++) {
      r.set(x, floorY - 4, TILES.CRUMBLING);
    }
    placeFlask(r, wallX + 3, floorY - 2);
    placeFlask(r, r.w - 4, floorY - 1);

    // 战斗：圣坛后 1 史莱姆 + 终点附近 1 史莱姆 + elite 多加一个 eye
    placeEnemy(r, 'slime', shrinePX + 7, floorY - 1);
    placeEnemy(r, 'slime', r.w - 5, floorY - 1);
    if (r.kind === 'elite') placeEnemy(r, 'eye', Math.floor(r.w / 2), 5);

    setSpawn(r, 3, floorY);
  }
};
