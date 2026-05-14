// 镜厅（Mirror Hall）— Zone 3
// 几何：中线对称的水平房间
// gimmick：每 3s 房间中央放出一道"镜像幽灵"沿玩家路径冲过来；冲刺/格挡可化解
import {
  clearInterior, placeFloor, placePlatform, placeSpikes,
  placeEnemy, setSpawn
} from './_primitives.js';

export const mirrorHall = {
  id: 'mirror_hall',
  name: '镜厅',
  zone: 3,
  kinds: ['normal', 'elite'],
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;
    placeFloor(r, 1, r.w - 2, floorY);

    // 镜像几何：左右两侧对称的两组台阶
    const center = Math.floor(r.w / 2);
    const stepUp = 3, pw = 4;
    for (let i = 0; i < 3; i++) {
      const dx = 4 + i * 5;
      const py = floorY - 2 - i * stepUp;
      placePlatform(r, center - dx - pw, center - dx, py, 'solid');
      placePlatform(r, center + dx, center + dx + pw, py, 'solid');
    }

    // 中央高处一段 PLATFORM 作为顶
    placePlatform(r, center - 3, center + 3, floorY - 8, 'platform');

    // 中央底面尖刺，鼓励玩家在两侧
    placeSpikes(r, center - 2, center + 2, floorY - 1);

    // 守卫
    placeEnemy(r, 'knight', 6, floorY - 1);
    placeEnemy(r, 'knight', r.w - 7, floorY - 1);
    if (r.kind === 'elite') {
      placeEnemy(r, 'eye', center - 8, 5);
      placeEnemy(r, 'eye', center + 8, 5);
    }

    // 镜像幽灵机制
    r.mechanic = {
      kind: 'mirror_ghost',
      period: 3.0,
      damage: 1
    };

    setSpawn(r, 3, floorY);
  }
};
