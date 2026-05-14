// Lore 石：站旁按 E 显示一段叙事文本
// 用于篝火房 / 秘密房等氛围房间，给世界观增加厚度
import { Entity } from './entity.js';
import { withAlpha } from '../art/palette.js';

export class LoreStone extends Entity {
  constructor(x, y, text) {
    super(x, y, 7, 9);
    this.team = 'neutral';
    this.gravityScale = 0;
    this.text = text || '深渊在低语…';
    this.t = 0;
  }

  interact(player, ctx) {
    ctx.showToast?.(this.text, 4.5);
  }

  update(dt, ctx) {
    super.update(dt, ctx);
    this.t += dt;
    if (Math.random() < 0.04) {
      ctx.particles?.spawn?.({
        x: this.centerX() + (Math.random() - 0.5) * 4,
        y: this.y + 1,
        vx: 0, vy: -8 - Math.random() * 6,
        life: 0.7, size: 1, color: '#cba0d6', shrink: true
      });
    }
  }

  render(ctx, camX, camY) {
    const sx = (this.x - camX) | 0;
    const sy = (this.y - camY) | 0;
    // 简易石碑：暗色底 + 顶端紫光
    ctx.fillStyle = '#3d2c40';
    ctx.fillRect(sx, sy + 2, this.w, this.h - 2);
    ctx.fillStyle = '#5b4366';
    ctx.fillRect(sx + 1, sy + 2, this.w - 2, 1);
    ctx.fillStyle = withAlpha('#cba0d6', 0.5 + Math.sin(this.t * 3) * 0.3);
    ctx.fillRect(sx + 2, sy, this.w - 4, 2);
    // 中央"卐"形（用 # 字符简化）
    ctx.fillStyle = '#7d5e8a';
    ctx.fillRect(sx + 3, sy + 4, 1, 3);
    ctx.fillRect(sx + 2, sy + 5, 3, 1);
  }
}
