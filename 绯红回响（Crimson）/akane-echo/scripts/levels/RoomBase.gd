extends Node3D
class_name RoomBase

# ============================================================
# 房间脚本基类
# 运行时自动建造地板 + 4 面墙（指定方向带门缝）+ 雨幕
# 子场景只需 export 房间尺寸 / 门方向 + 摆 RoomDoor / SpawnPoint / 敌人
# ============================================================

@export var room_id: String = ""
@export var room_width: float = 15.0    ## X 方向（左右）
@export var room_depth: float = 12.0    ## Z 方向（前后）

# 哪些边有门缝（true = 该面墙中央留 3m 缺口）
@export var door_north: bool = false    ## -Z 方向（地图上"北"，画面深处）
@export var door_south: bool = false    ## +Z 方向（"南"，靠近镜头）
@export var door_east: bool = false     ## +X 方向
@export var door_west: bool = false     ## -X 方向

@export var has_rain: bool = true

# 颜色
@export var floor_color: Color = Color(0.42, 0.46, 0.52)  ## 偏蓝灰，雨夜湿润感
@export var wall_color: Color = Color(0.06, 0.06, 0.08)   ## 接近 #0F0F12

const WALL_HEIGHT: float = 2.0
const WALL_THICKNESS: float = 0.5
const DOOR_GAP: float = 3.0

# 视觉抛光（缓存的 shader，所有房间共享）
static var _wall_shader: Shader = null
static var _floor_shader: Shader = null


static func _get_wall_shader() -> Shader:
	if _wall_shader == null:
		_wall_shader = load("res://assets/shaders/wall_gradient.gdshader") as Shader
	return _wall_shader


static func _get_floor_shader() -> Shader:
	if _floor_shader == null:
		_floor_shader = load("res://assets/shaders/floor_pattern.gdshader") as Shader
	return _floor_shader


func _ready() -> void:
	add_to_group("room")
	_build_floor()
	_build_walls()
	if has_rain:
		_spawn_rain()


func _build_floor() -> void:
	var mi := MeshInstance3D.new()
	var pmesh := PlaneMesh.new()
	pmesh.size = Vector2(room_width, room_depth)
	mi.mesh = pmesh
	# 视觉抛光：用棋盘格 + 噪点 shader 替代纯 albedo
	var mat := ShaderMaterial.new()
	mat.shader = _get_floor_shader()
	mat.set_shader_parameter("base_color", floor_color)
	mat.set_shader_parameter("grid_color", floor_color * 0.85)
	mat.set_shader_parameter("cell_size", 2.0)
	mat.set_shader_parameter("noise_amount", 0.05)
	mi.material_override = mat
	add_child(mi)


func _build_walls() -> void:
	var hw: float = room_width * 0.5
	var hd: float = room_depth * 0.5
	# 北墙：z = -hd - 0.25
	_build_wall_with_optional_gap(door_north, true, room_width, -hd - WALL_THICKNESS * 0.5)
	# 南墙：z = +hd + 0.25
	_build_wall_with_optional_gap(door_south, true, room_width, hd + WALL_THICKNESS * 0.5)
	# 东墙：x = +hw + 0.25
	_build_wall_with_optional_gap(door_east, false, room_depth, hw + WALL_THICKNESS * 0.5)
	# 西墙：x = -hw - 0.25
	_build_wall_with_optional_gap(door_west, false, room_depth, -hw - WALL_THICKNESS * 0.5)


# 在 X 轴（horizontal=true）或 Z 轴（horizontal=false）方向上建一面墙
# 如果 has_gap，则中间留 DOOR_GAP 缺口拆成两半
func _build_wall_with_optional_gap(has_gap: bool, horizontal: bool, length: float, fixed_axis_pos: float) -> void:
	if not has_gap:
		_build_wall_segment(horizontal, length, 0.0, fixed_axis_pos)
		return
	var half_seg: float = (length - DOOR_GAP) * 0.5
	if half_seg <= 0.05:
		# 房间太窄，整面都成门缝，不建
		return
	# 两段墙：以中央门缝为分隔
	# 段 1 中心位于 -length/2 + half_seg/2 = -(length-half_seg)/2
	var off1: float = -(length - half_seg) * 0.5
	var off2: float = (length - half_seg) * 0.5
	_build_wall_segment(horizontal, half_seg, off1, fixed_axis_pos)
	_build_wall_segment(horizontal, half_seg, off2, fixed_axis_pos)


# horizontal=true → 墙沿 X 延展（segment_length 在 X 方向）
# offset 是该轴上的偏移；fixed 是垂直轴（Z 或 X）的位置
func _build_wall_segment(horizontal: bool, segment_length: float, offset: float, fixed: float) -> void:
	var sb := StaticBody3D.new()
	sb.collision_layer = 1
	sb.collision_mask = 1
	var pos: Vector3
	var size: Vector3
	if horizontal:
		pos = Vector3(offset, WALL_HEIGHT * 0.5, fixed)
		size = Vector3(segment_length, WALL_HEIGHT, WALL_THICKNESS)
	else:
		pos = Vector3(fixed, WALL_HEIGHT * 0.5, offset)
		size = Vector3(WALL_THICKNESS, WALL_HEIGHT, segment_length)
	sb.position = pos
	add_child(sb)

	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	# 视觉抛光：用顶/底渐变 shader 替代纯 albedo
	var mat := ShaderMaterial.new()
	mat.shader = _get_wall_shader()
	mat.set_shader_parameter("top_color", wall_color * 1.4)
	mat.set_shader_parameter("bottom_color", wall_color * 0.6)
	mat.set_shader_parameter("wall_height", WALL_HEIGHT)
	mi.material_override = mat
	sb.add_child(mi)

	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = size
	cs.shape = bs
	sb.add_child(cs)


func _spawn_rain() -> void:
	var rain_scene: PackedScene = load("res://scenes/levels/components/Rain.tscn")
	if rain_scene == null:
		return
	var rain := rain_scene.instantiate()
	rain.position = Vector3(0, 8, 0)
	if "emission_box_extents" in rain or rain is GPUParticles3D:
		# Rain 的 ParticleProcessMaterial 决定发射区域；这里只设位置
		pass
	add_child(rain)
