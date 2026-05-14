extends CharacterBody2D
class_name BossRaincoatMan2D

signal defeated
signal message_requested(text: String)

const Assets := preload("res://scripts/v2/V2Assets.gd")
const CRIMSON := Color(0.7843, 0.0627, 0.1804, 1.0)
const PALE := Color(0.88, 0.87, 0.84, 1.0)

@export var max_hp: int = 600
@export var gravity: float = 1600.0
@export var walk_speed: float = 86.0
@export var safe_zone_position := Vector2(960, 720)

var current_hp: int
var phase: int = 1

var _state := "idle"
var _state_timer: float = 1.0
var _attack_kind := ""
var _attack_hit_done := false
var _dir: int = -1
var _flash_timer: float = 0.0
var _phase_started := false
var _rain_cooldown: float = 5.0
var _rain_timer: float = 0.0
var _rain_tick: float = 0.0
var _umbrella_sprite: Sprite2D
var _sprite: Sprite2D
var _weak_point: Polygon2D


func _ready() -> void:
	randomize()
	add_to_group("damageable")
	current_hp = max_hp
	collision_layer = 8
	collision_mask = 1
	_build_nodes()


func _physics_process(delta: float) -> void:
	_flash_timer = maxf(0.0, _flash_timer - delta)
	if not is_on_floor():
		velocity.y += gravity * delta

	_update_state(delta)
	_update_rain(delta)
	move_and_slide()
	_update_visuals()
	queue_redraw()


func _draw() -> void:
	if phase < 2:
		return
	if _rain_timer > 0.0:
		draw_rect(
			Rect2(to_local(Vector2(-120, -120)), Vector2(2160, 1160)),
			Color(CRIMSON.r, CRIMSON.g, CRIMSON.b, 0.10)
		)
	var safe_local := to_local(safe_zone_position)
	draw_arc(safe_local, 90.0, 0.0, TAU, 36, Color(CRIMSON.r, CRIMSON.g, CRIMSON.b, 0.40), 3.0, true)


func _build_nodes() -> void:
	var shape := CollisionShape2D.new()
	var capsule := CapsuleShape2D.new()
	capsule.radius = 28.0
	capsule.height = 112.0
	shape.shape = capsule
	shape.position = Vector2(0, -56)
	add_child(shape)

	_sprite = Sprite2D.new()
	_sprite.texture = Assets.BOSS_UMBRELLA
	_sprite.scale = Vector2(0.40, 0.40)
	_sprite.position = Vector2(0, -66)
	_sprite.z_index = 6
	add_child(_sprite)

	_weak_point = Polygon2D.new()
	_weak_point.polygon = PackedVector2Array([
		Vector2(-8, -92), Vector2(8, -92), Vector2(8, -72), Vector2(-8, -72)
	])
	_weak_point.color = CRIMSON
	_weak_point.z_index = 7
	add_child(_weak_point)


func _update_state(delta: float) -> void:
	var player := _player()
	if player != null:
		_dir = 1 if player.global_position.x > global_position.x else -1

	if _state == "idle":
		_state_timer -= delta
		if player != null:
			var target_speed := walk_speed * float(_dir)
			if absf(player.global_position.x - global_position.x) < 170.0:
				target_speed = 0.0
			velocity.x = move_toward(velocity.x, target_speed, 900.0 * delta)
		if _state_timer <= 0.0:
			_begin_attack()
	elif _state == "windup":
		_state_timer -= delta
		velocity.x = move_toward(velocity.x, 0.0, 1400.0 * delta)
		if _state_timer <= 0.0:
			_start_attack_active()
	elif _state == "active":
		_state_timer -= delta
		_apply_attack_motion()
		_try_attack_hit()
		if _state_timer <= 0.0:
			_state = "recover"
			_state_timer = 0.45
			velocity.x *= 0.2
	elif _state == "recover":
		_state_timer -= delta
		velocity.x = move_toward(velocity.x, 0.0, 1000.0 * delta)
		if _state_timer <= 0.0:
			_state = "idle"
			_state_timer = 0.55 if phase == 2 else 0.75


func _begin_attack() -> void:
	if phase == 2 and _rain_timer > 0.0 and randf() < 0.55:
		_attack_kind = "umbrella_charge"
	else:
		var attacks := ["stab", "spin", "slam"]
		if phase == 2:
			attacks.append("rib_throw")
		_attack_kind = attacks[randi() % attacks.size()]
	_state = "windup"
	_attack_hit_done = false
	match _attack_kind:
		"stab":
			_state_timer = 0.70
		"spin":
			_state_timer = 0.95
		"slam":
			_state_timer = 1.05
		"rib_throw":
			_state_timer = 0.45
		"umbrella_charge":
			_state_timer = 0.55


func _start_attack_active() -> void:
	_state = "active"
	match _attack_kind:
		"stab":
			_state_timer = 0.26
			velocity.x = float(_dir) * 420.0
		"spin":
			_state_timer = 0.42
		"slam":
			_state_timer = 0.30
			velocity.y = -80.0
		"rib_throw":
			_state_timer = 0.30
		"umbrella_charge":
			_state_timer = 0.44


func _apply_attack_motion() -> void:
	if _attack_kind == "umbrella_charge":
		var to_umbrella := safe_zone_position - global_position
		velocity.x = clampf(to_umbrella.x * 2.3, -620.0, 620.0)
	elif _attack_kind == "rib_throw":
		velocity.x = 0.0


func _try_attack_hit() -> void:
	if _attack_hit_done:
		return
	var player := _player()
	if player == null or not player.has_method("on_damaged"):
		return
	var delta := player.global_position - global_position
	var hit := false
	var damage := 20
	match _attack_kind:
		"stab":
			hit = signf(delta.x) == float(_dir) and absf(delta.x) <= 132.0 and absf(delta.y) <= 86.0
			damage = 20
		"spin":
			hit = delta.length() <= 104.0
			damage = 25
		"slam":
			hit = delta.length() <= 134.0
			damage = 30
		"rib_throw":
			hit = signf(delta.x) == float(_dir) and absf(delta.y) <= 58.0 and absf(delta.x) <= 420.0
			damage = 12
		"umbrella_charge":
			hit = absf(delta.x) <= 92.0 and absf(delta.y) <= 90.0
			damage = 30
	if not hit:
		return
	_attack_hit_done = true
	player.call("on_damaged", damage, Vector2(signf(delta.x), -0.2).normalized(), 420.0, self)


func _update_rain(delta: float) -> void:
	if phase < 2:
		return
	_ensure_safe_umbrella()
	if _rain_timer > 0.0:
		_rain_timer = maxf(0.0, _rain_timer - delta)
		_rain_tick = maxf(0.0, _rain_tick - delta)
		if _rain_tick <= 0.0:
			_rain_tick = 0.85
			_damage_player_outside_umbrella()
		return
	_rain_cooldown -= delta
	if _rain_cooldown <= 0.0:
		_rain_timer = 5.0
		_rain_cooldown = 15.0
		_rain_tick = 0.15
		message_requested.emit("红伞之雨")


func _damage_player_outside_umbrella() -> void:
	var player := _player()
	if player == null or not player.has_method("on_damaged"):
		return
	if player.global_position.distance_to(safe_zone_position) <= 92.0:
		return
	var dir := (player.global_position - safe_zone_position).normalized()
	player.call("on_damaged", 5, dir, 130.0, self)


func _ensure_safe_umbrella() -> void:
	if _umbrella_sprite != null and is_instance_valid(_umbrella_sprite):
		return
	_umbrella_sprite = Sprite2D.new()
	_umbrella_sprite.texture = Assets.RED_UMBRELLA
	_umbrella_sprite.global_position = safe_zone_position
	_umbrella_sprite.scale = Vector2(0.34, 0.34)
	_umbrella_sprite.z_index = 5
	get_parent().add_child(_umbrella_sprite)


func on_damaged(amount: int, knockback_dir: Vector2, knockback_force: float, _source: Node) -> void:
	current_hp -= amount
	velocity = knockback_dir.normalized() * knockback_force * 0.35
	_flash_timer = 0.14
	if phase == 1 and current_hp <= max_hp / 2:
		_start_phase_two()
	if current_hp <= 0:
		_die()


func _start_phase_two() -> void:
	if _phase_started:
		return
	_phase_started = true
	phase = 2
	_state = "recover"
	_state_timer = 1.2
	_rain_cooldown = 1.4
	_ensure_safe_umbrella()
	message_requested.emit("雨声变红了。")


func _die() -> void:
	defeated.emit()
	queue_free()


func _update_visuals() -> void:
	if _sprite == null:
		return
	_sprite.flip_h = _dir > 0
	_sprite.modulate = CRIMSON if _flash_timer > 0.0 else Color.WHITE
	var target_rotation := 0.0
	if _state == "windup":
		target_rotation = deg_to_rad(-8.0 * float(_dir))
	elif _state == "active":
		target_rotation = deg_to_rad(10.0 * float(_dir))
	_sprite.rotation = lerp_angle(_sprite.rotation, target_rotation, 0.16)
	_weak_point.visible = _state == "windup" or _flash_timer > 0.0


func _player() -> Node2D:
	var player_node := get_tree().get_first_node_in_group("player_2d")
	if player_node is Node2D:
		return player_node as Node2D
	return null
