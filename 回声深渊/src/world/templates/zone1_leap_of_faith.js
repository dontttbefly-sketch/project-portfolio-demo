// 飞跃悬崖（Leap of Faith）— Zone 1
// 几何：3 段稳定地面，缝隙之间用 CRUMBLING 平台垫
// gimmick：CRUMBLING 踩上 0.5s 必塌，玩家不能停留 → 强迫"跳-踩-跳"节奏
import {
  clearInterior, placeFloor, placePlatform,
  placeEnemy, placeFlask, setSpawn
} from './_primitives.js';
import { TILES } from '../tile.js';

export const leapOfFaith = {
  id: 'leap_of_faith',
  name: '飞跃悬崖',
  zone: 1,
  kinds: ['normal'],
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;

    // 三段稳固地面
    const seg1End = Math.floor(r.w * 0.25);
    const seg2Start = Math.floor(r.w * 0.45);
    const seg2End = Math.floor(r.w * 0.60);
    const seg3Start = Math.floor(r.w * 0.78);
    placeFloor(r, 1, seg1End, floorY);
    placeFloor(r, seg2Start, seg2End, floorY);
    placeFloor(r, seg3Start, r.w - 2, floorY);

    // 缝隙 1：CRUMBLING 紧挨段边，让玩家踩着自然过渡
    // [seg1End SOLID] CCCC___CCCC [seg2Start SOLID]
    for (let dx = 1; dx <= 3; dx++) r.set(seg1End + dx, floorY, TILES.CRUMBLING);
    // 中间 1 tile 空隙（强制跳）
    for (let dx = 1; dx <= 3; dx++) r.set(seg2Start - dx, floorY, TILES.CRUMBLING);

    // 缝隙 2：上下错落的 3 块 CRUMBLING
    // 让玩家"跳-踩-跳"过 — 每块紧贴下一块跳跃可达范围
    const g2x = seg2End + 2;
    for (let dx = 0; dx < 2; dx++) r.set(g2x + dx, floorY - 1, TILES.CRUMBLING);     // 第 1 块（高一点）
    for (let dx = 0; dx < 2; dx++) r.set(g2x + 3 + dx, floorY - 2, TILES.CRUMBLING); // 第 2 块（更高）
    for (let dx = 0; dx < 2; dx++) r.set(g2x + 6 + dx, floorY - 1, TILES.CRUMBLING); // 第 3 块（回到中高度）

    // 上方装饰浮岛
    placePlatform(r, Math.floor(r.w * 0.5) - 2, Math.floor(r.w * 0.5) + 2, floorY - 5, 'platform');

    placeEnemy(r, 'slime', seg2Start + 1, floorY - 1);

    // 终点放治疗瓶
    placeFlask(r, r.w - 4, floorY - 1);

    setSpawn(r, 3, floorY);
  }
};
