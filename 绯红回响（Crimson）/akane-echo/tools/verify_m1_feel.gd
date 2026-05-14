extends SceneTree

const Player2DScript := preload("res://scripts/v2/Player2D.gd")
const DummyEnemy2DScript := preload("res://scripts/v2/DummyEnemy2D.gd")


func _init() -> void:
	var failures: Array[String] = []
	_check_player_action_specs(failures)
	_check_player_texture_fallback(failures)
	_check_player_jump_reaches_m1_platforms(failures)
	_check_enemy_hit_stun(failures)

	if failures.is_empty():
		print("M1 feel contract: PASS")
		quit(0)
		return

	for failure in failures:
		push_error(failure)
	quit(1)


func _check_player_action_specs(failures: Array[String]) -> void:
	var player := Player2DScript.new()
	if not player.has_method("_get_action_spec"):
		failures.append("Player2D must provide _get_action_spec(action_name) for tunable feel data.")
		player.free()
		return

	var atk1: Dictionary = player.call("_get_action_spec", "atk1")
	var atk3: Dictionary = player.call("_get_action_spec", "atk3")
	var dash_slash: Dictionary = player.call("_get_action_spec", "dash_slash")
	var charged: Dictionary = player.call("_get_action_spec", "charged")

	var required := [
		"startup",
		"active",
		"recovery",
		"cancel_window",
		"damage",
		"echo_gain",
		"knockback",
		"hit_pause",
		"shake_duration",
		"shake_strength",
	]
	for spec_name in ["atk1", "atk3", "dash_slash", "charged"]:
		var spec: Dictionary = player.call("_get_action_spec", spec_name)
		for key in required:
			if not spec.has(key):
				failures.append("%s action spec is missing '%s'." % [spec_name, key])

	if atk1.get("damage", 0) != 10 or atk1.get("echo_gain", 0) != 5:
		failures.append("atk1 should keep 10 damage and +5 echo on hit.")
	if atk3.get("damage", 0) != 25 or atk3.get("hit_pause", 0) <= atk1.get("hit_pause", 0):
		failures.append("atk3 should keep 25 damage and have stronger hit pause than atk1.")
	if atk3.get("recovery", 999.0) > 0.34:
		failures.append("atk3 recovery should feel heavy but not drag beyond 0.34s.")
	if dash_slash.get("echo_gain", 0) != 8:
		failures.append("dash_slash should grant +8 echo only on hit.")
	if charged.get("damage", 0) != 50 or charged.get("echo_gain", 0) != 20:
		failures.append("charged attack should keep 50 damage and +20 echo on hit.")
	player.free()


func _check_player_texture_fallback(failures: Array[String]) -> void:
	var player := Player2DScript.new()
	if not player.has_method("_get_action_frame_count"):
		failures.append("Player2D must provide _get_action_frame_count(action_name) for sheet/fallback playback.")
		player.free()
		return
	if not player.has_method("_get_action_texture"):
		failures.append("Player2D must provide _get_action_texture(action_name, frame_index) with fallback support.")
		player.free()
		return

	var frame_count: int = player.call("_get_action_frame_count", "idle")
	if frame_count < 1:
		failures.append("idle action should always resolve at least one frame.")
	var texture: Texture2D = player.call("_get_action_texture", "idle", 0)
	if texture == null:
		failures.append("idle action should resolve to a fallback texture when no sheet exists.")
	elif texture.get_width() != 384 or texture.get_height() != 384:
		failures.append("idle fallback texture should keep the 384x384 action-frame contract.")
	player.free()


func _check_player_jump_reaches_m1_platforms(failures: Array[String]) -> void:
	var player := Player2DScript.new()
	var max_rise := (player.jump_velocity * player.jump_velocity) / (2.0 * player.gravity)
	if max_rise < 160.0:
		failures.append("Player2D jump max rise should be at least 160px to reach M1 prototype platform steps.")
	player.free()


func _check_enemy_hit_stun(failures: Array[String]) -> void:
	var enemy := DummyEnemy2DScript.new()
	enemy.current_hp = enemy.max_hp
	enemy.on_damaged(5, Vector2.RIGHT, 100.0, null)

	var hit_stun = enemy.get("_hit_stun_timer")
	if typeof(hit_stun) != TYPE_FLOAT or float(hit_stun) <= 0.0:
		failures.append("DummyEnemy2D should enter short hit stun after non-lethal damage.")

	var recoil = enemy.get("_hit_recoil_velocity")
	if typeof(recoil) != TYPE_VECTOR2 or (recoil as Vector2).length() <= 0.0:
		failures.append("DummyEnemy2D should store restrained hit recoil after damage.")
	enemy.free()
