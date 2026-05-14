extends Node

# ============================================================
# 玩家长期进度（autoload 单例）
# 跨场景持久 + JSON 存档源
# ============================================================

# === 数值 ===
var hp: int = 100
var max_hp: int = 100

# === 已解锁能力 ===
var has_dash: bool = false           ## F-03 影渡
var has_grapple: bool = false        ## Boss 1 后获得缠红丝
var has_silent_step: bool = false    ## Boss 2 后获得静音步
var has_unlocked_parry: bool = true  ## 测试期默认；正式 Boss 4 后获得

# 影渡升级（Boss 3 后距离 ×1.5）
var dash_distance_multiplier: float = 1.0

# 二周目（M7）
var ng_plus_count: int = 0           ## 0 = 一周目，1+ = NG+
var enemy_difficulty_mult: float = 1.0  ## NG+ 敌人 HP/伤害倍率

# 结局相关（M7）
var seen_endings: Array[String] = []   ## "A", "B", "C"
var post_boss4_state: bool = false     ## Boss 4 击败后进入终幕（Hub 切换为终幕模式）
var ending_chosen: bool = false        ## 终幕中已做出选择（防重复触发）

# === 货币 ===
var crimson_threads: int = 0  ## 绯红丝缕：丝缕掉落 / 升级花费

# === 武器升级（1-5）===
var weapon_level: int = 1

# === 已击败的 Boss / 精英 ID ===
var killed_bosses: Array[String] = []

# === 上次坐过的残响碑：复活点 ===
var last_stele_room: String = "res://scenes/levels/hub/Hub.tscn"
var last_stele_spawn: String = "default"

# === 已装备道具（4 槽位）===
var equipped_items: Array[String] = ["", "", "", ""]
# === 库存：{item_id: count} ===
var item_inventory: Dictionary = {}

# === 进入下一个房间时玩家落点 id ===
var next_spawn_id: String = "default"

# === 死亡掉落（M5）===
var death_room: String = ""              ## 死亡发生的房间路径（残响痕生成地点）
var death_position: Vector3 = Vector3.ZERO
var dropped_threads: int = 0             ## 等待拾回的丝缕数


signal hp_changed(old_value: int, new_value: int, max_value: int)
signal threads_changed(old: int, new_v: int)
signal weapon_level_changed(level: int)


func set_hp(v: int) -> void:
	var old := hp
	hp = clampi(v, 0, max_hp)
	if hp != old:
		hp_changed.emit(old, hp, max_hp)


func add_threads(amount: int) -> void:
	var old := crimson_threads
	crimson_threads = max(0, crimson_threads + amount)
	threads_changed.emit(old, crimson_threads)


func spend_threads(amount: int) -> bool:
	if crimson_threads < amount:
		return false
	add_threads(-amount)
	return true


# 把状态写到 Player 节点（房间切换时调用）
func push_to_player(player: Node) -> void:
	if player == null:
		return
	if "current_hp" in player:
		player.current_hp = hp
	if "max_hp" in player:
		player.max_hp = max_hp
	if "has_dash" in player:
		player.has_dash = has_dash
	if "has_grapple" in player:
		player.has_grapple = has_grapple
	if "has_silent_step" in player:
		player.has_silent_step = has_silent_step
	if "has_unlocked_parry" in player:
		player.has_unlocked_parry = has_unlocked_parry


# 从 Player 节点拉状态
func pull_from_player(player: Node) -> void:
	if player == null:
		return
	if "current_hp" in player:
		hp = player.current_hp
	if "has_dash" in player:
		has_dash = player.has_dash
	if "has_grapple" in player:
		has_grapple = player.has_grapple
	if "has_silent_step" in player:
		has_silent_step = player.has_silent_step


# 完全重置（新游戏 / 死亡读档）
func reset_run() -> void:
	hp = max_hp


# 全清（点"开始"重新游戏时）
func full_reset() -> void:
	hp = 100
	max_hp = 100
	has_dash = false
	has_grapple = false
	has_silent_step = false
	has_unlocked_parry = true
	dash_distance_multiplier = 1.0
	# 注意：full_reset 不清 ng_plus_count / seen_endings（这两项跨周目持久）
	crimson_threads = 0
	weapon_level = 1
	killed_bosses.clear()
	last_stele_room = "res://scenes/levels/hub/Hub.tscn"
	last_stele_spawn = "default"
	equipped_items = ["", "", "", ""]
	item_inventory.clear()
	next_spawn_id = "default"
	post_boss4_state = false
	ending_chosen = false
