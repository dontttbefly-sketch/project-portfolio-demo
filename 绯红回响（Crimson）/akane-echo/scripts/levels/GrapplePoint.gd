extends Node3D
class_name GrapplePoint

# ============================================================
# 缠红丝钩点
# 玩家有 has_grapple 时，按 Q 朝其方向触发会被拉过来
# ============================================================

@onready var sprite: Sprite3D = get_node_or_null("Sprite")


func _ready() -> void:
	add_to_group("grapple_point")
	# 没解锁缠红丝时半透明（M5 简化提示）
	if not PlayerProgress.has_grapple and sprite != null:
		sprite.modulate.a = 0.35
