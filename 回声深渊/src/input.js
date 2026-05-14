// 键盘输入：当前帧状态 + 边沿检测
const keys = new Set();
const justPressed = new Set();
const justReleased = new Set();
const heldTime = new Map();

const map = {
  left:    ['KeyA', 'ArrowLeft'],
  right:   ['KeyD', 'ArrowRight'],
  up:      ['KeyW', 'ArrowUp'],
  down:    ['KeyS', 'ArrowDown'],
  jump:    ['KeyK', 'Space'],
  attack:  ['KeyJ'],
  ranged:  ['KeyU'],
  dash:    ['KeyL'],
  parry:   ['KeyI'],
  interact:['KeyE'],
  summon:  ['KeyF'],
  heal:    ['KeyH'],
  pause:   ['Escape'],
  confirm: ['Enter', 'KeyZ'],
  cancel:  ['Escape', 'KeyX'],
  menu:    ['Tab']
};

window.addEventListener('keydown', e => {
  if (Object.values(map).flat().includes(e.code)) e.preventDefault();
  if (!keys.has(e.code)) {
    justPressed.add(e.code);
    heldTime.set(e.code, 0);
  }
  keys.add(e.code);
});
window.addEventListener('keyup', e => {
  if (keys.has(e.code)) {
    justReleased.add(e.code);
  }
  keys.delete(e.code);
  heldTime.delete(e.code);
});
window.addEventListener('blur', () => {
  keys.clear();
  heldTime.clear();
});

function anyHeld(codes) { return codes.some(c => keys.has(c)); }
function anyPressed(codes) { return codes.some(c => justPressed.has(c)); }
function anyReleased(codes) { return codes.some(c => justReleased.has(c)); }
function maxHeld(codes) {
  let m = 0;
  for (const c of codes) m = Math.max(m, heldTime.get(c) || 0);
  return m;
}

export const Input = {
  held(action) { return anyHeld(map[action] || []); },
  pressed(action) { return anyPressed(map[action] || []); },
  released(action) { return anyReleased(map[action] || []); },
  heldTime(action) { return maxHeld(map[action] || []); },

  axisX() {
    return (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0);
  },
  axisY() {
    return (this.held('down') ? 1 : 0) - (this.held('up') ? 1 : 0);
  },

  // 每帧末尾调用，更新 hold 时间和清空 just-* 集合
  endFrame(dt) {
    for (const [k, t] of heldTime) heldTime.set(k, t + dt);
    justPressed.clear();
    justReleased.clear();
  },

  consume(action) {
    for (const c of map[action] || []) justPressed.delete(c);
  }
};
