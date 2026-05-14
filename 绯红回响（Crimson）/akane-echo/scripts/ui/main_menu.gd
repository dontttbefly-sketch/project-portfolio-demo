extends Control


func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	# 有存档时按钮文字改成 "继续"
	var btn := get_node_or_null("Buttons/StartButton") as Button
	if btn != null:
		btn.text = "开始 M1 原型"
		btn.grab_focus()
	# NG+ 按钮：仅在通关至少一次结局后显示
	var ng_btn := get_node_or_null("Buttons/NewGamePlusButton") as Button
	if ng_btn != null:
		ng_btn.visible = EndingSystem.has_unlocked_ng_plus()


func _on_start_pressed() -> void:
	print("[MainMenu] 启动 v2 M1 原型")
	PlayerProgress.full_reset()
	var err := get_tree().change_scene_to_file("res://scenes/v2/M1Prototype.tscn")
	if err != OK:
		push_error("[MainMenu] 切换到 M1Prototype.tscn 失败: %d" % err)


func _on_ng_plus_pressed() -> void:
	# 二周目：保留能力 + weapon_level + seen_endings + ng_plus_count，
	# 但 HP / 残响重置 + 敌人 ×1.5 倍率
	PlayerProgress.ng_plus_count += 1
	PlayerProgress.enemy_difficulty_mult = 1.0 + 0.5 * PlayerProgress.ng_plus_count
	PlayerProgress.hp = PlayerProgress.max_hp
	PlayerProgress.crimson_threads = 0
	PlayerProgress.killed_bosses.clear()
	PlayerProgress.last_stele_room = "res://scenes/levels/hub/Hub.tscn"
	PlayerProgress.last_stele_spawn = "default"
	PlayerProgress.next_spawn_id = "default"
	PlayerProgress.death_room = ""
	PlayerProgress.dropped_threads = 0
	# 残响累积清空
	EchoSystem.reset()
	# 收集物清空（让玩家重新拾取碎片）
	CollectibleSystem.reset()
	SaveSystem.save_game()
	get_tree().change_scene_to_file("res://scenes/main/Game.tscn")


func _on_settings_pressed() -> void:
	# TODO(M0+): 设置菜单
	print("Settings — TODO")


func _on_quit_pressed() -> void:
	get_tree().quit()
