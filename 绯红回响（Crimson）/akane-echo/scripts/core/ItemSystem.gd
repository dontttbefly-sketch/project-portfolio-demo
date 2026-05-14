extends Node

# ============================================================
# 道具系统（autoload 单例）
# 装备 4 个槽位 + 触发主动道具 + 被动道具效果检查
# 12 件道具按策划案 §5，本 M5 完整实装 4 件，其他 8 件作为 stub
# ============================================================

# id → ItemResource
var _registry: Dictionary = {}

# id → 当前充能（残响碑休整后回满）
var _charges: Dictionary = {}

signal item_used(item_id: String)
signal charges_changed(item_id: String, charges: int, max_charges: int)


func _ready() -> void:
	_register_all()


# === 装备 / 充能 API ===
func equip(slot: int, item_id: String) -> void:
	if slot < 0 or slot >= PlayerProgress.equipped_items.size():
		return
	PlayerProgress.equipped_items[slot] = item_id


func get_equipped(slot: int) -> String:
	if slot < 0 or slot >= PlayerProgress.equipped_items.size():
		return ""
	return PlayerProgress.equipped_items[slot]


func get_resource(item_id: String) -> ItemResource:
	if _registry.has(item_id):
		return _registry[item_id]
	return null


func get_charges(item_id: String) -> int:
	return _charges.get(item_id, 0)


func add_charges(item_id: String, n: int) -> void:
	var res := get_resource(item_id)
	if res == null:
		return
	var cur: int = _charges.get(item_id, 0)
	cur = clampi(cur + n, 0, res.max_charges)
	_charges[item_id] = cur
	charges_changed.emit(item_id, cur, res.max_charges)


# 残响碑休整：所有主动道具充能回满
func refill_all_active_charges() -> void:
	for id in _registry:
		var res: ItemResource = _registry[id]
		if res != null and res.item_type == ItemResource.ItemType.ACTIVE:
			_charges[id] = res.max_charges
			charges_changed.emit(id, res.max_charges, res.max_charges)


# === 主动道具触发 ===
func use_active_slot(slot: int) -> void:
	var item_id := get_equipped(slot)
	if item_id.is_empty():
		return
	var res := get_resource(item_id)
	if res == null:
		return
	if res.item_type != ItemResource.ItemType.ACTIVE:
		return
	var charges: int = _charges.get(item_id, 0)
	if charges <= 0:
		return
	if not _execute_effect(res.use_effect_id):
		return
	_charges[item_id] = charges - 1
	charges_changed.emit(item_id, _charges[item_id], res.max_charges)
	item_used.emit(item_id)


# === 效果分发（M5 实装 4 件，其余打印日志做 stub）===
func _execute_effect(effect_id: String) -> bool:
	var player: Node = get_tree().get_first_node_in_group("player")
	match effect_id:
		"heal_40":
			# 红茶：回 40 HP
			if player == null:
				return false
			var heal: int = mini(player.max_hp, player.current_hp + 40)
			var actual: int = heal - player.current_hp
			if actual <= 0:
				return false
			player.current_hp = heal
			PlayerProgress.set_hp(heal)
			return true
		"echo_50":
			# 樱酒：回 50 残响
			if EchoSystem.is_full():
				return false
			EchoSystem.add_echo(50)
			return true
		"echo_30":
			# 残响碎瓷：立即 +30 残响
			EchoSystem.add_echo(30)
			return true
		"talisman_debuff":
			# 封符：投出 → 命中破甲；M5 简化版：对最近敌人（5m 内）打个标记
			if player == null:
				return false
			var nearest := _find_nearest_enemy(player.global_position, 5.0)
			if nearest == null:
				return false
			# 简化：直接造一次 0 伤害带"破甲"标记。完整版 M6 接 status effect 系统
			print("[Item] 封符标记敌人 → ", nearest.name, "（M5 简化：未实现破甲，仅打日志）")
			return true
		# === 以下为 stub（M5 占位）===
		"corner_print", "fog_seal", "ground_thorns":
			print("[Item] 主动道具 effect=", effect_id, " 已使用（M5 stub，效果未实装）")
			return true
		_:
			print("[Item] 未知 effect_id：", effect_id)
			return false


func _find_nearest_enemy(from: Vector3, max_dist: float) -> Node:
	var enemies := get_tree().get_nodes_in_group("enemy")
	var best: Node = null
	var best_d: float = max_dist
	for e in enemies:
		if not is_instance_valid(e):
			continue
		var d: float = (e.global_position - from).length()
		if d <= best_d:
			best_d = d
			best = e
	return best


# ============================================================
# 被动道具查询：策划案 §5.3
# ============================================================
func has_passive(item_id: String) -> bool:
	for slot in PlayerProgress.equipped_items:
		if slot == item_id:
			return true
	return false


# 风铃护符：受伤时 30% 概率不扣残响（CombatBus.player_died 不用，自定义 hook）
func roll_wind_chime_save() -> bool:
	if not has_passive("wind_chime"):
		return false
	return randf() < 0.3


# ============================================================
# 注册：12 件道具
# ============================================================
func _register_all() -> void:
	# 主动 ×7
	_register("red_tea", "红茶", "饮一口便身轻气爽。回 40 HP。", ItemResource.ItemType.ACTIVE, 3, "heal_40", Color(0.78, 0.06, 0.18))
	_register("sake", "樱酒", "微醺中残响更清晰。回 50 残响值。", ItemResource.ItemType.ACTIVE, 2, "echo_50", Color(1.0, 0.4, 0.5))
	_register("shard_dust", "残响碎瓷", "敲碎后能听见昔日的回响。立刻 +30 残响。", ItemResource.ItemType.ACTIVE, 1, "echo_30", Color(0.85, 0.4, 0.55))
	_register("talisman_seal", "封符", "投出 → 命中破甲 5s。", ItemResource.ItemType.ACTIVE, 2, "talisman_debuff", Color(0.95, 0.92, 0.85))
	_register("corner_print", "咒纸", "直线穿透，对褪色敌人额外伤害。", ItemResource.ItemType.ACTIVE, 2, "corner_print", Color(0.9, 0.85, 0.8))
	_register("ground_thorns", "地刺符", "脚下放置，5s 内踩到伤害。", ItemResource.ItemType.ACTIVE, 2, "ground_thorns", Color(0.7, 0.7, 0.8))
	_register("fog_seal", "迷雾符", "4m 烟雾，敌人在内看不见。", ItemResource.ItemType.ACTIVE, 1, "fog_seal", Color(0.85, 0.9, 1.0))

	# 被动 ×5
	_register("wind_chime", "风铃护符", "受伤时 30% 概率不扣残响。", ItemResource.ItemType.PASSIVE, 0, "", Color(1, 0.95, 0.7))
	_register("red_jade", "朱玉", "残响态时间 +2 秒。", ItemResource.ItemType.PASSIVE, 0, "", Color(0.85, 0.1, 0.2))
	_register("old_pocket_watch", "旧怀表", "弹反窗口 +0.1 秒。", ItemResource.ItemType.PASSIVE, 0, "", Color(0.7, 0.65, 0.5))
	_register("binding_cloth", "缠布", "死亡时丢失丝缕减少 50%。", ItemResource.ItemType.PASSIVE, 0, "", Color(0.95, 0.95, 0.95))
	_register("purple_chime", "紫阳铃", "靠近隐藏物时铃响。", ItemResource.ItemType.PASSIVE, 0, "", Color(0.6, 0.3, 0.7))


func _register(id: String, name: String, desc: String, t: int, charges: int, effect: String, color: Color) -> void:
	var r := ItemResource.new()
	r.id = id
	r.display_name = name
	r.description = desc
	r.item_type = t
	r.max_charges = charges
	r.use_effect_id = effect
	r.icon_color = color
	_registry[id] = r
	_charges[id] = charges
