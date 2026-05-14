// 熔岩涌进（Lava Surge）— Zone 2 强制回声机制 ⭐
// 几何：水平宽房，唯一安全平台是左下起点；右上是出口
// gimmick：底部熔岩缓慢上涨，玩家无法在熔岩上停留
//        中间 5+ tile 间距空旷，需要召唤回声当临时落脚才能跨过
import {
  clearInterior, placeFloor, placePlatform, placeLava,
  placeEnemy, setSpawn
} from './_primitives.js';

export const lavaSurge = {
  id: 'lava_surge',
  name: '熔岩涌进',
  zone: 2,
  kinds: ['normal', 'elite'],
  requiresEcho: true,
  build(rng, r) {
    clearInterior(r);

    // 起点：左下角的小石台（高于初始熔岩）
    const startY = r.h - 5;
    placePlatform(r, 1, 5, startY, 'solid');

    // 中段：稀疏 PLATFORM，间距 ≥ 6 tile，单纯双跳跨不过去（双跳 10 但有重力）
    const platforms = [
      { x: 11, y: startY - 1, w: 3 },
      { x: 19, y: startY - 3, w: 3 },
      { x: 27, y: startY - 1, w: 3 },
      { x: 35, y: startY - 3, w: 3 }
    ];
    for (const p of platforms) {
      if (p.x + p.w < r.w - 2) placePlatform(r, p.x, p.x + p.w - 1, p.y, 'solid');
    }

    // 右上角：出口附近的高台
    const endX = Math.min(r.w - 6, 42);
    placePlatform(r, endX, endX + 4, startY - 4, 'solid');

    // 底部初始熔岩 1 行
    placeLava(r, 1, r.w - 2, r.h - 2);

    // 几个守卫眼
    placeEnemy(r, 'eye', Math.floor(r.w / 2), 4);
    if (r.kind === 'elite') placeEnemy(r, 'knight', endX + 2, startY - 5);

    // 上涨熔岩：从 r.h-2 缓慢上升到 startY-1
    r.mechanic = {
      kind: 'rising_lava',
      startY: r.h - 2,
      endY: startY,
      duration: 30.0,    // 30s 涨满
      x0: 1, x1: r.w - 2
    };

    setSpawn(r, 3, startY);
  }
};
