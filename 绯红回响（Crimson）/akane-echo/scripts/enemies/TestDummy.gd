extends CharacterBody3D
class_name TestDummy

# ============================================================
# 测试假人（M3 升级：会挥拳 + 受残响态减速影响）
# - HP 100，受击演出，HP=0 灰烬，5s 重生
# - 每 3-5s 挥一次拳：0.5s 蓄力（变红朝玩家）+ 0.2s 命中
# - 蓄力开始后 0.1s 触发 enemy_attack_telegraph，让玩家有 0.4s 弹反窗
# - time_scale_multiplier 字段：残响态时主角把所有敌人调成 0.7，单独减速
# ============================================================

@onready var sprite: Sprite3D = $ModelHolder/Sprite
@onready var hurt_box: HurtBox = $HurtBox
@onready var collision: CollisionShape3D = $CollisionShape
@onready var hurt_box_shape: CollisionShape3D = $HurtBox/HurtBoxShape
@onready var hit_box: HitBox = $HitBox

var max_hp: int = CombatConstants.DUMMY_MAX_HP
var current_hp: int = CombatConstants.DUMMY_MAX_HP

# 残响态：主角进入残响态时把这个调成 0.7，所有 delta 乘它
var time_scale_multiplier: float = 1.0

var _spawn_position: Vector3 = Vector3.ZERO
var _is_dead: bool = false
var _respawn_timer: float = 0.0
var _knockback_velocity: Vector3 = Vector3.ZERO

# 挥拳 AI
enum SwingPhase { IDLE, WINDUP, ACTIVE, RECOVERY }
var _swing_phase: SwingPhase = SwingPhase.IDLE
var _swing_cooldown: float = 0.0  ## 进入下一次挥拳的等待时间
var _phase_timer: float = 0.0
var _telegraph_emitted: bool = false
var _attack_dir: Vector3 = Vector3(0, 0, 1)


func _ready() -> void:
	_spawn_position = global_position
	add_to_group("test_dummy")
	add_to_group("enemy")  ## 主角残响态广播 / 凝时锁定都用这个组
	_swing_cooldown = randf_range(CombatConstants.DUMMY_SWING_INTERVAL_MIN, CombatConstants.DUMMY_SWING_INTERVAL_MAX)
	# 配置 HitBox 数值
	if hit_box != null:
		hit_box.damage = CombatConstants.DUMMY_SWING_DAMAGE
		hit_box.knockback_force = CombatConstants.DUMMY_SWING_KNOCKBACK


func _physics_process(delta: float) -> void:
	# 残响态时间减速
	delta *= time_scale_multiplier

	if _is_dead:
		_respawn_timer += delta
		if _respawn_timer >= CombatConstants.DUMMY_RESPAWN_TIME:
			_respawn()
		return

	# 击退衰减（被打飞时被动滑动）
	velocity = _knockback_velocity
	_knockback_velocity *= 0.82
	if _knockback_velocity.length() < 0.1:
		_knockback_velocity = Vector3.ZERO

	# 攻击 AI
	_tick_swing_ai(delta)

	move_and_slide()


func _tick_swing_ai(delta: float) -> void:
	match _swing_phase:
		SwingPhase.IDLE:
			_swing_cooldown -= delta
			if _swing_cooldown <= 0.0:
				_start_windup()
		SwingPhase.WINDUP:
			_phase_timer += delta
			# 命中前 0.4s 发射 telegraph
			if not _telegraph_emitted and _phase_timer >= CombatConstants.DUMMY_SWING_WINDUP - CombatConstants.PARRY_WINDOW:
				CombatBus.enemy_attack_telegraph.emit(self, CombatConstants.PARRY_WINDOW)
				_telegraph_emitted = true
			if _phase_timer >= CombatConstants.DUMMY_SWING_WINDUP:
				_start_active()
		SwingPhase.ACTIVE:
			_phase_timer += delta
			if _phase_timer >= CombatConstants.DUMMY_SWING_ACTIVE:
				_end_swing()
		SwingPhase.RECOVERY:
			pass  # 当前没用，留扩展


func _start_windup() -> void:
	# 朝向当前玩家位置（仅 XZ 平面）
	var p := get_tree().get_first_node_in_group("player")
	if p != null:
		var d: Vector3 = p.global_position - global_position
		d.y = 0.0
		if d.length_squared() > 0.001:
			_attack_dir = d.normalized()
	_swing_phase = SwingPhase.WINDUP
	_phase_timer = 0.0
	_telegraph_emitted = false
	# 蓄力变红预警
	if sprite != null:
		sprite.modulate = Color(1.5, 0.4, 0.4)
	# 摆 HitBox 到攻击方向
	if hit_box != null:
		hit_box.position = Vector3(_attack_dir.x * 1.0, 0.8, _attack_dir.z * 1.0)
		hit_box.rotation = Vector3(0, atan2(-_attack_dir.x, -_attack_dir.z), 0)


func _start_active() -> void:
	_swing_phase = SwingPhase.ACTIVE
	_phase_timer = 0.0
	if hit_box != null:
		hit_box.set_active(true)


func _end_swing() -> void:
	if hit_box != null:
		hit_box.set_active(false)
	if sprite != null:
		sprite.modulate = Color(1, 1, 1, 1)
	_swing_phase = SwingPhase.IDLE
	_phase_timer = 0.0
	_swing_cooldown = randf_range(CombatConstants.DUMMY_SWING_INTERVAL_MIN, CombatConstants.DUMMY_SWING_INTERVAL_MAX)


# 弹反成功时被玩家调用——反推所有挥拳，避免反弹后还吃伤害
func interrupt_swing() -> void:
	if _swing_phase == SwingPhase.IDLE:
		return
	_end_swing()
	# 给个稍长的冷却，避免立刻又开打
	_swing_cooldown = max(_swing_cooldown, 1.5)


# ============================================================
# 受击鸭子接口
# ============================================================
func on_damaged(damage: int, knockback_dir: Vector3, knockback_force: float, _source: Node) -> void:
	if _is_dead:
		return
	current_hp = max(0, current_hp - damage)
	_play_hit_reaction(knockback_dir, knockback_force)
	if current_hp <= 0:
		_die()


func _play_hit_reaction(dir: Vector3, force: float) -> void:
	if sprite != null:
		var t := sprite.create_tween()
		t.tween_property(sprite, "modulate", Color(0.4, 0.4, 0.5), 0.05)
		t.tween_property(sprite, "modulate", Color(1, 1, 1, 1), 0.10)
	var k_force: float = force if force > 0.1 else 3.0
	_knockback_velocity = dir * k_force


func _die() -> void:
	_is_dead = true
	_respawn_timer = 0.0
	# 中断挥拳
	_swing_phase = SwingPhase.IDLE
	if hit_box != null: hit_box.set_active(false)
	if collision != null: collision.disabled = true
	if hurt_box != null: hurt_box.monitorable = false
	if hurt_box_shape != null: hurt_box_shape.disabled = true
	_knockback_velocity = Vector3.ZERO

	if sprite != null:
		var t := sprite.create_tween().set_parallel(true)
		t.tween_property(sprite, "modulate", Color(0.15, 0.15, 0.18, 1), 0.5)
		t.tween_property(sprite, "scale", Vector3(0.01, 0.01, 0.01), 0.5)


func _respawn() -> void:
	_is_dead = false
	current_hp = max_hp
	global_position = _spawn_position
	if sprite != null:
		sprite.modulate = Color(1, 1, 1, 1)
		sprite.scale = Vector3.ONE
	if collision != null: collision.disabled = false
	if hurt_box != null: hurt_box.monitorable = true
	if hurt_box_shape != null: hurt_box_shape.disabled = false
	_knockback_velocity = Vector3.ZERO
	_swing_phase = SwingPhase.IDLE
	_phase_timer = 0.0
	_swing_cooldown = randf_range(CombatConstants.DUMMY_SWING_INTERVAL_MIN, CombatConstants.DUMMY_SWING_INTERVAL_MAX)
	CombatBus.dummy_respawned.emit(self)
