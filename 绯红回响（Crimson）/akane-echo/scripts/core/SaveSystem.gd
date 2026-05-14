extends Node

# ============================================================
# 存档系统（autoload 单例）
# JSON 写到 user://savegame.json，方便调试看
# ============================================================

const SAVE_PATH: String = "user://savegame.json"

signal saved
signal loaded


func has_save() -> bool:
	return FileAccess.file_exists(SAVE_PATH)


# 把 PlayerProgress / EchoSystem / CollectibleSystem 状态序列化
func save_game() -> void:
	var data := {
		"version": 1,
		"hp": PlayerProgress.hp,
		"max_hp": PlayerProgress.max_hp,
		"max_echo": EchoSystem.max_echo,
		"has_dash": PlayerProgress.has_dash,
		"has_grapple": PlayerProgress.has_grapple,
		"has_unlocked_parry": PlayerProgress.has_unlocked_parry,
		"crimson_threads": PlayerProgress.crimson_threads,
		"weapon_level": PlayerProgress.weapon_level,
		"killed_bosses": PlayerProgress.killed_bosses,
		"last_stele_room": PlayerProgress.last_stele_room,
		"last_stele_spawn": PlayerProgress.last_stele_spawn,
		"equipped_items": PlayerProgress.equipped_items,
		"item_inventory": PlayerProgress.item_inventory,
		"collected_shards": _serialize_dict(_get_collected()),
		"ng_plus_count": PlayerProgress.ng_plus_count,
		"enemy_difficulty_mult": PlayerProgress.enemy_difficulty_mult,
		"seen_endings": PlayerProgress.seen_endings,
		"post_boss4_state": PlayerProgress.post_boss4_state,
		"ending_chosen": PlayerProgress.ending_chosen,
	}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		push_error("SaveSystem: 无法打开存档文件")
		return
	f.store_string(JSON.stringify(data, "  "))
	f.close()
	saved.emit()
	print("[Save] 已写入 ", SAVE_PATH)


func load_game() -> bool:
	if not has_save():
		return false
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		return false
	var raw: String = f.get_as_text()
	f.close()
	var json := JSON.new()
	var err := json.parse(raw)
	if err != OK:
		push_error("SaveSystem: 解析存档失败 → " + json.get_error_message())
		return false
	var d: Dictionary = json.data
	PlayerProgress.hp = int(d.get("hp", 100))
	PlayerProgress.max_hp = int(d.get("max_hp", 100))
	EchoSystem.max_echo = int(d.get("max_echo", EchoSystem.MAX_ECHO_BASE))
	PlayerProgress.has_dash = bool(d.get("has_dash", false))
	PlayerProgress.has_grapple = bool(d.get("has_grapple", false))
	PlayerProgress.has_unlocked_parry = bool(d.get("has_unlocked_parry", true))
	PlayerProgress.crimson_threads = int(d.get("crimson_threads", 0))
	PlayerProgress.weapon_level = int(d.get("weapon_level", 1))
	PlayerProgress.killed_bosses = _to_string_array(d.get("killed_bosses", []))
	PlayerProgress.last_stele_room = String(d.get("last_stele_room", "res://scenes/levels/hub/Hub.tscn"))
	PlayerProgress.last_stele_spawn = String(d.get("last_stele_spawn", "default"))
	PlayerProgress.equipped_items = _to_string_array(d.get("equipped_items", ["", "", "", ""]))
	while PlayerProgress.equipped_items.size() < 4:
		PlayerProgress.equipped_items.append("")
	PlayerProgress.item_inventory = d.get("item_inventory", {})
	_restore_collected(d.get("collected_shards", {}))
	PlayerProgress.ng_plus_count = int(d.get("ng_plus_count", 0))
	PlayerProgress.enemy_difficulty_mult = float(d.get("enemy_difficulty_mult", 1.0))
	PlayerProgress.seen_endings = _to_string_array(d.get("seen_endings", []))
	PlayerProgress.post_boss4_state = bool(d.get("post_boss4_state", false))
	PlayerProgress.ending_chosen = bool(d.get("ending_chosen", false))
	loaded.emit()
	print("[Save] 已读取 ", SAVE_PATH)
	return true


func clear_save() -> void:
	if has_save():
		DirAccess.remove_absolute(ProjectSettings.globalize_path(SAVE_PATH))


# ============================================================
# 辅助：CollectibleSystem 内部 _collected 字典的访问
# ============================================================
func _get_collected() -> Dictionary:
	# CollectibleSystem 用 var _collected 存。这里直接借接口枚举。
	# 简化：通过遍历 has_collected() 不可行；用属性反射
	if "_collected" in CollectibleSystem:
		return CollectibleSystem._collected.duplicate()
	return {}


func _restore_collected(raw) -> void:
	if not raw is Dictionary:
		return
	if "_collected" in CollectibleSystem:
		CollectibleSystem._collected = raw.duplicate()


func _serialize_dict(d: Dictionary) -> Dictionary:
	# JSON 不喜欢非 string 键，但 shard_id 已经是 string，直接复制即可
	return d.duplicate()


func _to_string_array(arr) -> Array[String]:
	var out: Array[String] = []
	if arr is Array:
		for v in arr:
			out.append(String(v))
	return out
