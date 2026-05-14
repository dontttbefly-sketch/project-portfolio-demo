extends Area2D
class_name EchoStele2D

const Assets := preload("res://scripts/v2/V2Assets.gd")
const CRIMSON := Color(0.7843, 0.0627, 0.1804, 1.0)

var _player_inside


func _ready() -> void:
	collision_layer = 0
	collision_mask = 2
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)
	_build_nodes()


func _process(_delta: float) -> void:
	if _player_inside != null and Input.is_action_just_pressed("interact"):
		_player_inside.call("save_checkpoint", global_position + Vector2(0, -8))


func _build_nodes() -> void:
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = Vector2(82, 120)
	shape.shape = rect
	shape.position = Vector2(0, -48)
	add_child(shape)

	var sprite := Sprite2D.new()
	sprite.texture = Assets.ECHO_STELE
	sprite.scale = Vector2(0.42, 0.42)
	sprite.position = Vector2(0, -54)
	sprite.z_index = 2
	add_child(sprite)


func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player_2d"):
		_player_inside = body
		_player_inside.message_requested.emit("按 E 记录残响碑。")


func _on_body_exited(body: Node2D) -> void:
	if body == _player_inside:
		_player_inside = null
