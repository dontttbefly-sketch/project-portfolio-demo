extends CharacterBody2D
class_name Player2D

const Assets := preload("res://scripts/v2/V2Assets.gd")
const SlashVFX2DScript := preload("res://scripts/v2/SlashVFX2D.gd")

signal hp_changed(current: int, maximum: int)
signal echo_changed(current: int, maximum: int)
signal shard_changed(count: int)
signal message_requested(text: String)

const CRIMSON := Color(0.7843, 0.0627, 0.1804, 1.0)
const PALE := Color(0.96, 0.94, 0.90, 1.0)
const DARK := Color(0.08, 0.08, 0.09, 1.0)
const ATTACK_PHASE_NONE := 0
const ATTACK_PHASE_STARTUP := 1
const ATTACK_PHASE_ACTIVE := 2
const ATTACK_PHASE_RECOVERY := 3

const ACTION_SPECS := {
	"atk1": {
		"startup": 0.05,
		"active": 0.08,
		"recovery": 0.14,
		"cancel_window": 0.08,
		"damage": 10,
		"echo_gain": 5,
		"knockback": 250.0,
		"hit_pause": 2,
		"shake_duration": 0.04,
		"shake_strength": 1.7,
		"slash_radius": 50.0,
		"slash_width": 8.0,
		"vfx_lifetime": 0.13,
	},
	"atk2": {
		"startup": 0.06,
		"active": 0.09,
		"recovery": 0.18,
		"cancel_window": 0.10,
		"damage": 12,
		"echo_gain": 5,
		"knockback": 275.0,
		"hit_pause": 3,
		"shake_duration": 0.05,
		"shake_strength": 2.0,
		"slash_radius": 58.0,
		"slash_width": 9.0,
		"vfx_lifetime": 0.15,
	},
	"atk3": {
		"startup": 0.07,
		"active": 0.10,
		"recovery": 0.30,
		"cancel_window": 0.16,
		"damage": 25,
		"echo_gain": 5,
		"knockback": 330.0,
		"hit_pause": 5,
		"shake_duration": 0.08,
		"shake_strength": 3.4,
		"slash_radius": 72.0,
		"slash_width": 13.0,
		"vfx_lifetime": 0.20,
	},
	"dash_slash": {
		"startup": 0.03,
		"active": 0.10,
		"recovery": 0.05,
		"cancel_window": 0.05,
		"damage": 20,
		"echo_gain": 8,
		"knockback": 350.0,
		"hit_pause": 3,
		"shake_duration": 0.06,
		"shake_strength": 2.6,
		"slash_radius": 66.0,
		"slash_width": 11.0,
		"vfx_lifetime": 0.16,
	},
	"charged": {
		"startup": 0.10,
		"active": 0.14,
		"recovery": 0.26,
		"cancel_window": 0.20,
		"damage": 50,
		"echo_gain": 20,
		"knockback": 430.0,
		"hit_pause": 6,
		"shake_duration": 0.10,
		"shake_strength": 4.2,
		"slash_radius": 82.0,
		"slash_width": 15.0,
		"vfx_lifetime": 0.24,
	},
}

const ACTION_FRAME_FPS := {
	"idle": 8.0,
	"walk": 12.0,
	"atk1": 24.0,
	"atk2": 24.0,
	"atk3": 22.0,
	"charged": 18.0,
	"dash_slash": 24.0,
	"shadowdash": 20.0,
	"hit": 16.0,
	"echo": 12.0,
}

@export var max_hp: int = 100
@export var max_echo: int = 100
@export var move_speed: float = 230.0
@export var acceleration: float = 1800.0
@export var friction: float = 2200.0
@export var gravity: float = 1700.0
@export var jump_velocity: float = -760.0
@export var coyote_time: float = 0.10
@export var jump_buffer_time: float = 0.10
@export var shadow_dash_speed: float = 620.0
@export var shadow_dash_time: float = 0.16
@export var shadow_dash_cooldown: float = 0.45
@export var dash_attack_speed: float = 460.0
@export var dash_attack_cooldown: float = 0.80
@export var grapple_range: float = 280.0
@export var grapple_speed: float = 760.0
@export var grapple_time: float = 0.34
@export var has_grapple: bool = false

var current_hp: int = 100
var current_echo: int = 0
var shard_count: int = 0
var facing: int = 1

var _coyote_timer: float = 0.0
var _jump_buffer_timer: float = 0.0
var _dash_timer: float = 0.0
var _dash_cooldown_timer: float = 0.0
var _dash_attack_timer: float = 0.0
var _dash_attack_cooldown_timer: float = 0.0
var _grapple_timer: float = 0.0
var _attack_timer: float = 0.0
var _attack_active_timer: float = 0.0
var _combo_reset_timer: float = 0.0
var _charge_hold_timer: float = 0.0
var _invincible_timer: float = 0.0
var _echo_burst_timer: float = 0.0
var _flash_timer: float = 0.0
var _walk_anim_timer: float = 0.0
var _attack_pose_timer: float = 0.0
var _land_squash_timer: float = 0.0
var _afterimage_timer: float = 0.0
var _camera_shake_timer: float = 0.0
var _camera_shake_strength: float = 0.0
var _attack_phase: int = ATTACK_PHASE_NONE
var _attack_phase_timer: float = 0.0
var _active_action_name: String = ""
var _active_action_spec: Dictionary = {}
var _combo_buffered: bool = false
var _hit_pause_active: bool = false
var _visual_action_name: String = ""
var _visual_frame_timer: float = 0.0

var _combo_index: int = 0
var _last_attack_charged: bool = false
var _last_attack_combo: int = 0
var _attack_damage: int = 10
var _attack_echo_gain: int = 5
var _attack_hits: Array[Node] = []
var _checkpoint_position: Vector2
var _dead: bool = false
var _grapple_target := Vector2.ZERO

var _sprite: Sprite2D
var _fallback_body: Polygon2D
var _attack_area: Area2D
var _attack_shape: CollisionShape2D
var _collision_shape: CollisionShape2D
var _camera: Camera2D
var _grapple_line: Line2D
var _camera_base_position := Vector2(120, -120)
var _sheet_cache: Dictionary = {}
var _frame_cache: Dictionary = {}


func _ready() -> void:
	add_to_group("player_2d")
	collision_layer = 2
	collision_mask = 1
	_ensure_runtime_input_actions()
	_ensure_nodes()
	_checkpoint_position = global_position
	current_hp = max_hp
	_emit_status()
	message_requested.emit("A/D 移动 · K 跳跃 · J 斩击 · Shift 影渡 · 空格 残响/破壁")


func _physics_process(delta: float) -> void:
	if _dead:
		_update_visuals(delta)
		return

	_tick_timers(delta)
	_handle_horizontal_movement(delta)
	_handle_jump(delta)
	_handle_shadow_dash()
	_handle_grapple_input()
	_handle_attack_input(delta)
	_handle_echo_action()
	_apply_action_motion(delta)
	var was_on_floor := is_on_floor()
	var fall_speed := velocity.y
	move_and_slide()
	if not was_on_floor and is_on_floor() and fall_speed > 180.0:
		_land_squash_timer = 0.12
		_spawn_dust(global_position + Vector2(0, -4), 12, Vector2(-70, -150), Vector2(70, -35))
		_shake_camera(0.08, 2.0)
	_update_visuals(delta)


func _ensure_nodes() -> void:
	_collision_shape = CollisionShape2D.new()
	var capsule := CapsuleShape2D.new()
	capsule.radius = 16.0
	capsule.height = 66.0
	_collision_shape.shape = capsule
	_collision_shape.position = Vector2(0, -34)
	add_child(_collision_shape)

	_sprite = Sprite2D.new()
	_sprite.texture = Assets.AKANE_ACT_IDLE
	_sprite.scale = Vector2(0.33, 0.33)
	_sprite.position = Vector2(0, -42)
	_sprite.z_index = 10
	add_child(_sprite)

	_fallback_body = Polygon2D.new()
	_fallback_body.polygon = PackedVector2Array([
		Vector2(-14, -70), Vector2(14, -70), Vector2(18, -8), Vector2(-18, -8)
	])
	_fallback_body.color = Color(0.95, 0.92, 0.88, 0.88)
	_fallback_body.z_index = 9
	_fallback_body.visible = false
	add_child(_fallback_body)

	_attack_area = Area2D.new()
	_attack_area.monitoring = false
	_attack_area.collision_layer = 0
	_attack_area.collision_mask = 8
	_attack_area.body_entered.connect(_on_attack_body_entered)
	add_child(_attack_area)

	_attack_shape = CollisionShape2D.new()
	var attack_rect := RectangleShape2D.new()
	attack_rect.size = Vector2(76, 54)
	_attack_shape.shape = attack_rect
	_attack_shape.disabled = true
	_attack_area.add_child(_attack_shape)

	_camera = Camera2D.new()
	_camera.position = _camera_base_position
	_camera.zoom = Vector2(1.7, 1.7)
	_camera.position_smoothing_enabled = true
	_camera.position_smoothing_speed = 7.0
	add_child(_camera)
	_camera.call_deferred("make_current")

	_grapple_line = Line2D.new()
	_grapple_line.width = 3.0
	_grapple_line.default_color = Color(CRIMSON.r, CRIMSON.g, CRIMSON.b, 0.78)
	_grapple_line.points = PackedVector2Array([Vector2.ZERO, Vector2.ZERO])
	_grapple_line.z_index = 28
	_grapple_line.visible = false
	add_child(_grapple_line)


func _ensure_runtime_input_actions() -> void:
	_add_key_action("jump", KEY_K)
	_add_key_action("shadow_dash", KEY_SHIFT)
	_add_key_action("grapple", KEY_Q)


func _add_key_action(action_name: String, keycode: Key) -> void:
	if not InputMap.has_action(action_name):
		InputMap.add_action(action_name)
	for event in InputMap.action_get_events(action_name):
		if event is InputEventKey and event.physical_keycode == keycode:
			return
	var key := InputEventKey.new()
	key.physical_keycode = keycode
	InputMap.action_add_event(action_name, key)


func _tick_timers(delta: float) -> void:
	_dash_cooldown_timer = maxf(0.0, _dash_cooldown_timer - delta)
	_dash_attack_cooldown_timer = maxf(0.0, _dash_attack_cooldown_timer - delta)
	_combo_reset_timer = maxf(0.0, _combo_reset_timer - delta)
	_invincible_timer = maxf(0.0, _invincible_timer - delta)
	_flash_timer = maxf(0.0, _flash_timer - delta)
	_attack_pose_timer = maxf(0.0, _attack_pose_timer - delta)
	_land_squash_timer = maxf(0.0, _land_squash_timer - delta)
	_camera_shake_timer = maxf(0.0, _camera_shake_timer - delta)
	_afterimage_timer = maxf(0.0, _afterimage_timer - delta)

	if _dash_timer > 0.0:
		_dash_timer = maxf(0.0, _dash_timer - delta)
	if _dash_attack_timer > 0.0:
		_dash_attack_timer = maxf(0.0, _dash_attack_timer - delta)
	if _grapple_timer > 0.0:
		_grapple_timer = maxf(0.0, _grapple_timer - delta)
		if _grapple_timer == 0.0:
			_end_grapple()

	if _echo_burst_timer > 0.0:
		_echo_burst_timer = maxf(0.0, _echo_burst_timer - delta)
		if _echo_burst_timer == 0.0:
			message_requested.emit("残响退去。")

	if _combo_reset_timer == 0.0 and _attack_timer == 0.0:
		_combo_index = 0

	_tick_attack_phase(delta)


func _handle_horizontal_movement(delta: float) -> void:
	if _dash_timer > 0.0 or _dash_attack_timer > 0.0 or _grapple_timer > 0.0:
		return

	var x_input := Input.get_axis("move_left", "move_right")
	if absf(x_input) > 0.01:
		facing = 1 if x_input > 0.0 else -1
		velocity.x = move_toward(velocity.x, x_input * move_speed, acceleration * delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, friction * delta)


func _handle_jump(delta: float) -> void:
	if is_on_floor():
		_coyote_timer = coyote_time
	else:
		_coyote_timer = maxf(0.0, _coyote_timer - delta)
		velocity.y += gravity * delta

	if _is_jump_just_pressed():
		_jump_buffer_timer = jump_buffer_time
	else:
		_jump_buffer_timer = maxf(0.0, _jump_buffer_timer - delta)

	if _jump_buffer_timer > 0.0 and _coyote_timer > 0.0:
		velocity.y = jump_velocity
		_jump_buffer_timer = 0.0
		_coyote_timer = 0.0
		_land_squash_timer = 0.10
		_spawn_dust(global_position + Vector2(0, -4), 8, Vector2(-45, -80), Vector2(45, -20))

	if _is_jump_just_released() and velocity.y < -120.0:
		velocity.y *= 0.45


func _handle_shadow_dash() -> void:
	if _dash_timer > 0.0 or _dash_attack_timer > 0.0 or _grapple_timer > 0.0:
		return
	if Input.is_action_just_pressed("shadow_dash") and _dash_cooldown_timer <= 0.0:
		_dash_timer = shadow_dash_time
		_dash_cooldown_timer = shadow_dash_cooldown
		_invincible_timer = shadow_dash_time + 0.06
		_afterimage_timer = 0.0
		velocity = Vector2(facing * shadow_dash_speed, 0.0)
		_spawn_afterimage()
		_spawn_dust(global_position + Vector2(-facing * 18, -12), 10, Vector2(-facing * 140, -40), Vector2(-facing * 40, 25))
		_shake_camera(0.07, 1.8)
		message_requested.emit("影渡")


func _handle_attack_input(delta: float) -> void:
	if Input.is_action_pressed("attack"):
		_charge_hold_timer += delta
	else:
		_charge_hold_timer = 0.0

	if _is_attack_running():
		if Input.is_action_just_pressed("attack"):
			_combo_buffered = true
		return

	if _dash_attack_timer > 0.0 or _grapple_timer > 0.0:
		return

	if _charge_hold_timer >= 0.80:
		_start_action_attack("charged", true, -1)
		_charge_hold_timer = -999.0
		message_requested.emit("蓄力斩")
		return

	if Input.is_action_just_pressed("attack"):
		var x_input := Input.get_axis("move_left", "move_right")
		if absf(x_input) > 0.01 and _dash_attack_cooldown_timer <= 0.0:
			facing = 1 if x_input > 0.0 else -1
			_dash_attack_timer = 0.16
			_dash_attack_cooldown_timer = dash_attack_cooldown
			velocity = Vector2(facing * dash_attack_speed, -40.0)
			_start_action_attack("dash_slash", false, -1)
		else:
			_start_combo_attack(_combo_index)


func _handle_grapple_input() -> void:
	if not Input.is_action_just_pressed("grapple"):
		return
	if not has_grapple:
		message_requested.emit("红丝还没有回应。")
		return
	if _dash_timer > 0.0 or _dash_attack_timer > 0.0 or _grapple_timer > 0.0:
		return
	var point = _find_grapple_point()
	if point != null:
		_start_grapple(point.get_pull_target())
		message_requested.emit("缠红丝")
		return
	if _try_grapple_enemy():
		message_requested.emit("红丝牵回白怨")
	else:
		message_requested.emit("没有可缠住的红丝节点。")


func _find_grapple_point():
	var closest = null
	var closest_dist := grapple_range
	for node in get_tree().get_nodes_in_group("grapple_point_2d"):
		if not (node is Node2D):
			continue
		if not node.has_method("get_pull_target"):
			continue
		var point := node as Node2D
		var to_point := point.global_position - global_position
		if to_point.length() > closest_dist:
			continue
		if absf(to_point.x) > 32.0 and signf(to_point.x) != float(facing):
			continue
		closest = point
		closest_dist = to_point.length()
	return closest


func _try_grapple_enemy() -> bool:
	var closest: Node2D = null
	var closest_dist := minf(grapple_range, 230.0)
	for node in get_tree().get_nodes_in_group("damageable"):
		if not (node is Node2D):
			continue
		if not node.has_method("on_grappled"):
			continue
		var body := node as Node2D
		var to_body := body.global_position - global_position
		if to_body.length() > closest_dist:
			continue
		if absf(to_body.x) > 28.0 and signf(to_body.x) != float(facing):
			continue
		closest = body
		closest_dist = to_body.length()
	if closest == null:
		return false
	closest.call("on_grappled", global_position + Vector2(0, -32))
	_draw_grapple_line(closest.global_position + Vector2(0, -34))
	_shake_camera(0.05, 1.5)
	get_tree().create_timer(0.12).timeout.connect(func() -> void:
		if is_instance_valid(_grapple_line) and _grapple_timer <= 0.0:
			_grapple_line.visible = false
	)
	return true


func _start_grapple(target: Vector2) -> void:
	_grapple_target = target
	_grapple_timer = grapple_time
	_invincible_timer = maxf(_invincible_timer, 0.08)
	velocity = (_grapple_target - global_position).normalized() * grapple_speed
	_draw_grapple_line(_grapple_target)
	_spawn_afterimage()
	_shake_camera(0.06, 1.7)


func _start_combo_attack(combo_stage: int) -> void:
	var action_name := "atk%d" % (combo_stage + 1)
	_start_action_attack(action_name, false, combo_stage)
	_combo_index = 0 if combo_stage >= 2 else combo_stage + 1
	_combo_reset_timer = 0.72


func _start_action_attack(action_name: String, charged: bool, combo_stage: int) -> void:
	var spec := _get_action_spec(action_name)
	_active_action_name = action_name
	_active_action_spec = spec
	_attack_damage = int(spec.get("damage", 0))
	_attack_echo_gain = int(spec.get("echo_gain", 0))
	_last_attack_charged = charged
	_last_attack_combo = combo_stage
	if _echo_burst_timer > 0.0:
		_attack_damage = int(round(float(_attack_damage) * 1.5))
	_attack_timer = float(spec.get("startup", 0.0)) + float(spec.get("active", 0.0)) + float(spec.get("recovery", 0.0))
	_attack_phase = ATTACK_PHASE_STARTUP
	_attack_phase_timer = float(spec.get("startup", 0.0))
	_attack_active_timer = 0.0
	_attack_pose_timer = _attack_timer
	_combo_buffered = false
	_attack_hits.clear()
	_set_attack_active(false)
	_play_attack_feedback(action_name, spec)


func _is_attack_running() -> bool:
	return _attack_phase != ATTACK_PHASE_NONE


func _tick_attack_phase(delta: float) -> void:
	if _attack_phase == ATTACK_PHASE_NONE:
		_attack_timer = 0.0
		_attack_active_timer = 0.0
		return

	_attack_timer = maxf(0.0, _attack_timer - delta)
	_attack_phase_timer -= delta
	if _attack_phase == ATTACK_PHASE_ACTIVE:
		_attack_active_timer = maxf(0.0, _attack_phase_timer)

	if _attack_phase == ATTACK_PHASE_RECOVERY:
		var recovery := float(_active_action_spec.get("recovery", 0.0))
		var cancel_window := float(_active_action_spec.get("cancel_window", recovery))
		var elapsed := recovery - maxf(_attack_phase_timer, 0.0)
		if _combo_buffered and _last_attack_combo >= 0 and _last_attack_combo < 2 and elapsed >= cancel_window:
			_start_combo_attack(_last_attack_combo + 1)
			return

	if _attack_phase_timer > 0.0:
		return

	match _attack_phase:
		ATTACK_PHASE_STARTUP:
			_begin_attack_active()
		ATTACK_PHASE_ACTIVE:
			_begin_attack_recovery()
		ATTACK_PHASE_RECOVERY:
			_finish_attack()


func _begin_attack_active() -> void:
	_attack_phase = ATTACK_PHASE_ACTIVE
	_attack_phase_timer = float(_active_action_spec.get("active", 0.0))
	_attack_active_timer = _attack_phase_timer
	_attack_area.position = Vector2(facing * 46, -36)
	_set_attack_active(true)


func _begin_attack_recovery() -> void:
	_attack_phase = ATTACK_PHASE_RECOVERY
	_attack_phase_timer = float(_active_action_spec.get("recovery", 0.0))
	_attack_active_timer = 0.0
	_set_attack_active(false)


func _finish_attack() -> void:
	_attack_phase = ATTACK_PHASE_NONE
	_attack_phase_timer = 0.0
	_attack_timer = 0.0
	_attack_active_timer = 0.0
	_combo_buffered = false
	_active_action_spec = {}
	_active_action_name = ""
	_set_attack_active(false)


func _set_attack_active(active: bool) -> void:
	if _attack_area == null:
		return
	if active:
		_attack_hits.clear()
	_attack_area.monitoring = active
	if _attack_shape != null:
		_attack_shape.disabled = not active
	if active:
		call_deferred("_check_existing_attack_overlaps")


func _check_existing_attack_overlaps() -> void:
	await get_tree().physics_frame
	if _attack_area == null or not _attack_area.monitoring:
		return
	for body in _attack_area.get_overlapping_bodies():
		_on_attack_body_entered(body)


func _handle_echo_action() -> void:
	if not Input.is_action_just_pressed("echo_action"):
		return
	if _try_break_wall():
		return
	if current_echo >= max_echo and _echo_burst_timer <= 0.0:
		current_echo = 0
		_echo_burst_timer = 6.0
		echo_changed.emit(current_echo, max_echo)
		message_requested.emit("残响态")
	elif current_echo < 50:
		message_requested.emit("残响不足。")


func _try_break_wall() -> bool:
	var closest = null
	var closest_dist := 999999.0
	for node in get_tree().get_nodes_in_group("breakable_wall_2d"):
		if not (node is Node2D):
			continue
		if not node.has_method("break_wall"):
			continue
		var wall := node as Node2D
		var to_wall := wall.global_position - global_position
		if signf(to_wall.x) != float(facing):
			continue
		var dist := to_wall.length()
		if dist < closest_dist and dist <= 110.0:
			closest = wall
			closest_dist = dist
	if closest == null:
		return false
	if current_echo < 50:
		message_requested.emit("需要 50% 残响才能破壁。")
		return true
	current_echo -= 50
	echo_changed.emit(current_echo, max_echo)
	closest.break_wall()
	message_requested.emit("褪色之壁裂开了。")
	return true


func _apply_action_motion(_delta: float) -> void:
	if _dash_timer > 0.0:
		velocity.x = facing * shadow_dash_speed
		velocity.y = 0.0
		if _afterimage_timer <= 0.0:
			_spawn_afterimage()
			_afterimage_timer = 0.045
	elif _dash_attack_timer > 0.0:
		velocity.x = facing * dash_attack_speed
	elif _grapple_timer > 0.0:
		var to_target := _grapple_target - global_position
		if to_target.length() <= 26.0:
			_end_grapple()
			velocity *= 0.35
			return
		velocity = to_target.normalized() * grapple_speed
		_draw_grapple_line(_grapple_target)


func _update_visuals(delta: float) -> void:
	if _sprite != null:
		var moving := absf(velocity.x) > 18.0 and is_on_floor()
		var action_name := _select_action_name(moving)
		if _visual_action_name != action_name:
			_visual_action_name = action_name
			_visual_frame_timer = 0.0
		else:
			_visual_frame_timer += delta
		var frame_index := int(floor(_visual_frame_timer * _get_action_fps(action_name)))
		var action_texture := _get_action_texture(action_name, frame_index)
		if _sprite.texture != action_texture:
			_sprite.texture = action_texture
		_sprite.flip_h = facing < 0
		_sprite.modulate = CRIMSON if _flash_timer > 0.0 else Color.WHITE
		_walk_anim_timer += delta * (1.0 + absf(velocity.x) / maxf(move_speed, 1.0))
		var bob := sin(_walk_anim_timer * 12.0) * 3.0 if moving else 0.0
		var base_scale := Vector2(0.33, 0.33)
		var target_rotation := 0.0
		if _dash_timer > 0.0 or _dash_attack_timer > 0.0:
			base_scale = Vector2(0.37, 0.28)
			target_rotation = deg_to_rad(-7.0 * float(facing))
		elif _attack_pose_timer > 0.0:
			base_scale = Vector2(0.36, 0.30)
			target_rotation = deg_to_rad(-10.0 * float(facing))
		elif _land_squash_timer > 0.0:
			base_scale = Vector2(0.37, 0.28)
		elif not is_on_floor():
			base_scale = Vector2(0.32, 0.35)
			target_rotation = deg_to_rad(4.0 * float(facing))
		_sprite.scale = _sprite.scale.lerp(base_scale, minf(1.0, delta * 18.0))
		_sprite.rotation = lerp_angle(_sprite.rotation, target_rotation, minf(1.0, delta * 16.0))
		_sprite.position = Vector2(facing * 2, -42 + bob)
	if _fallback_body != null:
		var glow := _echo_burst_timer > 0.0
		_fallback_body.color = Color(0.95, 0.92, 0.88, 0.95) if not glow else Color(1.0, 0.88, 0.88, 1.0)
		_fallback_body.rotation = _sprite.rotation if _sprite != null else 0.0
		_fallback_body.scale = Vector2(1.0 + (_sprite.scale.x - 0.33) * 2.5, 1.0 + (_sprite.scale.y - 0.33) * 2.5) if _sprite != null else Vector2.ONE
		_update_camera_feedback()


func _select_action_name(moving: bool) -> String:
	if _dead:
		return "death"
	if _flash_timer > 0.0:
		return "hit"
	if _grapple_timer > 0.0:
		return "thread"
	if _dash_attack_timer > 0.0:
		return "dash_slash"
	if _dash_timer > 0.0:
		return "shadowdash"
	if _is_attack_running() or _attack_pose_timer > 0.0:
		if _active_action_name != "":
			return _active_action_name
		if _last_attack_charged:
			return "charged"
		return "atk%d" % (_last_attack_combo + 1)
	if _charge_hold_timer > 0.24:
		return "charged"
	if _land_squash_timer > 0.0 and is_on_floor():
		return "land"
	if not is_on_floor():
		return "jump" if velocity.y < 0.0 else "fall"
	if _echo_burst_timer > 0.0:
		return "echo"
	return "walk" if moving else "idle"


func _get_action_spec(action_name: String) -> Dictionary:
	var fallback: Dictionary = ACTION_SPECS["atk1"]
	var spec: Dictionary = ACTION_SPECS.get(action_name, fallback)
	return spec.duplicate()


func _get_action_fps(action_name: String) -> float:
	return float(ACTION_FRAME_FPS.get(action_name, 12.0))


func _get_action_frame_count(action_name: String) -> int:
	var sheet := _get_sheet_texture(action_name)
	if sheet == null:
		return 1
	var frame_width: int = max(1, Assets.AKANE_FRAME_SIZE.x)
	return maxi(1, int(sheet.get_width() / frame_width))


func _get_action_texture(action_name: String, frame_index: int) -> Texture2D:
	var sheet := _get_sheet_texture(action_name)
	if sheet == null:
		return Assets.get_akane_fallback(action_name)
	var frame_count := _get_action_frame_count(action_name)
	var safe_index := posmod(frame_index, frame_count)
	var cache_key := "%s:%d" % [action_name, safe_index]
	if _frame_cache.has(cache_key):
		return _frame_cache[cache_key]
	var frame := AtlasTexture.new()
	frame.atlas = sheet
	frame.region = Rect2(
		float(safe_index * Assets.AKANE_FRAME_SIZE.x),
		0.0,
		float(Assets.AKANE_FRAME_SIZE.x),
		float(Assets.AKANE_FRAME_SIZE.y)
	)
	_frame_cache[cache_key] = frame
	return frame


func _get_sheet_texture(action_name: String) -> Texture2D:
	if _sheet_cache.has(action_name):
		return _sheet_cache[action_name]
	var path := Assets.get_akane_sheet_path(action_name)
	if path.is_empty() or not ResourceLoader.exists(path):
		_sheet_cache[action_name] = null
		return null
	var texture := load(path) as Texture2D
	_sheet_cache[action_name] = texture
	return texture


func _play_attack_feedback(action_name: String, spec: Dictionary) -> void:
	var slash = SlashVFX2DScript.new()
	slash.setup(
		facing,
		action_name == "charged",
		float(spec.get("slash_radius", 54.0)),
		float(spec.get("slash_width", 9.0)),
		float(spec.get("vfx_lifetime", 0.14))
	)
	get_parent().add_child(slash)
	slash.global_position = global_position + Vector2(facing * 42, -42)
	slash.z_index = 30


func _draw_grapple_line(target: Vector2) -> void:
	if _grapple_line == null:
		return
	_grapple_line.visible = true
	_grapple_line.global_position = Vector2.ZERO
	_grapple_line.points = PackedVector2Array([
		global_position + Vector2(0, -42),
		target
	])


func _end_grapple() -> void:
	_grapple_timer = 0.0
	if _grapple_line != null:
		_grapple_line.visible = false


func _spawn_hit_spark(pos: Vector2) -> void:
	var particles := CPUParticles2D.new()
	particles.amount = 16
	particles.lifetime = 0.25
	particles.one_shot = true
	particles.explosiveness = 1.0
	particles.direction = Vector2(float(facing), -0.25).normalized()
	particles.spread = 65.0
	particles.initial_velocity_min = 120.0
	particles.initial_velocity_max = 260.0
	particles.gravity = Vector2(0, 120)
	particles.color = CRIMSON
	get_parent().add_child(particles)
	particles.global_position = pos
	particles.emitting = true
	get_tree().create_timer(0.35).timeout.connect(func() -> void:
		if is_instance_valid(particles):
			particles.queue_free()
	)


func _spawn_dust(pos: Vector2, amount: int, velocity_min: Vector2, velocity_max: Vector2) -> void:
	var particles := CPUParticles2D.new()
	particles.amount = amount
	particles.lifetime = 0.35
	particles.one_shot = true
	particles.explosiveness = 0.9
	particles.direction = Vector2.UP
	particles.spread = 90.0
	particles.initial_velocity_min = minf(velocity_min.length(), velocity_max.length())
	particles.initial_velocity_max = maxf(velocity_min.length(), velocity_max.length())
	particles.gravity = Vector2(0, 360)
	particles.color = Color(0.72, 0.70, 0.66, 0.55)
	get_parent().add_child(particles)
	particles.global_position = pos
	particles.emitting = true
	get_tree().create_timer(0.45).timeout.connect(func() -> void:
		if is_instance_valid(particles):
			particles.queue_free()
	)


func _spawn_afterimage() -> void:
	if _sprite == null:
		return
	var ghost := Sprite2D.new()
	ghost.texture = _sprite.texture
	ghost.flip_h = _sprite.flip_h
	ghost.global_position = _sprite.global_position
	ghost.global_rotation = _sprite.global_rotation
	ghost.scale = _sprite.scale
	ghost.modulate = Color(CRIMSON.r, CRIMSON.g, CRIMSON.b, 0.32)
	ghost.z_index = 4
	get_parent().add_child(ghost)
	var tween := create_tween()
	tween.tween_property(ghost, "modulate:a", 0.0, 0.22)
	tween.tween_callback(Callable(ghost, "queue_free"))


func _shake_camera(duration: float, strength: float) -> void:
	_camera_shake_timer = maxf(_camera_shake_timer, duration)
	_camera_shake_strength = maxf(_camera_shake_strength, strength)


func _update_camera_feedback() -> void:
	if _camera == null:
		return
	if _camera_shake_timer <= 0.0:
		_camera.position = _camera.position.lerp(_camera_base_position, 0.35)
		_camera_shake_strength = 0.0
		return
	var tick := float(Time.get_ticks_msec())
	var offset := Vector2(
		sin(tick * 0.073) * _camera_shake_strength,
		cos(tick * 0.091) * _camera_shake_strength
	)
	_camera.position = _camera_base_position + offset


func _on_attack_body_entered(body: Node2D) -> void:
	if _attack_active_timer <= 0.0:
		return
	if body in _attack_hits:
		return
	if not body.has_method("on_damaged"):
		return
	_attack_hits.append(body)
	var spec := _active_action_spec
	var knockback := float(spec.get("knockback", 260.0))
	body.on_damaged(_attack_damage, Vector2(facing, -0.1).normalized(), knockback, self)
	_spawn_hit_spark(body.global_position + Vector2(0, -34))
	_shake_camera(float(spec.get("shake_duration", 0.06)), float(spec.get("shake_strength", 2.0)))
	_request_hit_pause(int(spec.get("hit_pause", 0)))
	_add_echo(_attack_echo_gain)
	if _echo_burst_timer > 0.0:
		current_hp = mini(max_hp, current_hp + 2)
		hp_changed.emit(current_hp, max_hp)


func _request_hit_pause(frames: int) -> void:
	if frames <= 0 or _hit_pause_active:
		return
	_hit_pause_active = true
	_run_hit_pause(frames)


func _run_hit_pause(frames: int) -> void:
	var seconds := float(frames) / 60.0
	Engine.time_scale = 0.0
	await get_tree().create_timer(seconds, true, false, true).timeout
	Engine.time_scale = 1.0
	_hit_pause_active = false


func on_damaged(damage: int, knockback_dir: Vector2, knockback_force: float, _source: Node) -> void:
	if _invincible_timer > 0.0 or _dead:
		return
	current_hp = maxi(0, current_hp - damage)
	current_echo = maxi(0, current_echo - 10)
	hp_changed.emit(current_hp, max_hp)
	echo_changed.emit(current_echo, max_echo)
	velocity = knockback_dir.normalized() * knockback_force
	_invincible_timer = 0.8
	_flash_timer = 0.12
	message_requested.emit("受击")
	if current_hp <= 0:
		_die_and_respawn()


func save_checkpoint(pos: Vector2) -> void:
	_checkpoint_position = pos
	current_hp = max_hp
	hp_changed.emit(current_hp, max_hp)
	message_requested.emit("残响碑已记录。")


func collect_shard() -> void:
	shard_count += 1
	shard_changed.emit(shard_count)
	message_requested.emit("残响碎片 +1")


func unlock_grapple() -> void:
	if has_grapple:
		return
	has_grapple = true
	message_requested.emit("缠红丝觉醒。Q 键可牵引红丝节点 / 拉回轻型白怨。")


func _die_and_respawn() -> void:
	_dead = true
	message_requested.emit("阿茜回到上一座残响碑。")
	await get_tree().create_timer(0.65).timeout
	global_position = _checkpoint_position
	velocity = Vector2.ZERO
	current_hp = max_hp
	current_echo = 0
	_invincible_timer = 1.0
	_dead = false
	_emit_status()


func _add_echo(amount: int) -> void:
	current_echo = mini(max_echo, current_echo + amount)
	echo_changed.emit(current_echo, max_echo)


func _emit_status() -> void:
	hp_changed.emit(current_hp, max_hp)
	echo_changed.emit(current_echo, max_echo)
	shard_changed.emit(shard_count)


func _is_jump_just_pressed() -> bool:
	return (InputMap.has_action("jump") and Input.is_action_just_pressed("jump")) or Input.is_action_just_pressed("move_up")


func _is_jump_just_released() -> bool:
	return (InputMap.has_action("jump") and Input.is_action_just_released("jump")) or Input.is_action_just_released("move_up")
