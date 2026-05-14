extends Area2D
class_name GrapplePoint2D

const Assets := preload("res://scripts/v2/V2Assets.gd")
const CRIMSON := Color(0.7843, 0.0627, 0.1804, 1.0)

@export var pull_offset: Vector2 = Vector2.ZERO
@export var sprite_scale: float = 0.22

var _sprite: Sprite2D
var _pulse: float = 0.0


func _ready() -> void:
	add_to_group("grapple_point_2d")
	collision_layer = 0
	collision_mask = 0
	_build_nodes()


func _process(delta: float) -> void:
	_pulse += delta
	if _sprite != null:
		var s := sprite_scale + sin(_pulse * 4.0) * 0.018
		_sprite.scale = Vector2(s, s)
	queue_redraw()


func _draw() -> void:
	var alpha := 0.22 + sin(_pulse * 4.0) * 0.08
	draw_arc(Vector2.ZERO, 34.0, 0.0, TAU, 28, Color(CRIMSON.r, CRIMSON.g, CRIMSON.b, alpha), 2.0, true)


func get_pull_target() -> Vector2:
	return global_position + pull_offset


func _build_nodes() -> void:
	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 36.0
	shape.shape = circle
	add_child(shape)

	_sprite = Sprite2D.new()
	_sprite.texture = Assets.GRAPPLE_POINT
	_sprite.scale = Vector2(sprite_scale, sprite_scale)
	_sprite.z_index = 4
	add_child(_sprite)
