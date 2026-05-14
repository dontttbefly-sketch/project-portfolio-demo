// 鼓动熔岩塔（Pulsing Lava Tower）— Zone 2
// 几何：垂直长塔，平台 zigzag 向上
// gimmick：底部熔岩周期 3s 涨落到中段，淹没下方平台 → 必须时机点踩
import {
  clearInterior, placeFloor, placePlatform, placeLava,
  placeEnemy, setSpawn
} from './_primitives.js';

export const pulsingLavaTower = {
  id: 'pulsing_lava',
  name: '鼓动熔岩塔',
  zone: 2,
  kinds: ['normal', 'elite'],
  requiresVerticalExit: true,   // 垂直爬升塔，水平出口的房间不能用（会被涨潮岩浆淹掉地板）
  build(rng, r) {
    clearInterior(r);

    // 底部 2 行熔岩池
    const lavaBaseY = r.h - 2;
    placeLava(r, 1, r.w - 2, lavaBaseY);
    placeLava(r, 1, r.w - 2, lavaBaseY - 1);

    // 起跳点：左下小台
    const startY = r.h - 4;
    placePlatform(r, 1, 5, startY, 'solid');

    // zigzag 向上：起跳点正上方开始，左右摆动 ±4 tile
    const anchorX = 4;  // 起跳点中心列
    const layers = Math.min(8, Math.floor((r.h - 6) / 3));
    let curY = startY - 3;
    let side = 1;
    for (let i = 0; i < layers; i++) {
      const pw = 4;
      const cx = anchorX + side * 4;
      const px = Math.max(2, Math.min(r.w - pw - 2, cx - 1));
      placePlatform(r, px, px + pw - 1, curY, 'solid');
      side *= -1;
      curY -= 3;
      if (curY < 3) break;
    }

    // 中段一只眼远程骚扰
    placeEnemy(r, 'eye', Math.floor(r.w / 2), Math.floor(r.h / 2));
    if (r.kind === 'elite') placeEnemy(r, 'eye', Math.floor(r.w / 3), Math.floor(r.h / 3));

    r.mechanic = {
      kind: 'pulsing_lava',
      baseY: lavaBaseY - 1,
      peakY: lavaBaseY - 4,
      period: 3.0,
      x0: 1, x1: r.w - 2
    };

    setSpawn(r, 3, startY);
  }
};
