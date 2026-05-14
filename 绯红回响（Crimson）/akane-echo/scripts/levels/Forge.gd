extends StaticBody3D
class_name Forge

# ============================================================
# 绯红铸炉（武器升级互动点）
# 玩家走近 [E] 升级到下一级；扣除丝缕 + 自动存档
# 5 级（1→5），花费来自 COSTS 数组（策划案 §7.2）
# ============================================================

const COSTS: Array[int] = [0, 50, 150, 300, 600]   ## 索引 = 目标等级；COSTS[2] 表示从 1→2 的花费 50

@onready var prompt_area: Area3D = $PromptArea
@onready var sprite: Sprite3D = $Sprite

var _player_in_range: bool = false


func _ready() -> void:
	add_to_group("forge")
	if prompt_area != null:
		prompt_area.body_entered.connect(_on_enter)
		prompt_area.body_exited.connect(_on_exit)


func _process(_delta: float) -> void:
	if not _player_in_range:
		return
	# 实时刷新提示
	_refresh_prompt()
	if Input.is_action_just_pressed("interact"):
		_try_upgrade()


func _on_enter(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	_player_in_range = true
	_refresh_prompt()


func _on_exit(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	_player_in_range = false
	CombatBus.interact_prompt.emit("")


func _refresh_prompt() -> void:
	var lvl: int = PlayerProgress.weapon_level
	if lvl >= 5:
		CombatBus.interact_prompt.emit("[绯红铸炉] 已达最高等级 Lv5")
		return
	var cost: int = COSTS[lvl + 1] if lvl + 1 < COSTS.size() else 0
	var afford: bool = PlayerProgress.crimson_threads >= cost
	var afford_str: String = "" if afford else " ❌"
	CombatBus.interact_prompt.emit("[E] 铸炉升级 Lv%d → Lv%d  (耗费 %d 丝缕)%s" % [lvl, lvl + 1, cost, afford_str])


func _try_upgrade() -> void:
	var lvl: int = PlayerProgress.weapon_level
	if lvl >= 5:
		CombatBus.toast.emit("已达最高等级", 1.5)
		return
	var cost: int = COSTS[lvl + 1] if lvl + 1 < COSTS.size() else 0
	if PlayerProgress.crimson_threads < cost:
		CombatBus.toast.emit("丝缕不足（需 %d，当前 %d）" % [cost, PlayerProgress.crimson_threads], 2.0)
		return
	PlayerProgress.spend_threads(cost)
	PlayerProgress.weapon_level = lvl + 1
	PlayerProgress.weapon_level_changed.emit(PlayerProgress.weapon_level)
	# 视觉反馈
	if sprite != null:
		var t: Tween = sprite.create_tween()
		t.tween_property(sprite, "modulate", Color(2.5, 0.5, 0.5), 0.15)
		t.tween_property(sprite, "modulate", Color(1.5, 0.4, 0.5), 0.4)
	CombatBus.toast.emit("武器升级 → Lv%d (+20%% 攻击力)" % PlayerProgress.weapon_level, 3.0)
	SaveSystem.save_game()
