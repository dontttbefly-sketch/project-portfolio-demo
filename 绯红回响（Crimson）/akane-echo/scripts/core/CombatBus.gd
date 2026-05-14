extends Node

# ============================================================
# 战斗事件总线（单例 autoload）
# 任何攻击命中都广播 hit_landed，监听者：
#   - PlayerStateMachine：第三段（月）触发顿帧
#   - 调试面板：连击 / 伤害日志
#   - 未来：相机震屏 / 音效 / 数值飞字
# ============================================================

## 攻击命中：发自 HitBox._on_area_entered
## 参数：攻击者节点 / 受击实体 / 伤害 / 击退方向 / 击退力度
signal hit_landed(attacker: Node, target: Node, damage: int, knockback_dir: Vector3, knockback_force: float)

## 顿帧请求（让其他系统也能 freeze）
signal hit_pause_requested(frames: int)

## 主角死亡通知（UI / 关卡管理器监听）
signal player_died

## 假人重生通知（调试 / 数值面板用）
signal dummy_respawned(dummy: Node)

# ============================================================
# M3 残响系统相关
# ============================================================

## 敌人发起攻击的预告——窗口期 lead_time 秒后命中
## 玩家用此信号决定是否开启 PARRY 窗口
signal enemy_attack_telegraph(attacker: Node, lead_time: float)

## 凝时斩开始/结束（UI / 镜头 / 音效订阅）
signal timestop_begin
signal timestop_end

## 残响态开始/结束
signal echo_burst_begin
signal echo_burst_end

# ============================================================
# M5 — UI / 流程总线
# ============================================================

## 互动提示：empty 表示隐藏
signal interact_prompt(text: String)

## Toast 通知（顶部短暂浮现）
signal toast(text: String, duration: float)

## 玩家请求复活到上一个残响碑（DeathOverlay → SceneManager）
signal respawn_at_stele

## Boss 被击败
signal boss_defeated(boss_id: String)

## 玩家凝时斩成功触发（M7v2：用于隐藏 Boss 反惩罚）
signal parry_executed
