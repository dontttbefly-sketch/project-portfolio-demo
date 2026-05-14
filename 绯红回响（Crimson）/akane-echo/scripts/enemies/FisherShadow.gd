extends EnemyBase
class_name FisherShadow

# ============================================================
# 渔影（策划案 第四卷 §2.3）
# HP 30, 攻击 10, 远程。投掷网，命中后玩家短暂减速（M6.2 简化为伤害）
# ============================================================

const NET_INTERVAL: float = 3.0
const PREFER_DIST: float = 6.0
var _net_t: float = NET_INTERVAL


func _init() -> void:
	max_hp = 30
	attack_damage = 10
	move_speed = 3.5
	vision_range = 10.0
	attack_range = 8.0
	attack_windup = 0.7
	attack_active = 0.05
	attack_recovery = 0.4


func _ai_chase(_delta: float) -> void:
	if _player == null:
		return
	var to_p: Vector3 = _player.global_position - global_position
	to_p.y = 0.0
	var dist: float = to_p.length()
	var dir: Vector3 = to_p.normalized() if to_p.length_squared() > 0.001 else Vector3(0, 0, -1)
	if dist < PREFER_DIST - 1.0:
		velocity = -dir * move_speed
	elif dist > PREFER_DIST + 1.0:
		velocity = dir * move_speed * 0.7
	else:
		velocity = Vector3.ZERO
	_face(dir)
	_net_t -= get_physics_process_delta_time() * time_scale_multiplier
	if dist <= attack_range and _net_t <= 0.0:
		_net_t = NET_INTERVAL
		_throw_net(dir)


func _throw_net(dir: Vector3) -> void:
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
		sp.modulate = Color(0.6, 0.7, 0.85, 1)  ## 蓝色网
