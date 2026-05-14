extends EnemyBase
class_name BossSwordMaiden

# ============================================================
# Boss 4：持剑的少女（策划案 第四卷 §7）— 终局 Boss
# HP 1100 / 4 阶段 + HP <= 5% 触发"最后一斩"必须弹反
# 阶段 1（HP 100-75%）"初心"：普攻 / 冲刺斩
# 阶段 2（HP 75-50%）"成长"：加 缠红丝（拉玩家）/ 影渡（瞬移）
# 阶段 3（HP 50-25%）"绽放"：花瓣反弹光环（命中玩家时反伤 +8）
# 阶段 4（HP 25-5%）"凝时"：30% 概率"凝时反击"玩家攻击 → 玩家 0.3s 硬直
# HP <= 5%："最后一斩" — Boss 锁血，1.0s 弹反窗口；
#                      成功弹反 → Boss 死亡演出
#                      失败 → 玩家受 60 伤，Boss 回 20% HP 重置
# ============================================================

const BOSS_ID: String = "boss_sword_maiden"

const FINAL_CUT_THRESHOLD_RATIO: float = 0.05
const FINAL_CUT_PARRY_WINDOW: float = 1.0
const FINAL_CUT_FAIL_DAMAGE: int = 60
const FINAL_CUT_FAIL_HP_RESTORE_RATIO: float = 0.20

# 招式数值
const SLASH_DAMAGE: int = 22
const THRUST_DAMAGE: int = 18
const DASH_DAMAGE: int = 30
const PULL_RANGE: float = 10.0
const REFLECT_DAMAGE: int = 8

var phase: int = 1
var _phase_done: Array[bool] = [false, false, false, false]  ## phase 2/3/4/final 转换标志

enum MovePhase { IDLE, WINDUP, EXECUTE, RECOVERY }
var _move_phase: MovePhase = MovePhase.IDLE
var _move_cd: float = 1.5
var _current_move: String = ""
var _move_t: float = 0.0
var _telegraph: MeshInstance3D = null

# 最终一斩
var _hp_locked: bool = false       ## 锁血（≤5% 时不再下降）
var _final_cut_active: bool = false
var _final_cut_t: float = 0.0
var _final_cut_window_ms: int = 0  ## 真实时间起点
var _final_cut_telegraph: MeshInstance3D = null


func _init() -> void:
	max_hp = 1100
	attack_damage = SLASH_DAMAGE
	move_speed = 5.5
	vision_range = 30.0
	attack_range = 999.0
	hit_stun_duration = 0.05


func _ready() -> void:
	super._ready()
	add_to_group("boss")


# ============================================================
# 重写 on_damaged：HP <= 5% 时锁血
# ============================================================
func on_damaged(damage: int, knockback_dir: Vector3, knockback_force: float, source: Node) -> void:
	if current_state == State.DEAD:
		return
	if _hp_locked:
		# 已锁血：闪一下但不掉
		if sprite != null:
			var t: Tween = sprite.create_tween()
			t.tween_property(sprite, "modulate", Color(2.5, 0.5, 0.5), 0.06)
			t.tween_property(sprite, "modulate", Color(1, 1, 1, 1), 0.10)
		return
	# 阶段 4 凝时反击：30% 概率反弹（玩家被 0.3s 硬直且不掉血）
	if phase == 4 and randf() < 0.30 and source != null and source.is_in_group("player"):
		# 玩家硬直
		if "state_machine" in source and source.state_machine != null:
			source.state_machine.enter_hit(Vector3.ZERO, 0.3)
		CombatBus.toast.emit("⏱ 持剑少女凝时反击", 1.0)
		return

	# 阶段 3 反伤光环
	if phase == 3 and source != null and source.is_in_group("player"):
		if source.has_method("on_damaged"):
			var dir: Vector3 = source.global_position - global_position
			dir.y = 0
			if dir.length_squared() > 0.001:
				dir = dir.normalized()
			else:
				dir = Vector3(0, 0, 1)
			source.on_damaged(REFLECT_DAMAGE, dir, 1.5, self)

	# 正常扣血
	super.on_damaged(damage, knockback_dir, knockback_force, source)
	# 检查是否要锁血触发"最后一斩"
	var ratio: float = float(current_hp) / float(max_hp)
	if ratio <= FINAL_CUT_THRESHOLD_RATIO and not _final_cut_active:
		_start_final_cut()


# ============================================================
# 主循环
# ============================================================
func _physics_process(delta: float) -> void:
	delta *= time_scale_multiplier
	if current_state == State.DEAD:
		return

	# 阶段切换
	var ratio: float = float(current_hp) / float(max_hp)
	if not _phase_done[0] and ratio <= 0.75:
		_phase_done[0] = true; phase = 2
		CombatBus.toast.emit("阶段 2 — 成长", 2.0)
	if not _phase_done[1] and ratio <= 0.50:
		_phase_done[1] = true; phase = 3
		if sprite != null:
			sprite.modulate = Color(1.4, 0.7, 0.85, 1)  ## 染粉，反伤光环视觉
		CombatBus.toast.emit("阶段 3 — 绽放（反伤光环）", 2.0)
	if not _phase_done[2] and ratio <= 0.25:
		_phase_done[2] = true; phase = 4
		if sprite != null:
			sprite.modulate = Color(1.6, 0.4, 0.5, 1)  ## 染深红
		CombatBus.toast.emit("阶段 4 — 凝时（30% 反击）", 2.0)

	# 击退
	if _knockback_velocity.length() > 0.1:
		velocity = _knockback_velocity
		_knockback_velocity *= 0.85
	else:
		_knockback_velocity = Vector3.ZERO
		velocity = Vector3.ZERO

	if _player == null or not is_instance_valid(_player):
		_player = get_tree().get_first_node_in_group("player")

	# 最后一斩中：仅推进真实时间窗口
	if _final_cut_active:
		_tick_final_cut()
		move_and_slide()
		return

	if current_state == State.HIT:
		_ai_hit(delta)
		move_and_slide()
		return

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


# ============================================================
# 招式选择（按阶段决定池）
# ============================================================
func _select_move() -> void:
	var pool: Array
	match phase:
		1: pool = ["slash", "thrust"]
		2: pool = ["slash", "thrust", "dash", "pull"]
		3: pool = ["slash", "dash", "pull"]   ## 阶段 3 反伤光环鼓励 Boss 主动攻击
		4: pool = ["slash", "thrust", "dash", "pull"]
		_: pool = ["slash"]
	_current_move = pool[randi() % pool.size()]
	_move_phase = MovePhase.WINDUP
	_move_t = 0.0
	if _player != null:
		var d: Vector3 = _player.global_position - global_position
		d.y = 0
		if d.length_squared() > 0.001:
			_face(d.normalized())
	_spawn_telegraph(_current_move)
	# 弹反 telegraph
	var lead: float = CombatConstants.PARRY_WINDOW
	get_tree().create_timer(max(0.0, _windup_time(_current_move) - lead), true, false, true).timeout.connect(_emit_telegraph_signal)


func _windup_time(m: String) -> float:
	match m:
		"slash": return 0.6
		"thrust": return 0.5
		"dash": return 0.45
		"pull": return 0.7
	return 0.5


func _emit_telegraph_signal() -> void:
	if current_state == State.DEAD or _final_cut_active or _move_phase != MovePhase.WINDUP:
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
		"slash":
			# 前方扇形 AOE 22 伤
			_perform_slash()
		"thrust":
			# 直线突刺 18 伤（HitBox 激活）
			_set_hitbox_for(THRUST_DAMAGE, 4.0)
			if hit_box != null: hit_box.set_active(true)
		"dash":
			# 影渡瞬移到玩家身后 + 30 伤
			_perform_boss_dash()
		"pull":
			# 缠红丝拉玩家
			_perform_pull()


func _tick_execute(delta: float) -> void:
	_move_t += delta
	match _current_move:
		"thrust":
			if _move_t >= 0.25:
				if hit_box != null: hit_box.set_active(false)
				_move_phase = MovePhase.RECOVERY
				_move_t = 0.0
		_:
			# 其他招式瞬时
			if _move_t >= 0.15:
				_move_phase = MovePhase.RECOVERY
				_move_t = 0.0


func _tick_recovery(delta: float) -> void:
	_move_t += delta
	# 阶段越后期收招越快
	var rec_t: float = 0.5 - 0.1 * (phase - 1)
	if _move_t >= max(0.2, rec_t):
		_move_phase = MovePhase.IDLE
		_move_cd = randf_range(1.0, 1.8)


# ============================================================
# 招式实现
# ============================================================
func _perform_slash() -> void:
	if _player == null: return
	var d: float = global_position.distance_to(_player.global_position)
	if d <= 3.0:
		var dir: Vector3 = _player.global_position - global_position
		dir.y = 0
		if dir.length_squared() > 0.001:
			dir = dir.normalized()
		else:
			dir = Vector3(0, 0, 1)
		if _player.has_method("on_damaged"):
			_player.on_damaged(SLASH_DAMAGE, dir, 5.0, self)


func _perform_boss_dash() -> void:
	if _player == null: return
	# 瞬移到玩家身后 1m
	var to_p: Vector3 = _player.global_position - global_position
	to_p.y = 0
	var dir: Vector3 = to_p.normalized() if to_p.length_squared() > 0.001 else Vector3(0, 0, -1)
	global_position = _player.global_position - dir * 1.0  ## 身后
	# 立即出击
	var d: float = global_position.distance_to(_player.global_position)
	if d <= 2.5 and _player.has_method("on_damaged"):
		_player.on_damaged(DASH_DAMAGE, -dir, 6.0, self)


func _perform_pull() -> void:
	if _player == null: return
	var d: float = global_position.distance_to(_player.global_position)
	if d > PULL_RANGE: return
	# 把玩家拉到 Boss 前方 2m
	var to_p: Vector3 = _player.global_position - global_position
	to_p.y = 0
	var dir: Vector3 = to_p.normalized() if to_p.length_squared() > 0.001 else Vector3(0, 0, -1)
	if "global_position" in _player:
		_player.global_position = global_position + dir * 2.0
	# 拉过来后做轻击
	if _player.has_method("on_damaged"):
		_player.on_damaged(12, dir, 3.0, self)


func _set_hitbox_for(d: int, kb: float) -> void:
	if hit_box != null:
		hit_box.damage = d
		hit_box.knockback_force = kb


# ============================================================
# 攻击指示器
# ============================================================
func _spawn_telegraph(m: String) -> void:
	_clear_telegraph()
	var mi := MeshInstance3D.new()
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(0.85, 0.05, 0.18, 0.45)
	var qmesh := QuadMesh.new()
	mi.rotation_degrees = Vector3(-90, 0, 0)
	match m:
		"slash":
			qmesh.size = Vector2(4.0, 3.0)
			mi.position = Vector3(0, 0.05, -1.5)
		"thrust":
			qmesh.size = Vector2(0.8, 4.0)
			mi.position = Vector3(0, 0.05, -2.0)
		"dash":
			qmesh.size = Vector2(2.0, 2.0)
			mi.position = Vector3(0, 0.05, 0)
		"pull":
			qmesh.size = Vector2(1.5, 6.0)
			mi.position = Vector3(0, 0.05, -3.0)
		_:
			qmesh.size = Vector2(1.0, 1.0)
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
# 最后一斩（HP ≤ 5% 触发）— 必须弹反才能击败
# ============================================================
func _start_final_cut() -> void:
	_final_cut_active = true
	_hp_locked = true
	_clear_telegraph()
	if hit_box != null: hit_box.set_active(false)
	_move_phase = MovePhase.IDLE
	# 指示器：地面大圆 + sprite 蓄红光
	_spawn_final_cut_telegraph()
	if sprite != null:
		var t: Tween = sprite.create_tween()
		t.tween_property(sprite, "modulate", Color(2.5, 0.4, 0.4, 1), 0.5)
	# 强烈预告 telegraph 让玩家弹反凝时
	CombatBus.enemy_attack_telegraph.emit(self, FINAL_CUT_PARRY_WINDOW)
	CombatBus.toast.emit("⚔ 最后一斩 — 按空格弹反！", 2.5)
	_final_cut_window_ms = Time.get_ticks_msec() + int(FINAL_CUT_PARRY_WINDOW * 1500.0)  ## 1.5s 总等待
	_final_cut_t = 0.0


func _tick_final_cut() -> void:
	# 检测玩家弹反
	if _player != null and "state_machine" in _player:
		var sm = _player.state_machine
		if sm != null and sm.current_state == sm.State.PARRY_TIMESTOP:
			# 成功弹反！Boss 死
			_final_cut_active = false
			_hp_locked = false
			current_hp = 0
			_clear_final_cut_telegraph()
			_change_state(State.DEAD)
			return

	# 等到时间窗口结束未弹反 → 失败
	if Time.get_ticks_msec() >= _final_cut_window_ms:
		_final_cut_failed()


func _final_cut_failed() -> void:
	_clear_final_cut_telegraph()
	# 玩家受 60 伤
	if _player != null and _player.has_method("on_damaged"):
		var dir: Vector3 = _player.global_position - global_position
		dir.y = 0
		if dir.length_squared() > 0.001:
			dir = dir.normalized()
		else:
			dir = Vector3(0, 0, 1)
		_player.on_damaged(FINAL_CUT_FAIL_DAMAGE, dir, 8.0, self)
	# Boss 回 20% HP，解锁继续战斗
	current_hp = int(max_hp * FINAL_CUT_FAIL_HP_RESTORE_RATIO)
	_hp_locked = false
	_final_cut_active = false
	if sprite != null:
		sprite.modulate = Color(1.6, 0.4, 0.5, 1)
	CombatBus.toast.emit("最后一斩失败 — Boss 回血 20%", 2.5)
	_move_cd = 2.0


func _spawn_final_cut_telegraph() -> void:
	var mi := MeshInstance3D.new()
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(1.0, 0.05, 0.20, 0.55)
	var qmesh := QuadMesh.new()
	qmesh.size = Vector2(20.0, 20.0)
	qmesh.material = mat
	mi.mesh = qmesh
	mi.rotation_degrees = Vector3(-90, 0, 0)
	mi.position = Vector3(0, 0.05, 0)
	add_child(mi)
	_final_cut_telegraph = mi


func _clear_final_cut_telegraph() -> void:
	if _final_cut_telegraph != null and is_instance_valid(_final_cut_telegraph):
		_final_cut_telegraph.queue_free()
	_final_cut_telegraph = null


# ============================================================
# 死亡演出 + 奖励
# ============================================================
func _play_death_sequence() -> void:
	if hit_box != null: hit_box.set_active(false)
	if collision != null: collision.disabled = true
	if hurt_box != null: hurt_box.monitorable = false
	if hurt_box_shape != null: hurt_box_shape.disabled = true
	_clear_telegraph()
	_clear_final_cut_telegraph()

	if sprite != null:
		var t: Tween = sprite.create_tween()
		t.tween_property(sprite, "modulate", Color(2.8, 2.8, 2.8, 1), 0.5)
	await get_tree().create_timer(0.8).timeout

	MonologueSystem.show_monologue("「这一次，我没让你倒下。我成了你举的剑。」", 6.0)

	if sprite != null:
		var t2: Tween = sprite.create_tween()
		t2.tween_property(sprite, "modulate", Color(1, 1, 1, 0), 2.0)
	await get_tree().create_timer(2.5).timeout

	_grant_rewards()
	if is_instance_valid(self):
		queue_free()


func _grant_rewards() -> void:
	# 1. 凝时斩正式解锁（M3 测试期已默认 true，幂等设置）
	PlayerProgress.has_unlocked_parry = true
	var p := get_tree().get_first_node_in_group("player")
	if p != null and "has_unlocked_parry" in p:
		p.has_unlocked_parry = true
	# 2. 丝缕 +200
	PlayerProgress.add_threads(200)
	# 3. 静默之心 +25
	EchoSystem.add_max_echo(25)
	# 4. 击败记录
	if not PlayerProgress.killed_bosses.has(BOSS_ID):
		PlayerProgress.killed_bosses.append(BOSS_ID)
	CombatBus.boss_defeated.emit(BOSS_ID)
	CombatBus.toast.emit("「啊。是我啊。我以为我会哭。但其实没什么好哭的……」", 5.0)
	SaveSystem.save_game()
	# 终幕铺垫（M7v2）：传送回 Hub 进入终幕模式（咏消失 + 船出现）
	await get_tree().create_timer(6.0).timeout
	EndingSystem.enter_post_boss4()
