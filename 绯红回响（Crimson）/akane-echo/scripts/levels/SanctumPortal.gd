extends StaticBody3D
class_name SanctumPortal

# ============================================================
# 隐藏祭坛入口（M7）
# 需要 4/4 高光残响碎片才能解锁
# 解锁前完全不可见 + 不响应
# ============================================================

const REQUIRED_HIGHLIGHTS: int = 4
const TARGET_SCENE: String = "res://scenes/levels/area_secret/E01_RiverBottom.tscn"
const TARGET_SPAWN: String = "from_hub"

@onready var prompt_area: Area3D = $PromptArea
@onready var sprite: Sprite3D = $Sprite

var _player_in_range: bool = false


func _ready() -> void:
	add_to_group("sanctum_portal")
	if prompt_area != null:
		prompt_area.body_entered.connect(_on_enter)
		prompt_area.body_exited.connect(_on_exit)
	# 实时监听高光碎片拾取（修复"必须离开 Hub 再回来才出现"的 bug）
	CollectibleSystem.shard_collected.connect(_on_shard_collected)
	_refresh_visibility()


func _on_shard_collected(shard_id: String, _text: String) -> void:
	if not String(shard_id).begins_with("highlight_"):
		return
	var was_unlocked: bool = _is_unlocked() and (sprite != null and sprite.visible)
	_refresh_visibility()
	# 第 4 块刚集齐时给玩家显著反馈
	if not was_unlocked and _is_unlocked():
		CombatBus.toast.emit("✦ 残响共鸣 — 隐藏祭坛已现", 4.0)


func _refresh_visibility() -> void:
	var unlocked: bool = _is_unlocked()
	if sprite != null:
		sprite.visible = unlocked
	if prompt_area != null:
		prompt_area.monitoring = unlocked


func _is_unlocked() -> bool:
	return CollectibleSystem.count_with_prefix("highlight_") >= REQUIRED_HIGHLIGHTS


func _process(_delta: float) -> void:
	if not _player_in_range:
		return
	if Input.is_action_just_pressed("interact"):
		_try_enter()


func _on_enter(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	if not _is_unlocked():
		return
	_player_in_range = true
	CombatBus.interact_prompt.emit("[E] 进入最初之地")


func _on_exit(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	_player_in_range = false
	CombatBus.interact_prompt.emit("")


func _try_enter() -> void:
	if not _is_unlocked():
		return
	SceneManager.change_room(TARGET_SCENE, TARGET_SPAWN)
