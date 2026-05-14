extends Area3D
class_name HurtBox

# ============================================================
# 受击口（挂在 Area3D 上）
# 接收 HitBox 的命中调用，把伤害转发给 entity（绑定的实体）。
# entity 必须实现 on_damaged(damage, knockback_dir, knockback_force, source) 方法。
# ============================================================

@export var entity_path: NodePath
var entity: Node


func _ready() -> void:
	if entity_path != NodePath(""):
		entity = get_node(entity_path)
	else:
		# 默认：向上找第一个实现 on_damaged 的祖先
		var n: Node = get_parent()
		while n != null:
			if n.has_method("on_damaged"):
				entity = n
				return
			n = n.get_parent()
		# 找不到就用直接父节点
		entity = get_parent()


# 由 HitBox 调用。HurtBox 不主动判定，被动接受。
func receive_hit(damage: int, knockback_dir: Vector3, knockback_force: float, source: Node) -> void:
	if entity == null:
		return
	if entity.has_method("on_damaged"):
		entity.on_damaged(damage, knockback_dir, knockback_force, source)
