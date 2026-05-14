extends StaticBody3D
class_name Boat

# ============================================================
# 渡船（终幕 Hub 出现）
# 玩家走近 [E] 上船 → EndingSystem.choose_boat() → 触发结局
# ============================================================

@onready var prompt_area: Area3D = $PromptArea
@onready var sprite: Sprite3D = $Sprite

var _player_in_range: bool = false


func _ready() -> void:
	add_to_group("boat")
	if prompt_area != null:
		prompt_area.body_entered.connect(_on_enter)
		prompt_area.body_exited.connect(_on_exit)


func _process(_delta: float) -> void:
	if _player_in_range and Input.is_action_just_pressed("interact"):
		# 二次确认 toast 提示在 EndingSystem 里
		EndingSystem.choose_boat()


func _on_enter(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	_player_in_range = true
	CombatBus.interact_prompt.emit("[E] 上船 — 渡过去")


func _on_exit(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	_player_in_range = false
	CombatBus.interact_prompt.emit("")
