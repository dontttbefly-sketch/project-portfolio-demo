extends Node2D

const Assets := preload("res://scripts/v2/V2Assets.gd")
const Player2DScript := preload("res://scripts/v2/Player2D.gd")
const DummyEnemy2DScript := preload("res://scripts/v2/DummyEnemy2D.gd")
const BreakableWall2DScript := preload("res://scripts/v2/BreakableWall2D.gd")
const EchoStele2DScript := preload("res://scripts/v2/EchoStele2D.gd")
const EchoShard2DScript := preload("res://scripts/v2/EchoShard2D.gd")
const GrapplePoint2DScript := preload("res://scripts/v2/GrapplePoint2D.gd")
const BossRaincoatMan2DScript := preload("res://scripts/v2/BossRaincoatMan2D.gd")

const CRIMSON := Color(0.7843, 0.0627, 0.1804, 1.0)
const BG := Color(0.0588, 0.0588, 0.0706, 1.0)
const FLOOR := Color(0.72, 0.70, 0.66, 1.0)
const FLOOR_DARK := Color(0.30, 0.30, 0.32, 1.0)

const ROOM_TITLES := {
	"W-01": "忘川渡口 · 醒来之屋",
	"W-02": "忘川渡口 · 渡口码头",
	"W-03": "忘川渡口 · 绯红铸炉",
	"W-04": "忘川渡口 · 残响石阵",
	"W-05": "忘川渡口 · 河岸小径",
	"F-01": "濡羽之森 · 林缘渡桥",
	"F-02": "濡羽之森 · 滴水洞口",
	"F-03": "濡羽之森 · 倒木裂沟",
	"F-04": "濡羽之森 · 雨幕岔口",
	"F-09": "濡羽之森 · 雨衣下的祭坛",
}

var _player
var _room_layer: Node2D
var _bg_image: Sprite2D
var _current_room_id := "W-01"
var _room_change_pending := false
var _boss_defeated := false
var _hp_label: Label
var _echo_label: Label
var _shard_label: Label
var _room_label: Label
var _message_label: Label
var _message_timer: float = 0.0


func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_build_background()
	_build_room_layer()
	_build_player()
	_build_hud()
	_load_room("W-01", "start")
	_show_message("忘川渡口已经拆成房间骨架。")


func _process(delta: float) -> void:
	if _message_timer > 0.0:
		_message_timer -= delta
		if _message_timer <= 0.0 and _message_label != null:
			_message_label.text = ""


func _build_background() -> void:
	_bg_image = Sprite2D.new()
	_bg_image.texture = Assets.MAP_HUB
	_bg_image.global_position = Vector2(960, 540)
	_bg_image.modulate = Color(0.72, 0.72, 0.75, 0.55)
	_bg_image.z_index = -100
	add_child(_bg_image)

	_make_world_rect(Vector2(1050, 550), Vector2(2500, 1300), Color(BG.r, BG.g, BG.b, 0.62), -90)

	for i in range(6):
		_make_world_rect(
			Vector2(600.0 + 180.0 * i, 127.0 + 36.0 * i),
			Vector2(1200, 14),
			Color(0.20, 0.21, 0.22, 0.20),
			-80
		)


func _build_room_layer() -> void:
	_room_layer = Node2D.new()
	_room_layer.name = "RoomLayer"
	add_child(_room_layer)


func _build_player() -> void:
	_player = Player2DScript.new()
	_player.global_position = Vector2(220, 730)
	add_child(_player)
	_player.hp_changed.connect(_on_hp_changed)
	_player.echo_changed.connect(_on_echo_changed)
	_player.shard_changed.connect(_on_shard_changed)
	_player.message_requested.connect(_show_message)


func _build_hud() -> void:
	var hud := CanvasLayer.new()
	hud.layer = 20
	add_child(hud)

	var panel := ColorRect.new()
	panel.color = Color(0.0, 0.0, 0.0, 0.35)
	panel.position = Vector2(24, 24)
	panel.size = Vector2(500, 166)
	hud.add_child(panel)

	_hp_label = _make_label(Vector2(44, 38), 24)
	_echo_label = _make_label(Vector2(44, 72), 24)
	_shard_label = _make_label(Vector2(44, 106), 24)
	_room_label = _make_label(Vector2(44, 140), 20)
	_room_label.size = Vector2(460, 34)
	_message_label = _make_label(Vector2(560, 36), 24)
	_message_label.size = Vector2(900, 80)

	hud.add_child(_hp_label)
	hud.add_child(_echo_label)
	hud.add_child(_shard_label)
	hud.add_child(_room_label)
	hud.add_child(_message_label)

	var controls := _make_label(Vector2(44, 1006), 20)
	controls.text = "A/D 移动  K 跳跃  J 攻击  A/D+J 冲刺斩  长按 J 蓄力  Shift 影渡  空格 残响/破壁  Q 缠红丝（Boss 后）  E 存档"
	controls.size = Vector2(1640, 40)
	hud.add_child(controls)

	_on_hp_changed(_player.current_hp, _player.max_hp)
	_on_echo_changed(_player.current_echo, _player.max_echo)
	_on_shard_changed(_player.shard_count)


func _load_room(room_id: String, spawn_key: String) -> void:
	_room_change_pending = false
	_current_room_id = room_id
	_clear_room()
	_update_background_for_room(room_id)

	var spawns: Dictionary = {}
	match room_id:
		"W-01":
			spawns = _build_room_w01()
		"W-02":
			spawns = _build_room_w02()
		"W-03":
			spawns = _build_room_w03()
		"W-04":
			spawns = _build_room_w04()
		"W-05":
			spawns = _build_room_w05()
		"F-01":
			spawns = _build_room_f01()
		"F-02":
			spawns = _build_room_f02()
		"F-03":
			spawns = _build_room_f03()
		"F-04":
			spawns = _build_room_f04()
		"F-09":
			spawns = _build_room_f09()
		_:
			spawns = _build_room_w01()

	var fallback: Vector2 = spawns.get("start", Vector2(220, 730)) as Vector2
	var spawn_pos: Vector2 = spawns.get(spawn_key, fallback) as Vector2
	if _player != null:
		_player.global_position = spawn_pos
		_player.velocity = Vector2.ZERO
	if _room_label != null:
		_room_label.text = ROOM_TITLES.get(room_id, room_id)
	_show_message(ROOM_TITLES.get(room_id, room_id))


func _clear_room() -> void:
	for child in _room_layer.get_children():
		child.queue_free()


func _update_background_for_room(room_id: String) -> void:
	if _bg_image == null:
		return
	_bg_image.texture = Assets.MAP_FOREST if room_id.begins_with("F") else Assets.MAP_HUB
	_bg_image.modulate = Color(0.70, 0.70, 0.72, 0.50) if room_id.begins_with("F") else Color(0.72, 0.72, 0.75, 0.55)


func _build_room_w01() -> Dictionary:
	_make_room_shell()
	_make_back_wall(Vector2(360, 650), Vector2(420, 220))
	_make_prop(Assets.ECHO_TRACE, Vector2(270, 690), 0.20, 2).modulate = Color(CRIMSON.r, CRIMSON.g, CRIMSON.b, 0.30)
	_make_platform(Vector2(1220, 620), Vector2(280, 28), FLOOR)
	_make_room_door(Vector2(1888, 700), Vector2(64, 180), "W-02", "left")
	return {"start": Vector2(230, 730), "left": Vector2(230, 730), "right": Vector2(1660, 730)}


func _build_room_w02() -> Dictionary:
	_make_room_shell()
	_make_prop(Assets.FERRY_BOAT, Vector2(270, 735), 0.54, -1)
	_make_prop(Assets.YONG, Vector2(880, 710), 0.36, 2)
	_make_prop(Assets.RED_UMBRELLA, Vector2(1040, 748), 0.22, 2)
	_make_red_trace(Vector2(1180, 734), Vector2(52, 10))
	_make_room_door(Vector2(32, 700), Vector2(64, 180), "W-01", "right")
	_make_room_door(Vector2(1888, 700), Vector2(64, 180), "W-03", "left")
	return {"left": Vector2(220, 730), "right": Vector2(1660, 730)}


func _build_room_w03() -> Dictionary:
	_make_room_shell()
	_make_back_wall(Vector2(920, 650), Vector2(360, 240))
	_make_prop(Assets.CRIMSON_FORGE, Vector2(930, 725), 0.42, 2)
	_make_platform(Vector2(530, 620), Vector2(280, 28), FLOOR)
	_make_platform(Vector2(1320, 620), Vector2(280, 28), FLOOR)
	_make_room_door(Vector2(32, 700), Vector2(64, 180), "W-02", "right")
	_make_room_door(Vector2(1888, 700), Vector2(64, 180), "W-04", "left")
	return {"left": Vector2(220, 730), "right": Vector2(1660, 730)}


func _build_room_w04() -> Dictionary:
	_make_room_shell()
	_make_prop(Assets.SANCTUM_PORTAL, Vector2(520, 710), 0.32, 1).modulate = Color(0.80, 0.80, 0.82, 0.34)
	_make_prop(Assets.SANCTUM_PORTAL, Vector2(960, 710), 0.34, 1).modulate = Color(0.80, 0.80, 0.82, 0.44)
	_make_prop(Assets.SANCTUM_PORTAL, Vector2(1400, 710), 0.32, 1).modulate = Color(0.80, 0.80, 0.82, 0.34)
	var stele = EchoStele2DScript.new()
	stele.global_position = Vector2(960, 744)
	_room_layer.add_child(stele)
	_make_room_door(Vector2(32, 700), Vector2(64, 180), "W-03", "right")
	_make_room_door(Vector2(1888, 700), Vector2(64, 180), "W-05", "left")
	return {"left": Vector2(220, 730), "right": Vector2(1660, 730)}


func _build_room_w05() -> Dictionary:
	_make_room_shell()
	_make_prop(Assets.FERRY_BOAT, Vector2(340, 735), 0.42, -1)
	_make_prop(Assets.SANCTUM_PORTAL, Vector2(1550, 710), 0.36, 1)
	_make_red_trace(Vector2(1585, 620), Vector2(42, 78))
	_make_platform(Vector2(1260, 630), Vector2(280, 28), FLOOR)
	_make_room_door(Vector2(32, 700), Vector2(64, 180), "W-04", "right")
	_make_room_door(Vector2(1888, 700), Vector2(64, 180), "F-01", "left")
	return {"left": Vector2(220, 730), "right": Vector2(1660, 730)}


func _build_room_f01() -> Dictionary:
	_make_room_shell()
	_make_back_wall(Vector2(660, 650), Vector2(360, 260))
	_make_platform(Vector2(500, 620), Vector2(260, 28), FLOOR)
	_make_platform(Vector2(1180, 610), Vector2(320, 28), FLOOR)
	_spawn_enemy(Vector2(920, 742), false, 45)
	_spawn_shard(Vector2(1180, 548))
	_make_room_door(Vector2(32, 700), Vector2(64, 180), "W-05", "right")
	_make_room_door(Vector2(1888, 700), Vector2(64, 180), "F-02", "left")
	return {"left": Vector2(220, 730), "right": Vector2(1660, 730)}


func _build_room_f02() -> Dictionary:
	_make_room_shell()
	_make_back_wall(Vector2(1120, 650), Vector2(420, 280))
	_spawn_enemy(Vector2(620, 742), false, 45)
	_spawn_enemy(Vector2(980, 742), true, 70)
	_spawn_breakable_wall(Vector2(1510, 715), Vector2(58, 148))
	_make_platform(Vector2(1320, 600), Vector2(300, 28), FLOOR)
	_spawn_shard(Vector2(1320, 536))
	_make_room_door(Vector2(32, 700), Vector2(64, 180), "F-01", "right")
	_make_room_door(Vector2(1888, 700), Vector2(64, 180), "F-03", "left")
	return {"left": Vector2(220, 730), "right": Vector2(1660, 730)}


func _build_room_f03() -> Dictionary:
	_make_platform(Vector2(420, 790), Vector2(840, 100), FLOOR_DARK)
	_make_platform(Vector2(1430, 790), Vector2(860, 100), FLOOR_DARK)
	_make_back_wall(Vector2(960, 690), Vector2(180, 250))
	_make_red_trace(Vector2(1012, 700), Vector2(26, 94))
	_make_platform(Vector2(1260, 610), Vector2(260, 28), FLOOR)
	_spawn_shard(Vector2(1260, 548))
	_make_room_door(Vector2(32, 700), Vector2(64, 180), "F-02", "right")
	_make_room_door(Vector2(1888, 700), Vector2(64, 180), "F-04", "left")
	return {"left": Vector2(220, 730), "right": Vector2(1660, 730)}


func _build_room_f04() -> Dictionary:
	_make_room_shell()
	_make_platform(Vector2(540, 610), Vector2(300, 28), FLOOR)
	_make_platform(Vector2(960, 500), Vector2(260, 28), FLOOR)
	_make_platform(Vector2(1360, 610), Vector2(300, 28), FLOOR)
	_make_prop(Assets.RED_UMBRELLA, Vector2(960, 742), 0.25, 2)
	_make_red_trace(Vector2(960, 462), Vector2(64, 8))
	_make_red_trace(Vector2(1440, 566), Vector2(64, 8))
	_spawn_enemy(Vector2(720, 742), false, 50)
	_make_room_door(Vector2(32, 700), Vector2(64, 180), "F-03", "right")
	_make_room_door(Vector2(1888, 700), Vector2(64, 180), "F-09", "left")
	return {"left": Vector2(220, 730), "right": Vector2(1660, 730)}


func _build_room_f09() -> Dictionary:
	_make_room_shell()
	_make_back_wall(Vector2(960, 630), Vector2(260, 330))
	_make_prop(Assets.RED_UMBRELLA, Vector2(960, 748), 0.26, 2)
	_make_red_trace(Vector2(960, 580), Vector2(20, 120))
	_make_room_door(Vector2(32, 700), Vector2(64, 180), "F-04", "right")
	if _boss_defeated:
		_make_prop(Assets.BOSS_UMBRELLA, Vector2(1120, 725), 0.24, 2).modulate = Color(0.88, 0.88, 0.90, 0.52)
		var grapple = GrapplePoint2DScript.new()
		grapple.global_position = Vector2(1260, 520)
		_room_layer.add_child(grapple)
	else:
		var boss = BossRaincoatMan2DScript.new()
		boss.global_position = Vector2(1280, 724)
		boss.safe_zone_position = Vector2(960, 724)
		boss.defeated.connect(_on_boss_defeated)
		boss.message_requested.connect(_show_message)
		_room_layer.add_child(boss)
	return {"left": Vector2(220, 730), "right": Vector2(1660, 730)}


func _make_room_shell() -> void:
	_make_platform(Vector2(960, 790), Vector2(1920, 100), FLOOR_DARK)
	_make_back_wall(Vector2(960, 660), Vector2(720, 260))


func _spawn_enemy(pos: Vector2, elite: bool, hp: int) -> void:
	var enemy = DummyEnemy2DScript.new()
	enemy.global_position = pos
	enemy.max_hp = hp
	if elite:
		enemy.texture = Assets.ENEMY_ELITE
		enemy.sprite_scale = 0.30
		enemy.damage = 10
	_room_layer.add_child(enemy)


func _spawn_shard(pos: Vector2) -> void:
	var shard = EchoShard2DScript.new()
	shard.global_position = pos
	_room_layer.add_child(shard)


func _spawn_breakable_wall(pos: Vector2, size: Vector2) -> void:
	var wall = BreakableWall2DScript.new()
	wall.global_position = pos
	wall.size = size
	_room_layer.add_child(wall)


func _make_room_door(center: Vector2, size: Vector2, target_room: String, spawn_key: String) -> void:
	var door := Area2D.new()
	door.collision_layer = 0
	door.collision_mask = 2
	door.global_position = center
	door.body_entered.connect(_on_room_door_entered.bind(target_room, spawn_key))
	_room_layer.add_child(door)

	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = size
	shape.shape = rect
	door.add_child(shape)

	var trace := Sprite2D.new()
	trace.texture = Assets.ECHO_TRACE
	trace.scale = Vector2(size.x / 256.0, size.y / 256.0)
	trace.modulate = Color(CRIMSON.r, CRIMSON.g, CRIMSON.b, 0.55)
	trace.z_index = 4
	door.add_child(trace)


func _on_room_door_entered(body: Node2D, target_room: String, spawn_key: String) -> void:
	if _room_change_pending:
		return
	if body != _player:
		return
	_room_change_pending = true
	call_deferred("_load_room", target_room, spawn_key)


func _on_boss_defeated() -> void:
	_boss_defeated = true
	if _player != null and _player.has_method("unlock_grapple"):
		_player.call("unlock_grapple")
	_make_prop(Assets.BOSS_UMBRELLA, Vector2(1120, 725), 0.24, 2).modulate = Color(0.88, 0.88, 0.90, 0.52)
	var grapple = GrapplePoint2DScript.new()
	grapple.global_position = Vector2(1260, 520)
	_room_layer.add_child(grapple)
	_show_message("雨停了。")


func _make_label(pos: Vector2, size: int) -> Label:
	var label := Label.new()
	label.position = pos
	label.size = Vector2(420, 34)
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", Color(0.96, 0.94, 0.90, 1.0))
	return label


func _make_platform(center: Vector2, size: Vector2, color: Color) -> void:
	var body := StaticBody2D.new()
	body.collision_layer = 1
	body.collision_mask = 0
	body.global_position = center
	_room_layer.add_child(body)

	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = size
	shape.shape = rect
	body.add_child(shape)

	var sprite := Sprite2D.new()
	sprite.texture = Assets.FLOOR_WET_STONE
	sprite.scale = Vector2(size.x / 256.0, maxf(size.y / 256.0, 0.16))
	sprite.modulate = color.lerp(Color.WHITE, 0.15)
	body.add_child(sprite)

	var top_line := Polygon2D.new()
	top_line.polygon = PackedVector2Array([
		Vector2(-size.x * 0.5, -size.y * 0.5),
		Vector2(size.x * 0.5, -size.y * 0.5),
		Vector2(size.x * 0.5, -size.y * 0.5 + 3),
		Vector2(-size.x * 0.5, -size.y * 0.5 + 3)
	])
	top_line.color = Color(0.86, 0.82, 0.76, 0.70)
	body.add_child(top_line)


func _make_red_trace(center: Vector2, size: Vector2) -> void:
	var trace := Sprite2D.new()
	trace.global_position = center
	trace.texture = Assets.ECHO_TRACE
	trace.scale = Vector2(size.x / 256.0, size.y / 256.0)
	trace.modulate = Color(CRIMSON.r, CRIMSON.g, CRIMSON.b, 0.65)
	trace.z_index = 3
	_room_layer.add_child(trace)


func _make_prop(texture: Texture2D, pos: Vector2, scale_value: float, z: int) -> Sprite2D:
	var sprite := Sprite2D.new()
	sprite.texture = texture
	sprite.global_position = pos
	sprite.scale = Vector2(scale_value, scale_value)
	sprite.z_index = z
	_room_layer.add_child(sprite)
	return sprite


func _make_back_wall(center: Vector2, size: Vector2) -> void:
	var sprite := Sprite2D.new()
	sprite.texture = Assets.WALL_GRAY_WASH
	sprite.global_position = center
	sprite.scale = Vector2(size.x / 256.0, size.y / 256.0)
	sprite.modulate = Color(0.70, 0.70, 0.72, 0.34)
	sprite.z_index = -8
	_room_layer.add_child(sprite)


func _make_world_rect(center: Vector2, size: Vector2, color: Color, z: int) -> void:
	var rect := Polygon2D.new()
	var half := size * 0.5
	rect.polygon = PackedVector2Array([
		Vector2(-half.x, -half.y), Vector2(half.x, -half.y),
		Vector2(half.x, half.y), Vector2(-half.x, half.y)
	])
	rect.color = color
	rect.global_position = center
	rect.z_index = z
	add_child(rect)


func _on_hp_changed(current: int, maximum: int) -> void:
	if _hp_label != null:
		_hp_label.text = "HP  %03d / %03d" % [current, maximum]


func _on_echo_changed(current: int, maximum: int) -> void:
	if _echo_label != null:
		_echo_label.text = "残响 %03d / %03d" % [current, maximum]


func _on_shard_changed(count: int) -> void:
	if _shard_label != null:
		_shard_label.text = "残响碎片 %02d" % count


func _show_message(text: String) -> void:
	if _message_label == null:
		return
	_message_label.text = text
	_message_timer = 2.2
