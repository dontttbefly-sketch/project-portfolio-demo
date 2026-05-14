extends EnemyBase
class_name Reciter

# ============================================================
# 诵读者（策划案 第四卷 §2.2）
# HP 45, 攻击 12, 中速。普通近战；玩家近身时变化形态加速
# ============================================================

var _enraged: bool = false


func _init() -> void:
	max_hp = 45
	attack_damage = 12
	move_speed = 4.0
	vision_range = 9.0
	attack_range = 1.8
	attack_windup = 0.7
	attack_active = 0.25
	attack_recovery = 0.45


# 受伤时一定概率切换为"撕书"形态：移速 +50%，攻击间隔 -30%
func on_damaged(damage: int, knockback_dir: Vector3, knockback_force: float, source: Node) -> void:
	super.on_damaged(damage, knockback_dir, knockback_force, source)
	if not _enraged and current_hp > 0 and current_hp <= max_hp / 2:
		_enraged = true
		move_speed *= 1.5
		attack_recovery *= 0.7
		if sprite != null:
			sprite.modulate = Color(1.3, 0.7, 0.7, 1)
