extends CharacterBody3D
class_name EnemyBase

# ============================================================
# 敌人基类
# 通用 AI 状态机 + 受击 + 死亡演出 + 残响态减速兼容
# ============================================================

enum State { IDLE, PATROL, CHASE, ATTACK, HIT, DEAD }

# === 数值（子类覆盖）===
@export var max_hp: int = 30
@export var attack_damage: int = 5
@export var attack_knockback: float = 3.0
@export var move_speed: float = 3.6           ## 玩家是 6.0
@export var vision_range: float = 8.0
@export var attack_range: float = 1.5
@export var attack_windup: float = 0.5        ## 蓄力时长（命中前 0.4s 发 telegraph）
@export var attack_active: float = 0.2
@export var attack_recovery: float = 0.4
@export var hit_stun_duration: float = 0.3

# === 残响态减速 ===
var time_scale_multiplier: float = 1.0

# === 节点引用（子类场景需提供这些子节点）===
@onready var sprite: Sprite3D = get_node_or_null("ModelHolder/Sprite")
@onready var hurt_box: HurtBox = get_node_or_null("HurtBox")
@onready var hit_box: HitBox = get_node_or_null("HitBox")
@onready var hurt_box_shape: CollisionShape3D = get_node_or_null("HurtBox/HurtBoxShape")
@onready var collision: CollisionShape3D = get_node_or_null("CollisionShape")

# === 运行时状态 ===
var current_hp: int = 0
var current_state: State = State.IDLE
var _knockback_velocity: Vector3 = Vector3.ZERO
var _hit_timer: float = 0.0
var _attack_phase: int = 0   ## 0=windup, 1=active, 2=recovery
var _attack_phase_timer: float = 0.0
var _telegraph_emitted: bool = false
var _player: Node = null


func _ready() -> void:
	add_to_group("enemy")
	# NG+ 倍率：HP 和伤害都按 PlayerProgress.enemy_difficulty_mult 提升
	if PlayerProgress.enemy_difficulty_mult > 1.0:
		max_hp = int(max_hp * PlayerProgress.enemy_difficulty_mult)
		attack_damage = int(attack_damage * PlayerProgress.enemy_difficulty_mult)
	current_hp = max_hp
	if hit_box != null:
		hit_box.damage = attack_damage
		hit_box.knockback_force = attack_knockback
	# 占位图视觉抛光：脚下椭圆阴影；半径按身位（普通 0.45，子类可在自己 _ready 后覆盖）
	CharacterShadow.attach_to(self, 0.45)


func _physics_process(delta: float) -> void:
	delta *= time_scale_multiplier
	if current_state == State.DEAD:
		return

	# 击退衰减（任何状态都被动滑动）
	if _knockback_velocity.length() > 0.1:
		velocity = _knockback_velocity
		_knockback_velocity *= 0.82
	else:
		_knockback_velocity = Vector3.ZERO
		# 无击退时由 AI 决定速度（默认 0）
		velocity = Vector3.ZERO

	# 缓存玩家
	if _player == null or not is_instance_valid(_player):
		_player = get_tree().get_first_node_in_group("player")

	match current_state:
		State.IDLE: _ai_idle(delta)
		State.CHASE: _ai_chase(delta)
		State.ATTACK: _ai_attack(delta)
		State.HIT: _ai_hit(delta)
		State.PATROL: _ai_idle(delta)  ## 子类可覆盖

	move_and_slide()


# ============================================================
# 默认 AI（子类可 override）
# ============================================================
func _ai_idle(_delta: float) -> void:
	if _player_in_vision():
		_change_state(State.CHASE)


func _ai_chase(_delta: float) -> void:
	if _player == null:
		return
	var to_p: Vector3 = _player.global_position - global_position
	to_p.y = 0.0
	var dist: float = to_p.length()
	if dist <= attack_range:
		_change_state(State.ATTACK)
		return
	if dist > vision_range * 1.5:
		_change_state(State.IDLE)
		return
	var dir: Vector3 = to_p.normalized()
	velocity = dir * move_speed
	_face(dir)


func _ai_attack(delta: float) -> void:
	_attack_phase_timer += delta
	match _attack_phase:
		0:  # 蓄力
			# 命中前 0.4s 发 telegraph（让玩家有弹反窗）
			if not _telegraph_emitted and _attack_phase_timer >= attack_windup - CombatConstants.PARRY_WINDOW:
				CombatBus.enemy_attack_telegraph.emit(self, CombatConstants.PARRY_WINDOW)
				_telegraph_emitted = true
			# 蓄力时朝玩家
			if _player != null:
				var d: Vector3 = _player.global_position - global_position
				d.y = 0
				if d.length_squared() > 0.001:
					_face(d.normalized())
			if _attack_phase_timer >= attack_windup:
				_attack_phase = 1
				_attack_phase_timer = 0.0
				if hit_box != null:
					hit_box.set_active(true)
				if sprite != null:
					sprite.modulate = Color(1.5, 0.4, 0.4)  ## 蓄力变红
		1:  # 命中窗
			if _attack_phase_timer >= attack_active:
				if hit_box != null:
					hit_box.set_active(false)
				_attack_phase = 2
				_attack_phase_timer = 0.0
		2:  # 收招
			if sprite != null:
				sprite.modulate = Color(1, 1, 1, 1)
			if _attack_phase_timer >= attack_recovery:
				_telegraph_emitted = false
				_change_state(State.CHASE)


func _ai_hit(delta: float) -> void:
	_hit_timer += delta
	if _hit_timer >= hit_stun_duration:
		_change_state(State.IDLE)


# ============================================================
# 状态切换
# ============================================================
func _change_state(new_s: State) -> void:
	if new_s == current_state:
		return
	# 退出当前状态
	match current_state:
		State.ATTACK:
			if hit_box != null:
				hit_box.set_active(false)
			if sprite != null:
				sprite.modulate = Color(1, 1, 1, 1)
	current_state = new_s
	# 进入新状态
	match new_s:
		State.ATTACK:
			_attack_phase = 0
			_attack_phase_timer = 0.0
			_telegraph_emitted = false
		State.HIT:
			_hit_timer = 0.0
		State.DEAD:
			_play_death_sequence()


# ============================================================
# 受击鸭子接口
# ============================================================
func on_damaged(damage: int, knockback_dir: Vector3, knockback_force: float, source: Node) -> void:
	if current_state == State.DEAD:
		return
	# 子类可在此前修改 damage（弱点 +30%）
	damage = _modify_damage(damage, source)

	current_hp = max(0, current_hp - damage)
	_knockback_velocity = knockback_dir * knockback_force
	# 受击闪暗
	if sprite != null:
		var t: Tween = sprite.create_tween()
		t.tween_property(sprite, "modulate", Color(0.4, 0.4, 0.5), 0.05)
		t.tween_property(sprite, "modulate", Color(1, 1, 1, 1), 0.10)
	if current_hp <= 0:
		_change_state(State.DEAD)
	else:
		_change_state(State.HIT)


# 子类可重写：返回根据来源/方向调整后的伤害
func _modify_damage(damage: int, _source: Node) -> int:
	return damage


# ============================================================
# 工具
# ============================================================
func _player_in_vision() -> bool:
	if _player == null:
		return false
	# 静音步：玩家隐身时敌人看不见
	if "state_machine" in _player and _player.state_machine != null:
		if _player.state_machine.has_method("is_silent_active") and _player.state_machine.is_silent_active():
			return false
	return global_position.distance_to(_player.global_position) <= vision_range


# 让攻击方向矢量旋转 HitBox（如果有）
func _face(dir: Vector3) -> void:
	if hit_box == null:
		return
	if dir.length_squared() < 0.001:
		return
	var n: Vector3 = Vector3(dir.x, 0, dir.z).normalized()
	hit_box.position = Vector3(n.x * 1.0, 0.8, n.z * 1.0)
	hit_box.rotation = Vector3(0, atan2(-n.x, -n.z), 0)


# ============================================================
# 死亡演出：0.3s 白光定格 + 白色灰烬粒子飘散
# ============================================================
func _play_death_sequence() -> void:
	if hit_box != null: hit_box.set_active(false)
	if collision != null: collision.disabled = true
	if hurt_box != null: hurt_box.monitorable = false
	if hurt_box_shape != null: hurt_box_shape.disabled = true
	_knockback_velocity = Vector3.ZERO

	# 白光定格 0.3s
	if sprite != null:
		var t1: Tween = sprite.create_tween()
		t1.tween_property(sprite, "modulate", Color(2.5, 2.5, 2.5, 1), 0.08)
		t1.tween_interval(0.22)
	await get_tree().create_timer(0.3).timeout

	# 白色灰烬粒子
	_spawn_white_ash_particles()

	# 渐隐
	if sprite != null:
		var t2: Tween = sprite.create_tween()
		t2.tween_property(sprite, "modulate", Color(1, 1, 1, 0), 0.5)
	await get_tree().create_timer(0.6).timeout
	if is_instance_valid(self):
		queue_free()


func _spawn_white_ash_particles() -> void:
	var p := GPUParticles3D.new()
	var pmat := ParticleProcessMaterial.new()
	pmat.direction = Vector3(0, 1, 0)
	pmat.spread = 90.0
	pmat.initial_velocity_min = 1.0
	pmat.initial_velocity_max = 3.0
	pmat.gravity = Vector3(0, -1, 0)
	pmat.scale_min = 0.10
	pmat.scale_max = 0.25
	var grad := Gradient.new()
	grad.add_point(0.0, Color(1, 1, 1, 1))
	grad.add_point(1.0, Color(0.7, 0.75, 0.8, 0))
	var ramp := GradientTexture1D.new()
	ramp.gradient = grad
	pmat.color_ramp = ramp

	var qmat := StandardMaterial3D.new()
	qmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	qmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	qmat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	qmat.vertex_color_use_as_albedo = true

	var qmesh := QuadMesh.new()
	qmesh.size = Vector2(0.18, 0.18)
	qmesh.material = qmat

	p.process_material = pmat
	p.draw_pass_1 = qmesh
	p.amount = 40
	p.lifetime = 1.5
	p.one_shot = true
	p.explosiveness = 0.7

	var root := get_tree().current_scene
	if root == null:
		return
	root.add_child(p)
	p.global_position = global_position + Vector3(0, 0.8, 0)
	p.emitting = true
	# 自清理
	await get_tree().create_timer(p.lifetime + 0.1).timeout
	if is_instance_valid(p):
		p.queue_free()


# 弹反成功时玩家会调用：立即中断攻击
func interrupt_swing() -> void:
	if current_state == State.ATTACK:
		_change_state(State.IDLE)
