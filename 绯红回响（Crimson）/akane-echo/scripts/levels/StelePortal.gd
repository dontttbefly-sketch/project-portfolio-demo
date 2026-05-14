extends StaticBody3D
class_name StelePortal

# ============================================================
# 残响石阵传送门
# 玩家走近 [E] 快速传送到目标房间
# 可选：required_boss 限制（必须击败该 Boss 才能用）
# ============================================================

@export var target_scene: String = ""
@export var target_spawn_id: String = "default"
@export var portal_name: String = "未知之地"   ## 显示给玩家
@export var required_boss: String = ""         ## 空 = 无限制；非空 = 必须 killed_bosses 含此 ID

@onready var prompt_area: Area3D = $PromptArea
@onready var sprite: Sprite3D = $Sprite

var _player_in_range: bool = false


func _ready() -> void:
	add_to_group("stele_portal")
	if prompt_area != null:
		prompt_area.body_entered.connect(_on_enter)
		prompt_area.body_exited.connect(_on_exit)
	# 未解锁的传送门半透明
	if not required_boss.is_empty() and not PlayerProgress.killed_bosses.has(required_boss):
		if sprite != null:
			sprite.modulate.a = 0.3


func _process(_delta: float) -> void:
	if not _player_in_range:
		return
	if Input.is_action_just_pressed("interact"):
		_try_teleport()


func _on_enter(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	_player_in_range = true
	if not _is_unlocked():
		CombatBus.interact_prompt.emit("[%s] 尚未解锁（击败对应 Boss 后开启）" % portal_name)
	else:
		CombatBus.interact_prompt.emit("[E] 传送至 %s" % portal_name)


func _on_exit(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	_player_in_range = false
	CombatBus.interact_prompt.emit("")


func _is_unlocked() -> bool:
	if required_boss.is_empty():
		return true
	return PlayerProgress.killed_bosses.has(required_boss)


func _try_teleport() -> void:
	if not _is_unlocked():
		CombatBus.toast.emit("尚未解锁", 1.5)
		return
	if target_scene.is_empty():
		return
	SceneManager.change_room(target_scene, target_spawn_id)
