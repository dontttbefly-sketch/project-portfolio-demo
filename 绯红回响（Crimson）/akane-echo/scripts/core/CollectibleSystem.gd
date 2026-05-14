extends Node

# ============================================================
# 残响碎片 / 收集物管理（autoload 单例）
# 跨场景持久：玩家已经拾过哪些碎片
# ============================================================

# 已收集碎片 ID 集合
var _collected: Dictionary = {}

# 拾取信号：碎片 id + 文字内容（用于浮现 UI）
signal shard_collected(shard_id: String, text: String)


func has_collected(shard_id: String) -> bool:
	return _collected.has(shard_id)


# 拾取一个碎片。重复拾取直接返回（不覆盖、不重复触发）
func collect(shard_id: String, text: String = "") -> void:
	if _collected.has(shard_id):
		return
	_collected[shard_id] = true
	shard_collected.emit(shard_id, text)


func get_collected_count() -> int:
	return _collected.size()


# 按前缀计数（如 "highlight_" 数高光碎片，"monologue_" 数已触发独白）
func count_with_prefix(prefix: String) -> int:
	var n: int = 0
	for k in _collected:
		if String(k).begins_with(prefix):
			n += 1
	return n


# 调试 / 重启
func reset() -> void:
	_collected.clear()
