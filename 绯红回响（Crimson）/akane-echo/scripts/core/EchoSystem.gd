extends Node

# ============================================================
# 残响值管理（autoload 单例）
# 策划案 §4.1 — 「这是本作的招牌系统」
# 静默之心可让 max_echo 运行时增长（M5）
# ============================================================

const MAX_ECHO_BASE: int = 100  ## 起始上限
var max_echo: int = MAX_ECHO_BASE

var _current: int = 0

## 残响值变化时发出（旧值, 新值, 上限）
signal echo_changed(old_value: int, new_value: int, max_value: int)


func get_echo() -> int:
	return _current


func get_ratio() -> float:
	return float(_current) / float(max(max_echo, 1))


func is_full() -> bool:
	return _current >= max_echo


# 增加残响值。返回实际加成（被上限截断）。
func add_echo(amount: int) -> int:
	if amount <= 0:
		return 0
	var old := _current
	_current = min(max_echo, _current + amount)
	echo_changed.emit(old, _current, max_echo)
	return _current - old


# 消耗残响值。返回实际扣除（不会扣到负值）。
func spend_echo(amount: int) -> int:
	if amount <= 0:
		return 0
	var old := _current
	_current = max(0, _current - amount)
	echo_changed.emit(old, _current, max_echo)
	return old - _current


# 受击扣槽（风铃护符被动：30% 概率不扣残响）
func on_player_hurt() -> void:
	if ItemSystem.roll_wind_chime_save():
		# 触发风铃护符——不扣，给玩家 toast 反馈
		CombatBus.toast.emit("♪ 风铃护符 — 残响未损", 1.2)
		return
	spend_echo(CombatConstants.ECHO_LOSS_HURT)


# 静默之心：运行时永久 +N 上限（M5 Boss 1 奖励 +25）
func add_max_echo(extra: int) -> void:
	max_echo = max(MAX_ECHO_BASE, max_echo + extra)
	echo_changed.emit(_current, _current, max_echo)


# 残响碑休整：清零（策划案设计：休息时残响清零，鼓励主动战斗积累）
func reset() -> void:
	if _current == 0:
		return
	var old := _current
	_current = 0
	echo_changed.emit(old, 0, max_echo)
