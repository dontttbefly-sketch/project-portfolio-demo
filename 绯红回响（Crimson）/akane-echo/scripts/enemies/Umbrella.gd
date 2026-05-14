extends Node3D
class_name Umbrella

# ============================================================
# 折伞者的单把伞（策划案 §3.1 精英战）
# 独立 HP，被破坏时通知本体
# ============================================================

@export var max_hp: int = 30
var current_hp: int = 30
var _broken: bool = false

@onready var sprite: Sprite3D = get_node_or_null("Sprite")
@onready var hurt_box: HurtBox = get_node_or_null("HurtBox")
@onready var hurt_box_shape: CollisionShape3D = get_node_or_null("HurtBox/Shape")

signal broken


func _ready() -> void:
	current_hp = max_hp


# HurtBox 回调（hurt_box.entity 指到这里）
func on_damaged(damage: int, _knockback_dir: Vector3, _knockback_force: float, _source: Node) -> void:
	if _broken:
		return
	current_hp = max(0, current_hp - damage)
	if sprite != null:
		var t: Tween = sprite.create_tween()
		t.tween_property(sprite, "modulate", Color(0.4, 0.4, 0.5), 0.05)
		t.tween_property(sprite, "modulate", Color(1, 1, 1, 1), 0.10)
	if current_hp <= 0:
		_break()


func _break() -> void:
	_broken = true
	if hurt_box != null:
		hurt_box.monitorable = false
	if hurt_box_shape != null:
		hurt_box_shape.disabled = true
	if sprite != null:
		var t: Tween = sprite.create_tween().set_parallel(true)
		t.tween_property(sprite, "modulate", Color(0.2, 0.2, 0.2, 0.2), 0.4)
		t.tween_property(sprite, "scale", Vector3(0.3, 0.3, 0.3), 0.4)
	broken.emit()


func is_broken() -> bool:
	return _broken
