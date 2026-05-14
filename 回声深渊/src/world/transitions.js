import { TILE } from '../config.js';

export function canEnterExit(player, room, exit) {
  if (!player || !room || !exit) return false;

  let touchingEdge = false;
  if (exit.dir === 'right') touchingEdge = player.x + player.w >= room.w * TILE - 2;
  else if (exit.dir === 'left') touchingEdge = player.x <= 2;
  else if (exit.dir === 'up') touchingEdge = player.y <= TILE * 2;
  else if (exit.dir === 'down') touchingEdge = player.y + player.h >= room.h * TILE - 2;

  if (!touchingEdge) return false;

  if (exit.dir === 'left' || exit.dir === 'right') {
    return Math.abs(player.y / TILE - exit.y) <= 3;
  }

  const playerCenterTx = (player.x + player.w / 2) / TILE;
  return Math.abs(playerCenterTx - exit.x) <= 4;
}
