extends CanvasLayer

# ============================================================
# 调试面板（F1 切换）
# 显示主角 / 假人 / 残响系统 状态。F2 / F3 用于测试受击与死亡。
# ============================================================

@onready var label: Label = $Label

var player: Player = null


func _ready() -> void:
	player = get_tree().get_first_node_in_group("player")


func _input(event: InputEvent) -> void:
	if not (event is InputEventKey):
		return
	if not event.pressed or event.echo:
		return
	match event.keycode:
		KEY_F1:
			visible = not visible
			get_viewport().set_input_as_handled()
		KEY_F2:
			if player != null:
				player.debug_take_damage(25)
				get_viewport().set_input_as_handled()
		KEY_F3:
			if player != null:
				player.debug_take_damage(99999)
				get_viewport().set_input_as_handled()
		KEY_F4:
			# 调试：解锁所有能力 + 给 100 丝缕
			if player != null:
				player.has_dash = true
				player.has_grapple = true
				player.has_silent_step = true
				PlayerProgress.has_dash = true
				PlayerProgress.has_grapple = true
				PlayerProgress.has_silent_step = true
				PlayerProgress.add_threads(100)
				CombatBus.toast.emit("[F4] 影渡 + 缠红丝 + 静音步 + 100 丝缕", 2.0)
				get_viewport().set_input_as_handled()


func _process(_delta: float) -> void:
	if not visible:
		return
	if player == null:
		player = get_tree().get_first_node_in_group("player")
		if player == null:
			label.text = "等待主角加入场景..."
			return

	var sm: PlayerStateMachine = player.state_machine
	var state_str: String = PlayerStateMachine.state_name(sm.current_state) if sm else "?"
	var pos: Vector3 = player.global_position
	var vel: Vector3 = player.velocity
	var f: Vector3 = player.facing

	# 战斗扩展信息
	var combo_str: String = "—"
	if sm and sm.current_state == PlayerStateMachine.State.ATTACK:
		var name_arr := ["风", "雪", "月"]
		if sm.is_charged_attack:
			combo_str = "蓄力斩"
		else:
			combo_str = "%d/3 %s" % [sm.combo_index + 1, name_arr[clampi(sm.combo_index, 0, 2)]]
	elif sm and sm.current_state == PlayerStateMachine.State.CHARGE:
		var pct: int = int(min(1.0, sm.charge_timer / CombatConstants.CHARGED_ATTACK_TIME) * 100)
		combo_str = "蓄力 %d%%" % pct

	var inv_str := "—"
	if player.hurt_invincible:
		inv_str = "受击无敌"
	elif player.move_invincible:
		inv_str = "动作无敌"

	# 假人 HP（取第一个）
	var dummy = get_tree().get_first_node_in_group("test_dummy")
	var dummy_str := "(无假人)"
	if dummy != null:
		if dummy._is_dead:
			var rt: float = CombatConstants.DUMMY_RESPAWN_TIME - dummy._respawn_timer
			dummy_str = "灰烬中... %.1fs 后重生" % max(0.0, rt)
		else:
			dummy_str = "%d / %d" % [dummy.current_hp, dummy.max_hp]

	# === M3 残响系统 ===
	var echo_str := "%d / %d" % [EchoSystem.get_echo(), EchoSystem.max_echo]
	if EchoSystem.is_full():
		echo_str += "  ★满"

	var burst_str := "—"
	if sm and sm.is_echo_burst_active():
		burst_str = "残响态 剩余 %.1fs" % sm._echo_burst_timer

	var parry_str := "—"
	if sm and sm._parry_window_active:
		parry_str = "★ 弹反窗口 %.2fs" % sm._parry_window_timer
	elif player.parry_cooldown_remaining > 0.0:
		parry_str = "冷却 %.1fs" % player.parry_cooldown_remaining
	elif player.has_unlocked_parry:
		parry_str = "已解锁"
	else:
		parry_str = "未解锁"

	# M5 信息
	var abilities := []
	if player.has_dash: abilities.append("影渡")
	if player.has_grapple: abilities.append("缠红丝")
	if player.has_silent_step: abilities.append("静音步")
	if player.has_unlocked_parry: abilities.append("凝时")
	if sm and sm.is_silent_active():
		abilities.append("[隐身中]")
	var ab_str: String = ", ".join(abilities) if abilities.size() > 0 else "—"
	var threads_str := "%d" % PlayerProgress.crimson_threads
	var weapon_str := "Lv%d" % PlayerProgress.weapon_level

	label.text = "[F1 切换 / F2 伤 / F3 秒杀 / F4 全解锁]\n状态:    %s\n动作:    %s\n位置:    (%.2f, %.2f, %.2f)\n速度:    %.2f m/s\n朝向:    (%.2f, %.2f, %.2f)\n无敌:    %s\nHP:      %d / %d\n残响:    %s\n残响态:  %s\n弹反:    %s\n能力:    %s\n丝缕:    %s\n武器:    %s\n影 CD:   %.2fs / 冲 CD: %.2fs / 钩 CD: %.2fs\n假人1:   %s" % [
		state_str,
		combo_str,
		pos.x, pos.y, pos.z,
		vel.length(),
		f.x, f.y, f.z,
		inv_str,
		player.current_hp, player.max_hp,
		echo_str,
		burst_str,
		parry_str,
		ab_str,
		threads_str,
		weapon_str,
		player.dash_cooldown_remaining,
		player.dash_attack_cooldown_remaining,
		player.grapple_cooldown_remaining,
		dummy_str,
	]
