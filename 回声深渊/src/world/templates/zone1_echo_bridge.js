// 回声桥引导（Echo Bridge Tutorial）— Zone 2 强制回声机制 ⭐
// 几何：短路程 + 宽 7 tile 的鸿沟，双跳也不舒服，死亡后回声会落在坑中当桥点。
// 玩家典型流程：尝试跳过去 → 落入坑底死亡 → 留下回声 → 重生回来 → 用回声当桥跨过去
import {
  clearInterior, placeFloor, placePlatform, placeSpikes,
  placeEnemy, setSpawn
} from './_primitives.js';
import { TILES } from '../tile.js';

// 注意：从 zone 1 主线移到 zone 2 — 第一次教学回声机制时玩家已死过几次，回声更自然
export const echoBridgeTutorial = {
  id: 'echo_bridge',
  name: '回声桥',
  zone: 2,
  kinds: ['normal', 'elite'],
  requiresEcho: true,
  build(rng, r) {
    clearInterior(r);
    const floorY = r.h - 4;

    // 左岸很短，死后从最近篝火回来不会再跑很久。
    const gapStart = Math.floor(r.w * 0.35);
    placeFloor(r, 1, gapStart - 1, floorY);

    // 预告台：玩家会自然站上去看见鸿沟，明白这里不是普通跳跃题。
    placePlatform(r, gapStart - 6, gapStart - 3, floorY - 3, 'platform');

    // 鸿沟：7 tile，底部尖刺。回声落在坑中后能作为中继点。
    const gapWidth = 7;
    const gapEnd = gapStart + gapWidth;
    placeSpikes(r, gapStart, gapEnd - 1, r.h - 2);

    // 右半地板
    placeFloor(r, gapEnd, r.w - 2, floorY);

    // 鸿沟下方放一个稍微凹的"坑"，玩家掉进去死亡 → 回声留在坑底
    // （坑两侧的墙体呈漏斗形，回声落点准确）
    for (let x = gapStart; x < gapEnd; x++) {
      // 把坑壁略微挖深，制造回声"落坐"的视觉感
      r.set(x, r.h - 3, TILES.EMPTY);
    }

    // 只放一个地面史莱姆，避免第一次回声教学叠加远程/精英压力。
    placeEnemy(r, 'slime', gapEnd + 4, floorY - 1);

    // 出生点在左岸，便于"看到"鸿沟
    setSpawn(r, 3, floorY);
  }
};
