extends EnemyBase
class_name BossOriginalYong

# ============================================================
# 隐藏 Boss：最初的咏（M7）
# HP 1500（受 NG+ 倍率影响）/ 2 阶段
# 阶段 1：远程齐射 + 近战
# 阶段 2（HP 50%）：召唤 WaveWhisperers + 攻速翻倍
# 击败 → 立即触发结局 C
# ============================================================

const BOSS_ID: String = "boss_original_yong"

var phase: int = 1
var _phase2_done: bool = false

enum MovePhase { IDLE, WINDUP, EXECUTE, RECOVERY }
var _move_phase: MovePhase = MovePhase.IDLE
var _move_cd: float = 1.5
var _current_move: String = ""
var _move_t: float = 0.0
var _telegraph: MeshInstance3D = null
var _summon_t: float = 8.0


func _init() -> void:
	max_hp = 1500
	attack_damage = 28
	move_speed = 5.0
	vision_range = 30.0
	attack_range = 999.0
	hit_stun_duration = 0.05


func _ready() -> void:
	super._ready()  ## EnemyBase._ready 已应用 NG+ 倍率，无需重复
	add_to_group("boss")
	# M7v2 凝时反惩罚（策划案 §8 反规则设计）
	CombatBus.parry_executed.connect(_on_player_parry)
	# M7v2 动作模仿（阶段 1）：玩家命中本 Boss → 0.5s 后 Boss 反击
	CombatBus.hit_landed.connect(_on_hit_landed_mimic)


# 凝时反惩罚：玩家用一次凝时斩 → Boss HP +50
func _on_player_parry() -> void:
	if current_state == State.DEAD:
		return
	current_hp = min(max_hp, current_hp + 50)
	if sprite != null:
		var t: Tween = sprite.create_tween()
		t.tween_property(sprite, "modulate", Color(2.5, 0.8, 1.0), 0.1)
		t.tween_property(sprite, "modulate", _phase_modulate(), 0.2)
	CombatBus.toast.emit("⏱ 你用了凝时 — 她回了 50 HP", 1.5)


func _phase_modulate() -> Color:
	if phase == 2:
		return Color(2.0, 0.5, 0.7, 1)
	return Color(1.5, 0.7, 0.9, 1)


# 动作模仿（仅阶段 1）：玩家命中本 Boss → 0.5s 后 Boss thrust 反击
func _on_hit_landed_mimic(_attacker: Node, target: Node, _damage: int, _dir: Vector3, _force: float) -> void:
	if phase != 1 or current_state == State.DEAD:
		return
	if target != self:
		return
	get_tree().create_timer(0.5).timeout.connect(_mimic_attack)


func _mimic_attack() -> void:
	if current_state == State.DEAD or _player == null:
		return
	if _move_phase != MovePhase.IDLE:
		return  ## 已在出招中，不打断
	_current_move = "thrust"
	_move_phase = MovePhase.WINDUP
	_move_t = 0.0
	if _player != null:
		var d: Vector3 = _player.global_position - global_position
		d.y = 0
		if d.length_squared() > 0.001:
			_face(d.normalized())
	_spawn_telegraph(_current_move)
	get_tree().create_timer(max(0.0, _windup_time(_current_move) - CombatConstants.PARRY_WINDOW), true, false, true).timeout.connect(_emit_telegraph_signal)


func _physics_process(delta: float) -> void:
	delta *= time_scale_multiplier
	if current_state == State.DEAD:
		return

	# 阶段切换
	if not _phase2_done and current_hp <= max_hp / 2:
		_phase2_done = true
		phase = 2
		if sprite != null:
			sprite.modulate = Color(2.0, 0.5, 0.7, 1)
		CombatBus.toast.emit("阶段 2 — 真名归位", 2.5)

	# 击退
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

	# 阶段 2 周期召唤
	if phase == 2:
		_summon_t -= delta
		if _summon_t <= 0.0:
			_summon_t = 9.0
			_summon_whisperer()

	match _move_phase:
		MovePhase.IDLE:
			_move_cd -= delta * (1.5 if phase == 2 else 1.0)  ## 阶段 2 攻速 ×1.5
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
		1: pool = ["volley", "thrust"]
		2: pool = ["volley", "thrust", "burst"]
		_: pool = ["thrust"]
	_current_move = pool[randi() % pool.size()]
	_move_phase = MovePhase.WINDUP
	_move_t = 0.0
	if _player != null:
		var d: Vector3 = _player.global_position - global_position
		d.y = 0
		if d.length_squared() > 0.001:
			_face(d.normalized())
	_spawn_telegraph(_current_move)
	get_tree().create_timer(max(0.0, _windup_time(_current_move) - CombatConstants.PARRY_WINDOW), true, false, true).timeout.connect(_emit_telegraph_signal)


func _windup_time(m: String) -> float:
	match m:
		"volley": return 0.8
		"thrust": return 0.5
		"burst": return 1.0
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
		"volley":
			_volley.call_deferred()
		"thrust":
			# 直线突刺
			if _player != null:
				var d: float = global_position.distance_to(_player.global_position)
				if d <= 4.0:
					var dir: Vector3 = _player.global_position - global_position
					dir.y = 0
					if dir.length_squared() > 0.001: dir = dir.normalized()
					else: dir = Vector3(0, 0, 1)
					if _player.has_method("on_damaged"):
						_player.on_damaged(28, dir, 6.0, self)
		"burst":
			# 周身爆发
			if _player != null:
				var d2: float = global_position.distance_to(_player.global_position)
				if d2 <= 5.0:
					var dir2: Vector3 = _player.global_position - global_position
					dir2.y = 0
					if dir2.length_squared() > 0.001: dir2 = dir2.normalized()
					else: dir2 = Vector3(0, 0, 1)
					if _player.has_method("on_damaged"):
						_player.on_damaged(35, dir2, 8.0, self)


func _tick_execute(delta: float) -> void:
	_move_t += delta
	if _move_t >= 0.4:
		_move_phase = MovePhase.RECOVERY
		_move_t = 0.0


func _tick_recovery(delta: float) -> void:
	_move_t += delta
	if _move_t >= (0.5 if phase == 1 else 0.35):
		_move_phase = MovePhase.IDLE
		_move_cd = randf_range(1.0, 2.0)


func _volley() -> void:
	if _player == null:
		return
	var base: Vector3 = (_player.global_position - global_position)
	base.y = 0
	if base.length_squared() < 0.001:
		base = Vector3(0, 0, -1)
	base = base.normalized()
	for a in [-0.45, -0.22, 0.0, 0.22, 0.45]:
		var rotated: Vector3 = base.rotated(Vector3.UP, a)
		_throw(rotated, 16)
		await get_tree().create_timer(0.06, true, false, true).timeout


func _throw(dir: Vector3, dmg: int) -> void:
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
	if "damage" in p: p.damage = dmg
	var sp := p.get_node_or_null("Sprite") as Sprite3D
	if sp != null:
		sp.modulate = Color(1.5, 0.4, 0.5, 1)


func _summon_whisperer() -> void:
	var existing: int = 0
	for e in get_tree().get_nodes_in_group("enemy"):
		if e is WaveWhisperer and is_instance_valid(e):
			existing += 1
	if existing >= 2:
		return
	var packed: PackedScene = load("res://scenes/enemies/WaveWhisperer.tscn")
	if packed == null:
		return
	var w: Node3D = packed.instantiate()
	var root := get_tree().current_scene
	if root == null:
		return
	root.add_child(w)
	var angle: float = randf() * TAU
	w.global_position = global_position + Vector3(cos(angle) * 3.0, 0, sin(angle) * 3.0)


func _spawn_telegraph(m: String) -> void:
	_clear_telegraph()
	var mi := MeshInstance3D.new()
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(1.0, 0.05, 0.20, 0.50)
	var qmesh := QuadMesh.new()
	mi.rotation_degrees = Vector3(-90, 0, 0)
	match m:
		"volley":
			qmesh.size = Vector2(7.0, 7.0)
			mi.position = Vector3(0, 0.05, -3.0)
		"thrust":
			qmesh.size = Vector2(0.8, 4.0)
			mi.position = Vector3(0, 0.05, -2.0)
		"burst":
			qmesh.size = Vector2(10.0, 10.0)
			mi.position = Vector3(0, 0.05, 0)
		_:
			qmesh.size = Vector2(1.5, 1.5)
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
# 死亡 → 直接触发结局 C
# ============================================================
func _play_death_sequence() -> void:
	if hit_box != null: hit_box.set_active(false)
	if collision != null: collision.disabled = true
	if hurt_box != null: hurt_box.monitorable = false
	if hurt_box_shape != null: hurt_box_shape.disabled = true
	_clear_telegraph()

	if sprite != null:
		var t: Tween = sprite.create_tween()
		t.tween_property(sprite, "modulate", Color(2.8, 2.0, 2.4, 1), 0.5)
	await get_tree().create_timer(0.8).timeout

	MonologueSystem.show_monologue("「原来你也是被忘记的那一个。我们终于见面了。」", 5.0)

	if sprite != null:
		var t2: Tween = sprite.create_tween()
		t2.tween_property(sprite, "modulate", Color(1, 1, 1, 0), 2.0)
	await get_tree().create_timer(2.5).timeout

	# 记录击败 + 触发结局 C
	if not PlayerProgress.killed_bosses.has(BOSS_ID):
		PlayerProgress.killed_bosses.append(BOSS_ID)
	CombatBus.boss_defeated.emit(BOSS_ID)
	SaveSystem.save_game()
	if is_instance_valid(self):
		queue_free()
	# 触发结局 C
	await get_tree().create_timer(1.0).timeout
	EndingSystem.trigger_ending()
