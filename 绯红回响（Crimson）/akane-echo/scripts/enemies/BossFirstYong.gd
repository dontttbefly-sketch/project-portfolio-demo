extends BossUmbrellaMan
class_name BossFirstYong

# ============================================================
# 第一咏（Boss-rush，策划案 §7.3）
# 雨衣男人的白色变体：HP 800 / 招式与 Boss 1 相同 / 伤害 ×1.5
# 击败后：+50 丝缕 + 标记击败（不重复给缠红丝）
# ============================================================

const FIRST_YONG_ID: String = "boss_first_yong"


func _init() -> void:
	super._init()
	max_hp = 800
	# 伤害 ×1.5
	attack_damage = int(round(attack_damage * 1.5))


func _ready() -> void:
	super._ready()
	# 白色变体
	if sprite != null:
		sprite.modulate = Color(0.95, 0.95, 0.95, 1)


# 覆盖奖励：不给缠红丝（已经获得过），仅给丝缕
func _grant_rewards() -> void:
	if not PlayerProgress.killed_bosses.has(FIRST_YONG_ID):
		PlayerProgress.killed_bosses.append(FIRST_YONG_ID)
	PlayerProgress.add_threads(50)
	CombatBus.boss_defeated.emit(FIRST_YONG_ID)
	CombatBus.toast.emit("第一咏 — 雨衣男人的白色变体已被击破  +50 丝缕", 3.5)
	SaveSystem.save_game()
