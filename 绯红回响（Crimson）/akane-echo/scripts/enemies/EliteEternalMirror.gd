extends EnemyBase
class_name EliteEternalMirror

# ============================================================
# 永镜（精英，策划案 第四卷 §3）
# 设计："会复制玩家招式"
# M6.3 简化：高 HP / 多招式池（直接近战 + 偶发投射）
# ============================================================

const PROJECTILE_COOLDOWN: float = 5.0
var _proj_t: float = 4.0


func _init() -> void:
	max_hp = 350
	attack_damage = 25
	attack_knockback = 6.0
	move_speed = 5.5
	vision_range = 12.0
	attack_range = 2.0
	attack_windup = 0.6
	attack_active = 0.25
	attack_recovery = 0.4
	hit_stun_duration = 0.10


func _physics_process(delta: float) -> void:
	super._physics_process(delta)
	if current_state == State.DEAD or _player == null:
		return
	# 周期性朝玩家投射"反射的招式"
	_proj_t -= delta * time_scale_multiplier
	if _proj_t <= 0.0 and current_state == State.CHASE:
		_proj_t = PROJECTILE_COOLDOWN
		_throw_mirrored_attack()


func _throw_mirrored_attack() -> void:
	if _player == null:
		return
	var dir: Vector3 = _player.global_position - global_position
	dir.y = 0
	if dir.length_squared() < 0.001:
		return
	dir = dir.normalized()
	var packed: PackedScene = load("res://scenes/enemies/UmbrellaProjectile.tscn")
	if packed == null:
		return
	var p: Node3D = packed.instantiate()
	var root := get_tree().current_scene
	if root == null:
		return
	root.add_child(p)
	p.global_position = global_position + Vector3(0, 1.0, 0) + dir * 1.5
	if "direction" in p: p.direction = dir
	if "damage" in p: p.damage = 18
	var sp := p.get_node_or_null("Sprite") as Sprite3D
	if sp != null:
		sp.modulate = Color(1.5, 1.5, 1.6, 0.85)
