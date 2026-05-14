extends EnemyBase
class_name RustyBellRinger

# ============================================================
# 锈钟手（策划案 第四卷 §2.3）
# HP 40, 攻击 13, 慢速。重击型近战，砸钟有 AoE 范围
# ============================================================


func _init() -> void:
	max_hp = 40
	attack_damage = 13
	attack_knockback = 5.0
	move_speed = 3.0    ## 慢
	vision_range = 8.0
	attack_range = 2.0
	attack_windup = 0.9
	attack_active = 0.3
	attack_recovery = 0.6
	hit_stun_duration = 0.4
