extends EnemyBase
class_name EliteBookBurner

# ============================================================
# 烧书人（精英，策划案 第四卷 §3）
# HP 200, 攻击 30, 烟雾遮挡 + 召唤 2 只烬焰
# 简化：周期性召唤 + 自身近战
# ============================================================

const SUMMON_INTERVAL: float = 8.0
var _summon_timer: float = 4.0


func _init() -> void:
	max_hp = 200
	attack_damage = 30
	attack_knockback = 5.0
	move_speed = 4.5
	vision_range = 12.0
	attack_range = 2.0
	attack_windup = 0.8
	attack_active = 0.3
	attack_recovery = 0.5
	hit_stun_duration = 0.15


func _physics_process(delta: float) -> void:
	super._physics_process(delta)
	if current_state == State.DEAD:
		return
	# 周期召唤烬焰（最多场上 2 只）
	_summon_timer -= delta * time_scale_multiplier
	if _summon_timer <= 0.0:
		_summon_timer = SUMMON_INTERVAL
		_summon_embers()


func _summon_embers() -> void:
	# 限场上烬焰 ≤ 2
	var existing: int = 0
	for e in get_tree().get_nodes_in_group("enemy"):
		if e is EmberFlame and is_instance_valid(e):
			existing += 1
	if existing >= 2:
		return
	var packed: PackedScene = load("res://scenes/enemies/EmberFlame.tscn")
	if packed == null:
		return
	var root := get_tree().current_scene
	if root == null:
		return
	for i in range(2 - existing):
		var ember := packed.instantiate()
		root.add_child(ember)
		var angle: float = randf() * TAU
		(ember as Node3D).global_position = global_position + Vector3(cos(angle) * 2.0, 0, sin(angle) * 2.0)
