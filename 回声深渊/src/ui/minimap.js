// 小地图：角落常驻 + TAB 展开全图
// 房间布局基于 layout.edges 的方向（h/u/d）做 BFS 推算 2D 坐标
import { Input } from '../input.js';
import { withAlpha } from '../art/palette.js';

export class Minimap {
  constructor(world) {
    this.world = world;
    this.expanded = false;
    this.positions = layoutRooms(world.layout);
    // 计算坐标范围，方便居中
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of this.positions.values()) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    this.bounds = { minX, maxX, minY, maxY };
  }

  toggle() { this.expanded = !this.expanded; }

  update(dt, ctx) {
    if (Input.pressed('menu')) this.toggle();
  }

  // 角落小地图（常驻）
  renderCorner(ctx) {
    const W = ctx.canvas.width;
    const cell = 4;
    const gap = 1;
    const span = cell + gap;
    const cols = (this.bounds.maxX - this.bounds.minX + 1);
    const rows = (this.bounds.maxY - this.bounds.minY + 1);
    const w = cols * span - gap;
    const h = rows * span - gap;
    const padX = 6;
    const padY = 22; // 在 fragment 计数下方
    const x0 = W - w - padX;
    const y0 = padY;

    // 半透明背景
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x0 - 3, y0 - 3, w + 6, h + 6);

    this._renderRoomsAndLinks(ctx, x0, y0, span, cell);
  }

  // 全屏地图（按 TAB 展开）
  renderFull(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.fillStyle = 'rgba(8,5,15,0.85)';
    ctx.fillRect(0, 0, W, H);
    const cell = 18;
    const gap = 6;
    const span = cell + gap;
    const cols = (this.bounds.maxX - this.bounds.minX + 1);
    const rows = (this.bounds.maxY - this.bounds.minY + 1);
    const w = cols * span - gap;
    const h = rows * span - gap;
    const x0 = (W - w) / 2;
    const y0 = (H - h) / 2 + 6;

    // 标题
    ctx.fillStyle = '#cba0d6';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('深  渊  地  图', W / 2, y0 - 12);
    ctx.textAlign = 'left';

    this._renderRoomsAndLinks(ctx, x0, y0, span, cell, true);

    // 图例
    const ly = y0 + h + 14;
    drawLegend(ctx, W / 2 - 130, ly);
    ctx.fillStyle = '#7d5e8a';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TAB 关闭', W / 2, ly + 26);
    ctx.textAlign = 'left';
  }

  _renderRoomsAndLinks(ctx, x0, y0, span, cell, expanded = false) {
    const cur = this.world.currentRoom?.id;

    // 先连线
    ctx.strokeStyle = withAlpha('#7d5e8a', expanded ? 0.6 : 0.5);
    ctx.lineWidth = 1;
    for (const [a, b] of this.world.layout.edges) {
      const pa = this.positions.get(a);
      const pb = this.positions.get(b);
      if (!pa || !pb) continue;
      const ax = x0 + (pa.x - this.bounds.minX) * span + cell / 2;
      const ay = y0 + (pa.y - this.bounds.minY) * span + cell / 2;
      const bx = x0 + (pb.x - this.bounds.minX) * span + cell / 2;
      const by = y0 + (pb.y - this.bounds.minY) * span + cell / 2;
      ctx.beginPath();
      ctx.moveTo(Math.floor(ax) + 0.5, Math.floor(ay) + 0.5);
      ctx.lineTo(Math.floor(bx) + 0.5, Math.floor(by) + 0.5);
      ctx.stroke();
    }

    // 再画房间
    for (const [id, p] of this.positions) {
      const room = this.world.rooms.get(id);
      if (!room) continue;
      const rx = x0 + (p.x - this.bounds.minX) * span;
      const ry = y0 + (p.y - this.bounds.minY) * span;
      const visited = this.world.persist.lastVisited?.[id];
      const isCurrent = id === cur;
      const color = roomColor(room, visited);
      ctx.fillStyle = color;
      ctx.fillRect(rx, ry, cell, cell);
      // 标识
      if (room.kind === 'boss') {
        ctx.fillStyle = '#000';
        ctx.fillRect(rx + (cell - 2) / 2, ry + (cell - 2) / 2, 2, 2);
      } else if (room.kind === 'bonfire') {
        ctx.fillStyle = '#ed8030';
        ctx.fillRect(rx + (cell - 2) / 2, ry + (cell - 2) / 2, 2, 2);
      } else if (room.kind === 'elite') {
        ctx.fillStyle = '#cf6877';
        ctx.fillRect(rx + (cell - 2) / 2, ry + (cell - 2) / 2, 2, 2);
      } else if (room.kind === 'secret' && visited) {
        ctx.fillStyle = '#cba0d6';
        ctx.fillRect(rx + (cell - 2) / 2, ry + (cell - 2) / 2, 2, 2);
      }
      // 当前房间闪烁框
      if (isCurrent) {
        const t = Math.floor(Date.now() / 250) & 1;
        ctx.strokeStyle = t ? '#fde9a8' : '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx - 0.5, ry - 0.5, cell + 1, cell + 1);
      }
    }
  }
}

function roomColor(room, visited) {
  if (!visited) return 'rgba(60,40,80,0.55)'; // 未访问灰
  switch (room.kind) {
    case 'start': return '#7d5e8a';
    case 'normal': return '#5a8a4d';
    case 'elite': return '#a82a2a';
    case 'boss': return '#cf6877';
    case 'bonfire': return '#ed8030';
    case 'secret': return '#cba0d6';
    default: return '#5b4366';
  }
}

function drawLegend(ctx, x, y) {
  const items = [
    ['#7d5e8a', '起点'], ['#5a8a4d', '普通'],
    ['#a82a2a', '精英'], ['#ed8030', '篝火'],
    ['#cf6877', 'BOSS'], ['#cba0d6', '秘密'],
    ['rgba(80,60,100,0.6)', '未访']
  ];
  ctx.font = '6px monospace';
  for (let i = 0; i < items.length; i++) {
    const ix = x + i * 38;
    ctx.fillStyle = items[i][0];
    ctx.fillRect(ix, y, 4, 4);
    ctx.fillStyle = '#cba0d6';
    ctx.fillText(items[i][1], ix + 6, y + 4);
  }
}

// BFS 用边方向推算房间在 2D 上的位置
function layoutRooms(layout) {
  const positions = new Map();
  if (!layout || !layout.startId) return positions;
  positions.set(layout.startId, { x: 0, y: 0 });
  const occupied = new Set(['0,0']);
  const queue = [layout.startId];
  const visited = new Set([layout.startId]);
  while (queue.length) {
    const id = queue.shift();
    const pos = positions.get(id);
    for (const [a, b, dir] of layout.edges) {
      let other = null, dx = 0, dy = 0;
      if (a === id && !visited.has(b)) {
        other = b;
        if (dir === 'h') dx = 1;
        else if (dir === 'u') dy = -1;
        else if (dir === 'd') dy = 1;
      } else if (b === id && !visited.has(a)) {
        other = a;
        if (dir === 'h') dx = -1;
        else if (dir === 'u') dy = 1;
        else if (dir === 'd') dy = -1;
      }
      if (!other) continue;
      let cand = { x: pos.x + dx, y: pos.y + dy };
      let safety = 0;
      while (occupied.has(cand.x + ',' + cand.y) && safety < 8) {
        cand.y += 1;
        safety++;
      }
      occupied.add(cand.x + ',' + cand.y);
      positions.set(other, cand);
      visited.add(other);
      queue.push(other);
    }
  }
  return positions;
}
