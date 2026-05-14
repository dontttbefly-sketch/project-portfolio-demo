extends Node2D
class_name SlashVFX2D

const CRIMSON := Color(0.7843, 0.0627, 0.1804, 1.0)

var facing: int = 1
var charged: bool = false
var lifetime: float = 0.16
var radius: float = 54.0
var width: float = 9.0
var _age: float = 0.0


func setup(p_facing: int, p_charged: bool, p_radius: float = 54.0, p_width: float = 9.0, p_lifetime: float = -1.0) -> void:
	facing = p_facing
	charged = p_charged
	radius = p_radius
	width = p_width
	lifetime = p_lifetime if p_lifetime > 0.0 else (0.22 if charged else 0.14)


func _process(delta: float) -> void:
	_age += delta
	if _age >= lifetime:
		queue_free()
		return
	queue_redraw()


func _draw() -> void:
	var t := clampf(_age / lifetime, 0.0, 1.0)
	var alpha := 1.0 - t
	var start := -1.05
	var end := 1.05
	if facing < 0:
		start = PI - 1.05
		end = PI + 1.05

	draw_arc(Vector2.ZERO, radius, start, end, 24, Color(CRIMSON.r, CRIMSON.g, CRIMSON.b, 0.90 * alpha), width, true)
	draw_arc(Vector2.ZERO, radius * 0.72, start + 0.15 * float(facing), end - 0.15 * float(facing), 18, Color(1.0, 0.92, 0.92, 0.55 * alpha), maxf(3.0, width * 0.35), true)
	if charged:
		draw_circle(Vector2(facing * 8, 0), 8.0 * alpha, Color(CRIMSON.r, CRIMSON.g, CRIMSON.b, 0.55 * alpha))
