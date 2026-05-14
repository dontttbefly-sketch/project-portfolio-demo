import assert from 'node:assert/strict';

import { TILE } from '../src/config.js';
import { meleeHitbox, meleeTileTargets } from '../src/entities/melee.js';

const player = { x: 10, y: 24, w: 9, h: 14, facing: 1 };

const right = meleeHitbox(player);
assert.equal(right.x, player.x + player.w);
assert.equal(right.w, TILE * 2);
assert.equal(right.y, player.y + 1);
assert.equal(right.h, player.h - 2);

const left = meleeHitbox({ ...player, facing: -1 });
assert.equal(left.x, player.x - TILE * 2);
assert.equal(left.w, TILE * 2);

const targets = meleeTileTargets(player);
const targetKeys = targets.map(t => `${t.tx},${t.ty}`);
assert.ok(targetKeys.includes('1,2'), 'first tile in front should be covered');
assert.ok(targetKeys.includes('2,2'), 'second tile in front should be covered');
assert.ok(targetKeys.includes('1,3'), 'lower body tile in front should be covered');
assert.ok(targetKeys.includes('2,3'), 'lower body second tile should be covered');

console.log('melee geometry tests passed');
