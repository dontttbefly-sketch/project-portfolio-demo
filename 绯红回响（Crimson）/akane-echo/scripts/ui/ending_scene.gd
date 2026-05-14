extends Control

# ============================================================
# 结局演出场景（M7v2）
# 黑底 + 标题 + 渗墨正文 + 通关数据统计 + 任意键回主菜单
#
# 注意：EndingSystem.determine_ending(rode_boat) 现在需要参数。
# 这里我们读取 PlayerProgress.seen_endings 最新一条作为本次结局；
# 因为 EndingSystem._trigger 在切场前已经把结局加入 seen_endings。
# ============================================================

@onready var title_label: Label = $Title
@onready var body_label: Label = $Body
@onready var stats_label: Label = $Stats
@onready var hint_label: Label = $Hint

var _ending: String = "A"


func _ready() -> void:
	Engine.time_scale = 1.0
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	# 取 seen_endings 最后一条（即刚刚被 _trigger 加进去的）
	if PlayerProgress.seen_endings.size() > 0:
		_ending = PlayerProgress.seen_endings[-1]
	title_label.text = ""
	body_label.text = ""
	stats_label.text = ""
	hint_label.text = ""
	hint_label.modulate = Color(1, 1, 1, 0)
	stats_label.modulate = Color(1, 1, 1, 0)
	_play_ending()


func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		_to_main_menu()


func _to_main_menu() -> void:
	get_tree().change_scene_to_file("res://scenes/main/MainMenu.tscn")


func _play_ending() -> void:
	# 1. 渐显标题
	var t1: Tween = title_label.create_tween()
	t1.tween_property(title_label, "modulate", Color(1, 1, 1, 0), 0.0)
	title_label.text = EndingSystem.get_title(_ending)
	t1.tween_property(title_label, "modulate", Color(0.91, 0.706, 0.722, 1), 1.0)
	await get_tree().create_timer(1.5).timeout

	# 2. 渗墨正文逐字浮现
	var text: String = EndingSystem.get_text(_ending)
	body_label.modulate = Color(1, 1, 1, 1)
	for i in text.length():
		body_label.text = text.substr(0, i + 1)
		await get_tree().create_timer(0.05).timeout

	# 3. 渐显通关统计
	await get_tree().create_timer(1.5).timeout
	stats_label.text = StatsTracker.get_summary_text()
	var t2: Tween = stats_label.create_tween()
	t2.tween_property(stats_label, "modulate", Color(0.85, 0.85, 0.85, 1), 1.5)

	# 4. 提示返回
	await get_tree().create_timer(2.5).timeout
	hint_label.text = "（任意键返回主菜单）"
	var t3: Tween = hint_label.create_tween()
	t3.tween_property(hint_label, "modulate", Color(0.7, 0.7, 0.7, 0.85), 0.8)
