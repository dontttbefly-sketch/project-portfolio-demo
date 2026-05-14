// 16 色调色板系统 — 限定色数量营造像素复古质感
// 每个 palette 是一组 hex 颜色字符串

export const palettes = {
  // 起始：腐朽森林
  forest: [
    '#000000', '#1d1018', '#2a1e2c', '#3d2c40',
    '#5b4366', '#7d5e8a', '#a47bb1', '#cba0d6',
    '#3a5d3a', '#5a8a4d', '#8db86a', '#c4d97e',
    '#8a4a3a', '#bb6f4d', '#e6a464', '#fbd987'
  ],

  // 第二区：熔岩洞窟
  lava: [
    '#000000', '#150607', '#2c0d10', '#48141b',
    '#741b22', '#a82a2a', '#d44e2a', '#ed8030',
    '#f7c45d', '#fde9a8', '#3a1e0d', '#5e3215',
    '#1a0d18', '#2c1d2e', '#3f3050', '#7a5fa0'
  ],

  // 第三区：腐朽神殿
  temple: [
    '#000000', '#0a0815', '#1c1830', '#2f2a4a',
    '#4a4570', '#7a78a8', '#b9bbd9', '#e6e8f5',
    '#5d2640', '#a04269', '#d97095', '#f0a4bf',
    '#2d4d4a', '#4f867d', '#7fcab9', '#c7f0e3'
  ],

  // 玩家专属（半透明回声会基于它）
  player: [
    '#000000', '#1a0d10', '#2e161b', '#48202b',
    '#68303f', '#9c4655', '#cf6877', '#f08c95',
    '#2a3245', '#4a5878', '#7a8db2', '#b3c4e0',
    '#5e3819', '#8c5a2c', '#c08e4d', '#e8c486'
  ]
};

// 获取颜色
export function color(palette, idx) {
  const p = typeof palette === 'string' ? palettes[palette] : palette;
  return p[idx] || '#ff00ff';
}

// 加深 / 变亮 — 用于动态渲染
export function tint(hex, mult) {
  const r = clamp01(parseInt(hex.slice(1, 3), 16) / 255 * mult);
  const g = clamp01(parseInt(hex.slice(3, 5), 16) / 255 * mult);
  const b = clamp01(parseInt(hex.slice(5, 7), 16) / 255 * mult);
  return `rgb(${(r*255)|0},${(g*255)|0},${(b*255)|0})`;
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

export function withAlpha(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}
