extends Area3D
class_name EchoTrace

# ============================================================
# 残响痕（死亡掉落，回收点）
# 由 SceneManager 在玩家进入死亡房间时自动生成
# ============================================================

var dropped_amount: int = 0


func _ready() -> void:
	add_to_group("echo_trace")
	body_entered.connect(_on_body_entered)
	collision_layer = 0
	collision_mask = 2


func setup(amount: int) -> void:
	dropped_amount = amount


func _on_body_entered(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	# 把丝缕还给玩家
	if dropped_amount > 0:
		PlayerProgress.add_threads(dropped_amount)
		CombatBus.toast.emit("拾回 %d 绯红丝缕" % dropped_amount, 1.8)
	# 清空死亡记录
	PlayerProgress.dropped_threads = 0
	PlayerProgress.death_room = ""
	queue_free()
