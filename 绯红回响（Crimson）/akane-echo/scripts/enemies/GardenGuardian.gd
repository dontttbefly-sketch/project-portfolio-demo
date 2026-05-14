extends EnemyBase
class_name GardenGuardian

# ============================================================
# 庭守（策划案 第四卷 §2.4）
# HP 60, 攻击 18, 慢速厚血。重击近战
# ============================================================

func _init() -> void:
	max_hp = 60
	attack_damage = 18
	attack_knockback = 6.0
	move_speed = 3.0
	vision_range = 10.0
	attack_range = 2.2
	attack_windup = 1.0
	attack_active = 0.3
	attack_recovery = 0.6
	hit_stun_duration = 0.25
