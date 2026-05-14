extends StaticBody3D
class_name FadedWall

# ============================================================
# 褪色之壁（策划案 §4.2B：消耗 50% 残响破除的隐藏路径）
# ============================================================

@onready var mesh: MeshInstance3D = $Mesh
@onready var collision: CollisionShape3D = $Collision

var _broken: bool = false


func _ready() -> void:
	add_to_group("faded_wall")


func can_be_broken() -> bool:
	return not _broken


# 由玩家调用：破壁演出 + 删除碰撞 + 渐隐 + queue_free
func break_wall(breaker: Node = null) -> void:
	if _broken:
		return
	_broken = true

	_spawn_break_particles()

	# 立即去掉碰撞（玩家可以穿过）
	if collision != null:
		collision.disabled = true

	# 网格渐隐 0.8s（MeshInstance3D.transparency: 0=opaque, 1=invisible）
	if mesh != null:
		var t := create_tween()
		t.tween_property(mesh, "transparency", 1.0, 0.8)

	# 通知主角相机微震
	var p := get_tree().get_first_node_in_group("player")
	if p != null and breaker != null:
		var cam = p.get_node_or_null("Camera")
		if cam != null and cam.has_method("add_shake"):
			cam.add_shake(0.25)

	# 0.85s 后清理（>0.8s 渐隐时长）
	await get_tree().create_timer(0.85).timeout
	if is_instance_valid(self):
		queue_free()


# 破碎粒子（占位实现：石屑 + 红光，未来美术接入后替换）
func _spawn_break_particles() -> void:
	var p := GPUParticles3D.new()

	var pmat := ParticleProcessMaterial.new()
	pmat.direction = Vector3(0, 1, 0)
	pmat.spread = 70.0
	pmat.initial_velocity_min = 4.0
	pmat.initial_velocity_max = 9.0
	pmat.gravity = Vector3(0, -8, 0)
	pmat.scale_min = 0.08
	pmat.scale_max = 0.20
	# 颜色坡道：从绯红向暗灰过渡，模拟"红光被吹散 + 石屑下落"
	var gradient := Gradient.new()
	gradient.add_point(0.0, Color(0.8, 0.1, 0.2, 1.0))
	gradient.add_point(0.5, Color(0.5, 0.2, 0.2, 0.9))
	gradient.add_point(1.0, Color(0.25, 0.25, 0.28, 0.0))
	var ramp := GradientTexture1D.new()
	ramp.gradient = gradient
	pmat.color_ramp = ramp

	var qmat := StandardMaterial3D.new()
	qmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	qmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	qmat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	qmat.vertex_color_use_as_albedo = true

	var qmesh := QuadMesh.new()
	qmesh.size = Vector2(0.15, 0.15)
	qmesh.material = qmat

	p.process_material = pmat
	p.draw_pass_1 = qmesh
	p.amount = 50
	p.lifetime = 0.9
	p.one_shot = true
	p.explosiveness = 0.95
	p.emitting = false

	var root := get_tree().current_scene
	if root == null:
		return
	root.add_child(p)
	p.global_position = global_position + Vector3(0, 1.0, 0)
	p.emitting = true

	await get_tree().create_timer(p.lifetime + 0.1).timeout
	if is_instance_valid(p):
		p.queue_free()
