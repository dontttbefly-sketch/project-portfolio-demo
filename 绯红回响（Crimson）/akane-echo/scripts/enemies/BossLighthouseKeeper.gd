extends EnemyBase
class_name BossLighthouseKeeper

# ============================================================
# Boss 3：灯塔守（策划案 第四卷 §6）
# HP 900 / 3 阶段
# 阶段 1：灯笼摆击 / 红光突刺 / 召唤浪低语
# 阶段 2：船幻影机制（M6.2 简化为远程齐射 + toast）
# 阶段 3：永夜（Boss 半透明，仍可命中）
# ============================================================

const BOSS_ID: String = "boss_lighthouse_keeper"

const SWING_DAMAGE: int = 28
const BEAM_DAMAGE: int = 22
const SUMMON_INTERVAL: float = 12.0

var phase: int = 1
var _phase2_done: bool = false
var _phase3_done: bool = false

enum MovePhase { IDLE, WINDUP, EXECUTE, RECOVERY }
var _move_phase: MovePhase = MovePhase.IDLE
var _move_cd: float = 1.5
var _current_move: String = ""
var _move_t: float = 0.0
var _telegraph: MeshInstance3D = null

var _summon_t: float = SUMMON_INTERVAL


func _init() -> void:
	max_hp = 900
	attack_damage = 22
	move_speed = 3.5
	vision_range = 30.0
	attack_range = 999.0
	hit_stun_duration = 0.05


func _ready() -> void:
	super._ready()
	add_to_group("boss")


func _physics_process(delta: float) -> void:
	delta *= time_scale_multiplier
	if current_state == State.DEAD:
		return

	# 阶段切换
	var ratio: float = float(current_hp) / float(max_hp)
	if not _phase2_done and ratio <= 0.66:
		_phase2_done = true
		phase = 2
		CombatBus.toast.emit("阶段 2 — 船幻影", 2.0)
	if not _phase3_done and ratio <= 0.33:
		_phase3_done = true
		phase = 3
		# 永夜：sprite 半透明
		if sprite != null:
			sprite.modulate = Color(0.4, 0.5, 0.7, 0.35)
		CombatBus.toast.emit("阶段 3 — 永夜", 2.0)

	# 击退衰减
	if _knockback_velocity.length() > 0.1:
		velocity = _knockback_velocity
		_knockback_velocity *= 0.85
	else:
		_knockback_velocity = Vector3.ZERO
		velocity = Vector3.ZERO

	if _player == null or not is_instance_valid(_player):
		_player = get_tree().get_first_node_in_group("player")

	if current_state == State.HIT:
		_ai_hit(delta)
		move_and_slide()
		return

	# 周期召唤浪低语（仅阶段 1/2）
	if phase < 3:
		_summon_t -= delta
		if _summon_t <= 0.0:
			_summon_t = SUMMON_INTERVAL
			_summon_whisperer()

	# 招式调度
	match _move_phase:
		MovePhase.IDLE:
			_move_cd -= delta
			if _move_cd <= 0.0:
				_select_move()
		MovePhase.WINDUP:
			_tick_windup(delta)
		MovePhase.EXECUTE:
			_tick_execute(delta)
		MovePhase.RECOVERY:
			_tick_recovery(delta)

	move_and_slide()


func _select_move() -> void:
	var pool: Array
	match phase:
		1: pool = ["lantern_swing", "red_beam"]
		2: pool = ["lantern_swing", "red_beam", "ship_phantom"]
		3: pool = ["red_beam", "red_beam", "lantern_swing"]
		_: pool = ["lantern_swing"]
	_current_move = pool[randi() % pool.size()]
	_move_phase = MovePhase.WINDUP
	_move_t = 0.0
	if _player != null:
		var d: Vector3 = _player.global_position - global_position
		d.y = 0
		if d.length_squared() > 0.001:
			_face(d.normalized())
	_spawn_telegraph(_current_move)
	var lead: float = CombatConstants.PARRY_WINDOW
	get_tree().create_timer(max(0.0, _windup_time(_current_move) - lead), true, false, true).timeout.connect(_emit_telegraph_signal)


func _windup_time(m: String) -> float:
	match m:
		"lantern_swing": return 0.9
		"red_beam": return 1.0
		"ship_phantom": return 1.2
	return 0.5


func _emit_telegraph_signal() -> void:
	if current_state == State.DEAD or _move_phase != MovePhase.WINDUP:
		return
	CombatBus.enemy_attack_telegraph.emit(self, CombatConstants.PARRY_WINDOW)


func _tick_windup(delta: float) -> void:
	_move_t += delta
	if _move_t >= _windup_time(_current_move):
		_clear_telegraph()
		_move_phase = MovePhase.EXECUTE
		_move_t = 0.0
		_start_execute(_current_move)


func _start_execute(m: String) -> void:
	match m:
		"lantern_swing":
			# 360° AoE 灯笼摆击
			if _player != null:
				var d: float = global_position.distance_to(_player.global_position)
				if d <= 4.0:
					var dir: Vector3 = _player.global_position - global_position
					dir.y = 0
					if dir.length_squared() > 0.001:
						dir = dir.normalized()
					else:
						dir = Vector3(0, 0, 1)
					if _player.has_method("on_damaged"):
						_player.on_damaged(SWING_DAMAGE, dir, 6.0, self)
		"red_beam":
			# 直线红光突刺
			_throw_red_beam()
		"ship_phantom":
			# 船幻影齐射
			_ship_phantom_volley.call_deferred()


func _tick_execute(delta: float) -> void:
	_move_t += delta
	if _move_t >= 0.4:
		_move_phase = MovePhase.RECOVERY
		_move_t = 0.0


func _tick_recovery(delta: float) -> void:
	_move_t += delta
	if _move_t >= 0.5:
		_move_phase = MovePhase.IDLE
		_move_cd = randf_range(1.5, 2.5)


# ============================================================
# 招式实现
# ============================================================
func _throw_red_beam() -> void:
	if _player == null:
		return
	var dir: Vector3 = _player.global_position - global_position
	dir.y = 0
	if dir.length_squared() < 0.001:
		dir = Vector3(0, 0, -1)
	dir = dir.normalized()
	var packed: PackedScene = load("res://scenes/enemies/UmbrellaProjectile.tscn")
	if packed == null:
		return
	var p: Node3D = packed.instantiate()
	var root := get_tree().current_scene
	if root == null:
		return
	root.add_child(p)
	p.global_position = global_position + Vector3(0, 1.5, 0) + dir * 1.5
	if "direction" in p: p.direction = dir
	if "damage" in p: p.damage = BEAM_DAMAGE
	if "speed" in p: p.speed = 18.0
	var sp := p.get_node_or_null("Sprite") as Sprite3D
	if sp != null:
		sp.modulate = Color(2.0, 0.3, 0.4, 1)
		sp.pixel_size = 0.06


func _ship_phantom_volley() -> void:
	# 5 发扇形（基础朝玩家 ±25°）
	if _player == null:
		return
	var base: Vector3 = (_player.global_position - global_position)
	base.y = 0
	if base.length_squared() < 0.001:
		base = Vector3(0, 0, -1)
	base = base.normalized()
	for a in [-0.45, -0.22, 0.0, 0.22, 0.45]:
		var rotated: Vector3 = base.rotated(Vector3.UP, a)
		_throw_phantom(rotated)
		await get_tree().create_timer(0.06, true, false, true).timeout


func _throw_phantom(dir: Vector3) -> void:
	var packed: PackedScene = load("res://scenes/enemies/UmbrellaProjectile.tscn")
	if packed == null:
		return
	var p: Node3D = packed.instantiate()
	var root := get_tree().current_scene
	if root == null:
		return
	root.add_child(p)
	p.global_position = global_position + Vector3(0, 1.0, 0) + dir * 1.5
	if "direction" in p: p.direction = dir
	if "damage" in p: p.damage = 14
	var sp := p.get_node_or_null("Sprite") as Sprite3D
	if sp != null:
		sp.modulate = Color(0.5, 0.6, 0.9, 0.85)


func _summon_whisperer() -> void:
	# 场上限 3 只浪低语
	var existing: int = 0
	for e in get_tree().get_nodes_in_group("enemy"):
		if e is WaveWhisperer and is_instance_valid(e):
			existing += 1
	if existing >= 3:
		return
	var packed: PackedScene = load("res://scenes/enemies/WaveWhisperer.tscn")
	if packed == null:
		return
	var root := get_tree().current_scene
	if root == null:
		return
	var w := packed.instantiate()
	root.add_child(w)
	var angle: float = randf() * TAU
	(w as Node3D).global_position = global_position + Vector3(cos(angle) * 3.0, 0, sin(angle) * 3.0)


# ============================================================
# 攻击指示器
# ============================================================
func _spawn_telegraph(m: String) -> void:
	_clear_telegraph()
	var mi := MeshInstance3D.new()
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(0.8, 0.05, 0.15, 0.40)
	var qmesh := QuadMesh.new()
	mi.rotation_degrees = Vector3(-90, 0, 0)
	match m:
		"lantern_swing":
			qmesh.size = Vector2(8.0, 8.0)
			mi.position = Vector3(0, 0.05, 0)
		"red_beam":
			qmesh.size = Vector2(0.8, 8.0)
			mi.position = Vector3(0, 0.05, -4.0)
		"ship_phantom":
			qmesh.size = Vector2(7.0, 7.0)
			mi.position = Vector3(0, 0.05, -3.0)
		_:
			qmesh.size = Vector2(2.0, 2.0)
			mi.position = Vector3.ZERO
	qmesh.material = mat
	mi.mesh = qmesh
	add_child(mi)
	_telegraph = mi


func _clear_telegraph() -> void:
	if _telegraph != null and is_instance_valid(_telegraph):
		_telegraph.queue_free()
	_telegraph = null


# ============================================================
# 死亡：奖励发放
# ============================================================
func _play_death_sequence() -> void:
	if hit_box != null: hit_box.set_active(false)
	if collision != null: collision.disabled = true
	if hurt_box != null: hurt_box.monitorable = false
	if hurt_box_shape != null: hurt_box_shape.disabled = true
	_clear_telegraph()

	if sprite != null:
		var t: Tween = sprite.create_tween()
		t.tween_property(sprite, "modulate", Color(2.5, 2.5, 2.5, 1), 0.3)
	await get_tree().create_timer(0.6).timeout

	MonologueSystem.show_monologue("「灯还亮着，只是你看着的方向不在这里。」", 5.0)

	if sprite != null:
		var t2: Tween = sprite.create_tween()
		t2.tween_property(sprite, "modulate", Color(1, 1, 1, 0), 1.5)
	await get_tree().create_timer(2.0).timeout

	_grant_rewards()
	if is_instance_valid(self):
		queue_free()


func _grant_rewards() -> void:
	# 1. 影渡升级（距离 ×1.5）
	PlayerProgress.dash_distance_multiplier = 1.5
	# 2. 丝缕 +150
	PlayerProgress.add_threads(150)
	# 3. 静默之心 +25
	EchoSystem.add_max_echo(25)
	# 4. 风铃护符（被动道具入库存）
	var inv: Dictionary = PlayerProgress.item_inventory
	inv["wind_chime"] = int(inv.get("wind_chime", 0)) + 1
	PlayerProgress.item_inventory = inv
	# 5. 击败记录
	if not PlayerProgress.killed_bosses.has(BOSS_ID):
		PlayerProgress.killed_bosses.append(BOSS_ID)
	CombatBus.boss_defeated.emit(BOSS_ID)
	CombatBus.toast.emit("获得：影渡升级 (×1.5) / +150 丝缕 / 静默之心 / 风铃护符", 5.0)
	SaveSystem.save_game()
