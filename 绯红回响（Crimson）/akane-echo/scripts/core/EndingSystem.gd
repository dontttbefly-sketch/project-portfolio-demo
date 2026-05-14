extends Node

# ============================================================
# 结局系统（autoload 单例）
# 策划案 §6 多结局：3 种结局根据通关条件 + 玩家选择判定
# ============================================================

const ENDING_A_TITLE: String = "结局 A — 消散"
const ENDING_B_TITLE: String = "结局 B — 驻留"
const ENDING_C_TITLE: String = "结局 C — 归还"

const ENDING_A_TEXT: String = "「她终于被忘记了。」\n\n阿茜上船 — 渡船驶入白雾。\n红色一点点褪去，\n最后只剩剑柄那一抹红。\n\n（现实界：那个少年长大成人，\n结婚那天对镜子愣了一下。）"

const ENDING_B_TEXT: String = "「她选择留在被忘记的人身边。」\n\n阿茜不上船 — 转身回到残响之境。\n她成为新的渡船人，\n等下一个迷路的人。\n\n（现实界：那个少年每年固定那天\n都会去山坡，放一把红伞。）"

const ENDING_C_TEXT: String = "「她回去了。回到那个仍在记得她的人身边。」\n\n阿茜上船 — 但船逆流，驶向现实。\n她变成红光飞回少年身边。\n\n（现实界：青年站在剑道馆门口，\n红色花瓣飘来。\n他笑了：「老师，您回来了。」）"

# 结局判定阈值（策划案 §6.5）
const FRAGMENTS_C_THRESHOLD: int = 70
const FRAGMENTS_B_THRESHOLD: int = 40


## 根据 rode_boat（是否上船）+ 收集度判定结局
## 策划案设计意图：玩家以为自己在选，但其实"被忘记的程度"早已决定了。
## - rode_boat=false → 永远 B（"她选择留下"）
## - rode_boat=true:
##     · 碎片 < 40 → A
##     · 碎片 >= 40 + 击败隐藏 Boss → C
##     · 碎片 >= 40 + 未击败隐藏 Boss → B
func determine_ending(rode_boat: bool) -> String:
	if not rode_boat:
		return "B"
	var fragments: int = CollectibleSystem.get_collected_count()
	var defeated_secret: bool = PlayerProgress.killed_bosses.has("boss_original_yong")
	if fragments >= FRAGMENTS_B_THRESHOLD and defeated_secret:
		return "C"
	if fragments < FRAGMENTS_B_THRESHOLD:
		return "A"
	return "B"


## 玩家上船 → 触发结局
func choose_boat() -> void:
	if PlayerProgress.ending_chosen:
		return
	PlayerProgress.ending_chosen = true
	_trigger(determine_ending(true))


## 玩家走出 Hub → 不上船 → 永远 B
func choose_leave() -> void:
	if PlayerProgress.ending_chosen:
		return
	PlayerProgress.ending_chosen = true
	_trigger("B")


func _trigger(ending: String) -> void:
	if not PlayerProgress.seen_endings.has(ending):
		PlayerProgress.seen_endings.append(ending)
	PlayerProgress.post_boss4_state = false
	SaveSystem.save_game()
	get_tree().change_scene_to_file("res://scenes/ui/EndingScene.tscn")


## Boss 4 击败后调用：标记 post_boss4 + 切场到 Hub（终幕模式）
func enter_post_boss4() -> void:
	PlayerProgress.post_boss4_state = true
	PlayerProgress.ending_chosen = false
	SaveSystem.save_game()
	SceneManager.change_room("res://scenes/levels/hub/Hub.tscn", "default")


# ============================================================
# 文本访问
# ============================================================
func get_title(ending: String) -> String:
	match ending:
		"A": return ENDING_A_TITLE
		"B": return ENDING_B_TITLE
		"C": return ENDING_C_TITLE
	return "—"


func get_text(ending: String) -> String:
	match ending:
		"A": return ENDING_A_TEXT
		"B": return ENDING_B_TEXT
		"C": return ENDING_C_TEXT
	return ""


func has_unlocked_ng_plus() -> bool:
	return PlayerProgress.seen_endings.size() > 0


# ============================================================
# 隐藏 Boss 击败 → 直接进结局 C（不需要上船）
# ============================================================
func trigger_hidden_boss_ending() -> void:
	PlayerProgress.ending_chosen = true
	PlayerProgress.post_boss4_state = false
	_trigger("C")


# 兼容旧调用名（M7v1）— 重定向到隐藏 Boss 结局
func trigger_ending() -> void:
	trigger_hidden_boss_ending()
