extends StaticBody3D
class_name EchoStele

# ============================================================
# 残响碑（存档点）
# 玩家走近 → HUD 提示 [E] 休息
# 按 E → 休整流程：存档 + 满血 + 残响清零 + 充能回满 + 敌人重生
# ============================================================

@export var stele_id: String = "stele_default"
@export var spawn_id_for_respawn: String = "default"  ## 死亡复活时落到本房此 spawn

@onready var prompt_area: Area3D = $PromptArea

var _player_in_range: bool = false
var _resting: bool = false


func _ready() -> void:
	add_to_group("echo_stele")
	if prompt_area != null:
		prompt_area.body_entered.connect(_on_player_entered)
		prompt_area.body_exited.connect(_on_player_exited)


func _process(_delta: float) -> void:
	if _player_in_range and Input.is_action_just_pressed("interact") and not _resting:
		_rest()


func _on_player_entered(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	_player_in_range = true
	CombatBus.interact_prompt.emit("[E] 在残响碑旁休息")


func _on_player_exited(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	_player_in_range = false
	CombatBus.interact_prompt.emit("")


func _rest() -> void:
	_resting = true
	CombatBus.interact_prompt.emit("")

	# 黑屏渐暗（SceneManager 已有 fade overlay；用 toast 提示替代复杂 UI）
	CombatBus.toast.emit("休整中...", 1.0)

	await get_tree().create_timer(0.5).timeout

	# 1. 设为复活点
	var room_path := _current_scene_path()
	PlayerProgress.last_stele_room = room_path
	PlayerProgress.last_stele_spawn = spawn_id_for_respawn

	# 2. 满血
	PlayerProgress.set_hp(PlayerProgress.max_hp)
	var p := get_tree().get_first_node_in_group("player")
	if p != null and "current_hp" in p:
		p.current_hp = PlayerProgress.max_hp

	# 3. 残响清零（策划案：休整鼓励主动战斗积累）
	EchoSystem.reset()

	# 4. 道具充能回满
	ItemSystem.refill_all_active_charges()

	# 5. 敌人重生：当前房间内所有 enemy 节点 → reset 状态（简化：通知重生）
	_respawn_enemies_in_room()

	# 6. 自动存档
	SaveSystem.save_game()

	await get_tree().create_timer(0.4).timeout

	CombatBus.toast.emit("已存档 / 满血 / 装备回充", 1.5)
	_resting = false


# 当前所在的房间场景路径（用 SceneManager._current_room）
func _current_scene_path() -> String:
	var room := SceneManager._current_room
	if room == null:
		return PlayerProgress.last_stele_room
	# scene_file_path 是 PackedScene 实例化后的属性
	return room.scene_file_path if room.scene_file_path != "" else PlayerProgress.last_stele_room


# 简化的"敌人重生"：让本房间内的 EnemyBase 满血 + 回到初始位置
# 由于 M4 敌人没记录 spawn 位置，这里采用"销毁并重新加载房间"的偷懒做法
func _respawn_enemies_in_room() -> void:
	# M5 简化：不真做重生（怕重新加载场景导致玩家也被传送）
	# 改为复活所有死亡假人；M6 完整实现敌人 spawn 系统
	for d in get_tree().get_nodes_in_group("test_dummy"):
		if d.has_method("_respawn") and "_is_dead" in d and d._is_dead:
			d._respawn()
