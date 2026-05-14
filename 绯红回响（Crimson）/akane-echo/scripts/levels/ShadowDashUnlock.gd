extends Area3D
class_name ShadowDashUnlock

# ============================================================
# F-03 影渡解锁触发器（残响兔，触摸即获得能力）
# ============================================================

@onready var sprite: Sprite3D = $Sprite

var _consumed: bool = false


func _ready() -> void:
	collision_layer = 0
	collision_mask = 2
	body_entered.connect(_on_body_entered)
	# 已经解锁过就不显示
	if PlayerProgress.has_dash:
		queue_free()


func _on_body_entered(body: Node) -> void:
	if _consumed:
		return
	if not body.is_in_group("player"):
		return
	_consumed = true
	monitoring = false

	# 记录到 PlayerProgress 并立即推给当前 Player
	PlayerProgress.has_dash = true
	if "has_dash" in body:
		body.has_dash = true

	# 视觉收起：上浮 + 渐隐
	if sprite != null:
		var tw := create_tween()
		tw.parallel().tween_property(sprite, "position:y", sprite.position.y + 1.5, 0.7)
		tw.parallel().tween_property(sprite, "modulate:a", 0.0, 0.7)

	# 独白与教学（异步）
	_play_unlock_sequence()


func _play_unlock_sequence() -> void:
	# 第一句：能力获得
	MonologueSystem.show_monologue("获得能力：影渡 — 按 Shift 试试", 3.5)
	# 等碎片消失 + 这句话演完
	await get_tree().create_timer(4.5).timeout
	# 第二句：阿茜独白
	MonologueSystem.show_monologue("「跨过去之后才发现，对面的风景，和这边其实差不多。这件事让我感到欣慰。」", 4.0)
	await get_tree().create_timer(4.5).timeout
	queue_free()
