extends Node3D
class_name RedUmbrellaShelter

# Boss 阶段 2 中央生成的红伞，玩家在底下避雨
# Boss 夺伞冲撞会击碎本节点

@onready var sprite: Sprite3D = get_node_or_null("Sprite")


func destroy_now() -> void:
	if sprite != null:
		var t: Tween = sprite.create_tween()
		t.tween_property(sprite, "modulate", Color(0.4, 0.2, 0.2, 0), 0.3)
		t.tween_property(sprite, "scale", Vector3.ZERO, 0.3)
	await get_tree().create_timer(0.4).timeout
	queue_free()
