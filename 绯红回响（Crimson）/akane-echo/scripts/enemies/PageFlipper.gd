extends EnemyBase
class_name PageFlipper

# ============================================================
# 翻页者（策划案 第四卷 §2.2）
# HP 35, 攻击 8。远程投掷"未写完的字"
# 简化：保持距离 + 周期投射小型 UmbrellaProjectile（外观模拟纸页）
# ============================================================

const THROW_INTERVAL: float = 2.5
const PREFER_DISTANCE: float = 5.0    ## 想保持的距离

var _throw_timer: float = THROW_INTERVAL


func _init() -> void:
	max_hp = 35
	attack_damage = 8
	move_speed = 3.0
	vision_range = 9.0
	attack_range = 7.0   ## 远程，到达此距离就开始投掷
	attack_windup = 0.6
	attack_active = 0.05
	attack_recovery = 0.4
	hit_stun_duration = 0.3


# 自定义 chase：保持距离不贴脸
func _ai_chase(_delta: float) -> void:
	if _player == null:
		return
	var to_p: Vector3 = _player.global_position - global_position
	to_p.y = 0.0
	var dist: float = to_p.length()
	if dist > vision_range * 1.5:
		_change_state(State.IDLE)
		return
	# 在 prefer_distance 周围徘徊；过近就退后
	var dir: Vector3 = to_p.normalized() if to_p.length_squared() > 0.001 else Vector3(0, 0, -1)
	if dist < PREFER_DISTANCE - 1.0:
		velocity = -dir * move_speed
	elif dist > PREFER_DISTANCE + 1.0:
		velocity = dir * move_speed * 0.7
	else:
		velocity = Vector3.ZERO
	_face(dir)
	# 在攻击范围内开始投掷
	_throw_timer -= get_physics_process_delta_time() * time_scale_multiplier
	if dist <= attack_range and _throw_timer <= 0.0:
		_throw_timer = THROW_INTERVAL
		_throw_page(dir)


func _throw_page(dir: Vector3) -> void:
	# 复用 UmbrellaProjectile 但 modulate 改成米白色
	var packed: PackedScene = load("res://scenes/enemies/UmbrellaProjectile.tscn")
	if packed == null:
		return
	var p: Node3D = packed.instantiate()
	var root := get_tree().current_scene
	if root == null:
		return
	root.add_child(p)
	p.global_position = global_position + Vector3(0, 1.0, 0) + dir * 1.0
	if "direction" in p:
		p.direction = dir
	if "damage" in p:
		p.damage = attack_damage
	# 染色
	var sp := p.get_node_or_null("Sprite") as Sprite3D
	if sp != null:
		sp.modulate = Color(0.95, 0.92, 0.85, 1)
