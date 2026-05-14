import assert from 'node:assert/strict';

import { generateLevel } from '../src/world/generator.js';
import { TILES } from '../src/world/tile.js';

const BLOCKING = new Set([
  TILES.SOLID,
  TILES.PLATFORM_SOLID,
  TILES.WALL_FRAGILE,
  TILES.CRUMBLING
]);

function assertClear(room, tx, ty, label) {
  const tile = room.tiles[ty * room.w + tx];
  assert.equal(
    BLOCKING.has(tile),
    false,
    `${label}: expected ${room.id} tile ${tx},${ty} to be passable, got ${tile}`
  );
}

for (const seed of [1, 12345, 987654321]) {
  const level = generateLevel(seed);

  for (const room of level.rooms.values()) {
    for (const ex of room.exits) {
      if (ex.dir === 'down') {
        for (let tx = ex.x - 1; tx <= ex.x + 1; tx++) {
          for (let ty = room.h - 6; ty <= room.h - 1; ty++) {
            assertClear(room, tx, ty, `${seed}:${ex.dir}->${ex.target}`);
          }
        }
      }

      if (ex.dir === 'up') {
        for (let tx = ex.x - 1; tx <= ex.x + 1; tx++) {
          for (let ty = 0; ty <= 5; ty++) {
            assertClear(room, tx, ty, `${seed}:${ex.dir}->${ex.target}`);
          }
        }
      }
    }
  }
}

console.log('exit clearance tests passed');
