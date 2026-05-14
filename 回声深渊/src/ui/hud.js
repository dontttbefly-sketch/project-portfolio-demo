// HUD: HP / Mana / Stamina / Flasks / Fragments / Toast / Buffs
import { withAlpha } from '../art/palette.js';
import { getFlaskSprite, getFragmentSprite } from '../art/pixelart.js';
import { palettes } from '../art/palette.js';

export class HUD {
  constructor() {
    this.toasts = []; // {text, time, life}
    this.hazardFlashTimer = 0;
  }

  showToast(text, life = 2.0) {
    this.toasts.push({ text, time: 0, life });
  }

  flashHazards(t) { this.hazardFlashTimer = t; }

  update(dt) {
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      this.toasts[i].time += dt;
      if (this.toasts[i].time >= this.toasts[i].life) this.toasts.splice(i, 1);
    }
    if (this.hazardFlashTimer > 0) this.hazardFlashTimer -= dt;
  }

  render(ctx, player, world) {
    if (!player) return;
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    // 左上：HP
    const x0 = 6, y0 = 6;
    for (let i = 0; i < player.maxHp; i++) {
      const filled = i < player.hp;
      ctx.fillStyle = filled ? '#cf6877' : '#3d2c40';
      ctx.fillRect(x0 + i * 7, y0, 5, 5);
      ctx.fillStyle = '#1a0d10';
      ctx.fillRect(x0 + i * 7, y0 + 5, 5, 1);
    }
    // 法力条
    const manaY = y0 + 8;
    ctx.fillStyle = '#2c1d2e';
    ctx.fillRect(x0, manaY, 60, 3);
    ctx.fillStyle = '#7a8db2';
    ctx.fillRect(x0, manaY, Math.ceil(60 * player.mana / player.maxMana), 3);
    // 体力条
    const stamY = manaY + 4;
    ctx.fillStyle = '#2c1d2e';
    ctx.fillRect(x0, stamY, 60, 3);
    ctx.fillStyle = '#8db86a';
    ctx.fillRect(x0, stamY, Math.ceil(60 * player.stamina / player.maxStamina), 3);

    // 治疗瓶
    const flaskSprite = getFlaskSprite(palettes.player);
    for (let i = 0; i < player.maxFlasks; i++) {
      const filled = i < player.flasks;
      const fx = x0 + i * 7;
      const fy = stamY + 6;
      if (filled) {
        ctx.drawImage(flaskSprite, fx, fy);
      } else {
        ctx.globalAlpha = 0.25;
        ctx.drawImage(flaskSprite, fx, fy);
        ctx.globalAlpha = 1;
      }
    }

    // 右上：碎片
    const fragSprite = getFragmentSprite(palettes.lava);
    ctx.drawImage(fragSprite, W - 38, 6);
    ctx.fillStyle = '#fde9a8';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(String(player.fragments), W - 30, 13);
    ctx.textAlign = 'left';

    // 右上：buff 列表
    let by = 16;
    for (const b of player.absorbedBuffs) {
      ctx.fillStyle = withAlpha('#cba0d6', 0.85);
      ctx.font = '6px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('▲ ' + buffLabel(b.type) + '(' + Math.ceil(b.time) + 's)', W - 6, by);
      by += 8;
    }
    ctx.textAlign = 'left';

    // toasts
    let ty = H - 40;
    for (const t of this.toasts) {
      const a = t.time < 0.3 ? t.time / 0.3 : t.life - t.time < 0.4 ? (t.life - t.time) / 0.4 : 1;
      ctx.fillStyle = `rgba(0,0,0,${0.6 * a})`;
      const tw = ctx.measureText(t.text).width;
      ctx.font = '8px monospace';
      const w2 = Math.ceil(t.text.length * 5.4) + 10;
      ctx.fillRect((W - w2) / 2, ty - 8, w2, 12);
      ctx.fillStyle = `rgba(228,232,245,${a})`;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, W / 2, ty);
      ctx.textAlign = 'left';
      ty -= 14;
    }

    // 召唤幽灵存在感提示
    if (player.summonedGhost && player.summonedGhost.alive) {
      ctx.fillStyle = '#a47bb1';
      ctx.font = '6px monospace';
      ctx.fillText('幽灵 ' + player.summonedGhost.duration.toFixed(1) + 's', x0, H - 6);
    }

    // 房间名
    ctx.fillStyle = withAlpha('#cba0d6', 0.4);
    ctx.font = '6px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(world.currentRoom ? world.currentRoom.id : '', W - 6, H - 6);
    ctx.textAlign = 'left';
  }

  // 在屏幕上短暂高亮危险瓦片
  shouldFlashHazards() {
    return this.hazardFlashTimer > 0;
  }
}

function buffLabel(t) {
  if (t === 'spike_resist') return '尖刺抗性';
  if (t === 'lava_resist') return '熔岩抗性';
  if (t.startsWith('enemy:')) return t.replace('enemy:', '').replace('_resist', '') + '抗性';
  return t;
}
