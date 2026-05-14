extends Area3D
class_name AreaMonologueTrigger

# ============================================================
# 阿茜独白触发器（玩家首次踏入触发一次）
# 用 CollectibleSystem 记录"已触发过"避免重复
# ============================================================

@export var trigger_id: String = ""           ## 全局唯一
@export_multiline var monologue_text: String = ""
@export var hold_seconds: float = 3.0
@export var auto_free_after: bool = true       ## 触发后自删（少占内存）


func _ready() -> void:
	collision_layer = 0
	collision_mask = 2
	body_entered.connect(_on_enter)
	# 已触发过的不再监听
	if not trigger_id.is_empty() and CollectibleSystem.has_collected("monologue_" + trigger_id):
		queue_free()


func _on_enter(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	if trigger_id.is_empty() or monologue_text.is_empty():
		return
	# 标记已触发
	CollectibleSystem.collect("monologue_" + trigger_id, "")  ## 不传文本，避免被独白系统再放一遍
	MonologueSystem.show_monologue(monologue_text, hold_seconds)
	monitoring = false
	if auto_free_after:
		queue_free()
