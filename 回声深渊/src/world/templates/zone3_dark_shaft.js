// 暗梯井（Dark Shaft）— Zone 3 强制回声 ⭐
// 几何：垂直深井，平台 zigzag 上行
// gimmick：可见半径仅 60px；先前留下的回声会发光成为路标
//        没有沉淀回声 → 摸黑跳跃极困难
import {
  clearInterior, placeFloor, placePlatform,
  placeEnemy, setSpawn
} from './_primitives.js';

export const darkShaft = {
  id: 'dark_shaft',
  name: '暗梯井',
  zone: 3,
  kinds: ['normal', 'elite'],
  requiresEcho: true,
  requiresVerticalExit: true,   // 垂直深井
  build(rng, r) {
    clearInterior(r);

    // 底部一片小地板供出生
    const floorY = r.h - 3;
    placeFloor(r, 1, r.w - 2, floorY);

    // zigzag 平台向上
    let curY = floorY - 3;
    let side = 1;
    const pw = 3;  // 较窄，黑暗中更难找
    while (curY > 4) {
      const xCenter = side > 0 ? Math.floor(r.w * 0.65) : Math.floor(r.w * 0.30);
      const px = Math.max(2, Math.min(r.w - pw - 2, xCenter - 1));
      placePlatform(r, px, px + pw - 1, curY, 'solid');
      curY -= 3;
      side *= -1;
    }

    // 几只眼在中段（从黑暗中射弹幕）
    placeEnemy(r, 'eye', Math.floor(r.w * 0.4), Math.floor(r.h * 0.55));
    placeEnemy(r, 'eye', Math.floor(r.w * 0.6), Math.floor(r.h * 0.35));
    if (r.kind === 'elite') placeEnemy(r, 'knight', Math.floor(r.w / 2), floorY - 1);

    // 黑暗机制：渲染时只显示玩家附近半径 R
    r.mechanic = {
      kind: 'darkness',
      radius: 80,        // px，玩家中心半径
      ambient: 0.05      // 半径外亮度
    };

    setSpawn(r, 3, floorY);
  }
};
