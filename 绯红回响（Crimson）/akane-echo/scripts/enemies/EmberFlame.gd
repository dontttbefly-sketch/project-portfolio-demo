extends EnemyBase
class_name EmberFlame

# ============================================================
# 烬焰（策划案 第四卷 §2.2）
# HP 25, 攻击 15, 快速近战，死亡爆炸（SLAM_RADIUS 1.8m）
# ============================================================

const DEATH_EXPLOSION_DAMAGE: int = 12
const DEATH_EXPLOSION_RADIUS: float = 1.8


func _init() -> void:
	max_hp = 25
	attack_damage = 15
	move_speed = 5.5    ## 比玩家快一点
	vision_range = 8.0
	attack_range = 1.5
	attack_windup = 0.4
	attack_active = 0.2
	attack_recovery = 0.3


# 死亡时引爆：圆形 AOE 对玩家造成 DEATH_EXPLOSION_DAMAGE 伤害
func _play_death_sequence() -> void:
	# 先做爆炸 AOE
	if _player != null:
		var d: float = global_position.distance_to(_player.global_position)
		if d <= DEATH_EXPLOSION_RADIUS:
			var dir: Vector3 = _player.global_position - global_position
			dir.y = 0
			if dir.length_squared() > 0.001:
				dir = dir.normalized()
			else:
				dir = Vector3(0, 0, 1)
			if _player.has_method("on_damaged"):
				_player.on_damaged(DEATH_EXPLOSION_DAMAGE, dir, 5.0, self)
	super._play_death_sequence()
