extends Area3D
class_name EchoShard

# ============================================================
# 残响碎片（拾取物）
# 触发后通过 CollectibleSystem 记录 + MonologueSystem 浮现文字
# ============================================================

@export var shard_id: String = ""
@export_multiline var fragment_text: String = ""

@onready var sprite: Sprite3D = $Sprite


func _ready() -> void:
	add_to_group("echo_shard")
	collision_layer = 0
	collision_mask = 2  ## 检测 Player
	body_entered.connect(_on_body_entered)
	# 已收集过的碎片不再显示
	if shard_id != "" and CollectibleSystem.has_collected(shard_id):
		queue_free()


func _on_body_entered(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	if shard_id.is_empty():
		queue_free()
		return
	# 收起 sprite，避免视觉残留
	if sprite != null:
		sprite.visible = false
	monitoring = false
	CollectibleSystem.collect(shard_id, fragment_text)
	# 浮起 + 渐隐效果
	var tw := create_tween()
	if sprite != null:
		tw.parallel().tween_property(sprite, "position:y", sprite.position.y + 1.0, 0.5)
		tw.parallel().tween_property(sprite, "modulate:a", 0.0, 0.5)
	tw.tween_callback(queue_free)
