extends StaticBody3D
class_name YongNPC

# 咏 NPC：走近 [E] 触发对白库随机抽一句

@onready var prompt_area: Area3D = $PromptArea

var _player_in_range: bool = false


func _ready() -> void:
	add_to_group("yong_npc")
	if prompt_area != null:
		prompt_area.body_entered.connect(_on_enter)
		prompt_area.body_exited.connect(_on_exit)
	# NG+ 视觉差异：sprite 染淡红（"灯笼是淡红色的"，spec §6）
	if PlayerProgress.ng_plus_count > 0:
		var sprite := get_node_or_null("Sprite") as Sprite3D
		if sprite != null:
			sprite.modulate = Color(1.3, 0.78, 0.85, 1)


func _process(_delta: float) -> void:
	if _player_in_range and Input.is_action_just_pressed("interact"):
		MonologueSystem.show_monologue(YongDialogue.pick_line(), 4.0)


func _on_enter(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	_player_in_range = true
	CombatBus.interact_prompt.emit("[E] 与咏说话")


func _on_exit(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	_player_in_range = false
	CombatBus.interact_prompt.emit("")
