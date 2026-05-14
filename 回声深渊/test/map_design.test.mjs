import assert from 'node:assert/strict';

import {
  ROOM_TEMPLATES,
  SECRET_TEMPLATE_POOL,
  ZONES,
  TILE
} from '../src/config.js';
import { generateLevel } from '../src/world/generator.js';
import { validate } from '../src/world/reachability.js';

function indexOf(id) {
  const main = /^room-(\d+)$/.exec(id);
  if (main) return Number(main[1]);
  const secret = /^room-secret-(\d+)$/.exec(id);
  if (secret) return Number(secret[1]);
  return 0;
}

function zoneFor(roomId) {
  const idx = indexOf(roomId);
  return ZONES.find(z => idx >= z.rooms[0] && idx <= z.rooms[1]) || ZONES[ZONES.length - 1];
}

function propTileX(prop) {
  return Math.floor((prop.x + 4) / TILE);
}

function assertMainTemplateFlow(seed) {
  const level = generateLevel(seed);
  const expected = {
    'room-0': 'start_room',
    'room-1': 'initiate_hall',
    'room-2': 'crumbling_path',
    'room-3': 'first_bonfire',
    'room-4': 'echo_bridge',
    'room-5': 'lava_sprint',
    'room-6': 'forge_arena',
    'room-7': 'second_bonfire',
    'room-8': 'wall_canyon',
    'room-9': 'reflecting_hall'
  };

  for (const [roomId, templateId] of Object.entries(expected)) {
    assert.equal(
      level.rooms.get(roomId)?.templateId,
      templateId,
      `${roomId} should use ${templateId}`
    );
  }

  for (const room of level.rooms.values()) {
    if (room.templateRequiresEcho || room.templateRequiresWallClimb) continue;
    const result = validate(room, zoneFor(room.id).abilities);
    assert.equal(result.ok, true, `${room.id} should be reachable`);
  }

  return level;
}

assert.equal(
  ROOM_TEMPLATES['room-4'],
  'echo_bridge',
  'Zone 2 entrance should introduce the mainline echo bridge'
);
assert.equal(
  SECRET_TEMPLATE_POOL.includes('echo_bridge'),
  false,
  'Echo bridge should not be repeated in the secret room pool'
);

for (const seed of [1, 12345, 987654321]) {
  const level = assertMainTemplateFlow(seed);

  const echoRoom = level.rooms.get('room-4');
  assert.equal(echoRoom.templateRequiresEcho, true, 'room-4 should be marked as echo-required');
  assert.ok(
    echoRoom.entitiesInit.every(e => e.type !== 'eye' && e.type !== 'knight'),
    'mainline echo tutorial should avoid ranged/elite pressure'
  );

  const dashRoom = level.rooms.get('room-5');
  const dashShrine = dashRoom.props.find(p => p.kind === 'shrine' && p.ability === 'dash');
  assert.ok(dashShrine, 'lava sprint should contain the dash shrine');
  assert.ok(
    propTileX(dashShrine) < Math.floor(dashRoom.w * 0.45),
    'dash shrine should sit in the safe front half before the chase escalates'
  );
}

console.log('map design tests passed');
