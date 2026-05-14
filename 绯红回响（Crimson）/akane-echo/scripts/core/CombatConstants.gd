extends Node

# ============================================================
# 战斗数值常量（单例 autoload）
# 所有动作脚本通过 CombatConstants.XXX 读取，调平衡只改这里
# 数值依据：策划案 §3 战斗系统
# ============================================================

# === 主角攻击伤害 ===
const ATTACK_FENG: int = 10        ## 风（第一段）
const ATTACK_XUE: int = 12         ## 雪（第二段）
const ATTACK_YUE: int = 25         ## 月（第三段）
const ATTACK_DASH: int = 20        ## 冲刺斩
const ATTACK_CHARGED: int = 50     ## 蓄力斩

# === 主角动作时长（秒）===
const ATTACK_FENG_RECOVERY: float = 0.15
const ATTACK_XUE_RECOVERY: float = 0.20
const ATTACK_YUE_RECOVERY: float = 0.45
const ATTACK_COMBO_WINDOW_FENG: float = 0.6
const ATTACK_COMBO_WINDOW_XUE: float = 0.7
const CHARGED_ATTACK_TIME: float = 0.8     ## 蓄满所需时间
const CHARGED_VISUAL_CUE_TIME: float = 0.5 ## 视觉提示开始的时间点

# 普通攻击各阶段时长
const ATTACK_STARTUP: float = 0.05
const ATTACK_ACTIVE: float = 0.08

# === 冲刺斩（方向 + J）===
const DASH_ATTACK_DISTANCE: float = 1.6
const DASH_ATTACK_DURATION: float = 0.18
const DASH_ATTACK_INVINCIBLE_FRAMES: int = 6
const DASH_ATTACK_COOLDOWN: float = 1.5
const DASH_ATTACK_KNOCKBACK: float = 6.0

# === 影渡（Shift）===
const SHADOW_DASH_DISTANCE: float = 3.0
const SHADOW_DASH_DURATION: float = 0.18
const SHADOW_DASH_COOLDOWN: float = 0.6

# 蓄力中触发蓄力的最小持续按下时间
const CHARGE_PRESS_THRESHOLD: float = 0.30

# === 受击 ===
const HIT_STUN: float = 0.4
const HIT_INVINCIBLE: float = 0.8
const HIT_FLASH_DURATION: float = 0.10

# === 顿帧帧数（@60fps 即约 0.1 秒）===
const HIT_PAUSE_FRAMES: int = 6

# === 蓄力中移动速度倍数 ===
const CHARGE_MOVE_MULTIPLIER: float = 0.5

# === 假人（M2 测试用）===
const DUMMY_MAX_HP: int = 100
const DUMMY_RESPAWN_TIME: float = 5.0
const DUMMY_KNOCKBACK_DISTANCE: float = 0.3

# === 残影（影渡）===
const AFTERIMAGE_INTERVAL: float = 0.04
const AFTERIMAGE_FADE_TIME: float = 0.30

# ============================================================
# 残响系统（M3，策划案 §4）
# ============================================================
const ECHO_MAX: int = 100

# 残响值的获取与消耗（策划案 §4.1）
const ECHO_GAIN_NORMAL_HIT: int = 5
const ECHO_GAIN_DASH_HIT: int = 8
const ECHO_GAIN_CHARGED_HIT: int = 20
const ECHO_GAIN_PARRY: int = 30
const ECHO_LOSS_HURT: int = 10

# === 残响态（消耗 100%；策划案 §4.2A）===
const ECHO_BURST_DURATION: float = 6.0
const ECHO_BURST_DAMAGE_MULT: float = 1.5
const ECHO_BURST_HEAL_PER_HIT: int = 2
const ECHO_BURST_TIME_SCALE_ENEMY: float = 0.7

# === 破壁（消耗 50%；策划案 §4.2B）===
const BREAK_WALL_COST: int = 50
const BREAK_WALL_RANGE: float = 2.0          ## 玩家面前 2m 内有褪色之壁才能破

# === 弹反凝时斩（策划案 §4.3）===
const PARRY_WINDOW: float = 0.4               ## 判定窗口
const TIMESTOP_DURATION: float = 1.5          ## 时停持续
const TIMESTOP_SLASH_COUNT: int = 8           ## 斩击次数
const TIMESTOP_SLASH_INTERVAL: float = 0.18   ## 单次斩击间隔
const TIMESTOP_LOCK_RANGE: float = 5.0        ## 锁定半径
const TIMESTOP_LOCK_MAX_TARGETS: int = 5
const TIMESTOP_DAMAGE_PER_HIT: int = 18
const TIMESTOP_ECHO_GAIN: int = 30
const TIMESTOP_COOLDOWN: float = 4.0
const PARRY_FAIL_EXTRA_STUN: float = 0.5      ## 弹反失败的额外硬直

# === 假人攻击（M3 新增 AI）===
const DUMMY_SWING_INTERVAL_MIN: float = 3.0
const DUMMY_SWING_INTERVAL_MAX: float = 5.0
const DUMMY_SWING_WINDUP: float = 0.5
const DUMMY_SWING_ACTIVE: float = 0.2
const DUMMY_SWING_DAMAGE: int = 15
const DUMMY_SWING_KNOCKBACK: float = 4.0
