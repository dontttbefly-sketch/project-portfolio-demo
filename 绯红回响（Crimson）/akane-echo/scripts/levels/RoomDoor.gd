extends Area3D
class_name RoomDoor

# ============================================================
# 房间门（Area3D）：玩家踏入即触发场景切换
# ============================================================

@export var target_scene: String = ""    ## 目标房间 .tscn 路径
@export var target_spawn_id: String = "default"  ## 在目标房间里 SpawnPoint.spawn_id

# 防止刚切到新房间时玩家立刻又触发回去（短暂忽略）
var _ignore_until_ms: int = 0


func _ready() -> void:
	body_entered.connect(_on_body_entered)
	collision_layer = 0
	collision_mask = 2  ## 只检测 Player（layer 2）
	# 监听 SceneManager 的房间切换事件，刚装入时短暂忽略
	if SceneManager.has_signal("room_changed"):
		SceneManager.room_changed.connect(_on_room_changed)


func _on_room_changed(_path: String, _spawn_id: String) -> void:
	_ignore_until_ms = Time.get_ticks_msec() + 400  ## 0.4s 内不响应


func _on_body_entered(body: Node) -> void:
	if Time.get_ticks_msec() < _ignore_until_ms:
		return
	if not body.is_in_group("player"):
		return
	if target_scene.is_empty():
		return
	# M7v2 终幕：玩家在 Hub 终幕状态下走任意门 = 不上船 = 结局 B
	if PlayerProgress.post_boss4_state and not PlayerProgress.ending_chosen:
		EndingSystem.choose_leave()
		return
	SceneManager.change_room(target_scene, target_spawn_id)
