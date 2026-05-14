extends CanvasLayer

# ============================================================
# 屏幕去色覆盖层（凝时斩用）
# - ColorRect 全屏挂 desat_keep_red 着色器
# - 用「真实时间」（Time.get_ticks_msec）推进 effect_strength
# - 这是关键：Engine.time_scale=0 时 Tween 也会被冻结，必须用 wall clock
# ============================================================

@onready var rect: ColorRect = $Rect

var _material: ShaderMaterial
var _current_strength: float = 0.0
var _target_strength: float = 0.0
var _transition_speed: float = 0.0  ## 单位/秒（duration 的倒数）

var _last_real_ms: int = 0


func _ready() -> void:
	add_to_group("desat_overlay")
	process_mode = Node.PROCESS_MODE_ALWAYS
	_material = rect.material as ShaderMaterial
	if _material != null:
		_material.set_shader_parameter("effect_strength", 0.0)
	_last_real_ms = Time.get_ticks_msec()


func _process(_delta: float) -> void:
	if _material == null:
		return
	# 真实时间 delta（不受 Engine.time_scale 影响）
	var now := Time.get_ticks_msec()
	var real_dt: float = (now - _last_real_ms) / 1000.0
	_last_real_ms = now

	if absf(_current_strength - _target_strength) > 0.001:
		var diff: float = _target_strength - _current_strength
		var step: float = _transition_speed * real_dt
		if absf(diff) <= step:
			_current_strength = _target_strength
		else:
			_current_strength += signf(diff) * step
		_material.set_shader_parameter("effect_strength", _current_strength)


# 进入凝时：strength 渐升到 1（duration 内完成）
func enter(duration: float = 0.15) -> void:
	_target_strength = 1.0
	_transition_speed = 1.0 / maxf(duration, 0.001)


# 退出凝时：strength 渐回 0
func leave(duration: float = 0.30) -> void:
	_target_strength = 0.0
	_transition_speed = 1.0 / maxf(duration, 0.001)
