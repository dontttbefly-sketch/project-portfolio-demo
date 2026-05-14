extends Area2D
class_name EchoShard2D

const Assets := preload("res://scripts/v2/V2Assets.gd")
const CRIMSON := Color(0.7843, 0.0627, 0.1804, 1.0)

var _base_y: float


func _ready() -> void:
	collision_layer = 0
	collision_mask = 2
	body_entered.connect(_on_body_entered)
	_base_y = position.y
	_build_nodes()


func _process(delta: float) -> void:
	position.y = _base_y + sin(Time.get_ticks_msec() * 0.004 + global_position.x * 0.01) * 4.0
	rotation += delta * 0.8


func _build_nodes() -> void:
	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 18.0
	shape.shape = circle
	add_child(shape)

	var sprite := Sprite2D.new()
	sprite.texture = Assets.ECHO_SHARD
	sprite.scale = Vector2(0.18, 0.18)
	sprite.z_index = 5
	add_child(sprite)


func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player_2d") and body.has_method("collect_shard"):
		body.call("collect_shard")
		queue_free()
