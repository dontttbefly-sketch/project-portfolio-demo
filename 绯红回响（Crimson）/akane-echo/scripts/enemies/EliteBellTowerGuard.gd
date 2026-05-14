extends EnemyBase
class_name EliteBellTowerGuard

# ============================================================
# 钟楼守（精英，3 阶段，策划案 第四卷 §3）
# HP 300 / 大型 / 三阶段递进
# ============================================================

var phase: int = 1


func _init() -> void:
	max_hp = 300
	attack_damage = 28
	attack_knockback = 6.0
	move_speed = 4.0
	vision_range = 12.0
	attack_range = 2.5
	attack_windup = 0.9
	attack_active = 0.3
	attack_recovery = 0.55
	hit_stun_duration = 0.15


func _physics_process(delta: float) -> void:
	# 阶段切换：HP 66% / 33%
	var ratio: float = float(current_hp) / float(max_hp)
	if phase < 2 and ratio <= 0.66:
		phase = 2
		# 阶段 2：移速 +30%、攻击间隔 -20%
		move_speed = 5.2
		attack_recovery = 0.45
		if sprite != null:
			sprite.modulate = Color(1.2, 0.9, 0.6, 1)
	elif phase < 3 and ratio <= 0.33:
		phase = 3
		# 阶段 3：再加速；蓄力时间减半
		move_speed = 6.0
		attack_windup *= 0.5
		attack_recovery = 0.35
		if sprite != null:
			sprite.modulate = Color(1.6, 0.7, 0.4, 1)
	super._physics_process(delta)
