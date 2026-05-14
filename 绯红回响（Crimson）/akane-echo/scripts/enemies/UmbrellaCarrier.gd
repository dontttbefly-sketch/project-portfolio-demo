extends EnemyBase
class_name UmbrellaCarrier

# ============================================================
# 白怨·撑伞者（策划案 第四卷 §2.1）
# HP 50, 攻击 10, 速度 1.0×
# 永远把伞对着玩家：每帧旋转面向玩家
# 正面攻击伤害归零（玩家攻击方向与伞朝向 dot > 0.4 时屏蔽）
# 玩家绕背时受伤
# ============================================================


func _init() -> void:
	max_hp = 50
	attack_damage = 10
	move_speed = 5.0
	vision_range = 10.0
	attack_range = 3.0   ## 突进伞戳距离
	attack_windup = 0.8
	attack_active = 0.25
	attack_recovery = 0.5


# 持续朝玩家旋转（撑伞者特征）
func _physics_process(delta: float) -> void:
	super._physics_process(delta)
	if current_state == State.DEAD or _player == null:
		return
	# 只更新 sprite 朝向（HitBox 已被 _face 处理）
	# 这里我们让 sprite 也"旋转"——其实 billboard 模式下视觉变化不明显
	# 关键的是 facing_dir 变量，在 _modify_damage 里用
	pass


# 被攻击时检查方向：来源在前方，伤害归零
func _modify_damage(damage: int, source: Node) -> int:
	if source == null or _player == null:
		return damage
	# 「伞朝向」 = 我朝玩家的方向
	var to_player: Vector3 = _player.global_position - global_position
	to_player.y = 0
	if to_player.length_squared() < 0.001:
		return damage
	var umbrella_facing: Vector3 = to_player.normalized()
	# 攻击者位置相对我的方向
	var to_attacker: Vector3 = source.global_position - global_position
	to_attacker.y = 0
	if to_attacker.length_squared() < 0.001:
		return damage
	var attacker_dir: Vector3 = to_attacker.normalized()
	# 攻击者在伞的"正面"区域（前方 ~80° 锥）→ 完全屏蔽
	if attacker_dir.dot(umbrella_facing) > 0.4:
		# 视觉反馈：被弹一下（蓝色一闪）
		if sprite != null:
			var t: Tween = sprite.create_tween()
			t.tween_property(sprite, "modulate", Color(0.6, 0.8, 1.2), 0.05)
			t.tween_property(sprite, "modulate", Color(1, 1, 1, 1), 0.10)
		return 0
	return damage
