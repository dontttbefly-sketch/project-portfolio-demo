extends EnemyBase
class_name FlowerBearer

# ============================================================
# 持花者（策划案 第四卷 §2.4）
# HP 35, 攻击 11, 远程投掷白色花瓣
# ============================================================

const THROW_INTERVAL: float = 2.2
const PREFER_DIST: float = 6.0
var _throw_t: float = THROW_INTERVAL


func _init() -> void:
	max_hp = 35
	attack_damage = 11
	move_speed = 3.5
	vision_range = 11.0
	attack_range = 8.0
	attack_windup = 0.6
	attack_active = 0.05
	attack_recovery = 0.4


func _ai_chase(_delta: float) -> void:
	if _player == null:
		return
	var to_p: Vector3 = _player.global_position - global_position
	to_p.y = 0
	var dist: float = to_p.length()
	var dir: Vector3 = to_p.normalized() if to_p.length_squared() > 0.001 else Vector3(0, 0, -1)
	if dist < PREFER_DIST - 1.0:
		velocity = -dir * move_speed
	elif dist > PREFER_DIST + 1.0:
		velocity = dir * move_speed * 0.7
	else:
		velocity = Vector3.ZERO
	_face(dir)
	_throw_t -= get_physics_process_delta_time() * time_scale_multiplier
	if dist <= attack_range and _throw_t <= 0.0:
		_throw_t = THROW_INTERVAL
		_throw_petal(dir)


func _throw_petal(dir: Vector3) -> void:
	var packed: PackedScene = load("res://scenes/enemies/UmbrellaProjectile.tscn")
	if packed == null:
		return
	var p: Node3D = packed.instantiate()
	var root := get_tree().current_scene
	if root == null:
		return
	root.add_child(p)
	p.global_position = global_position + Vector3(0, 1.0, 0) + dir * 1.0
	if "direction" in p: p.direction = dir
	if "damage" in p: p.damage = attack_damage
	var sp := p.get_node_or_null("Sprite") as Sprite3D
	if sp != null:
		sp.modulate = Color(1.0, 0.95, 0.98, 0.95)
