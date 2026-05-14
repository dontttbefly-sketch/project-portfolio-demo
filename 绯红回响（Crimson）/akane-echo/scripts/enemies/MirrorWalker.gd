extends EnemyBase
class_name MirrorWalker

# ============================================================
# 镜行者（策划案 第四卷 §2.4）
# HP 50, 攻击 16, 高速近战
# 简化版：'复制玩家招式'未实装，仅做高速贴身反复出招
# ============================================================

func _init() -> void:
	max_hp = 50
	attack_damage = 16
	move_speed = 6.0   ## 与玩家同速
	vision_range = 12.0
	attack_range = 1.8
	attack_windup = 0.4
	attack_active = 0.2
	attack_recovery = 0.3
	hit_stun_duration = 0.15
