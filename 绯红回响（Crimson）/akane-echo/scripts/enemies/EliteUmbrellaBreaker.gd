extends EnemyBase
class_name EliteUmbrellaBreaker

# ============================================================
# 褪色·折伞者（精英，策划案 §3.1 + 第四卷 §3）
# HP 250, 攻击 25, 中速
# 3 把伞独立挡格，每把破坏后进 5s 狂暴
# 全部伞破坏后才能击中本体
# ============================================================

const RAGE_DURATION: float = 5.0

var _umbrellas: Array[Umbrella] = []
var _all_umbrellas_broken: bool = false
var _rage_timer: float = 0.0
var _is_raging: bool = false


func _init() -> void:
	max_hp = 250
	attack_damage = 25
	attack_knockback = 6.0
	move_speed = 4.5
	vision_range = 12.0
	attack_range = 2.5
	attack_windup = 0.7
	attack_active = 0.3
	attack_recovery = 0.6
	hit_stun_duration = 0.2  ## 精英抗硬直短


func _ready() -> void:
	super._ready()
	# 收集子伞节点（命名约定：Umbrella1/2/3 子节点）
	for child in get_children():
		if child is Umbrella:
			_umbrellas.append(child)
			child.broken.connect(_on_umbrella_broken)
	# 本体 HurtBox 默认禁用，全部伞破后才解锁
	if hurt_box != null:
		hurt_box.monitorable = false


func _on_umbrella_broken() -> void:
	# 进入 5s 狂暴
	_is_raging = true
	_rage_timer = RAGE_DURATION
	if sprite != null:
		sprite.modulate = Color(1.6, 0.5, 0.5)
	# 检查是否全部破坏
	var all_broken := true
	for u in _umbrellas:
		if is_instance_valid(u) and not u.is_broken():
			all_broken = false
			break
	if all_broken:
		_all_umbrellas_broken = true
		if hurt_box != null:
			hurt_box.monitorable = true   ## 本体可被攻击
		if sprite != null:
			sprite.modulate = Color(2.0, 0.4, 0.5)


# 狂暴期：移动速度 +50%，伤害不变（M4 简化）
func _physics_process(delta: float) -> void:
	# 狂暴计时
	if _is_raging:
		_rage_timer -= delta * time_scale_multiplier
		if _rage_timer <= 0.0:
			_is_raging = false
			if sprite != null and not _all_umbrellas_broken:
				sprite.modulate = Color(1, 1, 1, 1)
	super._physics_process(delta)


# 狂暴期速度补正
func _ai_chase(delta: float) -> void:
	if _is_raging:
		var saved := move_speed
		move_speed = saved * 1.5
		super._ai_chase(delta)
		move_speed = saved
	else:
		super._ai_chase(delta)
