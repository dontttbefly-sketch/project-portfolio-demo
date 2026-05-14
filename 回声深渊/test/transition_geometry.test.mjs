import assert from 'node:assert/strict';

import { TILE } from '../src/config.js';
import { canEnterExit } from '../src/world/transitions.js';

const room = { w: 30, h: 20 };
const upExit = { dir: 'up', x: 4, y: 0 };
const downExit = { dir: 'down', x: 4, y: 19 };

assert.equal(
  canEnterExit({ x: 4 * TILE, y: TILE * 2 - 1, w: 9, h: 14 }, room, upExit),
  true,
  'up exits should trigger when the player reaches the visible top shaft'
);

assert.equal(
  canEnterExit({ x: 4 * TILE, y: TILE * 3, w: 9, h: 14 }, room, upExit),
  false,
  'up exits should not trigger from far below the top shaft'
);

assert.equal(
  canEnterExit({ x: 11 * TILE, y: TILE, w: 9, h: 14 }, room, upExit),
  false,
  'up exits still require the player to be near the exit column'
);

assert.equal(
  canEnterExit({ x: 4 * TILE, y: room.h * TILE - 14, w: 9, h: 14 }, room, downExit),
  true,
  'down exits should still trigger at the lower edge'
);

console.log('transition geometry tests passed');
