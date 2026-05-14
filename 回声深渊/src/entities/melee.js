import { PLAYER, TILE } from '../config.js';

export function meleeHitbox(actor, range = PLAYER.ATTACK_RANGE) {
  const facing = actor.facing >= 0 ? 1 : -1;
  return {
    x: facing > 0 ? actor.x + actor.w : actor.x - range,
    y: actor.y + 1,
    w: range,
    h: actor.h - 2
  };
}

export function meleeTileTargets(actor, range = PLAYER.ATTACK_RANGE) {
  const box = meleeHitbox(actor, range);
  const minTx = Math.floor(box.x / TILE);
  const maxTx = Math.floor((box.x + box.w - 1) / TILE);
  const minTy = Math.floor(box.y / TILE);
  const maxTy = Math.floor((box.y + box.h - 1) / TILE);
  const tiles = [];
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      tiles.push({ tx, ty });
    }
  }
  return tiles;
}

export function overlaps(a, b) {
  return b.x < a.x + a.w && b.x + b.w > a.x && b.y < a.y + a.h && b.y + b.h > a.y;
}
