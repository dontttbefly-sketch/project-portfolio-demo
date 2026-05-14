// 回声互动对话框：4 选 1
import { Input } from '../input.js';
import { ECHO } from '../config.js';
import { withAlpha } from '../art/palette.js';
import { DEATH_CAUSE_TEXT } from '../entities/echo.js';

const OPTIONS = [
  { key: '倾听', desc: '听它讲述死因（高亮陷阱）', action: 'listen' },
  { key: '吸收', desc: '消耗回声 → 获得抗性 buff', action: 'absorb' },
  { key: '召唤', desc: '化为幽灵 15 秒辅助战斗', action: 'summon' },
  { key: '渡桥', desc: '与之对话 3 秒 → 化为平台', action: 'commune' }
];

export class EchoDialog {
  constructor() {
    this.echo = null;
    this.idx = 0;
    this.open = false;
    this.t = 0;
  }

  show(echo) {
    this.echo = echo;
    this.idx = 0;
    this.open = true;
    this.t = 0;
  }

  close() {
    this.echo = null;
    this.open = false;
  }

  update(dt, ctx) {
    if (!this.open) return;
    this.t += dt;

    // 上下选择
    if (Input.pressed('up') || Input.pressed('jump')) this.idx = (this.idx + OPTIONS.length - 1) % OPTIONS.length;
    if (Input.pressed('down')) this.idx = (this.idx + 1) % OPTIONS.length;
    // 确认
    if (Input.pressed('interact') || Input.pressed('attack')) {
      const opt = OPTIONS[this.idx];
      if (opt.action === 'listen') this.echo.resolveListen(ctx);
      else if (opt.action === 'absorb') this.echo.resolveAbsorb(ctx);
      else if (opt.action === 'summon') this.echo.resolveSummon(ctx);
      else if (opt.action === 'commune') this.echo.resolveCommune(ctx);
      this.close();
    }
    // 关闭
    if (Input.pressed('cancel') || Input.pressed('pause')) {
      this.close();
    }
  }

  render(ctx) {
    if (!this.open) return;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    // 半透明背景
    ctx.fillStyle = 'rgba(8,5,15,0.65)';
    ctx.fillRect(0, 0, W, H);
    // 框
    const bw = 200, bh = 90;
    const bx = (W - bw) / 2, by = (H - bh) / 2;
    ctx.fillStyle = '#1a0d10';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#cba0d6';
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    // 标题
    ctx.fillStyle = '#cba0d6';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    const txt = this.echo?.data?.corrupted ? '腐 朽 的 回 声' : '回  声';
    ctx.fillText(txt, W / 2, by + 12);
    // 死亡日期
    if (this.echo) {
      const d = new Date(this.echo.data.timestamp);
      const tStr = d.toLocaleString('zh-CN', { hour12: false });
      ctx.fillStyle = withAlpha('#7d5e8a', 0.8);
      ctx.font = '6px monospace';
      ctx.fillText(tStr, W / 2, by + 20);
    }

    // 选项
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    for (let i = 0; i < OPTIONS.length; i++) {
      const o = OPTIONS[i];
      const yy = by + 32 + i * 12;
      if (i === this.idx) {
        ctx.fillStyle = withAlpha('#cba0d6', 0.25);
        ctx.fillRect(bx + 6, yy - 7, bw - 12, 10);
        ctx.fillStyle = '#fde9a8';
        ctx.fillText('▶ ' + o.key, bx + 10, yy);
      } else {
        ctx.fillStyle = '#7d5e8a';
        ctx.fillText('  ' + o.key, bx + 10, yy);
      }
      ctx.fillStyle = withAlpha(i === this.idx ? '#e6e8f5' : '#5b4366', 0.85);
      ctx.font = '6px monospace';
      ctx.fillText(o.desc, bx + 60, yy);
      ctx.font = '7px monospace';
    }
    // 提示
    ctx.fillStyle = withAlpha('#7d5e8a', 0.7);
    ctx.font = '6px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('W/S 选择 · E 确认 · ESC 取消', bx + bw - 6, by + bh - 4);
    ctx.textAlign = 'left';
  }
}
