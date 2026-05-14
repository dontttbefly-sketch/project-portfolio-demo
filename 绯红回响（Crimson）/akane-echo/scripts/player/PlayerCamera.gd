extends Camera3D
class_name PlayerCamera

# ============================================================
# 旧版 3D 原型跟随相机（当前主线基线为 v2 纯 2D 横版）
# - 倾斜 60° 测试镜头（X 轴 -60°）
# - 高度 14m / 后方 9m
# - 双层平滑跟随：
#     · 位置 lerp，时间常数 0.15s（spec）
#     · 朝向 lerp，时间常数 0.35s（修复换向时镜头折角问题）
# - 朝玩家移动方向前瞻（look-ahead），但前瞻矢量本身平滑变化
# - 透视投影 + 中等 FOV：保留旧原型的空间读法
# ============================================================

@export var height: float = 14.0
@export var distance: float = 9.0              ## 朝 +Z（玩家身后）的偏移
@export var look_ahead_distance: float = 1.0
@export var smooth_time: float = 0.15          ## 位置跟随时间常数（越小越紧）
@export var facing_smooth_time: float = 0.35   ## 朝向平滑时间常数（比 smooth_time 慢，避免换向时目标瞬跳）
@export var fov_degrees: float = 50.0          ## 透视 FOV（纵向）
@export var pitch_degrees: float = -60.0

var _target: Node3D = null
# 平滑后的朝向。换方向时不会瞬时翻转，而是用 facing_smooth_time 慢慢转过去。
# 这就是镜头丝滑跟随的关键 —— 让 look-ahead 目标位置连续变化，而不是阶跃跳变。
var _smooth_facing: Vector3 = Vector3(0, 0, -1)

# === 镜头震动（破壁 / 凝时切镜调用 add_shake） ===
var _shake_amount: float = 0.0
@export var shake_decay: float = 5.0


# 外部触发震动；连续调用取最大值，避免覆盖大震动
func add_shake(amount: float) -> void:
	_shake_amount = maxf(_shake_amount, amount)


func _ready() -> void:
	# top_level = true 让相机虽然是 Player 的子节点，但位置忽略父节点变换。
	# 这样 Player 移动时相机不会"硬跟随"，留出 lerp 平滑空间。
	top_level = true
	projection = PROJECTION_PERSPECTIVE
	fov = fov_degrees
	rotation_degrees = Vector3(pitch_degrees, 0, 0)

	# 把父节点（Player）作为跟随目标
	if get_parent() is Node3D:
		_target = get_parent() as Node3D
		# 初始化平滑朝向为玩家当前朝向，避免开局相机有"转向"过程
		if _target.has_method("get_facing"):
			var f: Vector3 = _target.get_facing()
			if f.length_squared() > 0.001:
				_smooth_facing = f
		# 第一帧直接 snap 到目标位置，避免开局相机从原点飞过去
		global_position = _compute_target_position()


func _process(delta: float) -> void:
	if _target == null:
		return

	# 取玩家最新朝向
	var actual_facing := _smooth_facing
	if _target.has_method("get_facing"):
		var f: Vector3 = _target.get_facing()
		if f.length_squared() > 0.001:
			actual_facing = f

	# 第 1 层：朝向平滑——这是修复"换方向不丝滑"的关键
	# 玩家从 W 切 S 时，原始 facing 一帧从 (0,0,-1) 跳到 (0,0,+1)，
	# 这里改成在 facing_smooth_time 内连续过渡，避免目标位置瞬跳。
	var facing_t := 1.0 - exp(-delta / max(facing_smooth_time, 0.0001))
	_smooth_facing = _smooth_facing.lerp(actual_facing, facing_t)

	# 第 2 层：位置平滑——用平滑后的朝向计算前瞻目标
	var goal := _compute_target_position()
	var t := 1.0 - exp(-delta / max(smooth_time, 0.0001))
	global_position = global_position.lerp(goal, t)

	# 震动：在跟随结果上叠加随机小偏移，按 shake_decay 衰减
	if _shake_amount > 0.0:
		_shake_amount = maxf(0.0, _shake_amount - shake_decay * delta)
		global_position += Vector3(
			randf_range(-_shake_amount, _shake_amount),
			randf_range(-_shake_amount, _shake_amount) * 0.5,
			randf_range(-_shake_amount, _shake_amount)
		)


# 目标位置 = 玩家当前位置 + 镜头偏移 + 平滑后的朝向前瞻
func _compute_target_position() -> Vector3:
	if _target == null:
		return global_position
	return _target.global_position + Vector3(0, height, distance) + _smooth_facing * look_ahead_distance
