extends EnemyBase
class_name Wanderer

# ============================================================
# 白怨·徘徊者（策划案 第四卷 §2.1）
# HP 30, 攻击 5, 速度 0.6×, 视野 8m
# 看见玩家直线接近，贴脸拳击
# ============================================================


func _init() -> void:
	max_hp = 30
	attack_damage = 5
	move_speed = 3.6   ## 0.6 × 玩家 6.0
	vision_range = 8.0
	attack_range = 1.5
	attack_windup = 0.5
	attack_active = 0.2
	attack_recovery = 0.4
