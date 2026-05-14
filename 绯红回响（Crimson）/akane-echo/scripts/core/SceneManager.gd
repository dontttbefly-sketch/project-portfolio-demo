extends Node

# ============================================================
# 房间管理（autoload 单例）
# 维护一个 "RoomContainer" 节点，把房间 Node3D 子场景装/卸进去。
# 房间间过渡：黑屏淡入 0.3s → 卸旧房 → 装新房 → 玩家移到 spawn 点 → 黑屏淡出 0.3s
# ============================================================

signal room_changed(scene_path: String, spawn_id: String)

const FADE_DURATION: float = 0.3

# 容器 / 玩家引用（在 Game.tscn 启动时由 Game 注册）
var _room_container: Node = null
var _player: Node = null
var _current_room: Node = null

var _fade_layer: CanvasLayer
var _fade_rect: ColorRect

# 真实时间 fade 推进（避免 Engine.time_scale 干扰）
var _fade_target: float = 0.0
var _fade_speed: float = 0.0
var _fade_value: float = 0.0
var _last_real_ms: int = 0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_setup_fade_overlay.call_deferred()
	_last_real_ms = Time.get_ticks_msec()


func _setup_fade_overlay() -> void:
	_fade_layer = CanvasLayer.new()
	_fade_layer.layer = 250
	add_child(_fade_layer)

	_fade_rect = ColorRect.new()
	_fade_rect.color = Color(0, 0, 0, 0)
	_fade_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fade_layer.add_child(_fade_rect)


func _process(_delta: float) -> void:
	# 真实时间推进 fade（绕过 time_scale）
	var now := Time.get_ticks_msec()
	var rdt: float = (now - _last_real_ms) / 1000.0
	_last_real_ms = now
	if _fade_rect == null:
		return
	if absf(_fade_value - _fade_target) > 0.001:
		var diff: float = _fade_target - _fade_value
		var step: float = _fade_speed * rdt
		if absf(diff) <= step:
			_fade_value = _fade_target
		else:
			_fade_value += signf(diff) * step
		_fade_rect.color = Color(0, 0, 0, _fade_value)


# 由 Game.tscn 调用：注册 RoomContainer 与 Player
func register_world(container: Node, player: Node) -> void:
	_room_container = container
	_player = player


# 切换到新房间（path 是 .tscn 路径，spawn_id 是新房间里 SpawnPoint.spawn_id）
func change_room(scene_path: String, spawn_id: String = "default") -> void:
	if _room_container == null:
		push_error("SceneManager: room_container 未注册，无法切换房间。先启动 Game.tscn。")
		return
	PlayerProgress.next_spawn_id = spawn_id
	await _do_transition(scene_path, spawn_id)


func _do_transition(scene_path: String, spawn_id: String) -> void:
	# 从玩家拉当前 HP 等到 PlayerProgress（迁移状态）
	if _player != null:
		PlayerProgress.pull_from_player(_player)

	# 黑屏淡入
	_fade_to(1.0, FADE_DURATION)
	await _wait_real(FADE_DURATION)

	# 卸旧房
	if _current_room != null and is_instance_valid(_current_room):
		_current_room.queue_free()
	_current_room = null

	# 等一帧让 queue_free 生效
	await get_tree().process_frame

	# 装新房
	var packed: PackedScene = load(scene_path)
	if packed == null:
		push_error("SceneManager: 无法加载 %s" % scene_path)
		_fade_to(0.0, FADE_DURATION)
		return
	var room := packed.instantiate()
	_room_container.add_child(room)
	_current_room = room

	# 把 PlayerProgress 推回 Player（HP / has_dash 等）
	if _player != null:
		PlayerProgress.push_to_player(_player)
		_place_player_at_spawn(spawn_id)

	# 残响痕：如果这是死亡房间且还有未拾回的丝缕，生成残响痕
	_maybe_spawn_echo_trace(scene_path)

	room_changed.emit(scene_path, spawn_id)

	# 黑屏淡出
	_fade_to(0.0, FADE_DURATION)


func _place_player_at_spawn(spawn_id: String) -> void:
	if _player == null:
		return
	var spawns := get_tree().get_nodes_in_group("spawn_point")
	var fallback: Node3D = null
	for s in spawns:
		if not is_instance_valid(s):
			continue
		if not (s is Node3D):
			continue
		# 只考虑当前房间的 spawn
		if not _is_in_current_room(s):
			continue
		if "spawn_id" in s and s.spawn_id == spawn_id:
			_player.global_position = (s as Node3D).global_position
			return
		if fallback == null:
			fallback = s as Node3D
	if fallback != null:
		_player.global_position = fallback.global_position


func _is_in_current_room(node: Node) -> bool:
	if _current_room == null:
		return true
	var n := node
	while n != null:
		if n == _current_room:
			return true
		n = n.get_parent()
	return false


func _fade_to(target: float, duration: float) -> void:
	_fade_target = target
	_fade_speed = 1.0 / maxf(duration, 0.001)


func _wait_real(seconds: float) -> void:
	# 用 ignore_time_scale 计时器，确保即使 time_scale=0 也能推进
	await get_tree().create_timer(seconds, true, false, true).timeout


func _maybe_spawn_echo_trace(scene_path: String) -> void:
	if PlayerProgress.dropped_threads <= 0:
		return
	if PlayerProgress.death_room != scene_path:
		return
	if _current_room == null:
		return
	var trace_scene: PackedScene = load("res://scenes/levels/components/EchoTrace.tscn")
	if trace_scene == null:
		return
	var trace := trace_scene.instantiate()
	_current_room.add_child(trace)
	if trace.has_method("setup"):
		trace.setup(PlayerProgress.dropped_threads)
	(trace as Node3D).global_position = PlayerProgress.death_position
