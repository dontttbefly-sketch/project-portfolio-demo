// 实体基类
export class Entity {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;     // 1 = right, -1 = left
    this.onGround = false;
    this.againstWall = 0;
    this.alive = true;
    this.dead = false;
    this.invuln = 0;
    this.flash = 0;
    this.hp = 1;
    this.maxHp = 1;
    this.dmgTouch = 0;   // 接触伤害
    this.team = 'enemy'; // player | enemy | neutral
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.gravityScale = 1;
    this.removeMe = false;
    this.touchingHazard = false;
  }

  centerX() { return this.x + this.w / 2; }
  centerY() { return this.y + this.h / 2; }

  hurt(dmg, kx = 0, ky = 0, source = null) {
    if (this.invuln > 0 || this.dead) return false;
    this.hp -= dmg;
    this.flash = 0.18;
    // 敌人受击不再有无敌帧（玩家三连击的每一刀都能落实）
    // 玩家有自己的 takeDamage 路径设置 HIT_IFRAMES，不走这里
    this.invuln = 0;
    this.knockbackVx = kx;
    this.knockbackVy = ky;
    if (this.hp <= 0) this.kill(source);
    return true;
  }

  kill(source) {
    if (this.dead) return;
    this.dead = true;
    this.alive = false;
  }

  update(dt, ctx) {
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flash > 0) this.flash -= dt;
  }

  render() {}
}
