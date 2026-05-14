extends CharacterBody2D
class_name DummyEnemy2D

const Assets := preload("res://scripts/v2/V2Assets.gd")
const CRIMSON := Color(0.7843, 0.0627, 0.1804, 1.0)
const PALE := Color(0.92, 0.91, 0.88, 1.0)
const HIT_TINT := Color(0.72, 0.72, 0.78, 1.0)
const DEATH_WHITE := Color(2.2, 2.2, 2.2, 1.0)

@export var max_hp: int = 45
@export var damage: int = 8
@export var move_speed: float = 55.0
@export var patrol_half_width: float = 120.0
@export var gravity: float = 1600.0
@export var texture: Texture2D
@export var sprite_scale: float = 0.34

var current_hp: int
var _spawn_x: float
var _dir: int = -1
var _attack_cooldown: float = 0.0
var _flash_timer: float = 0.0
var _hit_stun_timer: float = 0.0
var _death_timer: float = 0.0
var _hit_recoil_velocity := Vector2.ZERO
var _dead: bool = false
var _sprite: Sprite2D
var _weak_point: Polygon2D


func _ready() -> void:
	add_to_group("damageable")
	current_hp = max_hp
	_spawn_x = global_position.x
	collision_layer = 8
	collision_mask = 1
	_build_nodes()


func _physics_process(delta: float) -> void:
	_attack_cooldown = maxf(0.0, _attack_cooldown - delta)
	_flash_timer = maxf(0.0, _flash_timer - delta)

	if _dead:
		_death_timer = maxf(0.0, _death_timer - delta)
		velocity = Vector2.ZERO
		_update_visuals()
		if _death_timer == 0.0:
			_finish_death()
		return

	if not is_on_floor():
		velocity.y += gravity * delta

	if _hit_stun_timer > 0.0:
		_hit_stun_timer = maxf(0.0, _hit_stun_timer - delta)
		velocity.x = _hit_recoil_velocity.x
		if _hit_recoil_velocity.y < 0.0:
			velocity.y = minf(velocity.y, _hit_recoil_velocity.y)
		_hit_recoil_velocity = _hit_recoil_velocity.move_toward(Vector2.ZERO, 1100.0 * delta)
		move_and_slide()
		_update_visuals()
		return

	if absf(global_position.x - _spawn_x) > patrol_half_width:
		_dir *= -1
		global_position.x = clampf(global_position.x, _spawn_x - patrol_half_width, _spawn_x + patrol_half_width)
	velocity.x = move_speed * float(_dir)
	move_and_slide()

	_try_hit_player()
	_update_visuals()


func _build_nodes() -> void:
	var shape := CollisionShape2D.new()
	var capsule := CapsuleShape2D.new()
	capsule.radius = 15.0
	capsule.height = 58.0
	shape.shape = capsule
	shape.position = Vector2(0, -30)
	add_child(shape)

	_sprite = Sprite2D.new()
	_sprite.texture = texture if texture != null else Assets.ENEMY_WHITE
	_sprite.scale = Vector2(sprite_scale, sprite_scale)
	_sprite.position = Vector2(0, -34)
	_sprite.z_index = 3
	add_child(_sprite)

	_weak_point = Polygon2D.new()
	_weak_point.polygon = PackedVector2Array([
		Vector2(-5, -38), Vector2(5, -38), Vector2(5, -28), Vector2(-5, -28)
	])
	_weak_point.color = CRIMSON
	_weak_point.z_index = 2
	add_child(_weak_point)


func _try_hit_player() -> void:
	if _attack_cooldown > 0.0:
		return
	var player_node := get_tree().get_first_node_in_group("player_2d")
	if player_node == null or not (player_node is Node2D):
		return
	var player := player_node as Node2D
	if not player.has_method("on_damaged"):
		return
	var delta := player.global_position - global_position
	if absf(delta.x) <= 42.0 and absf(delta.y) <= 70.0:
		var knock_dir := Vector2(signf(delta.x), -0.15)
		if knock_dir.x == 0.0:
			knock_dir.x = float(_dir)
		player.call("on_damaged", damage, knock_dir.normalized(), 360.0, self)
		_attack_cooldown = 1.15


func on_damaged(amount: int, knockback_dir: Vector2, knockback_force: float, _source: Node) -> void:
	if _dead:
		return
	current_hp -= amount
	var restrained_force := minf(knockback_force, 280.0)
	_hit_recoil_velocity = knockback_dir.normalized() * restrained_force
	_hit_recoil_velocity.y = minf(_hit_recoil_velocity.y, -80.0)
	_hit_stun_timer = 0.18
	_attack_cooldown = maxf(_attack_cooldown, 0.45)
	_flash_timer = 0.16
	if current_hp <= 0:
		_die()


func on_grappled(anchor_position: Vector2) -> void:
	var pull := anchor_position - global_position
	if pull.length_squared() <= 1.0:
		return
	velocity = Vector2(pull.normalized().x * 380.0, -220.0)
	current_hp = maxi(1, current_hp - 4)
	_flash_timer = 0.18


func _die() -> void:
	if _dead:
		return
	_dead = true
	_death_timer = 0.30
	velocity = Vector2.ZERO
	collision_layer = 0
	collision_mask = 0
	if _weak_point != null:
		_weak_point.visible = false
	if _sprite != null:
		_sprite.modulate = DEATH_WHITE


func _finish_death() -> void:
	var burst := CPUParticles2D.new()
	burst.amount = 18
	burst.lifetime = 0.45
	burst.one_shot = true
	burst.explosiveness = 0.95
	burst.direction = Vector2.UP
	burst.spread = 90.0
	burst.initial_velocity_min = 90.0
	burst.initial_velocity_max = 180.0
	burst.gravity = Vector2(0, 300)
	burst.color = Color(0.94, 0.93, 0.90, 0.86)
	if get_parent() == null:
		queue_free()
		return
	get_parent().add_child(burst)
	burst.global_position = global_position + Vector2(0, -32)
	burst.emitting = true
	get_tree().create_timer(0.60).timeout.connect(func() -> void:
		if is_instance_valid(burst):
			burst.queue_free()
	)
	queue_free()


func _update_visuals() -> void:
	if _sprite == null:
		return
	_sprite.flip_h = _dir > 0
	if _dead:
		_sprite.modulate = DEATH_WHITE
	elif _flash_timer > 0.0:
		var pulse := 0.5 + 0.5 * sin(float(Time.get_ticks_msec()) * 0.05)
		_sprite.modulate = HIT_TINT.lerp(Color.WHITE, pulse)
	else:
		_sprite.modulate = Color.WHITE
	_sprite.rotation = lerp_angle(_sprite.rotation, deg_to_rad(3.0 * float(_dir)), 0.12)
