// 程序化像素艺术合成
// 角色由 4-5 个部件组合，每帧重新生成时利用缓存
// Sprite 用 ASCII pattern 描述，便于阅读：
//   '.' = 透明
//   '0'-'f' = palette index 0..15

import { palettes, withAlpha } from './palette.js';

// 把 ASCII pattern 渲染到一个离屏 canvas
function patternToCanvas(pattern, palette, scale = 1, alpha = 1) {
  const lines = pattern.split('\n').filter(l => l.length > 0);
  const w = lines[0].length;
  const h = lines.length;
  const cv = document.createElement('canvas');
  cv.width = w * scale;
  cv.height = h * scale;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < lines[y].length; x++) {
      const c = lines[y][x];
      if (c === '.') continue;
      const idx = parseInt(c, 16);
      const col = palette[idx];
      if (!col) continue;
      ctx.fillStyle = alpha < 1 ? withAlpha(col, alpha) : col;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return cv;
}

// 缓存：同样的 (key, palette, alpha) 复用 canvas
const cache = new Map();
function cached(key, build) {
  let c = cache.get(key);
  if (!c) { c = build(); cache.set(key, c); }
  return c;
}

// ============= 玩家 sprite =============
// 9x14 像素，共四个朝向状态：idle / walk / jump / attack
// 调色板 player：1=深皮肤, 4=暗红, 5/6=主红, 8=深蓝衣, 9/10=蓝衣, 13/14=金棕

const PLAYER_PATTERNS = {
  idle: [
`.........
...777...
..76667..
..71117..
..7d8d7..
..d8888d.
..d8888d.
...8888..
...8.78..
...8.78..
...8.78..
...8.78..
...d.7d..
...d.7d..`,

`.........
...777...
..76667..
..71117..
..7d8d7..
..d8888d.
..d8888d.
...8888..
...8.78..
...8.78..
...8.78..
...8.78..
..7d.7d..
..d8.7d..`
  ],
  walk: [
`.........
...777...
..76667..
..71117..
..7d8d7..
..d8888d.
..d8888d.
...8888..
...8788..
..78.78..
..78.78..
..d8.7d..
..7..d...
..d......`,

`.........
...777...
..76667..
..71117..
..7d8d7..
..d8888d.
..d8888d.
...8888..
...8788..
...8788..
...8.78..
...8.7d..
...d.7d..
.....d...`,

`.........
...777...
..76667..
..71117..
..7d8d7..
..d8888d.
..d8888d.
...8888..
...8.788.
..78..78.
..78..78.
..d8..7d.
...7..d..
...d.....`,

`.........
...777...
..76667..
..71117..
..7d8d7..
..d8888d.
..d8888d.
...8888..
...8888..
...8788..
...8.78..
...d.78..
....7.d..
....d....`
  ],
  jump: [
`.........
...777...
..76667..
..71117..
..7d8d7..
..d8888d.
..d8888d.
.7.8888.7
.7.8788.7
.7.8888.7
...8888..
...8.78..
...d.7d..
....7.d..`
  ],
  fall: [
`.........
...777...
..76667..
..71117..
..7d8d7..
.7d8888d7
.7d8888d7
...8888..
...8788..
...8788..
...8.78..
...d.7d..
....7d...
.........`
  ],
  attack1: [
`.........
...777...
..76667..
..71117..
..7d8d7..
..d8888d.
..d8888dd
...88886.
...88886.
...88766.
...d.7d6.
....7.d..
....d....
.........`
  ],
  attack2: [
`.........
...777...
..76667..
..71117..
..7d8d7..
..d8888d.
6.d8888d.
66.8888..
66.8788..
.6.8788..
...8.78..
...d.7d..
....7.d..
....d....`
  ],
  attack3: [
`.........
...777...
..76667..
..71117..
..7d8d76.
..d888866
..d8888d6
...88886.
...87766.
...87.66.
...d.766.
....7d6..
....d.6..
.........`
  ],
  hurt: [
`.........
...777...
..7accc7.
..7c5c5..
..7d8d7..
..dccccd.
..dccccd.
...cccc..
...c.7c..
...d.7d..
....d....
....7....
....d....
.........`
  ],
  dead: [
`.........
.........
.........
.........
.........
....777..
...76667.
..d8888d.
.d88888dd
.7888887.
..d.788..
..7..d...
.........
.........`
  ]
};

export function getPlayerSprite(state, frame, palette = palettes.player, alpha = 1) {
  const frames = PLAYER_PATTERNS[state] || PLAYER_PATTERNS.idle;
  const f = frames[frame % frames.length];
  const key = `player:${state}:${frame % frames.length}:${alpha.toFixed(2)}:${paletteHash(palette)}`;
  return cached(key, () => patternToCanvas(f, palette, 1, alpha));
}

function paletteHash(p) {
  let h = '';
  for (let i = 0; i < p.length; i++) h += p[i].slice(1, 3);
  return h;
}

// ============= 武器特效（程序化"月牙"形挥砍）=============
// 用大圆减去偏移的小圆形成月牙：⊃ 形开口向左（朝玩家），凸面向右（朝敌人）
// alpha 由调用方在渲染时控制 fade
function makeCrescentSlash(kind, alpha = 0.95) {
  const heavy = kind === 'heavy';
  const outerR = heavy ? 22 : 16;
  const innerR = outerR - (heavy ? 6 : 5);
  const offset = heavy ? 7 : 5;        // 内圆偏移量（决定月牙厚度）
  const W = outerR * 2 + 2;
  const H = outerR * 2 + 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const cx = W / 2, cy = H / 2;

  // 1. 外缘（柔和的暗轮廓 + 主体亮）
  // 主体填充：右半圆（朝向敌人）
  ctx.fillStyle = heavy ? '#fde9a8' : '#cba0d6';
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(cx, cy + outerR);
  ctx.closePath();
  ctx.fill();

  // 2. 用 destination-out 切掉内圆 → 形成月牙
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx - offset, cy, innerR, 0, Math.PI * 2);
  ctx.fill();

  // 3. 加亮线在月牙外缘（让边缘"发光"感）
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = heavy ? '#ffffff' : '#fde9a8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - 1, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // 4. 整体叠一层 alpha
  if (alpha < 1) {
    const buf = ctx.getImageData(0, 0, W, H);
    for (let i = 3; i < buf.data.length; i += 4) buf.data[i] = (buf.data[i] * alpha) | 0;
    ctx.putImageData(buf, 0, 0);
  }
  return c;
}

export function getSlashSprite(kind, palette = palettes.player, alpha = 0.85) {
  return cached(`slash:crescent:${kind}:${alpha.toFixed(2)}`, () => makeCrescentSlash(kind, alpha));
}

// ============= 敌人 sprite =============
// 史莱姆：随机变异 (palette + 变化 + 大小)
const SLIME_PATTERN = `
....2222....
...244442...
..24555542..
.2455dd5542.
.245d33d542.
.2455dd5542.
.244555442..
.244444442..
.244444442..
..24444442..
...224422...
....2222....`;

const SLIME_HURT_PATTERN = `
....7777....
...744447...
..74555547..
.7455dd5547.
.745daad547.
.7455dd5547.
.744555447..
.744444447..
.744444447..
..74444447..
...774477...
....7777....`;

export function getSlimeSprite(palette, hurt = false) {
  const key = `slime:${paletteHash(palette)}:${hurt ? 'h' : 'n'}`;
  return cached(key, () => patternToCanvas(hurt ? SLIME_HURT_PATTERN : SLIME_PATTERN, palette, 1));
}

// 飞行眼怪
const EYE_PATTERN = `
..3333..
.344443.
3445544c
3455554c
3457754c
3455554c
3445544c
.34443c.
..bbbb..
.bbbbbb.
b.b..b.b
b......b`;

export function getEyeSprite(palette) {
  return cached(`eye:${paletteHash(palette)}`, () => patternToCanvas(EYE_PATTERN, palette, 1));
}

// 重甲守卫
const KNIGHT_PATTERN = `
....4444....
...444444...
..44888844..
..48000084..
..40dd0d04..
..48000084..
..488d8884..
.4444444444.
.4cccccccc4.
.4ccc77ccc4.
.4cc7777cc4.
.4ccccccccc.
.44cccccc44.
..4ccccc44..
...4cc4444..
....44.44...`;

export function getKnightSprite(palette) {
  return cached(`knight:${paletteHash(palette)}`, () => patternToCanvas(KNIGHT_PATTERN, palette, 1));
}

// Boss：深渊王 — 头戴破碎王冠的骷髅诡异身躯
const BOSS_PATTERN = `
....7..7.7..7....
....7..7.7..7....
....77.7.7.77....
....7777777777...
...44444444444...
..4445555555444..
..445d55555d544..
..4555ddd55d544..
..4d55555555554..
..4555ddddd5554..
..44555555555544.
..444444444444444
.444aaa44444aaa44
.44a444444444444a
.4444cccccccccc44
.4cccc7c7c7c7ccc4
.4cccc7c7c7c7ccc4
.44ccccccccccccc4
..4ccccccccccc44.
..44cccccccc444..
...44ccccc444....
.....44a4a44.....
......a...a......`;

export function getBossSprite(palette) {
  return cached(`boss:${paletteHash(palette)}`, () => patternToCanvas(BOSS_PATTERN, palette, 1));
}

// ============= 弹幕 / 投射物 =============
const ORB_PATTERN = `
.cccc.
ccaacc
caaaac
caaaac
ccaacc
.cccc.`;
export function getOrbSprite(palette) {
  return cached(`orb:${paletteHash(palette)}`, () => patternToCanvas(ORB_PATTERN, palette, 1));
}

const ENEMY_BULLET_PATTERN = `
.55.
5dd5
5dd5
.55.`;
export function getEnemyBulletSprite(palette) {
  return cached(`ebul:${paletteHash(palette)}`, () => patternToCanvas(ENEMY_BULLET_PATTERN, palette, 1));
}

// ============= 治疗瓶 / 拾取物 =============
const FLASK_PATTERN = `
.787.
.6c6.
.555.
.555.
.555.
.666.`;
export function getFlaskSprite(palette) {
  return cached(`flask:${paletteHash(palette)}`, () => patternToCanvas(FLASK_PATTERN, palette, 1));
}

const FRAGMENT_PATTERN = `
.66.
6776
6776
.66.`;
export function getFragmentSprite(palette) {
  return cached(`frag:${paletteHash(palette)}`, () => patternToCanvas(FRAGMENT_PATTERN, palette, 1));
}

// ============= 篝火 (检查点) =============
const BONFIRE_PATTERN = `
....6.....
...767....
..76776...
..67667...
.7666667..
.7676767..
..67676...
.cccccccc.
ccccccccc
.cccccccc.`;
export function getBonfireSprite(palette) {
  return cached(`bonfire:${paletteHash(palette)}`, () => patternToCanvas(BONFIRE_PATTERN, palette, 1));
}

// ============= 通用矩形渲染 (HP 条等) =============
export function fillRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
}

export function strokeRect(ctx, x, y, w, h, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, Math.ceil(w) - 1, Math.ceil(h) - 1);
}
