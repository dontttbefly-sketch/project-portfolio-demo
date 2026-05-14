// 菜单：标题 / 暂停 / 死亡 / 通关
import { Input } from '../input.js';
import { withAlpha } from '../art/palette.js';
import { resetSave } from '../save.js';

export class TitleMenu {
  constructor() {
    this.idx = 0;
    this.t = 0;
  }
  options(persist) {
    return persist.totalRuns > 0
      ? ['继续游戏', '新游戏（重置存档）', '操作说明']
      : ['开始游戏', '操作说明'];
  }
  update(dt, ctx) {
    this.t += dt;
    const opts = this.options(ctx.world.persist);
    if (Input.pressed('up')) this.idx = (this.idx + opts.length - 1) % opts.length;
    if (Input.pressed('down')) this.idx = (this.idx + 1) % opts.length;
    if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('attack') || Input.pressed('interact')) {
      const opt = opts[this.idx];
      if (opt === '继续游戏' || opt === '开始游戏') ctx.startGame();
      else if (opt === '新游戏（重置存档）') ctx.confirmReset();
      else if (opt === '操作说明') ctx.openHelp();
    }
  }
  render(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    // 标题
    ctx.fillStyle = '#cf6877';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('回  声  深  渊', W / 2 + Math.sin(this.t * 0.7) * 1, H / 2 - 50);
    ctx.fillStyle = withAlpha('#cba0d6', 0.5);
    ctx.font = '7px monospace';
    ctx.fillText('— ECHO  ABYSS —', W / 2, H / 2 - 36);
    // 选项
    const opts = this.options(this._persist || { totalRuns: 0 });
    for (let i = 0; i < opts.length; i++) {
      const yy = H / 2 + i * 14;
      ctx.fillStyle = i === this.idx ? '#fde9a8' : withAlpha('#7d5e8a', 0.7);
      ctx.font = '9px monospace';
      ctx.fillText(i === this.idx ? '▶ ' + opts[i] : opts[i], W / 2, yy);
    }
    ctx.fillStyle = withAlpha('#5b4366', 0.7);
    ctx.font = '6px monospace';
    ctx.fillText('Created by procedural pixel synthesis', W / 2, H - 8);
    ctx.textAlign = 'left';
  }

  setPersist(p) { this._persist = p; }
}

export class PauseMenu {
  constructor() { this.idx = 0; }
  options() { return ['继续', '回到标题', '重置存档（危险）']; }
  update(dt, ctx) {
    const opts = this.options();
    if (Input.pressed('up')) this.idx = (this.idx + opts.length - 1) % opts.length;
    if (Input.pressed('down')) this.idx = (this.idx + 1) % opts.length;
    if (Input.pressed('pause') || Input.pressed('cancel')) ctx.resumeGame();
    if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('attack') || Input.pressed('interact')) {
      const opt = opts[this.idx];
      if (opt === '继续') ctx.resumeGame();
      else if (opt === '回到标题') ctx.toTitle();
      else if (opt === '重置存档（危险）') ctx.confirmReset();
    }
  }
  render(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#cba0d6';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('暂  停', W / 2, H / 2 - 32);
    const opts = this.options();
    for (let i = 0; i < opts.length; i++) {
      ctx.fillStyle = i === this.idx ? '#fde9a8' : '#7d5e8a';
      ctx.font = '8px monospace';
      ctx.fillText(i === this.idx ? '▶ ' + opts[i] : opts[i], W / 2, H / 2 - 12 + i * 12);
    }
    ctx.textAlign = 'left';
  }
}

export class DeathScreen {
  constructor() { this.t = 0; this.cause = ''; }
  show(cause) { this.t = 0; this.cause = cause; }
  update(dt, ctx) {
    this.t += dt;
    // 蔚蓝式：0.2s 后可按键复活；0.5s 自动复活（死亡几乎零成本）
    if (this.t > 0.2) {
      if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('attack') || Input.pressed('interact')) {
        ctx.respawnPlayer();
        return;
      }
      if (this.t > 0.5) {
        ctx.respawnPlayer();
      }
    }
  }
  render(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const a = Math.min(1, this.t / 0.35);
    ctx.fillStyle = `rgba(8,5,15,${0.85 * a})`;
    ctx.fillRect(0, 0, W, H);
    if (a > 0.4) {
      const fade = Math.min(1, (this.t - 0.14) / 0.21);
      ctx.fillStyle = `rgba(207,104,119,${fade})`;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('YOU  DIED', W / 2, H / 2 - 4);
      ctx.fillStyle = `rgba(164,123,177,${fade})`;
      ctx.font = '7px monospace';
      ctx.fillText('回声留在了深渊…', W / 2, H / 2 + 10);
      if (this.t > 0.4) {
        ctx.fillStyle = `rgba(253,233,168,${0.6 + Math.sin(this.t * 6) * 0.4})`;
        ctx.font = '7px monospace';
        ctx.fillText('按 J / K 重生', W / 2, H / 2 + 28);
      }
      ctx.textAlign = 'left';
    }
  }
}

export class VictoryScreen {
  constructor() { this.t = 0; }
  show() { this.t = 0; }
  update(dt, ctx) {
    this.t += dt;
    if (this.t > 2.5 && (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('attack'))) {
      ctx.toTitle();
    }
  }
  render(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.fillStyle = `rgba(8,5,15,${Math.min(1, this.t / 1.5)})`;
    ctx.fillRect(0, 0, W, H);
    if (this.t > 0.5) {
      ctx.fillStyle = `rgba(253,233,168,${Math.min(1, (this.t - 0.5))})`;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('深  渊  止  息', W / 2, H / 2 - 8);
      ctx.fillStyle = `rgba(207,160,214,${Math.min(1, (this.t - 1.0))})`;
      ctx.font = '7px monospace';
      ctx.fillText('你的回声从此自由', W / 2, H / 2 + 10);
      ctx.fillStyle = `rgba(125,94,138,${Math.min(1, (this.t - 1.5))})`;
      ctx.font = '6px monospace';
      ctx.fillText('按确认返回标题，开始新世界', W / 2, H / 2 + 28);
      ctx.textAlign = 'left';
    }
  }
}

export class HelpScreen {
  constructor() {}
  update(dt, ctx) {
    if (Input.pressed('confirm') || Input.pressed('cancel') || Input.pressed('jump')) {
      ctx.toTitle();
    }
  }
  render(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const lines = [
      '【操  作】',
      '  A / D · 移动',
      '  K / 空格 · 跳跃 (空中再按 = 二段跳)',
      '  S + K · 下穿单向平台',
      '  J · 攻击 (三连击) | 长按 0.7s = 蓄力重击 (可砸碎脆弱墙)',
      '  U · 远程魔法弹  (耗法力)',
      '  L · 冲刺 (冲刺前 0.16s 无敌)',
      '  I · 格挡 (0.16s 内挡 = 完美格挡)',
      '  E · 互动 (回声 / 篝火 / 升级)',
      '  F · 召唤 — 复活最近回声为幽灵',
      '  H · 喝治疗瓶  | TAB · 全图  | ESC · 暂停',
      '',
      '【回  声】',
      '  死亡时留下幽灵回声，跨周目永久存在',
      '  每个回声可：倾听 / 吸收 / 召唤 / 渡桥',
      '  长时未访问 → 腐蚀，化为敌人',
      '',
      '按任意键返回'
    ];
    ctx.fillStyle = '#cba0d6';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 12, 18 + i * 9);
    }
  }
}

export class ConfirmReset {
  constructor() { this.idx = 0; }
  update(dt, ctx) {
    if (Input.pressed('left') || Input.pressed('right')) this.idx = 1 - this.idx;
    if (Input.pressed('confirm') || Input.pressed('interact')) {
      if (this.idx === 1) {
        // ⚠️ 必须重置 ctx.persist，rebuildWorld 内部用的就是它
        ctx.persist = resetSave();
        ctx.rebuildWorld();
        ctx.toTitle();
      } else {
        ctx.toTitle();
      }
    }
    if (Input.pressed('cancel')) ctx.toTitle();
  }
  render(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#cf6877';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('清空所有进度与回声？', W / 2, H / 2 - 16);
    const opts = ['取消', '确认重置'];
    for (let i = 0; i < opts.length; i++) {
      ctx.fillStyle = i === this.idx ? '#fde9a8' : '#7d5e8a';
      ctx.font = '9px monospace';
      ctx.fillText(opts[i], W / 2 - 60 + i * 120, H / 2 + 10);
    }
    ctx.textAlign = 'left';
  }
}
