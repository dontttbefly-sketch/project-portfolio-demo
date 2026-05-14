extends CharacterBody3D
class_name Player

# ============================================================
# 移动参数（策划案 §3 战斗系统 / §9 主角设定）
# ============================================================
@export var move_speed: float = 6.0          ## 平地最大速度 m/s
@export var acceleration: float = 75.0       ## 加速度 m/s²（0→max 约 0.08s）
@export var friction: float = 50.0           ## 摩擦减速 m/s²（max→0 约 0.12s）

# ============================================================
# 战斗参数（策划案 §3.4 受击与生命）
# ============================================================
@export var max_hp: int = 100
@export var current_hp: int = 100

# ============================================================
# 残响参数（策划案 §4 残响系统 — M3 实装）
# ============================================================
@export var max_echo: int = 100
var current_echo: int = 0

# ============================================================
# 朝向：最后一次有效移动方向。
# 攻击 / 冲刺斩 / 弹反凝时全靠这个变量决定出招方向。
# ============================================================
var facing: Vector3 = Vector3(0, 0, -1)

# ============================================================
# 战斗状态标志
# ============================================================
var hurt_invincible: bool = false  ## 受击后无敌（0.8s）
var move_invincible: bool = false  ## 影渡 / 冲刺斩瞬时无敌

# ============================================================
# 弹反凝时（M3）— 测试期默认解锁，正式游戏中是 Boss 4 后获得
# ============================================================
@export var has_unlocked_parry: bool = true
var parry_cooldown_remaining: float = 0.0

# ============================================================
# 影渡能力开关（M4）：由 F-03 倒木裂沟解锁
# 在 TestArena 测试时可手动 export 设为 true
# ============================================================
@export var has_dash: bool = false

# ============================================================
# 缠红丝（M5）：Boss 1 击败后获得
# ============================================================
@export var has_grapple: bool = false
var grapple_cooldown_remaining: float = 0.0

# ============================================================
# 静音步（M6.1）：Boss 2 击败后获得
# ============================================================
@export var has_silent_step: bool = false
var silent_step_cooldown_remaining: float = 0.0

# ============================================================
# 蓄力检测：J 持续按下的累计时长（松开重置）
# ============================================================
var attack_held_time: float = 0.0

# ============================================================
# 冷却倒计时（由状态机写入，公开供调试 / UI 读取）
# ============================================================
var dash_cooldown_remaining: float = 0.0
var dash_attack_cooldown_remaining: float = 0.0

# ============================================================
# 节点引用
# ============================================================
@onready var state_machine: PlayerStateMachine = $PlayerStateMachine
@onready var sprite: Sprite3D = $ModelHolder/Sprite
@onready var hit_box: HitBox = $HitBox
@onready var hurt_box: HurtBox = $HurtBox

# ============================================================
# 角色立绘：站立 / 走路侧面（走路侧面默认面向左，flip_h=true 即面向右）
# ============================================================
const TEX_IDLE: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_idle_second_pass.png")
const TEX_WALK_SIDE: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_walk_second_pass.png")


func _ready() -> void:
	add_to_group("player")
	# 占位图视觉抛光：脚下椭圆阴影
	CharacterShadow.attach_to(self, 0.55)
	# 从 PlayerProgress 拉持久数据（HP / has_dash 等），由 SceneManager 在房间切换时同步
	if PlayerProgress.hp > 0 and PlayerProgress.hp <= max_hp:
		current_hp = PlayerProgress.hp
	else:
		current_hp = max_hp
		PlayerProgress.hp = max_hp
		PlayerProgress.max_hp = max_hp
	# has_dash / has_unlocked_parry 也从 PlayerProgress 拿（如果它已被设过）
	# 但 @export 的 inline 值优先（TestArena 里手动 has_dash=true 测试用）
	if PlayerProgress.has_dash:
		has_dash = true
	if PlayerProgress.has_grapple:
		has_grapple = true
	if PlayerProgress.has_silent_step:
		has_silent_step = true
	if PlayerProgress.has_unlocked_parry:
		has_unlocked_parry = true


func _physics_process(delta: float) -> void:
	# 输入跟踪：J 按住时长用于蓄力检测
	if Input.is_action_pressed("attack"):
		attack_held_time += delta
	else:
		attack_held_time = 0.0

	# 冷却倒计时
	dash_cooldown_remaining = max(0.0, dash_cooldown_remaining - delta)
	dash_attack_cooldown_remaining = max(0.0, dash_attack_cooldown_remaining - delta)
	parry_cooldown_remaining = max(0.0, parry_cooldown_remaining - delta)
	grapple_cooldown_remaining = max(0.0, grapple_cooldown_remaining - delta)
	silent_step_cooldown_remaining = max(0.0, silent_step_cooldown_remaining - delta)

	state_machine.physics_update(delta)
	_check_item_inputs()
	_update_sprite_pose()


# ============================================================
# 立绘切换：移动→walk_side（按 X 方向决定 flip_h），静止→idle
# ============================================================
func _update_sprite_pose() -> void:
	if sprite == null:
		return
	var moving := velocity.length() > 0.5
	if moving:
		if sprite.texture != TEX_WALK_SIDE:
			sprite.texture = TEX_WALK_SIDE
		# 走路侧面图默认面向左（剑指向左前方）。X 速度 > 0 表示向右走，需要镜像。
		# 纯 Z 方向移动时（向上/向下）保留上一次 flip_h，避免镜像跳变。
		if absf(velocity.x) > 0.05:
			sprite.flip_h = velocity.x > 0.0
	else:
		if sprite.texture != TEX_IDLE:
			sprite.texture = TEX_IDLE
		sprite.flip_h = false


func _check_item_inputs() -> void:
	# 1234 触发对应槽位的主动道具
	for i in range(4):
		if Input.is_action_just_pressed("item_%d" % (i + 1)):
			ItemSystem.use_active_slot(i)


# 8 方向移动输入，归一化到 XZ 平面
func read_input_dir() -> Vector3:
	var x := Input.get_axis("move_left", "move_right")
	var z := Input.get_axis("move_up", "move_down")
	var dir := Vector3(x, 0, z)
	if dir.length_squared() > 0.001:
		return dir.normalized()
	return Vector3.ZERO


func get_facing() -> Vector3:
	return facing


# ============================================================
# 受击入口（由 HurtBox 转发；实现自 HurtBox 期望的鸭子接口）
# ============================================================
func on_damaged(damage: int, knockback_dir: Vector3, knockback_force: float, _source: Node) -> void:
	# 任意一种无敌都免伤
	if hurt_invincible or move_invincible:
		return
	if state_machine.current_state == PlayerStateMachine.State.DEAD:
		return

	current_hp = max(0, current_hp - damage)
	flash(Color(1.8, 0.4, 0.4), CombatConstants.HIT_FLASH_DURATION)

	# 残响值受击衰减（策划案 §4.1，含风铃护符被动 30% 抵消概率）
	EchoSystem.on_player_hurt()

	if current_hp <= 0:
		state_machine.change_state(PlayerStateMachine.State.DEAD)
		return

	# 残响态期间免疫硬直（策划案 §4.2A），但仍掉血
	if state_machine.is_echo_burst_active():
		return

	# 弹反失败给 0.5s 额外硬直（策划案 §4.3 B 档：中风险中回报）
	var extra_stun := state_machine.consume_parry_fail_stun()
	state_machine.enter_hit(knockback_dir * knockback_force, extra_stun)


# ============================================================
# 死亡视觉：倒地 + 黑屏
# ============================================================
func die_visual() -> void:
	if sprite == null:
		return
	# 倒地动画：Sprite Z 轴旋转 90°
	var tween := create_tween()
	tween.tween_property(sprite, "rotation", Vector3(0, 0, deg_to_rad(90)), 0.4)

	# 黑屏 → 主菜单
	var overlay_scene: PackedScene = load("res://scenes/ui/DeathOverlay.tscn")
	if overlay_scene != null:
		var overlay = overlay_scene.instantiate()
		var root := get_tree().current_scene
		if root != null:
			root.add_child(overlay)


# ============================================================
# 闪色（受击 / 自定义）：modulate 短促 tween 后回到正常
# ============================================================
func flash(color: Color, duration: float) -> void:
	if sprite == null:
		return
	var tween := create_tween()
	tween.tween_property(sprite, "modulate", color, duration * 0.3)
	tween.tween_property(sprite, "modulate", Color(1, 1, 1, 1), duration * 0.7)


# 调试用：直接调用造伤害（绕过 HurtBox）
func debug_take_damage(damage: int) -> void:
	on_damaged(damage, -facing, 4.0, null)
