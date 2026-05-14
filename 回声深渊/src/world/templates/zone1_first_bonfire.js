// 第一篝火（First Bonfire）— Room 3
// Zone 1 末，已拿到双跳。安静休整间。
// 篝火居中，两侧治疗瓶在不同高度小台 — 顺手练双跳
import {
  clearInterior, placeFloor, placePlatform,
  placeBonfire, placeFlask, placeLore, setSpawn
} from './_primitives.js';

export const firstBonfire = {
  id: 'first_bonfire',
  name: '第一篝火',
  zone: 1,
  kinds: ['bonfire'],
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;
    placeFloor(r, 1, r.w - 2, floorY);

    // 篝火放正中央
    const cx = Math.floor(r.w / 2);
    placeBonfire(r, cx, floorY - 1);

    // 两侧高台各放 1 治疗瓶 — 双跳上去
    placePlatform(r, 4, 7, floorY - 4, 'solid');
    placePlatform(r, r.w - 8, r.w - 5, floorY - 4, 'solid');
    placeFlask(r, 5, floorY - 5);
    placeFlask(r, r.w - 7, floorY - 5);

    // 装饰中台 — 顶部点缀
    placePlatform(r, cx - 3, cx + 3, floorY - 8, 'platform');

    // Lore 石：森林深处
    placeLore(r, cx + 2, floorY - 1, '"森林之下还有森林…一层一层，回声不停。"');

    setSpawn(r, 4, floorY);
  }
};
