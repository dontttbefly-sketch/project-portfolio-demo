extends Node

# ============================================================
# 通关数据统计（autoload 单例，M7v2）
# 监听 CombatBus 信号，跨场景累计
# 结局演出展示
# ============================================================

var enemies_killed: int = 0
var deaths: int = 0
var parries_executed: int = 0
var parries_attempted: int = 0       ## 弹反窗口开启次数
var session_start_ms: int = 0


func _ready() -> void:
	session_start_ms = Time.get_ticks_msec()
	CombatBus.boss_defeated.connect(_on_boss_defeated)
	CombatBus.player_died.connect(_on_player_died)
	CombatBus.parry_executed.connect(_on_parry_executed)
	CombatBus.enemy_attack_telegraph.connect(_on_enemy_telegraph)
	# 普通敌人击杀监听稍微复杂，靠 EnemyBase 死亡时主动报；
	# 简化：boss_defeated 计 1，每只 enemy 死亡也单独 +1（M7v2 仅 boss 计入即可）


func _on_boss_defeated(_boss_id: String) -> void:
	enemies_killed += 1


func _on_player_died() -> void:
	deaths += 1


func _on_parry_executed() -> void:
	parries_executed += 1


func _on_enemy_telegraph(_attacker: Node, _lead: float) -> void:
	parries_attempted += 1


# 通关时长（秒）
func get_session_seconds() -> float:
	return (Time.get_ticks_msec() - session_start_ms) / 1000.0


func get_session_time_str() -> String:
	var s: int = int(get_session_seconds())
	var h: int = s / 3600
	var m: int = (s / 60) % 60
	var sec: int = s % 60
	return "%02d:%02d:%02d" % [h, m, sec]


# 弹反成功率（百分比）
func get_parry_success_rate() -> int:
	if parries_attempted <= 0:
		return 0
	return int(round(100.0 * float(parries_executed) / float(parries_attempted)))


func reset() -> void:
	enemies_killed = 0
	deaths = 0
	parries_executed = 0
	parries_attempted = 0
	session_start_ms = Time.get_ticks_msec()


# 给 EndingScene 用：返回多行格式化统计
func get_summary_text() -> String:
	var fragments: int = CollectibleSystem.get_collected_count()
	var threads: int = PlayerProgress.crimson_threads
	var weapon: int = PlayerProgress.weapon_level
	return "通关时长 %s\n碎片收集 %d\n绯红丝缕 %d  ·  武器 Lv%d\n死亡 %d 次  ·  Boss 击败 %d\n弹反成功率 %d%%（%d/%d）" % [
		get_session_time_str(),
		fragments,
		threads, weapon,
		deaths, enemies_killed,
		get_parry_success_rate(), parries_executed, parries_attempted,
	]
