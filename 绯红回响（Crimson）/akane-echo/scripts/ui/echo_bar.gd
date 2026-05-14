extends Control

# ============================================================
# 残响槽 UI（圆环）
# - 自绘（draw_arc）实现，不依赖 ring 贴图
# - 订阅 EchoSystem.echo_changed 自动更新
# - 满槽时整体 pulse 缩放 + 缓慢旋转（呼应"残响在共鸣"的视觉语言）
# ============================================================

@export var radius: float = 28.0
@export var thickness: float = 4.0
@export var outline_color: Color = Color(1, 1, 1, 0.35)
@export var fill_color: Color = Color(0.7843, 0.0627, 0.1804, 1)  ## 绯红 #C8102E
@export var glow_color: Color = Color(1.0, 0.4, 0.5, 1.0)         ## 满槽时叠加的高亮

var _ratio: float = 0.0           ## 当前残响占比 0..1
var _full: bool = false
var _full_time: float = 0.0       ## 满槽时长（用于驱动 pulse / rotate）


func _ready() -> void:
	set_anchors_preset(Control.PRESET_CENTER)
	pivot_offset = size * 0.5
	EchoSystem.echo_changed.connect(_on_echo_changed)
	# 初始化（防止 UI 加载比 EchoSystem 晚错过事件）
	_set_ratio(EchoSystem.get_ratio())


func _on_echo_changed(_old: int, new_value: int, max_value: int) -> void:
	_set_ratio(float(new_value) / float(max_value))


func _set_ratio(r: float) -> void:
	_ratio = clampf(r, 0.0, 1.0)
	var was_full := _full
	_full = _ratio >= 1.0
	if _full and not was_full:
		_full_time = 0.0
	queue_redraw()


func _process(delta: float) -> void:
	if _full:
		_full_time += delta
		# 整体微脉冲（1.0 ↔ 1.05，周期 1.5s）
		var s: float = 1.0 + 0.05 * sin(_full_time * (TAU / 1.5))
		scale = Vector2(s, s)
		# 缓慢旋转（4 秒一圈）
		rotation += delta * (TAU / 4.0)
		queue_redraw()
	else:
		if scale != Vector2.ONE:
			scale = Vector2.ONE
		if rotation != 0.0:
			rotation = 0.0


func _draw() -> void:
	var center := size * 0.5
	# 背景描边圆环（白色淡轮廓）
	draw_arc(center, radius, 0.0, TAU, 64, outline_color, thickness, true)
	# 填充圆环：从 12 点位置（-PI/2）顺时针填到 _ratio
	if _ratio > 0.001:
		var start := -PI * 0.5
		var end := start + TAU * _ratio
		var color := fill_color
		if _full:
			# 满槽时呼吸到 glow_color
			var t: float = 0.5 + 0.5 * sin(_full_time * (TAU / 0.8))
			color = fill_color.lerp(glow_color, t * 0.6)
		draw_arc(center, radius, start, end, 64, color, thickness, true)
