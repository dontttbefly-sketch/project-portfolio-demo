// 全局配置常量
export const W = 384;          // 逻辑画布宽
export const H = 216;          // 逻辑画布高
export const TILE = 12;        // 图块像素
export const FPS = 60;
export const DT = 1 / FPS;     // 固定时间步

// 物理
export const GRAVITY = 900;
export const MAX_FALL = 520;
export const FRICTION = 1100;
export const AIR_DRAG = 220;

// 玩家
export const PLAYER = {
  W: 9,
  H: 14,
  MOVE_SPEED: 110,
  ACCEL: 980,
  JUMP_VEL: -270,
  COYOTE: 0.10,
  JUMP_BUFFER: 0.12,
  JUMP_HOLD_GRAVITY: 480,
  WALL_SLIDE: 60,
  WALL_JUMP_VX: 150,
  WALL_JUMP_VY: -250,
  DASH_VEL: 280,
  DASH_TIME: 0.18,
  DASH_COOLDOWN: 0.55,
  DASH_IFRAMES: 0.16,
  HP_MAX: 5,
  STAMINA_MAX: 100,
  STAMINA_REGEN: 55,
  MANA_MAX: 100,
  MANA_REGEN: 8,
  FLASKS_MAX: 4,
  HEAL_AMOUNT: 3,
  HEAL_TIME: 0.55,
  ATTACK_COST: 12,
  HEAVY_COST: 28,
  PARRY_COST: 14,
  DASH_COST: 18,
  RANGED_COST: 22,
  ATTACK_RANGE: TILE * 2,
  ATTACK_DMG: 1,
  HEAVY_DMG: 4,
  RANGED_DMG: 1,
  COMBO_WINDOW: 0.45,
  ATTACK_TIME: 0.16,
  HEAVY_TIME: 0.45,
  HEAVY_CHARGE: 0.45,
  PARRY_WINDOW: 0.16,
  HIT_IFRAMES: 0.7,
  HIT_KNOCKBACK: 130
};

// 相机
export const CAMERA = {
  LOOKAHEAD: 28,        // 朝玩家朝向偏移多少像素
  VERTICAL_BIAS: 0.6    // 玩家在屏幕上的垂直位置（0=顶, 1=底）
};

// 战斗手感
export const SHAKE = {
  HIT: 5,
  DEATH: 12,
  HEAVY: 10,
  EXPLOSION: 9
};

// 回声
export const ECHO = {
  ABSORB_TIME: 0.85,
  COMMUNE_TIME: 3.0,
  GHOST_DURATION: 15.0,
  CORRUPT_AGE: 1000 * 60 * 30, // 30 分钟未访问 → 腐蚀
  MAX_PER_ROOM: 8,
  INTERACT_DIST: 22
};

// 关卡生成 — 蔚蓝式"单屏房间"：尽量贴近 32×18（一屏）
export const GEN = {
  ROOMS: 11,
  ROOM_W_MIN: 28,
  ROOM_W_MAX: 36,
  ROOM_H_MIN: 18,
  ROOM_H_MAX: 22,
  CONNECTIONS: 1.4
};

// 三层难度分区：每个 zone 的房间索引区间 + 该 zone 玩家应有的能力集
// 用于关卡生成（决定 biome / 间距上限 / 圣坛位置）和可达性验证
export const ZONES = [
  { id: 1, biome: 'forest', rooms: [0, 3], abilities: { jump: true, downStrike: true } },
  { id: 2, biome: 'lava',   rooms: [4, 7], abilities: { jump: true, downStrike: true, doubleJump: true, dash: true } },
  { id: 3, biome: 'temple', rooms: [8, 10], abilities: { jump: true, downStrike: true, doubleJump: true, dash: true, wallClimb: true } }
];

// 主线圣坛位置（roomId → ability）— 保证玩家进入下一个 zone 前已习得该能力
export const ABILITY_SHRINES = {
  'room-2': 'doubleJump',  // zone 1 末，进入 zone 2 前
  'room-5': 'dash',        // zone 2 中段
  'room-7': 'wallClimb',   // zone 2 末（前移），让 zone 3 全程能蹬墙
  'room-9': 'maxHp'        // zone 3 elite，奖励生命上限
};

// 主线房间模板编排（roomId → templateId）—— 替代随机抽，保证流程顺畅
// 设计意图：每间房只教/考一件事，节奏 教学→试用→综合→休息→进下一 zone
export const ROOM_TEMPLATES = {
  'room-0': 'start_room',        // 起点：篝火 + 试跳低台（无敌）
  'room-1': 'initiate_hall',     // zone 1：单跳节奏教学
  'room-2': 'crumbling_path',    // zone 1：蓄力重击+破墙；最高台 = 双跳圣坛
  'room-3': 'first_bonfire',     // 第一篝火：双跳后练手 + 治疗瓶
  'room-4': 'echo_bridge',       // zone 2 入口：温和强制回声桥，让死亡铺路进入主线
  'room-5': 'lava_sprint',       // zone 2：引入冲刺；尽头 = 冲刺圣坛
  'room-6': 'forge_arena',       // zone 2 终章：综合考核（地面 / 中层 / 顶层 三路线）
  'room-7': 'second_bonfire',    // 第二篝火：蹬墙圣坛
  'room-8': 'wall_canyon',       // zone 3：横向蹬墙考核（替代 sheer_cliff，因主线全水平）
  'room-9': 'reflecting_hall'    // zone 3：综合考核 + 双精英敌
};

// 秘密房模板池 —— 高难/echo 强制等"硬核"模板限定在秘密房作为可选挑战
export const SECRET_TEMPLATE_POOL = [
  'mirror_hall', 'dark_shaft', 'inverted_tower',
  'wall_bounce', 'leap_of_faith', 'floating_islands'
];

export const SAVE_KEY = 'echoabyss_v1';
