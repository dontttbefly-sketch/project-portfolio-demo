extends EnemyBase
class_name BossUmbrellaMan

# ============================================================
# Boss 1：雨衣的男人（策划案 第四卷 §4）
# - HP 600 / 两阶段 / HP 50% 转阶段 2
# - 阶段 1：折伞戳 + 伞砸地
# - 阶段 2：夺伞冲撞 + 伞骨投掷 + 红伞蔽雨
# - 击败：独白 + 奖励
# ============================================================

const BOSS_ID: String = "boss_umbrella_man"

# 招式数值
const THRUST_DAMAGE: int = 20
const THRUST_WINDUP: float = 0.7
const SLAM_DAMAGE: int = 30
const SLAM_WINDUP: float = 1.2
const SLAM_RADIUS: float = 3.0
const DASH_DAMAGE: int = 30
const DASH_SPEED: float = 14.0
const RIB_DAMAGE: int = 12
const RIB_INTERVAL: float = 0.18

# 红伞之雨
const RAIN_INTERVAL: float = 22.0   ## 阶段 2 内多久来一次红雨
const RAIN_DURATION: float = 5.0
const RAIN_DAMAGE_PER_SEC: int = 5

# 阶段
var phase: int = 1
var _phase_transition_done: bool = false

# 招式调度
enum MovePhase { IDLE, WINDUP, EXECUTE, RECOVERY }
var _move_phase_state: MovePhase = MovePhase.IDLE
var _move_cooldown: float = 1.5
var _current_move: String = ""
var _move_timer: float = 0.0
var _telegraph_node: MeshInstance3D = null

# 红伞之雨
var _rain_timer: float = 12.0
var _rain_active: bool = false
var _rain_remaining: float = 0.0
var _rain_dmg_accum: float = 0.0
var _red_umbrella: Node3D = null


func _init() -> void:
	max_hp = 600
	attack_damage = 20
	move_speed = 4.0
	vision_range = 30.0
	attack_range = 999.0
	attack_windup = 0.7
	attack_active = 0.2
	attack_recovery = 0.4
	hit_stun_duration = 0.05  ## Boss 几乎不被硬直


func _ready() -> void:
	super._ready()
	add_to_group("boss")


func _physics_process(delta: float) -> void:
	delta *= time_scale_multiplier
	if current_state == State.DEAD:
		return

	# 阶段切换
	if phase == 1 and current_hp <= max_hp / 2 and not _phase_transition_done:
		_phase_transition_done = true
		_run_phase_transition()
		return  # 过渡期间不走主 AI

	# 击退衰减
	if _knockback_velocity.length() > 0.1:
		velocity = _knockback_velocity
		_knockback_velocity *= 0.85
	else:
		_knockback_velocity = Vector3.ZERO
		velocity = Vector3.ZERO

	if _player == null or not is_instance_valid(_player):
		_player = get_tree().get_first_node_in_group("player")

	# 受击硬直时不出招
	if current_state == State.HIT:
		_ai_hit(delta)
		move_and_slide()
		return

	# 红雨循环（仅阶段 2）
	if phase == 2:
		_tick_red_rain(delta)

	# 招式调度
	match _move_phase_state:
		MovePhase.IDLE:
			_move_cooldown -= delta
			if _move_cooldown <= 0.0:
				_select_move()
		MovePhase.WINDUP:
			_tick_windup(delta)
		MovePhase.EXECUTE:
			_tick_execute(delta)
		MovePhase.RECOVERY:
			_tick_recovery(delta)

	move_and_slide()


# ============================================================
# 招式选择
# ============================================================
func _select_move() -> void:
	var pool: Array = []
	if phase == 1:
		pool = ["thrust", "slam"]
	else:
		pool = ["dash", "ribs"]
	_current_move = pool[randi() % pool.size()]
	_move_phase_state = MovePhase.WINDUP
	_move_timer = 0.0
	# 朝玩家
	if _player != null:
		var d: Vector3 = _player.global_position - global_position
		d.y = 0.0
		if d.length_squared() > 0.001:
			_face(d.normalized())
	# 创建预告指示器
	_spawn_telegraph(_current_move)
	# 命中前 0.4s 发 telegraph 信号给玩家弹反
	var windup: float = _move_windup(_current_move)
	var lead: float = CombatConstants.PARRY_WINDOW
	var delay: float = max(0.0, windup - lead)
	# 用真实时间触发 telegraph，避免被 time_scale 影响
	get_tree().create_timer(delay, true, false, true).timeout.connect(_emit_parry_telegraph)


func _emit_parry_telegraph() -> void:
	if current_state == State.DEAD or _move_phase_state != MovePhase.WINDUP:
		return
	CombatBus.enemy_attack_telegraph.emit(self, CombatConstants.PARRY_WINDOW)


func _move_windup(m: String) -> float:
	match m:
		"thrust": return THRUST_WINDUP
		"slam": return SLAM_WINDUP
		"dash": return 0.6
		"ribs": return 0.8
	return 0.5


# ============================================================
# 蓄力、执行、收招
# ============================================================
func _tick_windup(delta: float) -> void:
	_move_timer += delta
	var windup := _move_windup(_current_move)
	if _move_timer >= windup:
		_move_phase_state = MovePhase.EXECUTE
		_move_timer = 0.0
		_clear_telegraph()
		_start_execute(_current_move)


func _start_execute(m: String) -> void:
	match m:
		"thrust":
			# 直线突刺：HitBox 激活 0.25s
			_set_hitbox_for_attack(THRUST_DAMAGE, 5.0)
			if hit_box != null:
				hit_box.set_active(true)
		"slam":
			# 砸地：圆形 3m 范围内瞬时伤害
			_perform_slam_aoe()
		"dash":
			# 夺伞冲撞：朝红伞快速移动
			_start_dash_at_umbrella()
		"ribs":
			# 伞骨投掷：3 连发（间隔 RIB_INTERVAL）
			_throw_ribs.call_deferred()


func _tick_execute(delta: float) -> void:
	_move_timer += delta
	match _current_move:
		"thrust":
			if _move_timer >= 0.25:
				if hit_box != null:
					hit_box.set_active(false)
				_move_phase_state = MovePhase.RECOVERY
				_move_timer = 0.0
		"slam":
			# 砸地是瞬时；执行完直接收招
			_move_phase_state = MovePhase.RECOVERY
			_move_timer = 0.0
		"dash":
			# 朝红伞冲；用速度直推
			if _red_umbrella != null and is_instance_valid(_red_umbrella):
				var dir: Vector3 = _red_umbrella.global_position - global_position
				dir.y = 0
				if dir.length() < 1.0:
					# 砸碎红伞
					if _red_umbrella.has_method("destroy_now"):
						_red_umbrella.destroy_now()
					_red_umbrella = null
					_move_phase_state = MovePhase.RECOVERY
					_move_timer = 0.0
				else:
					velocity = dir.normalized() * DASH_SPEED
			else:
				_move_phase_state = MovePhase.RECOVERY
				_move_timer = 0.0
			if _move_timer >= 1.5:  # 兜底超时
				_move_phase_state = MovePhase.RECOVERY
				_move_timer = 0.0
		"ribs":
			# 投掷已 deferred 完成
			if _move_timer >= 0.6:
				_move_phase_state = MovePhase.RECOVERY
				_move_timer = 0.0


func _tick_recovery(delta: float) -> void:
	_move_timer += delta
	if _move_timer >= 0.5:
		_move_phase_state = MovePhase.IDLE
		_move_cooldown = randf_range(1.5, 2.5)
		_current_move = ""


# ============================================================
# 砸地 AOE：在 SLAM_RADIUS 内对玩家造成伤害
# ============================================================
func _perform_slam_aoe() -> void:
	if _player == null:
		return
	var d: float = global_position.distance_to(_player.global_position)
	if d <= SLAM_RADIUS + 0.5:
		var dir: Vector3 = _player.global_position - global_position
		dir.y = 0
		if dir.length_squared() > 0.001:
			dir = dir.normalized()
		else:
			dir = Vector3(0, 0, 1)
		if _player.has_method("on_damaged"):
			_player.on_damaged(SLAM_DAMAGE, dir, 6.0, self)
	# 镜头震动
	var cam = _player.get_node_or_null("Camera") if _player else null
	if cam != null and cam.has_method("add_shake"):
		cam.add_shake(0.4)


# ============================================================
# 夺伞冲撞：把红伞作为目标，靠近后砸碎
# ============================================================
func _start_dash_at_umbrella() -> void:
	if _red_umbrella == null or not is_instance_valid(_red_umbrella):
		# 没有伞可冲；直接收招
		_move_phase_state = MovePhase.RECOVERY
		return


# ============================================================
# 伞骨投掷：3 发，间隔 RIB_INTERVAL，朝玩家方向锁向
# ============================================================
func _throw_ribs() -> void:
	if _player == null:
		return
	var dir: Vector3 = _player.global_position - global_position
	dir.y = 0
	if dir.length_squared() < 0.001:
		dir = Vector3(0, 0, -1)
	dir = dir.normalized()
	for i in range(3):
		_spawn_rib(dir)
		await get_tree().create_timer(RIB_INTERVAL, true, false, true).timeout


func _spawn_rib(direction: Vector3) -> void:
	var packed: PackedScene = load("res://scenes/enemies/UmbrellaProjectile.tscn")
	if packed == null:
		return
	var rib: Node3D = packed.instantiate()
	var root := get_tree().current_scene
	if root == null:
		return
	root.add_child(rib)
	rib.global_position = global_position + Vector3(0, 1.0, 0) + direction * 1.5
	if "direction" in rib:
		rib.direction = direction


# ============================================================
# 红雨之雨：阶段 2 周期性触发
# ============================================================
func _tick_red_rain(delta: float) -> void:
	if _rain_active:
		_rain_remaining -= delta
		# 玩家不在伞下持续受伤（每秒 5）
		_rain_dmg_accum += delta
		if _rain_dmg_accum >= 1.0:
			_rain_dmg_accum -= 1.0
			if _player != null and not _player_is_sheltered():
				if _player.has_method("on_damaged"):
					_player.on_damaged(RAIN_DAMAGE_PER_SEC, Vector3.ZERO, 0.0, self)
		if _rain_remaining <= 0.0:
			_rain_active = false
			CombatBus.toast.emit("红雨停了", 1.5)
	else:
		_rain_timer -= delta
		if _rain_timer <= 0.0:
			_rain_active = true
			_rain_remaining = RAIN_DURATION
			_rain_timer = RAIN_INTERVAL
			CombatBus.toast.emit("⛈ 红雨降临，速进伞下！", 2.0)


func _player_is_sheltered() -> bool:
	if _red_umbrella == null or not is_instance_valid(_red_umbrella):
		return false
	if _player == null:
		return false
	var d: float = global_position.distance_to(_player.global_position)
	# 简化：检查玩家与红伞距离 ≤ 1.8m 即视为蔽护
	d = _red_umbrella.global_position.distance_to(_player.global_position)
	return d <= 1.8


# ============================================================
# 阶段过渡
# ============================================================
func _run_phase_transition() -> void:
	phase = 2
	_move_phase_state = MovePhase.IDLE
	_move_cooldown = 2.5
	_clear_telegraph()
	if hit_box != null: hit_box.set_active(false)
	# Boss 跪下：sprite 旋转
	if sprite != null:
		var t: Tween = sprite.create_tween()
		t.tween_property(sprite, "rotation", Vector3(deg_to_rad(15), 0, 0), 0.5)
	# 独白
	MonologueSystem.show_monologue("「车站三号口……别走错……」", 3.0)
	# 1s 跪 → 2s 抬头
	await get_tree().create_timer(2.5).timeout
	if sprite != null:
		var t2: Tween = sprite.create_tween()
		t2.tween_property(sprite, "rotation", Vector3.ZERO, 0.4)
	# 生成红伞
	_spawn_red_umbrella()
	CombatBus.toast.emit("阶段 2 — 记起来的父亲", 2.0)


func _spawn_red_umbrella() -> void:
	var packed: PackedScene = load("res://scenes/levels/components/RedUmbrellaShelter.tscn")
	if packed == null:
		return
	var umbrella: Node3D = packed.instantiate()
	var root := get_tree().current_scene
	if root == null:
		return
	root.add_child(umbrella)
	umbrella.global_position = global_position + Vector3(0, 0, 5)  ## 战场中央偏南
	_red_umbrella = umbrella


# ============================================================
# 攻击指示器（QuadMesh + 红色透明）
# ============================================================
func _spawn_telegraph(move_id: String) -> void:
	_clear_telegraph()
	var mi := MeshInstance3D.new()
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(0.8, 0.05, 0.15, 0.40)
	var qmesh := QuadMesh.new()
	# 立着的 quad 不行，要躺平。把 mesh 旋转 -90° 绕 X
	mi.rotation_degrees = Vector3(-90, 0, 0)
	match move_id:
		"thrust":
			qmesh.size = Vector2(1.5, 4.0)
			mi.position = Vector3(0, 0.05, -2.0)
		"slam":
			qmesh.size = Vector2(SLAM_RADIUS * 2, SLAM_RADIUS * 2)
			mi.position = Vector3(0, 0.05, 0)
		"dash":
			qmesh.size = Vector2(2.0, 6.0)
			mi.position = Vector3(0, 0.05, -3.0)
		"ribs":
			qmesh.size = Vector2(0.6, 4.0)
			mi.position = Vector3(0, 0.05, -2.0)
		_:
			qmesh.size = Vector2(1.5, 1.5)
			mi.position = Vector3.ZERO
	qmesh.material = mat
	mi.mesh = qmesh
	add_child(mi)
	_telegraph_node = mi


func _clear_telegraph() -> void:
	if _telegraph_node != null and is_instance_valid(_telegraph_node):
		_telegraph_node.queue_free()
	_telegraph_node = null


func _set_hitbox_for_attack(damage: int, knockback: float) -> void:
	if hit_box == null:
		return
	hit_box.damage = damage
	hit_box.knockback_force = knockback


# ============================================================
# 死亡：覆盖 EnemyBase 的演出，加入奖励发放
# ============================================================
func _play_death_sequence() -> void:
	if hit_box != null: hit_box.set_active(false)
	if collision != null: collision.disabled = true
	if hurt_box != null: hurt_box.monitorable = false
	if hurt_box_shape != null: hurt_box_shape.disabled = true
	_clear_telegraph()
	_rain_active = false
	# 红伞清理
	if _red_umbrella != null and is_instance_valid(_red_umbrella):
		_red_umbrella.queue_free()
		_red_umbrella = null

	# 白光定格
	if sprite != null:
		var t1: Tween = sprite.create_tween()
		t1.tween_property(sprite, "modulate", Color(2.5, 2.5, 2.5, 1), 0.3)
	await get_tree().create_timer(0.6).timeout

	# 阿茜独白
	MonologueSystem.show_monologue("「这位父亲。您的伞我会带给她。但是您的话——您的话她已经不需要了。她长大了。」", 5.0)

	# 渐隐
	if sprite != null:
		var t2: Tween = sprite.create_tween()
		t2.tween_property(sprite, "modulate", Color(1, 1, 1, 0), 1.5)
	await get_tree().create_timer(2.0).timeout

	# === 奖励发放 ===
	_grant_rewards()

	if is_instance_valid(self):
		queue_free()


func _grant_rewards() -> void:
	# 1. 缠红丝解锁
	PlayerProgress.has_grapple = true
	var p := get_tree().get_first_node_in_group("player")
	if p != null and "has_grapple" in p:
		p.has_grapple = true
	# 2. 绯红丝缕 +60
	PlayerProgress.add_threads(60)
	# 3. 静默之心：max_echo +25
	EchoSystem.add_max_echo(25)
	# 4. 击败记录
	if not PlayerProgress.killed_bosses.has(BOSS_ID):
		PlayerProgress.killed_bosses.append(BOSS_ID)
	# 5. UI 通知
	CombatBus.boss_defeated.emit(BOSS_ID)
	CombatBus.toast.emit("获得：缠红丝 / +60 丝缕 / 静默之心 (残响上限+25)", 5.0)
	# 6. 自动存档
	SaveSystem.save_game()
