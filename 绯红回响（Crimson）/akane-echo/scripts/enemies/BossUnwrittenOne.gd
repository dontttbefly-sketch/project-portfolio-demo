extends EnemyBase
class_name BossUnwrittenOne

# ============================================================
# Boss 2：未写完的人（策划案 第四卷 §5）
# HP 750 / 3 阶段
# 阶段 1（HP 100-66%）：字符飞射 / 墨点投掷
# 阶段 2（HP 66-33%）：未写完的字（M6.1 简化为远程齐射 + toast 提示）
# 阶段 3（HP 33-0%）：终章狂书（攻击间隔 -30%）+ END. 重锤
# ============================================================

const BOSS_ID: String = "boss_unwritten_one"

# 招式时长
const CHAR_SHOT_WINDUP: float = 0.6
const INK_DOT_WINDUP: float = 0.9
const INK_DOT_DAMAGE: int = 25
const END_HAMMER_DAMAGE: int = 40
const END_HAMMER_RADIUS: float = 4.0

var phase: int = 1
var _phase2_done: bool = false
var _phase3_done: bool = false

enum MovePhase { IDLE, WINDUP, EXECUTE, RECOVERY }
var _move_phase: MovePhase = MovePhase.IDLE
var _move_cd: float = 1.5
var _current_move: String = ""
var _move_t: float = 0.0
var _telegraph: MeshInstance3D = null
var _phase3_speed_mult: float = 1.0


func _init() -> void:
	max_hp = 750
	attack_damage = 18
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
	var hp_ratio: float = float(current_hp) / float(max_hp)
	if not _phase2_done and hp_ratio <= 0.66:
		_phase2_done = true
		phase = 2
		CombatBus.toast.emit("阶段 2 — 未写完的字", 2.0)
	if not _phase3_done and hp_ratio <= 0.33:
		_phase3_done = true
		phase = 3
		_phase3_speed_mult = 1.3   ## 攻击间隔 -30% 等价于速度 ×1.3
		if sprite != null:
			sprite.modulate = Color(1.6, 0.5, 0.4)
		CombatBus.toast.emit("阶段 3 — 终章狂书", 2.0)

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

	# 招式调度
	match _move_phase:
		MovePhase.IDLE:
			_move_cd -= delta * _phase3_speed_mult
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
	# 阶段决定招式池
	var pool: Array
	match phase:
		1: pool = ["char_shot", "ink_dot"]
		2: pool = ["char_shot", "ink_dot", "char_volley"]
		3: pool = ["char_volley", "end_hammer", "ink_dot"]
		_: pool = ["char_shot"]
	_current_move = pool[randi() % pool.size()]
	_move_phase = MovePhase.WINDUP
	_move_t = 0.0
	if _player != null:
		var d: Vector3 = _player.global_position - global_position
		d.y = 0
		if d.length_squared() > 0.001:
			_face(d.normalized())
	_spawn_telegraph(_current_move)
	# Telegraph 给玩家弹反窗
	var windup: float = _move_windup_time(_current_move)
	get_tree().create_timer(max(0.0, windup - CombatConstants.PARRY_WINDOW), true, false, true).timeout.connect(_emit_telegraph_signal)


func _move_windup_time(m: String) -> float:
	match m:
		"char_shot": return CHAR_SHOT_WINDUP
		"ink_dot": return INK_DOT_WINDUP
		"char_volley": return 1.0
		"end_hammer": return 1.4
	return 0.5


func _emit_telegraph_signal() -> void:
	if current_state == State.DEAD or _move_phase != MovePhase.WINDUP:
		return
	CombatBus.enemy_attack_telegraph.emit(self, CombatConstants.PARRY_WINDOW)


func _tick_windup(delta: float) -> void:
	_move_t += delta * _phase3_speed_mult
	if _move_t >= _move_windup_time(_current_move):
		_clear_telegraph()
		_move_phase = MovePhase.EXECUTE
		_move_t = 0.0
		_start_execute(_current_move)


func _start_execute(m: String) -> void:
	match m:
		"char_shot":
			# 单发字符飞射
			_throw_char(_facing_to_player(), 14)
		"ink_dot":
			# 砸地 AOE
			_perform_ink_dot()
		"char_volley":
			# 5 连射扇形
			_throw_char_volley.call_deferred()
		"end_hammer":
			# END. 重锤：大范围 AOE
			_perform_end_hammer()


func _tick_execute(delta: float) -> void:
	_move_t += delta * _phase3_speed_mult
	if _move_t >= 0.4:
		_move_phase = MovePhase.RECOVERY
		_move_t = 0.0


func _tick_recovery(delta: float) -> void:
	_move_t += delta * _phase3_speed_mult
	if _move_t >= 0.5:
		_move_phase = MovePhase.IDLE
		_move_cd = randf_range(1.2, 2.2)


# ============================================================
# 招式实现
# ============================================================
func _facing_to_player() -> Vector3:
	if _player == null:
		return Vector3(0, 0, -1)
	var d: Vector3 = _player.global_position - global_position
	d.y = 0
	if d.length_squared() < 0.001:
		return Vector3(0, 0, -1)
	return d.normalized()


func _throw_char(dir: Vector3, dmg: int) -> void:
	var packed: PackedScene = load("res://scenes/enemies/UmbrellaProjectile.tscn")
	if packed == null:
		return
	var p: Node3D = packed.instantiate()
	var root := get_tree().current_scene
	if root == null:
		return
	root.add_child(p)
	p.global_position = global_position + Vector3(0, 1.0, 0) + dir * 1.5
	if "direction" in p:
		p.direction = dir
	if "damage" in p:
		p.damage = dmg


func _throw_char_volley() -> void:
	# 5 发扇形（基础朝向 ± 30°）
	var base: Vector3 = _facing_to_player()
	var angles: Array[float] = [-0.5, -0.25, 0.0, 0.25, 0.5]
	for a in angles:
		var rotated: Vector3 = base.rotated(Vector3.UP, a)
		_throw_char(rotated, 14)
		await get_tree().create_timer(0.05, true, false, true).timeout


func _perform_ink_dot() -> void:
	if _player == null:
		return
	var d: float = global_position.distance_to(_player.global_position)
	if d <= 3.5:
		var dir: Vector3 = _facing_to_player()
		if _player.has_method("on_damaged"):
			_player.on_damaged(INK_DOT_DAMAGE, dir, 5.0, self)
	var cam = _player.get_node_or_null("Camera") if _player else null
	if cam != null and cam.has_method("add_shake"):
		cam.add_shake(0.3)


func _perform_end_hammer() -> void:
	if _player == null:
		return
	var d: float = global_position.distance_to(_player.global_position)
	if d <= END_HAMMER_RADIUS:
		var dir: Vector3 = _facing_to_player()
		if _player.has_method("on_damaged"):
			_player.on_damaged(END_HAMMER_DAMAGE, dir, 8.0, self)
	var cam = _player.get_node_or_null("Camera") if _player else null
	if cam != null and cam.has_method("add_shake"):
		cam.add_shake(0.6)


# ============================================================
# 攻击指示器（地面红色 quad）
# ============================================================
func _spawn_telegraph(move_id: String) -> void:
	_clear_telegraph()
	var mi := MeshInstance3D.new()
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(0.8, 0.05, 0.15, 0.40)
	var qmesh := QuadMesh.new()
	mi.rotation_degrees = Vector3(-90, 0, 0)
	match move_id:
		"char_shot":
			qmesh.size = Vector2(1.0, 6.0)
			mi.position = Vector3(0, 0.05, -3.0)
		"ink_dot":
			qmesh.size = Vector2(7.0, 7.0)
			mi.position = Vector3(0, 0.05, 0)
		"char_volley":
			qmesh.size = Vector2(6.0, 6.0)
			mi.position = Vector3(0, 0.05, -3.0)
		"end_hammer":
			qmesh.size = Vector2(END_HAMMER_RADIUS * 2, END_HAMMER_RADIUS * 2)
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
# 死亡：奖励发放（静音步 + 100 丝缕 + 静默之心 + 咒纸 ×5）
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

	MonologueSystem.show_monologue("「写完了。这一次，让我替你写。」", 5.0)

	if sprite != null:
		var t2: Tween = sprite.create_tween()
		t2.tween_property(sprite, "modulate", Color(1, 1, 1, 0), 1.5)
	await get_tree().create_timer(2.0).timeout

	_grant_rewards()
	if is_instance_valid(self):
		queue_free()


func _grant_rewards() -> void:
	# 1. 静音步
	PlayerProgress.has_silent_step = true
	var p := get_tree().get_first_node_in_group("player")
	if p != null and "has_silent_step" in p:
		p.has_silent_step = true
	# 2. 丝缕 +100
	PlayerProgress.add_threads(100)
	# 3. 静默之心 +25
	EchoSystem.add_max_echo(25)
	# 4. 咒纸 ×5（M5 stub 道具，但库存数字会涨）
	var inv: Dictionary = PlayerProgress.item_inventory
	inv["corner_print"] = int(inv.get("corner_print", 0)) + 5
	PlayerProgress.item_inventory = inv
	# 5. 击败记录
	if not PlayerProgress.killed_bosses.has(BOSS_ID):
		PlayerProgress.killed_bosses.append(BOSS_ID)
	CombatBus.boss_defeated.emit(BOSS_ID)
	CombatBus.toast.emit("获得：静音步 / +100 丝缕 / 静默之心 / 咒纸 ×5", 5.0)
	SaveSystem.save_game()
