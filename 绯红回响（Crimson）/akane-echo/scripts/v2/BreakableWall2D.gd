extends StaticBody2D
class_name BreakableWall2D

const Assets := preload("res://scripts/v2/V2Assets.gd")
const CRIMSON := Color(0.7843, 0.0627, 0.1804, 1.0)

@export var size: Vector2 = Vector2(64, 150)


func _ready() -> void:
	add_to_group("breakable_wall_2d")
	collision_layer = 1
	collision_mask = 0
	_build_nodes()


func _build_nodes() -> void:
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = size
	shape.shape = rect
	add_child(shape)

	var sprite := Sprite2D.new()
	sprite.texture = Assets.FADED_WALL
	sprite.scale = Vector2(size.x / 256.0, size.y / 256.0)
	sprite.z_index = 2
	add_child(sprite)

	var trace := Polygon2D.new()
	var h := size * 0.5
	trace.polygon = PackedVector2Array([
		Vector2(-5, -h.y + 16), Vector2(5, -h.y + 16), Vector2(5, h.y - 16), Vector2(-5, h.y - 16)
	])
	trace.color = Color(CRIMSON.r, CRIMSON.g, CRIMSON.b, 0.42)
	trace.z_index = 2
	add_child(trace)


func break_wall() -> void:
	var particles := CPUParticles2D.new()
	particles.amount = 32
	particles.lifetime = 0.6
	particles.one_shot = true
	particles.explosiveness = 0.85
	particles.direction = Vector2.UP
	particles.spread = 120.0
	particles.initial_velocity_min = 80.0
	particles.initial_velocity_max = 220.0
	particles.gravity = Vector2(0, 420)
	particles.color = Color(CRIMSON.r, CRIMSON.g, CRIMSON.b, 0.85)
	get_parent().add_child(particles)
	particles.global_position = global_position
	particles.emitting = true
	get_tree().create_timer(0.75).timeout.connect(func() -> void:
		if is_instance_valid(particles):
			particles.queue_free()
	)
	queue_free()
