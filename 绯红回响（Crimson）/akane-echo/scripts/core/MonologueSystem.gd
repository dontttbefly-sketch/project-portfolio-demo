extends Node

# ============================================================
# 阿茜独白 / 残响碎片文字浮现系统（autoload 单例）
# 屏幕底部居中，"渗墨"逐字浮现，2s 停顿后淡出
# 全过程不阻塞游戏（玩家可正常操作）
# ============================================================

const COLOR_INK: Color = Color(0.91, 0.706, 0.722, 1.0)  ## 樱褪色 #E8B4B8

@onready var _layer: CanvasLayer
@onready var _label: Label

var _last_real_ms: int = 0
# 当前显示队列（避免快速触发互相覆盖）
var _busy: bool = false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_setup_ui.call_deferred()
	# 自动接 CollectibleSystem 的拾取事件
	CollectibleSystem.shard_collected.connect(_on_shard_collected)


func _setup_ui() -> void:
	_layer = CanvasLayer.new()
	_layer.layer = 150
	add_child(_layer)

	# 容器：底部居中，撑开宽度
	var anchor := Control.new()
	anchor.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	anchor.offset_left = 200
	anchor.offset_right = -200
	anchor.offset_top = -180
	anchor.offset_bottom = -120
	anchor.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_layer.add_child(anchor)

	_label = Label.new()
	_label.set_anchors_preset(Control.PRESET_FULL_RECT)
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_label.add_theme_color_override("font_color", COLOR_INK)
	_label.add_theme_font_size_override("font_size", 26)
	_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	_label.add_theme_constant_override("shadow_offset_x", 2)
	_label.add_theme_constant_override("shadow_offset_y", 2)
	_label.modulate = Color(1, 1, 1, 0)
	_label.text = ""
	anchor.add_child(_label)


# 公共 API：显示一段独白
func show_monologue(text: String, hold_seconds: float = 2.0) -> void:
	if _label == null:
		await _wait_for_ui()
	_show_async(text, hold_seconds)


func _wait_for_ui() -> void:
	while _label == null:
		await get_tree().process_frame


# 内部：渗墨逐字浮现 + 停顿 + 淡出
func _show_async(text: String, hold_seconds: float) -> void:
	# 等之前那条结束（队列简化版）
	while _busy:
		await get_tree().create_timer(0.05, true, false, true).timeout
	_busy = true

	_label.text = ""
	_label.modulate = Color(1, 1, 1, 1)

	# 逐字"渗墨"出现：每字 0.05s
	for i in text.length():
		_label.text = text.substr(0, i + 1)
		await get_tree().create_timer(0.05, true, false, true).timeout

	# 停留
	await get_tree().create_timer(hold_seconds, true, false, true).timeout

	# 淡出（用真实时间推进，避免 time_scale=0 卡住）
	var dur: float = 0.5
	var elapsed: float = 0.0
	var last := Time.get_ticks_msec()
	while elapsed < dur:
		var now := Time.get_ticks_msec()
		var rdt: float = (now - last) / 1000.0
		last = now
		elapsed += rdt
		var alpha: float = 1.0 - clampf(elapsed / dur, 0.0, 1.0)
		_label.modulate = Color(1, 1, 1, alpha)
		await get_tree().process_frame

	_label.text = ""
	_label.modulate = Color(1, 1, 1, 0)
	_busy = false


func _on_shard_collected(_shard_id: String, text: String) -> void:
	if text.is_empty():
		return
	show_monologue("「" + text + "」", 3.0)
