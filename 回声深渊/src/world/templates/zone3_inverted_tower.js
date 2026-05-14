// 倒置之塔（Inverted Tower）— Zone 3 强制回声 ⭐
// 几何：进门后房间重力翻转 — 玩家朝"上"飞向天花板
// gimmick：天花板成为新地板；中段需要召唤回声链式渡桥
//        两个独立"地板"被空气间隔，必须留 2-3 个回声当落脚点
import {
  clearInterior, placeFloor, placePlatform,
  placeEnemy, setSpawn
} from './_primitives.js';

export const invertedTower = {
  id: 'inverted_tower',
  name: '倒置之塔',
  zone: 3,
  kinds: ['normal', 'elite'],
  requiresEcho: true,
  build(rng, r) {
    clearInterior(r);

    // 顶部"新地板"（重力翻转后的下方）
    const ceilingY = 2;
    for (let x = 1; x < r.w - 1; x++) r.set(x, ceilingY, 1);  // SOLID

    // 顶部稍下：两段"天花板平台"
    placePlatform(r, 1, Math.floor(r.w * 0.3), ceilingY + 4, 'solid');
    placePlatform(r, Math.floor(r.w * 0.7), r.w - 2, ceilingY + 4, 'solid');
    // 中段空缺 ≥ 4 tile，需要回声当桥（重力翻转下"上跳"=朝下走）

    // 原本的下方留一片小地板（玩家进门处，触发翻转前停留点）
    const floorY = r.h - 3;
    placeFloor(r, 1, 5, floorY);

    // 守卫（在天花板平台上）
    placeEnemy(r, 'knight', Math.floor(r.w * 0.2), ceilingY + 3);
    placeEnemy(r, 'knight', Math.floor(r.w * 0.8), ceilingY + 3);
    if (r.kind === 'elite') placeEnemy(r, 'eye', Math.floor(r.w / 2), Math.floor(r.h / 2));

    r.mechanic = {
      kind: 'inverted_gravity',
      activated: false,           // 进入房间后激活
      triggerX: 7                 // 走过这个 X 触发翻转
    };

    setSpawn(r, 3, floorY);
  }
};
