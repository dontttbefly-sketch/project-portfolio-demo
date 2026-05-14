extends CanvasLayer

# ============================================================
# 主 HUD（M5）
# - HP 细线（左上，受损时绯红跳动）
# - 绯红丝缕（HP 下方）
# - 4 道具槽位（右上，空槽暗灰；主动道具显示充能数字）
# - 互动提示（中下，CombatBus.interact_prompt 触发）
# - Toast（顶部，CombatBus.toast 触发）
# ============================================================

const COLOR_HP_BG: Color = Color(0.95, 0.95, 0.95, 0.30)
const COLOR_HP_FILL: Color = Color(0.95, 0.95, 0.95, 0.85)
const COLOR_HP_FLASH: Color = Color(0.78, 0.06, 0.18, 1.0)
const COLOR_TEXT: Color = Color(0.95, 0.95, 0.95, 0.85)

const HP_BAR_WIDTH: float = 220.0
const HP_BAR_HEIGHT: float = 4.0
const SLOT_SIZE: Vector2 = Vector2(40, 40)

var hp_back: ColorRect
var hp_fill: ColorRect
var hp_label: Label
var threads_label: Label
var item_slots: Array[Dictionary] = []  ## 每槽位：{bg, label, color_default}
var interact_label: Label
var toast_label: Label

var _last_hp: int = -1


func _ready() -> void:
	layer = 60
	_build_ui()
	# 订阅
	PlayerProgress.hp_changed.connect(_on_hp_changed)
	PlayerProgress.threads_changed.connect(_on_threads_changed)
	ItemSystem.charges_changed.connect(_on_charges_changed)
	CombatBus.interact_prompt.connect(_on_interact_prompt)
	CombatBus.toast.connect(_on_toast)
	# 首次填充
	_refresh_all()


func _build_ui() -> void:
	# === HP（左上）===
	hp_back = ColorRect.new()
	hp_back.position = Vector2(28, 28)
	hp_back.size = Vector2(HP_BAR_WIDTH, HP_BAR_HEIGHT)
	hp_back.color = COLOR_HP_BG
	hp_back.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(hp_back)

	hp_fill = ColorRect.new()
	hp_fill.position = Vector2(28, 28)
	hp_fill.size = Vector2(HP_BAR_WIDTH, HP_BAR_HEIGHT)
	hp_fill.color = COLOR_HP_FILL
	hp_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(hp_fill)

	hp_label = Label.new()
	hp_label.position = Vector2(28, 38)
	hp_label.size = Vector2(HP_BAR_WIDTH, 22)
	hp_label.add_theme_color_override("font_color", COLOR_TEXT)
	hp_label.add_theme_font_size_override("font_size", 14)
	hp_label.text = "100 / 100"
	add_child(hp_label)

	# === 丝缕（HP 下方）===
	threads_label = Label.new()
	threads_label.position = Vector2(28, 64)
	threads_label.size = Vector2(HP_BAR_WIDTH, 24)
	threads_label.add_theme_color_override("font_color", Color(0.78, 0.06, 0.18, 1))
	threads_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.7))
	threads_label.add_theme_constant_override("shadow_offset_x", 1)
	threads_label.add_theme_constant_override("shadow_offset_y", 1)
	threads_label.add_theme_font_size_override("font_size", 16)
	threads_label.text = "绯红丝缕  0"
	add_child(threads_label)

	# === 道具槽（右上）===
	var slot_y: float = 28.0
	var slot_x: float = 1920.0 - 28.0 - SLOT_SIZE.x  ## 假设 1920 宽（拉伸 viewport / keep）
	for i in range(4):
		var bg := ColorRect.new()
		bg.position = Vector2(slot_x - i * (SLOT_SIZE.x + 8), slot_y)
		bg.size = SLOT_SIZE
		bg.color = Color(0.3, 0.3, 0.3, 0.5)
		bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(bg)

		var lbl := Label.new()
		lbl.position = bg.position + Vector2(0, SLOT_SIZE.y - 4)
		lbl.size = Vector2(SLOT_SIZE.x, 16)
		lbl.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
		lbl.add_theme_font_size_override("font_size", 12)
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl.text = ""
		add_child(lbl)

		# 数字键标记（1234）
		var key_lbl := Label.new()
		key_lbl.position = bg.position + Vector2(2, 0)
		key_lbl.size = Vector2(16, 14)
		key_lbl.add_theme_color_override("font_color", Color(0, 0, 0, 0.7))
		key_lbl.add_theme_font_size_override("font_size", 10)
		key_lbl.text = "%d" % (i + 1)
		add_child(key_lbl)

		item_slots.append({
			"bg": bg,
			"label": lbl,
		})

	# === 互动提示（中下）===
	interact_label = Label.new()
	interact_label.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	interact_label.offset_left = 0
	interact_label.offset_right = 0
	interact_label.offset_top = -250
	interact_label.offset_bottom = -210
	interact_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	interact_label.add_theme_color_override("font_color", COLOR_TEXT)
	interact_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	interact_label.add_theme_constant_override("shadow_offset_x", 2)
	interact_label.add_theme_constant_override("shadow_offset_y", 2)
	interact_label.add_theme_font_size_override("font_size", 22)
	interact_label.text = ""
	add_child(interact_label)

	# === Toast（顶部居中）===
	toast_label = Label.new()
	toast_label.set_anchors_preset(Control.PRESET_TOP_WIDE)
	toast_label.offset_top = 100
	toast_label.offset_bottom = 140
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label.add_theme_color_override("font_color", Color(1, 1, 1, 1))
	toast_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.9))
	toast_label.add_theme_constant_override("shadow_offset_x", 2)
	toast_label.add_theme_constant_override("shadow_offset_y", 2)
	toast_label.add_theme_font_size_override("font_size", 24)
	toast_label.modulate = Color(1, 1, 1, 0)
	add_child(toast_label)


func _refresh_all() -> void:
	_on_hp_changed(PlayerProgress.hp, PlayerProgress.hp, PlayerProgress.max_hp)
	_on_threads_changed(PlayerProgress.crimson_threads, PlayerProgress.crimson_threads)
	for i in range(4):
		_refresh_slot(i)


func _refresh_slot(i: int) -> void:
	if i >= item_slots.size():
		return
	var slot: Dictionary = item_slots[i]
	var bg: ColorRect = slot["bg"]
	var lbl: Label = slot["label"]
	var item_id := ItemSystem.get_equipped(i)
	if item_id.is_empty():
		bg.color = Color(0.3, 0.3, 0.3, 0.4)
		lbl.text = ""
		return
	var res := ItemSystem.get_resource(item_id)
	if res == null:
		return
	bg.color = res.icon_color
	bg.color.a = 0.85
	if res.item_type == ItemResource.ItemType.ACTIVE:
		lbl.text = "%d" % ItemSystem.get_charges(item_id)
	else:
		lbl.text = "P"  ## passive 标记


func _on_hp_changed(_old: int, new_v: int, max_v: int) -> void:
	hp_label.text = "%d / %d" % [new_v, max_v]
	var ratio: float = clampf(float(new_v) / float(max(max_v, 1)), 0.0, 1.0)
	hp_fill.size = Vector2(HP_BAR_WIDTH * ratio, HP_BAR_HEIGHT)
	# 满血时整体淡出
	var alpha: float = 0.4 if ratio >= 1.0 else 1.0
	hp_fill.modulate = Color(1, 1, 1, alpha)
	hp_back.modulate = Color(1, 1, 1, alpha)
	hp_label.modulate = Color(1, 1, 1, alpha)
	# 受伤跳动
	if _last_hp >= 0 and new_v < _last_hp:
		_flash_hp_red()
	_last_hp = new_v


func _flash_hp_red() -> void:
	var t := create_tween()
	t.tween_property(hp_fill, "color", COLOR_HP_FLASH, 0.06)
	t.tween_property(hp_fill, "color", COLOR_HP_FILL, 0.20)


func _on_threads_changed(_old: int, new_v: int) -> void:
	threads_label.text = "绯红丝缕  %d" % new_v


func _on_charges_changed(_item_id: String, _charges: int, _max: int) -> void:
	for i in range(4):
		_refresh_slot(i)


func _on_interact_prompt(text: String) -> void:
	interact_label.text = text
	interact_label.modulate = Color(1, 1, 1, 1.0 if not text.is_empty() else 0.0)


func _on_toast(text: String, duration: float = 2.0) -> void:
	toast_label.text = text
	toast_label.modulate = Color(1, 1, 1, 0)
	var t := create_tween()
	t.tween_property(toast_label, "modulate:a", 1.0, 0.3)
	t.tween_interval(duration)
	t.tween_property(toast_label, "modulate:a", 0.0, 0.5)
