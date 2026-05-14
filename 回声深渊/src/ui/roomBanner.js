// 进入主题房间时短暂显示房间名，给玩家"哦这是什么主题房"的辨识感
// boss 模式：更长持续时间 + 红色标题 + 全屏暗化（戏剧化进场）
import { W, H } from '../config.js';
import { withAlpha } from '../art/palette.js';

export class RoomBanner {
  constructor() {
    this.t = 0;
    this.text = '';
    this.subtitle = '';
    this.boss = false;
    this.active = false;
    this.lastShownRoomId = null;
  }

  show(roomId, text, subtitle = '', boss = false) {
    if (roomId === this.lastShownRoomId) return;
    this.lastShownRoomId = roomId;
    this.text = text;
    this.subtitle = subtitle;
    this.boss = boss;
    this.t = 0;
    this.active = true;
  }

  _timings() {
    return this.boss
      ? { fadeIn: 0.35, hold: 1.40, fadeOut: 0.50 }
      : { fadeIn: 0.20, hold: 0.90, fadeOut: 0.40 };
  }

  isHoldingPhase() {
    if (!this.active) return false;
    const t = this._timings();
    return this.boss && this.t < t.fadeIn + t.hold;
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const t = this._timings();
    if (this.t >= t.fadeIn + t.hold + t.fadeOut) this.active = false;
  }

  render(ctx) {
    if (!this.active) return;
    const t = this._timings();
    let alpha = 1;
    if (this.t < t.fadeIn) alpha = this.t / t.fadeIn;
    else if (this.t > t.fadeIn + t.hold) alpha = 1 - (this.t - t.fadeIn - t.hold) / t.fadeOut;
    alpha = Math.max(0, Math.min(1, alpha));

    // Boss 模式：全屏暗化 + 大字体红色
    if (this.boss) {
      ctx.fillStyle = `rgba(8, 5, 15, ${0.7 * alpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    const cy = Math.floor(H * (this.boss ? 0.45 : 0.32));
    const barH = this.boss ? 32 : 22;
    ctx.fillStyle = `rgba(0, 0, 0, ${(this.boss ? 0.75 : 0.55) * alpha})`;
    ctx.fillRect(0, cy - barH / 2, W, barH);

    // 主标题
    ctx.font = this.boss ? 'bold 18px monospace' : '12px monospace';
    ctx.textAlign = 'center';
    const titleColor = this.boss ? '#cf6877' : '#fde9a8';
    ctx.fillStyle = withAlpha(titleColor, alpha);
    ctx.fillText(this.text, W / 2, cy + (this.boss ? 4 : 1));

    if (this.subtitle) {
      ctx.font = '7px monospace';
      ctx.fillStyle = withAlpha('#cba0d6', alpha * 0.8);
      ctx.fillText(this.subtitle, W / 2, cy + (this.boss ? 16 : 12));
    }
    ctx.textAlign = 'left';
  }
}
