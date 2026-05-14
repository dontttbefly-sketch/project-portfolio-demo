// 弹幕长廊（Bullet Corridor）— Zone 2
// 几何：水平长廊 + 几个稳定的 PLATFORM_SOLID 高台供休整
// gimmick：单一 lane 弹幕从右端发射，速度慢、周期长，玩家走路就能躲（跳/冲都行）
//
// 关键约束：
//   • 玩家身高 14px = 1.17 tile，站立 tile 上方还有 1 像素溢出
//   • 因此弹幕 lane 必须距离玩家可站位 ≥ 2 tile，否则不可能躲过
//   • Lane 放在 floorY - 4（地面玩家头顶上方 2 tile） — 玩家蹲在地上不被打、跳起来才会与弹道平行
import {
  clearInterior, placeFloor, placePlatform,
  placeEnemy, placeFlask, setSpawn
} from './_primitives.js';

export const bulletCorridor = {
  id: 'bullet_corridor',
  name: '弹幕长廊',
  zone: 2,
  kinds: ['normal', 'elite'],
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;
    placeFloor(r, 1, r.w - 2, floorY);

    // 三层平台让玩家可以"垂直分层"躲弹道
    // 地面 = 危险层（弹幕走头顶高）
    // PLATFORM_SOLID 在 floorY-4 = 安全层（玩家在这里站位高于弹幕）
    const p1x = Math.floor(r.w * 0.30);
    const p2x = Math.floor(r.w * 0.55);
    const p3x = Math.floor(r.w * 0.80);
    placePlatform(r, p1x, p1x + 4, floorY - 4, 'solid');
    placePlatform(r, p2x, p2x + 4, floorY - 4, 'solid');
    placePlatform(r, p3x, p3x + 4, floorY - 4, 'solid');

    // 弹幕：1 条 lane 在 floorY - 2（地面玩家"头顶"行）
    // 站地面被弹幕擦头；站平台上头顶在 floorY - 6 完全安全
    // 玩家逐段向上跳到平台躲过弹道，再下到地面赶路
    r.mechanic = {
      kind: 'bullet_curtain',
      period: 2.2,            // 2.8→2.2 节奏紧凑
      speed: 75,              // 55→75 反应窗口缩短
      lanes: [floorY - 2]
    };

    // 终点奖励
    placeFlask(r, r.w - 4, floorY - 1);

    if (r.kind === 'elite') placeEnemy(r, 'eye', Math.floor(r.w / 2), floorY - 8);

    setSpawn(r, 3, floorY);
  }
};
