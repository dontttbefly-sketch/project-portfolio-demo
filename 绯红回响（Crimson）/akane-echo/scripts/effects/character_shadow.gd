class_name CharacterShadow
extends RefCounted

# ============================================================
# 旧版 3D 原型角色脚下椭圆阴影
# 程序化创建，避免改 17 个角色 .tscn
# 使用：CharacterShadow.attach_to(self, 0.5)
# ============================================================

const SHADER_PATH: String = "res://assets/shaders/character_shadow.gdshader"
static var _cached_shader: Shader = null


static func _get_shader() -> Shader:
	if _cached_shader == null:
		_cached_shader = load(SHADER_PATH) as Shader
	return _cached_shader


# 在 node 下创建一个 MeshInstance3D 阴影并 add_child；返回该节点供调用方需要时操作。
# radius：阴影半径（米）。普通敌 0.45，主角 / 精英 0.5，Boss 可适当调大 0.7-0.9。
static func attach_to(node: Node3D, radius: float = 0.5) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = "Shadow"

	var pmesh := PlaneMesh.new()
	pmesh.size = Vector2(radius * 2.0, radius * 2.0)
	mi.mesh = pmesh

	var mat := ShaderMaterial.new()
	mat.shader = _get_shader()
	mi.material_override = mat

	# 略高于地板 0.02m 防 z-fighting
	mi.position = Vector3(0, 0.02, 0)
	# 自身不投真实阴影（避免与全局 DirectionalLight 冲突）
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	node.add_child(mi)
	return mi
