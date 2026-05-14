extends Area3D
class_name HitBox

# ============================================================
# 攻击判定（挂在 Area3D 上）
# - set_active(true/false)：启用/禁用监测
# - 启用时一次激活窗口内同一目标只打一次（避免连按 J 双判）
# - 命中后直接调用 HurtBox.receive_hit + 广播 CombatBus.hit_landed
# ============================================================

@export var damage: int = 10
@export var knockback_force: float = 3.0
@export var attacker_path: NodePath  ## 攻击者节点；空则向上找首个 CharacterBody3D

# 本次激活窗口内已经命中过的实体（避免同一段攻击对同目标多次判定）
var _hits_this_window: Array[Node] = []


func _ready() -> void:
	monitoring = false
	_set_shapes_enabled(false)
	area_entered.connect(_on_area_entered)


# 攻击的「判定窗口」启用与关闭
func set_active(active: bool) -> void:
	if active:
		_hits_this_window.clear()
	monitoring = active
	_set_shapes_enabled(active)
	if active:
		# 把已经在范围内的目标也算作"刚进入"
		# 否则站在敌人身上挥剑可能不触发
		call_deferred("_check_existing_overlaps")


func _check_existing_overlaps() -> void:
	# 等下一物理帧让 PhysicsServer 注册好监测状态
	await get_tree().physics_frame
	if not monitoring:
		return
	for area in get_overlapping_areas():
		_on_area_entered(area)


func _set_shapes_enabled(enabled: bool) -> void:
	for c in get_children():
		if c is CollisionShape3D:
			c.disabled = not enabled


func _on_area_entered(area: Area3D) -> void:
	if not monitoring:
		return
	if not (area is HurtBox):
		return
	var hb := area as HurtBox
	if hb.entity == null:
		return
	# 同窗口去重
	if hb.entity in _hits_this_window:
		return
	_hits_this_window.append(hb.entity)

	var atk: Node = _resolve_attacker()
	# 击退方向：从 HitBox 中心指向 HurtBox 中心，仅取 XZ 平面
	var dir: Vector3 = hb.global_position - global_position
	dir.y = 0.0
	if dir.length_squared() < 0.0001:
		dir = Vector3(0, 0, 1)
	else:
		dir = dir.normalized()

	hb.receive_hit(damage, dir, knockback_force, atk)
	CombatBus.hit_landed.emit(atk, hb.entity, damage, dir, knockback_force)
	_spawn_hit_particles(hb.global_position)


# 命中飞溅粒子（绯红，一次性炸开）
# M2 占位实现——美术接入后替换为预设资源
func _spawn_hit_particles(at: Vector3) -> void:
	var p := GPUParticles3D.new()

	var pmat := ParticleProcessMaterial.new()
	pmat.direction = Vector3(0, 1, 0)
	pmat.spread = 80.0
	pmat.initial_velocity_min = 3.0
	pmat.initial_velocity_max = 7.0
	pmat.gravity = Vector3(0, -6, 0)
	pmat.scale_min = 0.05
	pmat.scale_max = 0.15
	pmat.color = Color(0.7843, 0.0627, 0.1804, 1)

	var qmat := StandardMaterial3D.new()
	qmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	qmat.albedo_color = Color(0.7843, 0.0627, 0.1804, 1)
	qmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	qmat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES

	var qmesh := QuadMesh.new()
	qmesh.size = Vector2(0.10, 0.10)
	qmesh.material = qmat

	p.process_material = pmat
	p.draw_pass_1 = qmesh
	p.amount = 20
	p.lifetime = 0.5
	p.one_shot = true
	p.explosiveness = 0.95
	p.emitting = false

	var root := get_tree().current_scene
	if root == null:
		return
	root.add_child(p)
	p.global_position = at + Vector3(0, 0.4, 0)  # 抬一点离地，避免被地板裁剪
	p.emitting = true

	# 自渲染完成后清理
	await get_tree().create_timer(p.lifetime + 0.1).timeout
	if is_instance_valid(p):
		p.queue_free()


func _resolve_attacker() -> Node:
	if attacker_path != NodePath(""):
		return get_node(attacker_path)
	# 向上找首个 CharacterBody3D（玩家或敌人本体）
	var n: Node = get_parent()
	while n != null and not (n is CharacterBody3D):
		n = n.get_parent()
	return n
