extends EnemyBase
class_name CryingCrow

# ============================================================
# 白怨·啜泣鸦（策划案 第四卷 §2.1）
# HP 20, 攻击 8, 飞行单位
# 在玩家头顶 4m 高度盘旋 2-3s → 锁向俯冲 → 落地 0.6s 硬直窗
# ============================================================

const HOVER_HEIGHT: float = 4.0
const HOVER_RADIUS: float = 2.5
const DIVE_SPEED: float = 14.0
const DIVE_RECOVERY: float = 0.6

enum CrowPhase { HOVER, DIVE, RECOVER }

var _crow_phase: CrowPhase = CrowPhase.HOVER
var _hover_timer: float = 0.0
var _hover_duration: float = 0.0
var _hover_angle: float = 0.0
var _dive_lock_dir: Vector3 = Vector3.ZERO
var _dive_target_y: float = 0.0
var _recover_timer: float = 0.0


func _init() -> void:
	max_hp = 20
	attack_damage = 8
	move_speed = 6.0
	vision_range = 10.0
	attack_range = 1.0
	attack_windup = 0.0  ## 俯冲不用普通蓄力流程
	attack_active = 0.0
	attack_recovery = 0.0
	hit_stun_duration = 0.4


func _ready() -> void:
	super._ready()
	_hover_duration = randf_range(2.0, 3.0)
	# 起始飞高
	global_position.y = HOVER_HEIGHT


# 重写 AI：不用基类的 IDLE/CHASE/ATTACK，自己有三阶段
func _physics_process(delta: float) -> void:
	delta *= time_scale_multiplier
	if current_state == State.DEAD:
		return

	# 击退
	if _knockback_velocity.length() > 0.1:
		velocity = _knockback_velocity
		_knockback_velocity *= 0.82
		move_and_slide()
		return
	else:
		_knockback_velocity = Vector3.ZERO

	# 受击硬直走基类逻辑
	if current_state == State.HIT:
		_ai_hit(delta)
		velocity = Vector3.ZERO
		move_and_slide()
		return

	# 缓存玩家
	if _player == null or not is_instance_valid(_player):
		_player = get_tree().get_first_node_in_group("player")
	if _player == null:
		return

	match _crow_phase:
		CrowPhase.HOVER: _crow_hover(delta)
		CrowPhase.DIVE: _crow_dive(delta)
		CrowPhase.RECOVER: _crow_recover(delta)

	move_and_slide()


# 在玩家头顶绕圆飞，等够时间后开始俯冲
func _crow_hover(delta: float) -> void:
	_hover_timer += delta
	_hover_angle += delta * 1.5
	# 目标位置：玩家位置 + 圆周偏移 + 高度
	var target: Vector3 = _player.global_position + Vector3(
		cos(_hover_angle) * HOVER_RADIUS,
		HOVER_HEIGHT,
		sin(_hover_angle) * HOVER_RADIUS
	)
	# 软追踪过去
	var to_target: Vector3 = target - global_position
	velocity = to_target * 4.0   ## 软系数

	if _hover_timer >= _hover_duration:
		_start_dive()


func _start_dive() -> void:
	_crow_phase = CrowPhase.DIVE
	_dive_lock_dir = (_player.global_position - global_position).normalized()
	_dive_target_y = _player.global_position.y
	# 俯冲也发 telegraph，方便玩家弹反
	CombatBus.enemy_attack_telegraph.emit(self, CombatConstants.PARRY_WINDOW)
	if hit_box != null:
		hit_box.set_active(true)
		hit_box.position = Vector3(_dive_lock_dir.x, 0.5, _dive_lock_dir.z)
	if sprite != null:
		sprite.modulate = Color(1.5, 0.4, 0.4)


# 俯冲：锁向，不再修正方向
func _crow_dive(_delta: float) -> void:
	velocity = _dive_lock_dir * DIVE_SPEED
	# 落到玩家高度（或地板高度）就触发落地
	if global_position.y <= _dive_target_y + 0.2:
		_start_recover()


func _start_recover() -> void:
	_crow_phase = CrowPhase.RECOVER
	_recover_timer = 0.0
	if hit_box != null:
		hit_box.set_active(false)
	if sprite != null:
		sprite.modulate = Color(1, 1, 1, 1)


# 落地后 0.6s 硬直，是输出窗口
func _crow_recover(delta: float) -> void:
	_recover_timer += delta
	velocity = Vector3.ZERO
	if _recover_timer >= DIVE_RECOVERY:
		# 飞回头顶
		_crow_phase = CrowPhase.HOVER
		_hover_timer = 0.0
		_hover_duration = randf_range(2.0, 3.0)
		# 让 _crow_hover 把它带回 HOVER_HEIGHT
