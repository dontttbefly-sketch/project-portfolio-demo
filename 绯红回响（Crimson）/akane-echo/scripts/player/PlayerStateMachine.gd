extends Node
class_name PlayerStateMachine

# ============================================================
# 玩家状态机
# 设计参考：策划案 §3 战斗系统 / §6 探索能力 / §4 残响系统
# M2 实装：IDLE/MOVE（M1 已完成）+ ATTACK/CHARGE/DASH/DASH_ATTACK/HIT/DEAD
# 留接口：ECHO_BURST / PARRY_TIMESTOP（M3）
# ============================================================

enum State {
	IDLE,
	MOVE,
	ATTACK,           ## 三连斩 + 蓄力斩共用此状态（用 is_charged 区分）
	CHARGE,           ## 正在蓄力（M2 新增）
	DASH_ATTACK,      ## 方向 + J 冲刺斩
	DASH,             ## Shift 影渡
	HIT,              ## 受击硬直
	ECHO_BURST,       ## 残响态（M3）
	PARRY_TIMESTOP,   ## 弹反凝时斩（M3）
	GRAPPLE,          ## 缠红丝（M5）
	DEAD,             ## 死亡
}

enum AttackPhase { STARTUP, ACTIVE, RECOVERY }

@export var initial_state: State = State.IDLE
var current_state: State = State.IDLE
var player: Player = null

# === ATTACK 状态相关 ===
var combo_index: int = 0  # 0=风, 1=雪, 2=月
var attack_phase: AttackPhase = AttackPhase.STARTUP
var phase_timer: float = 0.0
var combo_buffered: bool = false  ## 恢复期内按了 J，缓存连击
var is_charged_attack: bool = false  ## 当前 ATTACK 是否为蓄力斩

# === CHARGE 状态相关 ===
var charge_timer: float = 0.0
var _charge_visual_active: bool = false

# === DASH 状态相关（影渡）===
var dash_timer: float = 0.0
var dash_velocity: Vector3 = Vector3.ZERO
var _afterimage_timer: float = 0.0

# === DASH_ATTACK 状态相关 ===
var dash_attack_timer: float = 0.0
var dash_attack_velocity: Vector3 = Vector3.ZERO
var _dash_attack_hitbox_done: bool = false

# === HIT 状态相关 ===
var hit_timer: float = 0.0
var hit_invincible_timer: float = 0.0
var hit_knockback: Vector3 = Vector3.ZERO

# === DEAD 状态相关 ===
var dead_timer: float = 0.0

# === GRAPPLE 状态相关（M5 缠红丝）===
var grapple_start_pos: Vector3 = Vector3.ZERO
var grapple_target_pos: Vector3 = Vector3.ZERO
var grapple_timer: float = 0.0
var grapple_duration: float = 0.5
var grapple_target_node: Node3D = null

# ============================================================
# M3 残响系统：flag-based overlays（不是 state，因为玩家依然能跑能砍）
# ============================================================
var _echo_burst_active: bool = false
var _echo_burst_timer: float = 0.0

var _parry_window_active: bool = false
var _parry_window_timer: float = 0.0

# === M6.1 静音步 flag-based overlay ===
var _silent_active: bool = false
var _silent_timer: float = 0.0
const SILENT_DURATION: float = 3.0
const SILENT_COOLDOWN: float = 5.0

# 弹反失败标志：窗口超时未按空格则置 true，下次受击多吃 0.5s 硬直
# 0.6s 后自动清除，避免影响后续无关受击
var _parry_failed: bool = false

# 受击时额外硬直（弹反失败用）
var hit_extra_stun: float = 0.0

# 弹反闪烁的 tween 句柄（关闭时 kill 掉，避免遗留）
var _parry_visual_tween: Tween = null

signal state_changed(from_state: State, to_state: State)


func _ready() -> void:
	player = get_parent() as Player
	if player == null:
		push_error("PlayerStateMachine 必须挂在 Player 节点下")
		return
	current_state = initial_state
	_enter(current_state)
	# 监听全局命中事件——第三段（月）命中时触发顿帧 + 残响累积
	CombatBus.hit_landed.connect(_on_hit_landed)
	# 监听敌人攻击预告——开 PARRY_WINDOW
	CombatBus.enemy_attack_telegraph.connect(_on_enemy_attack_telegraph)


func change_state(new_state: State) -> void:
	if new_state == current_state:
		return
	var old := current_state
	_exit(current_state)
	current_state = new_state
	_enter(current_state)
	state_changed.emit(old, new_state)


func physics_update(delta: float) -> void:
	# 受击无敌帧倒计时（贯穿所有状态）
	if hit_invincible_timer > 0.0:
		hit_invincible_timer -= delta
		player.hurt_invincible = hit_invincible_timer > 0.0

	# 残响态计时
	if _echo_burst_active:
		_echo_burst_timer -= delta
		if _echo_burst_timer <= 0.0:
			_end_echo_burst()

	# 弹反窗口计时
	if _parry_window_active:
		_parry_window_timer -= delta
		if _parry_window_timer <= 0.0:
			_on_parry_window_expired()

	# 静音步计时
	if _silent_active:
		_silent_timer -= delta
		if _silent_timer <= 0.0:
			_end_silent_step()

	match current_state:
		State.IDLE:           _physics_idle(delta)
		State.MOVE:           _physics_move(delta)
		State.ATTACK:         _physics_attack(delta)
		State.CHARGE:         _physics_charge(delta)
		State.DASH_ATTACK:    _physics_dash_attack(delta)
		State.DASH:           _physics_dash(delta)
		State.HIT:            _physics_hit(delta)
		State.ECHO_BURST:     _physics_echo_burst(delta)
		State.PARRY_TIMESTOP: _physics_parry(delta)
		State.GRAPPLE:        _physics_grapple(delta)
		State.DEAD:           _physics_dead(delta)


# ============================================================
# 状态进入 / 退出
# ============================================================
func _enter(s: State) -> void:
	match s:
		State.DEAD:
			dead_timer = 0.0
			player.hit_box.set_active(false)
			player.move_invincible = false
			player.hurt_invincible = true
			player.die_visual()
			CombatBus.player_died.emit()
		_:
			pass


func _exit(s: State) -> void:
	match s:
		State.ATTACK:
			player.hit_box.set_active(false)
		State.DASH_ATTACK:
			player.hit_box.set_active(false)
			player.move_invincible = false
		State.DASH:
			player.move_invincible = false
		State.CHARGE:
			player.sprite.modulate = Color(1, 1, 1, 1)
			_charge_visual_active = false
		_:
			pass


# ============================================================
# 战斗输入解析（IDLE/MOVE 中调用）
# 优先级：echo_action 三用 > 影渡 > 冲刺斩 > 普攻 > 蓄力
# ============================================================
func _check_combat_inputs() -> bool:
	# 空格键三用：弹反 > 破壁 > 残响态
	if Input.is_action_just_pressed("echo_action"):
		if _try_parry(): return true
		if _try_break_wall(): return true
		if _try_echo_burst(): return true
	# 缠红丝（M5）
	if Input.is_action_just_pressed("grapple") and player.has_grapple and player.grapple_cooldown_remaining <= 0.0:
		if _try_grapple(): return true
	# 静音步（M6.1）
	if Input.is_action_just_pressed("silent_step") and player.has_silent_step and player.silent_step_cooldown_remaining <= 0.0 and not _silent_active:
		_start_silent_step()
		return false  ## 不阻断状态机，玩家可继续动作
	# 影渡
	if Input.is_action_just_pressed("shadow_dash") and player.has_dash and player.dash_cooldown_remaining <= 0.0:
		_start_dash()
		return true
	# 冲刺斩（按 J 时如果有方向输入）
	if Input.is_action_just_pressed("attack"):
		var dir := player.read_input_dir()
		if dir.length_squared() > 0.001 and player.dash_attack_cooldown_remaining <= 0.0:
			_start_dash_attack(dir)
		else:
			_start_attack(0)
		return true
	# 蓄力：J 持续按住超过阈值（之前没触发普攻而是按住不放）
	if player.attack_held_time >= CombatConstants.CHARGE_PRESS_THRESHOLD:
		_start_charge()
		return true
	return false


# ============================================================
# IDLE / MOVE
# ============================================================
func _physics_idle(delta: float) -> void:
	if _check_combat_inputs():
		return
	var dir := player.read_input_dir()
	if dir.length_squared() > 0.001:
		change_state(State.MOVE)
		return
	player.velocity = player.velocity.move_toward(Vector3.ZERO, player.friction * delta)
	player.move_and_slide()


func _physics_move(delta: float) -> void:
	if _check_combat_inputs():
		return
	var dir := player.read_input_dir()
	if dir.length_squared() < 0.001:
		change_state(State.IDLE)
		return
	var target_velocity := dir * player.move_speed
	player.velocity = player.velocity.move_toward(target_velocity, player.acceleration * delta)
	player.facing = dir
	player.move_and_slide()


# ============================================================
# ATTACK：三连斩 / 蓄力斩
# ============================================================
func _start_attack(combo: int) -> void:
	combo_index = combo
	attack_phase = AttackPhase.STARTUP
	phase_timer = 0.0
	combo_buffered = false
	is_charged_attack = false
	change_state(State.ATTACK)


func _release_charged_attack() -> void:
	# 进入 ATTACK 状态，但带蓄力标志
	combo_index = 0
	attack_phase = AttackPhase.STARTUP
	phase_timer = 0.0
	combo_buffered = false
	is_charged_attack = true
	change_state(State.ATTACK)


func _physics_attack(delta: float) -> void:
	phase_timer += delta

	# 攻击中允许影渡打断
	if Input.is_action_just_pressed("shadow_dash") and player.has_dash and player.dash_cooldown_remaining <= 0.0:
		player.hit_box.set_active(false)
		_start_dash()
		return

	# 攻击中位移衰减（不允许 8 方向自由跑）
	player.velocity = player.velocity.move_toward(Vector3.ZERO, player.friction * delta * 0.5)

	# 各阶段时长（蓄力斩使用更长的 active 与 recovery）
	var startup_t: float = 0.10 if is_charged_attack else CombatConstants.ATTACK_STARTUP
	var active_t: float = 0.12 if is_charged_attack else CombatConstants.ATTACK_ACTIVE
	var recovery_t: float = 0.40 if is_charged_attack else _attack_recovery(combo_index)

	# 恢复期可缓存下一段连击
	if attack_phase == AttackPhase.RECOVERY and Input.is_action_just_pressed("attack"):
		combo_buffered = true

	match attack_phase:
		AttackPhase.STARTUP:
			if phase_timer >= startup_t:
				_position_hitbox_in_facing()
				var base_dmg: int = CombatConstants.ATTACK_CHARGED if is_charged_attack else _attack_damage(combo_index)
				player.hit_box.damage = _apply_echo_burst_multiplier(base_dmg)
				player.hit_box.knockback_force = (8.0 if is_charged_attack else 3.0)
				player.hit_box.set_active(true)
				attack_phase = AttackPhase.ACTIVE
				phase_timer = 0.0
		AttackPhase.ACTIVE:
			if phase_timer >= active_t:
				player.hit_box.set_active(false)
				attack_phase = AttackPhase.RECOVERY
				phase_timer = 0.0
		AttackPhase.RECOVERY:
			if phase_timer >= recovery_t:
				# 蓄力斩不参与连击
				if not is_charged_attack and combo_index < 2 and (combo_buffered or Input.is_action_just_pressed("attack")):
					_start_attack(combo_index + 1)
				else:
					_end_combo()

	player.move_and_slide()


func _attack_damage(idx: int) -> int:
	match idx:
		0: return CombatConstants.ATTACK_FENG
		1: return CombatConstants.ATTACK_XUE
		2: return CombatConstants.ATTACK_YUE
	return 0


func _attack_recovery(idx: int) -> float:
	match idx:
		0: return CombatConstants.ATTACK_FENG_RECOVERY
		1: return CombatConstants.ATTACK_XUE_RECOVERY
		2: return CombatConstants.ATTACK_YUE_RECOVERY
	return 0.2


func _position_hitbox_in_facing() -> void:
	# HitBox 跟随玩家朝向：放到主角前方 1m，并旋转使长边对齐朝向
	var f := player.facing
	if f.length_squared() < 0.001:
		f = Vector3(0, 0, -1)
	f = Vector3(f.x, 0, f.z).normalized()
	player.hit_box.position = Vector3(f.x * 1.0, 0.8, f.z * 1.0)
	# 解算 Y 旋转使 HitBox 局部 -Z 对齐 facing
	var angle := atan2(-f.x, -f.z)
	player.hit_box.rotation = Vector3(0, angle, 0)


func _end_combo() -> void:
	combo_index = 0
	combo_buffered = false
	is_charged_attack = false
	player.hit_box.set_active(false)
	var dir := player.read_input_dir()
	if dir.length_squared() > 0.001:
		change_state(State.MOVE)
	else:
		change_state(State.IDLE)


# ============================================================
# CHARGE：蓄力中（按住 J）
# ============================================================
func _start_charge() -> void:
	charge_timer = 0.0
	_charge_visual_active = false
	change_state(State.CHARGE)


func _physics_charge(delta: float) -> void:
	charge_timer += delta

	# 影渡可以打断蓄力（不浪费）
	if Input.is_action_just_pressed("shadow_dash") and player.has_dash and player.dash_cooldown_remaining <= 0.0:
		_cancel_charge()
		_start_dash()
		return

	# 蓄力中能移动但减速
	var dir := player.read_input_dir()
	if dir.length_squared() > 0.001:
		var target := dir * (player.move_speed * CombatConstants.CHARGE_MOVE_MULTIPLIER)
		player.velocity = player.velocity.move_toward(target, player.acceleration * delta)
		player.facing = dir
	else:
		player.velocity = player.velocity.move_toward(Vector3.ZERO, player.friction * delta)
	player.move_and_slide()

	# 视觉提示：0.5s 后开始绯红呼吸
	if charge_timer >= CombatConstants.CHARGED_VISUAL_CUE_TIME and not _charge_visual_active:
		_charge_visual_active = true
	if _charge_visual_active:
		# 在 0.5s ~ 0.8s 之间从 normal 渐变到绯红高亮
		var t: float = clampf((charge_timer - CombatConstants.CHARGED_VISUAL_CUE_TIME) / 0.3, 0.0, 1.0)
		var pulse: float = 1.0 + 0.5 * sin(charge_timer * 20.0)
		player.sprite.modulate = Color(1, 1, 1, 1).lerp(Color(2.0, 0.4, 0.5), t) * pulse

	# J 释放：判定是否蓄满
	if not Input.is_action_pressed("attack"):
		if charge_timer >= CombatConstants.CHARGED_ATTACK_TIME:
			_release_charged_attack()
		else:
			_cancel_charge()


func _cancel_charge() -> void:
	player.sprite.modulate = Color(1, 1, 1, 1)
	_charge_visual_active = false
	var dir := player.read_input_dir()
	if dir.length_squared() > 0.001:
		change_state(State.MOVE)
	else:
		change_state(State.IDLE)


# ============================================================
# DASH：影渡（无伤害位移，全程无敌）
# ============================================================
func _start_dash() -> void:
	dash_timer = 0.0
	_afterimage_timer = 0.0
	var dir := player.read_input_dir()
	if dir.length_squared() < 0.001:
		dir = player.facing if player.facing.length_squared() > 0.001 else Vector3(0, 0, -1)
	dir = dir.normalized()
	# 影渡距离应用 PlayerProgress.dash_distance_multiplier（Boss 3 升级 ×1.5）
	var effective_distance: float = CombatConstants.SHADOW_DASH_DISTANCE * PlayerProgress.dash_distance_multiplier
	dash_velocity = dir * (effective_distance / CombatConstants.SHADOW_DASH_DURATION)
	player.facing = dir
	player.move_invincible = true
	player.dash_cooldown_remaining = CombatConstants.SHADOW_DASH_COOLDOWN + CombatConstants.SHADOW_DASH_DURATION
	change_state(State.DASH)


func _physics_dash(delta: float) -> void:
	dash_timer += delta
	player.velocity = dash_velocity
	player.move_and_slide()
	_maybe_spawn_afterimage(delta)

	if dash_timer >= CombatConstants.SHADOW_DASH_DURATION:
		player.move_invincible = false
		var dir := player.read_input_dir()
		if dir.length_squared() > 0.001:
			change_state(State.MOVE)
		else:
			change_state(State.IDLE)


func _maybe_spawn_afterimage(delta: float) -> void:
	_afterimage_timer += delta
	if _afterimage_timer < CombatConstants.AFTERIMAGE_INTERVAL:
		return
	_afterimage_timer = 0.0
	var src: Sprite3D = player.sprite
	if src == null:
		return
	var image := Sprite3D.new()
	image.texture = src.texture
	image.pixel_size = src.pixel_size
	image.billboard = src.billboard
	image.shaded = src.shaded
	image.texture_filter = src.texture_filter
	image.global_transform = src.global_transform
	image.modulate = Color(1.0, 0.4, 0.5, 0.7)
	# 加到关卡根，避免被主角的移动 / 朝向更新带走
	var root := player.get_parent()
	if root == null:
		root = get_tree().current_scene
	root.add_child(image)
	var tween := image.create_tween()
	tween.tween_property(image, "modulate:a", 0.0, CombatConstants.AFTERIMAGE_FADE_TIME)
	tween.tween_callback(image.queue_free)


# ============================================================
# DASH_ATTACK：方向 + J 冲刺斩
# ============================================================
func _start_dash_attack(dir: Vector3) -> void:
	dash_attack_timer = 0.0
	_dash_attack_hitbox_done = false
	dir = dir.normalized()
	dash_attack_velocity = dir * (CombatConstants.DASH_ATTACK_DISTANCE / CombatConstants.DASH_ATTACK_DURATION)
	player.facing = dir
	player.move_invincible = true  ## 起步无敌帧
	player.dash_attack_cooldown_remaining = CombatConstants.DASH_ATTACK_COOLDOWN + CombatConstants.DASH_ATTACK_DURATION
	change_state(State.DASH_ATTACK)


func _physics_dash_attack(delta: float) -> void:
	dash_attack_timer += delta
	player.velocity = dash_attack_velocity
	player.move_and_slide()

	# 起步 6 帧（@60fps≈0.1s）无敌结束
	if dash_attack_timer > (float(CombatConstants.DASH_ATTACK_INVINCIBLE_FRAMES) / 60.0):
		player.move_invincible = false

	# 启动 2 帧后激活 HitBox
	if not _dash_attack_hitbox_done and dash_attack_timer >= 0.03:
		_position_hitbox_in_facing()
		player.hit_box.damage = _apply_echo_burst_multiplier(CombatConstants.ATTACK_DASH)
		player.hit_box.knockback_force = CombatConstants.DASH_ATTACK_KNOCKBACK
		player.hit_box.set_active(true)
		_dash_attack_hitbox_done = true

	if dash_attack_timer >= CombatConstants.DASH_ATTACK_DURATION:
		player.hit_box.set_active(false)
		player.move_invincible = false
		var moving := player.read_input_dir()
		if moving.length_squared() > 0.001:
			change_state(State.MOVE)
		else:
			change_state(State.IDLE)


# ============================================================
# HIT：受击
# ============================================================
func enter_hit(knockback: Vector3, extra_stun: float = 0.0) -> void:
	hit_knockback = knockback
	hit_timer = 0.0
	hit_invincible_timer = CombatConstants.HIT_INVINCIBLE
	hit_extra_stun = extra_stun
	change_state(State.HIT)


func _physics_hit(delta: float) -> void:
	hit_timer += delta
	# 击退衰减
	player.velocity = hit_knockback
	hit_knockback *= 0.85
	player.move_and_slide()
	if hit_timer >= CombatConstants.HIT_STUN + hit_extra_stun:
		hit_extra_stun = 0.0
		var dir := player.read_input_dir()
		if dir.length_squared() > 0.001:
			change_state(State.MOVE)
		else:
			change_state(State.IDLE)


# ============================================================
# DEAD
# ============================================================
func _physics_dead(delta: float) -> void:
	dead_timer += delta
	player.velocity = Vector3.ZERO
	player.move_and_slide()


# ============================================================
# ECHO_BURST / PARRY_TIMESTOP — M3
# ============================================================
func _physics_echo_burst(_delta: float) -> void:
	# TODO(M3): 残响态——时间 0.7×、攻击 +50%、命中回血 +2/击、6s
	pass


func _physics_parry(_delta: float) -> void:
	# TODO(M3): 弹反凝时——0.4s 判定窗、8 次锁定斩击、时停 1.5s
	pass


# ============================================================
# 命中事件汇总：顿帧 + 残响累积 + 残响态回血
# ============================================================
func _on_hit_landed(attacker: Node, _target: Node, _damage: int, _dir: Vector3, _force: float) -> void:
	if attacker != player:
		return

	# 月（第三段连击）非蓄力时触发顿帧
	if current_state == State.ATTACK and combo_index == 2 and not is_charged_attack:
		_do_hit_pause(CombatConstants.HIT_PAUSE_FRAMES)

	# 残响累积（策划案 §4.1）：按攻击类型决定加多少
	var gain: int = 0
	match current_state:
		State.ATTACK:
			gain = CombatConstants.ECHO_GAIN_CHARGED_HIT if is_charged_attack else CombatConstants.ECHO_GAIN_NORMAL_HIT
		State.DASH_ATTACK:
			gain = CombatConstants.ECHO_GAIN_DASH_HIT
	if gain > 0:
		EchoSystem.add_echo(gain)

	# 残响态回血（策划案 §4.2A：命中 +2 HP）
	if _echo_burst_active:
		player.current_hp = mini(player.max_hp, player.current_hp + CombatConstants.ECHO_BURST_HEAL_PER_HIT)


func _do_hit_pause(frames: int) -> void:
	var seconds := float(frames) / 60.0
	Engine.time_scale = 0.0
	# ignore_time_scale=true：定时器不受 time_scale=0 影响，否则永远不到点
	await get_tree().create_timer(seconds, true, false, true).timeout
	Engine.time_scale = 1.0


# ============================================================
# M3 — 残响态（flag-based overlay）
# ============================================================
func is_echo_burst_active() -> bool:
	return _echo_burst_active


func _try_echo_burst() -> bool:
	if not EchoSystem.is_full():
		return false
	if _echo_burst_active:
		return false
	_start_echo_burst()
	return true


func _start_echo_burst() -> void:
	_echo_burst_active = true
	_echo_burst_timer = CombatConstants.ECHO_BURST_DURATION
	EchoSystem.spend_echo(EchoSystem.MAX_ECHO)
	# 全场敌人减速到 0.7×（不能用 Engine.time_scale，会拖慢玩家）
	for e in get_tree().get_nodes_in_group("enemy"):
		if "time_scale_multiplier" in e:
			e.time_scale_multiplier = CombatConstants.ECHO_BURST_TIME_SCALE_ENEMY
	# 主角发红光（占位实现，未来加 outline shader）
	if player.sprite != null and _parry_visual_tween == null:
		player.sprite.modulate = Color(1.4, 0.55, 0.65, 1)
	CombatBus.echo_burst_begin.emit()


func _end_echo_burst() -> void:
	_echo_burst_active = false
	_echo_burst_timer = 0.0
	# 恢复敌人速度
	for e in get_tree().get_nodes_in_group("enemy"):
		if "time_scale_multiplier" in e:
			e.time_scale_multiplier = 1.0
	# 恢复主角颜色（如果不在弹反闪烁中）
	if player.sprite != null and _parry_visual_tween == null:
		player.sprite.modulate = Color(1, 1, 1, 1)
	CombatBus.echo_burst_end.emit()


func _apply_echo_burst_multiplier(base: int) -> int:
	var multiplier: float = 1.0
	if _echo_burst_active:
		multiplier *= CombatConstants.ECHO_BURST_DAMAGE_MULT
	# 武器升级（M5 简化：Lv2+ 每级 +20%）
	var lvl: int = PlayerProgress.weapon_level
	if lvl >= 2:
		multiplier *= 1.0 + 0.2 * (lvl - 1)
	return int(round(float(base) * multiplier))


# ============================================================
# M3 — 破壁
# ============================================================
func _try_break_wall() -> bool:
	if EchoSystem.get_echo() < CombatConstants.BREAK_WALL_COST:
		return false
	var wall := _detect_wall_in_front()
	if wall == null:
		return false
	EchoSystem.spend_echo(CombatConstants.BREAK_WALL_COST)
	if wall.has_method("break_wall"):
		wall.break_wall(player)
	return true


func _detect_wall_in_front() -> Node:
	var walls := get_tree().get_nodes_in_group("faded_wall")
	var f: Vector3 = player.facing
	if f.length_squared() < 0.001:
		f = Vector3(0, 0, -1)
	f = Vector3(f.x, 0, f.z).normalized()
	var best: Node = null
	var best_dist: float = INF
	for w in walls:
		if not is_instance_valid(w):
			continue
		if w.has_method("can_be_broken") and not w.can_be_broken():
			continue
		var d: Vector3 = w.global_position - player.global_position
		d.y = 0.0
		var dist: float = d.length()
		if dist > CombatConstants.BREAK_WALL_RANGE + 1.5:
			continue
		if dist < 0.001:
			return w
		var dot: float = d.normalized().dot(f)
		if dot < 0.5:  # 不在前方 ~60° 锥内
			continue
		if dist < best_dist:
			best = w
			best_dist = dist
	return best


# ============================================================
# M3 — 弹反凝时斩
# ============================================================
func _on_enemy_attack_telegraph(_attacker: Node, lead_time: float) -> void:
	if not player.has_unlocked_parry:
		return
	if player.parry_cooldown_remaining > 0.0:
		return
	if current_state == State.PARRY_TIMESTOP or current_state == State.DEAD:
		return
	# 已经在窗口里，不重置（避免连续 telegraph 永久延长）
	if _parry_window_active:
		return
	_parry_window_active = true
	# 使用 lead_time 与 PARRY_WINDOW 中较大的（让 Boss 4 最后一斩 1.0s 窗口生效）
	_parry_window_timer = maxf(lead_time, CombatConstants.PARRY_WINDOW)
	_show_parry_visual()


func _close_parry_window() -> void:
	_parry_window_active = false
	_parry_window_timer = 0.0
	_hide_parry_visual()


# 窗口自然超时 — 标记失败 + 0.6s 后自动清除标记
func _on_parry_window_expired() -> void:
	_close_parry_window()
	_parry_failed = true
	_schedule_clear_parry_failed()


func _schedule_clear_parry_failed() -> void:
	await get_tree().create_timer(0.6).timeout
	_parry_failed = false


# 由 Player.on_damaged 调用：消耗一次失败标记，返回额外硬直时长
func consume_parry_fail_stun() -> float:
	if _parry_failed:
		_parry_failed = false
		return CombatConstants.PARRY_FAIL_EXTRA_STUN
	return 0.0


func _show_parry_visual() -> void:
	if player.sprite == null:
		return
	if _parry_visual_tween != null and _parry_visual_tween.is_valid():
		_parry_visual_tween.kill()
	var t := player.sprite.create_tween().set_loops()
	t.tween_property(player.sprite, "modulate", Color(2.2, 0.5, 0.6, 1), 0.08)
	t.tween_property(player.sprite, "modulate", Color(1.5, 0.4, 0.5, 1), 0.08)
	_parry_visual_tween = t


func _hide_parry_visual() -> void:
	if _parry_visual_tween != null and _parry_visual_tween.is_valid():
		_parry_visual_tween.kill()
	_parry_visual_tween = null
	if player.sprite != null:
		# 残响态时恢复到红光，否则恢复到白
		if _echo_burst_active:
			player.sprite.modulate = Color(1.4, 0.55, 0.65, 1)
		else:
			player.sprite.modulate = Color(1, 1, 1, 1)


func _try_parry() -> bool:
	if not player.has_unlocked_parry:
		return false
	if not _parry_window_active:
		return false
	if player.parry_cooldown_remaining > 0.0:
		return false
	_close_parry_window()
	_start_parry_timestop()
	return true


func _start_parry_timestop() -> void:
	change_state(State.PARRY_TIMESTOP)
	# 广播给隐藏 Boss 用（凝时反惩罚）
	CombatBus.parry_executed.emit()
	# 协程异步推进 5 步流程
	_run_parry_timestop_async()


# 凝时斩 5 步演出（策划案 §4.3）
# 用 ignore_time_scale=true 的计时器推进，玩家直接传送（绕过物理）
func _run_parry_timestop_async() -> void:
	CombatBus.timestop_begin.emit()

	# Step 1：时间停止 + 屏幕去色（保留红色）
	Engine.time_scale = 0.0
	var desat := get_tree().get_first_node_in_group("desat_overlay")
	if desat != null and desat.has_method("enter"):
		desat.enter(0.15)

	# 中断附近所有敌人的挥拳（你成功弹反了，攻击被反推）
	for e in get_tree().get_nodes_in_group("enemy"):
		if e.has_method("interrupt_swing"):
			e.interrupt_swing()

	# Step 2：0 ~ 0.2s 挡格演出（红火花占位）
	_spawn_parry_sparks(player.global_position + Vector3(0, 0.8, 0))
	await get_tree().create_timer(0.2, true, false, true).timeout

	# Step 3：锁定目标 → 8 段斩击循环
	var targets := _lock_targets()
	var assignment := _assign_slashes(targets, CombatConstants.TIMESTOP_SLASH_COUNT)
	var damage_pool: Dictionary = {}

	for slash_target in assignment:
		if not is_instance_valid(slash_target):
			continue
		# 把玩家"传送"到目标背后 1m，朝目标
		var to_t: Vector3 = slash_target.global_position - player.global_position
		to_t.y = 0.0
		var to_t_dir: Vector3 = to_t.normalized() if to_t.length_squared() > 0.001 else Vector3(0, 0, -1)
		player.global_position = slash_target.global_position - to_t_dir * 1.0
		player.facing = to_t_dir

		# 留绯红残影
		_spawn_parry_afterimage()

		# 累计伤害（最后一次性结算，对应策划案"斩击伤害一次性结算"）
		if damage_pool.has(slash_target):
			damage_pool[slash_target] = int(damage_pool[slash_target]) + CombatConstants.TIMESTOP_DAMAGE_PER_HIT
		else:
			damage_pool[slash_target] = CombatConstants.TIMESTOP_DAMAGE_PER_HIT

		# 镜头微震（叠加在 lerp 上）
		var cam = player.get_node_or_null("Camera")
		if cam != null and cam.has_method("add_shake"):
			cam.add_shake(0.08)

		# 等下一斩
		await get_tree().create_timer(CombatConstants.TIMESTOP_SLASH_INTERVAL, true, false, true).timeout

	# Step 4：时间恢复 + 屏幕复色
	Engine.time_scale = 1.0
	if desat != null and desat.has_method("leave"):
		desat.leave(0.30)

	# Step 5：伤害一次性结算 + 残响 +30 + 入冷却
	for t in damage_pool.keys():
		if is_instance_valid(t) and t.has_method("on_damaged"):
			var dir_to: Vector3 = t.global_position - player.global_position
			dir_to.y = 0.0
			var n: Vector3 = dir_to.normalized() if dir_to.length_squared() > 0.001 else Vector3(0, 0, 1)
			t.on_damaged(damage_pool[t], n, 4.0, player)

	EchoSystem.add_echo(CombatConstants.TIMESTOP_ECHO_GAIN)
	player.parry_cooldown_remaining = CombatConstants.TIMESTOP_COOLDOWN
	# 后摇期短暂无敌避免敌人攻击残留判定还能打到
	hit_invincible_timer = 0.6
	player.hurt_invincible = true

	CombatBus.timestop_end.emit()
	change_state(State.IDLE)


# 锁定 5m 内最多 5 个 enemy，按 HP 降序（威胁高优先）
func _lock_targets() -> Array:
	var enemies := get_tree().get_nodes_in_group("enemy")
	var nearby: Array = []
	for e in enemies:
		if not is_instance_valid(e):
			continue
		if "_is_dead" in e and e._is_dead:
			continue
		var dist: float = player.global_position.distance_to(e.global_position)
		if dist <= CombatConstants.TIMESTOP_LOCK_RANGE:
			nearby.append(e)
	nearby.sort_custom(func(a, b): return a.current_hp > b.current_hp)
	if nearby.size() > CombatConstants.TIMESTOP_LOCK_MAX_TARGETS:
		return nearby.slice(0, CombatConstants.TIMESTOP_LOCK_MAX_TARGETS)
	return nearby


# 分配 8 段斩击：每个目标至少 1 段，剩余给 HP 最高的
func _assign_slashes(targets: Array, total: int) -> Array:
	if targets.is_empty():
		return []
	var assignment: Array = []
	for t in targets:
		assignment.append(t)
	var remaining: int = total - assignment.size()
	if remaining <= 0:
		return assignment.slice(0, total)
	var sorted := targets.duplicate()
	sorted.sort_custom(func(a, b): return a.current_hp > b.current_hp)
	var idx: int = 0
	while remaining > 0:
		assignment.append(sorted[idx % sorted.size()])
		idx += 1
		remaining -= 1
	return assignment


# 凝时斩残影（在 Player 当前位置生成绯红 Sprite 复制；定时清理）
# 不用 Tween 渐隐，因为 Tween 受 Engine.time_scale=0 影响会冻结。
# 用 ignore_time_scale=true 的真实时间计时器一次性清理。
func _spawn_parry_afterimage() -> void:
	var src: Sprite3D = player.sprite
	if src == null:
		return
	var image := Sprite3D.new()
	image.texture = src.texture
	image.pixel_size = src.pixel_size
	image.billboard = src.billboard
	image.shaded = src.shaded
	image.texture_filter = src.texture_filter
	image.global_transform = src.global_transform
	image.modulate = Color(1.0, 0.3, 0.4, 0.85)
	var root := player.get_parent()
	if root == null:
		root = get_tree().current_scene
	if root != null:
		root.add_child(image)
	# 0.5s 真实时间后清理（凝时整个流程 ~1.7s，残影留 0.5s 足够看）
	await get_tree().create_timer(0.5, true, false, true).timeout
	if is_instance_valid(image):
		image.queue_free()


# 弹反挡格火花（占位粒子，强爆开）
func _spawn_parry_sparks(at: Vector3) -> void:
	var p := GPUParticles3D.new()
	var pmat := ParticleProcessMaterial.new()
	pmat.direction = Vector3(0, 1, 0)
	pmat.spread = 180.0
	pmat.initial_velocity_min = 4.0
	pmat.initial_velocity_max = 8.0
	pmat.gravity = Vector3(0, -3, 0)
	pmat.scale_min = 0.06
	pmat.scale_max = 0.18
	pmat.color = Color(1.0, 0.2, 0.3, 1.0)

	var qmat := StandardMaterial3D.new()
	qmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	qmat.albedo_color = Color(1.0, 0.2, 0.3, 1.0)
	qmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	qmat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES

	var qmesh := QuadMesh.new()
	qmesh.size = Vector2(0.10, 0.10)
	qmesh.material = qmat

	p.process_material = pmat
	p.draw_pass_1 = qmesh
	p.amount = 30
	p.lifetime = 0.6
	p.one_shot = true
	p.explosiveness = 0.95
	p.process_mode = Node.PROCESS_MODE_ALWAYS  ## time_scale=0 时也喷出
	p.emitting = false

	var root := get_tree().current_scene
	if root == null:
		return
	root.add_child(p)
	p.global_position = at
	p.emitting = true
	# 1s 后清理（ignore_time_scale=true，凝时期间也会到点）
	await get_tree().create_timer(1.0, true, false, true).timeout
	if is_instance_valid(p):
		p.queue_free()


# ============================================================
# M6.1 — 静音步（flag-based overlay，类似残响态）
# ============================================================
func is_silent_active() -> bool:
	return _silent_active


func _start_silent_step() -> void:
	_silent_active = true
	_silent_timer = SILENT_DURATION
	player.silent_step_cooldown_remaining = SILENT_COOLDOWN + SILENT_DURATION
	# 视觉：玩家半透明淡蓝
	if player.sprite != null:
		player.sprite.modulate = Color(0.6, 0.8, 1.0, 0.5)
	CombatBus.toast.emit("静音步启动 3s", 1.0)


func _end_silent_step() -> void:
	_silent_active = false
	_silent_timer = 0.0
	if player.sprite != null:
		# 恢复（残响态时给红光，否则白）
		if _echo_burst_active:
			player.sprite.modulate = Color(1.4, 0.55, 0.65, 1)
		else:
			player.sprite.modulate = Color(1, 1, 1, 1)


# ============================================================
# M5 — 缠红丝（钩索）
# ============================================================
func _try_grapple() -> bool:
	var target := _find_grapple_target()
	if target == null:
		return false
	_start_grapple(target)
	return true


# 在朝向锥（约 ±60°）内 8m 范围找最近的 GrapplePoint
func _find_grapple_target() -> Node3D:
	var points := get_tree().get_nodes_in_group("grapple_point")
	var f: Vector3 = player.facing
	if f.length_squared() < 0.001:
		f = Vector3(0, 0, -1)
	f = Vector3(f.x, 0, f.z).normalized()
	var best: Node3D = null
	var best_dist: float = INF
	for n in points:
		if not is_instance_valid(n) or not (n is Node3D):
			continue
		var d: Vector3 = (n as Node3D).global_position - player.global_position
		var dist_h: float = Vector2(d.x, d.z).length()
		if dist_h > 8.0:
			continue
		var dn := Vector3(d.x, 0, d.z)
		if dn.length_squared() > 0.001:
			dn = dn.normalized()
			if dn.dot(f) < 0.4:
				continue
		if dist_h < best_dist:
			best = n as Node3D
			best_dist = dist_h
	return best


func _start_grapple(target: Node3D) -> void:
	grapple_target_node = target
	grapple_start_pos = player.global_position
	# 终点：钩点位置但保持玩家原本的高度
	grapple_target_pos = Vector3(target.global_position.x, player.global_position.y, target.global_position.z)
	grapple_timer = 0.0
	player.grapple_cooldown_remaining = 1.0  ## 策划案 §6.1 缠红丝冷却
	change_state(State.GRAPPLE)


func _physics_grapple(delta: float) -> void:
	grapple_timer += delta
	var t: float = clampf(grapple_timer / grapple_duration, 0.0, 1.0)
	# ease-out cubic 让收尾更柔和
	var eased: float = 1.0 - pow(1.0 - t, 3)
	player.global_position = grapple_start_pos.lerp(grapple_target_pos, eased)
	player.velocity = Vector3.ZERO
	if t >= 1.0:
		var dir := player.read_input_dir()
		if dir.length_squared() > 0.001:
			change_state(State.MOVE)
		else:
			change_state(State.IDLE)


# ============================================================
# 状态名（调试面板用）
# ============================================================
static func state_name(s: State) -> String:
	match s:
		State.IDLE:           return "IDLE"
		State.MOVE:           return "MOVE"
		State.ATTACK:         return "ATTACK"
		State.CHARGE:         return "CHARGE"
		State.DASH_ATTACK:    return "DASH_ATTACK"
		State.DASH:           return "DASH"
		State.HIT:            return "HIT"
		State.ECHO_BURST:     return "ECHO_BURST"
		State.PARRY_TIMESTOP: return "PARRY_TIMESTOP"
		State.GRAPPLE:        return "GRAPPLE"
		State.DEAD:           return "DEAD"
	return "UNKNOWN"
