extends CanvasLayer

# ============================================================
# 死亡黑屏（M5 重写）：
# 旧逻辑直接回主菜单。新逻辑：回到上一个残响碑 + 50% 丝缕掉落 + 在死亡处生成残响痕
# 由 Player.die_visual() 实例化
# ============================================================

@onready var fade: ColorRect = $Fade


func _ready() -> void:
	Engine.time_scale = 1.0
	fade.color = Color(0, 0, 0, 0)

	# 1. 记录死亡位置 + 丝缕掉落
	var player := get_tree().get_first_node_in_group("player")
	if player != null:
		# 缠布被动：丢失减半
		var drop_ratio: float = 0.25 if ItemSystem.has_passive("binding_cloth") else 0.5
		var lose: int = int(round(PlayerProgress.crimson_threads * drop_ratio))
		PlayerProgress.dropped_threads = lose
		PlayerProgress.death_room = SceneManager._current_room.scene_file_path if SceneManager._current_room != null else ""
		PlayerProgress.death_position = player.global_position
		PlayerProgress.add_threads(-lose)

	# 2. 渐黑
	var t := create_tween()
	t.tween_property(fade, "color:a", 1.0, 1.2)
	await t.finished

	# 3. 复活
	await get_tree().create_timer(0.5).timeout
	_respawn_at_stele()


func _respawn_at_stele() -> void:
	# 满血
	PlayerProgress.set_hp(PlayerProgress.max_hp)
	var p := get_tree().get_first_node_in_group("player")
	if p != null:
		if "current_hp" in p:
			p.current_hp = PlayerProgress.max_hp
		# 重置 Sprite 旋转（die_visual 把它转了 90°）
		if "sprite" in p and p.sprite != null:
			p.sprite.rotation = Vector3.ZERO
			p.sprite.modulate = Color(1, 1, 1, 1)
		# 重置状态机回 IDLE
		if "state_machine" in p and p.state_machine != null:
			p.state_machine.change_state(PlayerStateMachine.State.IDLE)
		p.hurt_invincible = false
		p.move_invincible = false

	# 切场到上一个残响碑所在房间
	var room := PlayerProgress.last_stele_room
	var spawn := PlayerProgress.last_stele_spawn
	if room.is_empty():
		room = "res://scenes/levels/hub/Hub.tscn"
		spawn = "default"

	# 用 SceneManager 切回去（它本身会做淡入淡出，但这里我们已经全黑，等它再淡）
	SceneManager.change_room(room, spawn)

	# 在 SceneManager 切完场后清理本 Overlay（自身的 fade 也淡掉）
	await get_tree().create_timer(0.4).timeout
	var t := create_tween()
	t.tween_property(fade, "color:a", 0.0, 0.4)
	await t.finished
	queue_free()
