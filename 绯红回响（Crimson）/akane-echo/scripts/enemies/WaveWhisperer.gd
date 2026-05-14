extends EnemyBase
class_name WaveWhisperer

# ============================================================
# 浪低语（策划案 第四卷 §2.3）
# HP 25, 攻击 8, 脆弱。靠近玩家短促爆发回响 AoE
# ============================================================


func _init() -> void:
	max_hp = 25
	attack_damage = 8
	move_speed = 4.5
	vision_range = 9.0
	attack_range = 1.5
	attack_windup = 0.5
	attack_active = 0.2
	attack_recovery = 0.4
	hit_stun_duration = 0.5  ## 容易被打断
