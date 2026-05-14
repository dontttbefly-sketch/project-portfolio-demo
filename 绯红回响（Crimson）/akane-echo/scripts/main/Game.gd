extends Node3D

# ============================================================
# 游戏根节点（持久层）
# 从主菜单"开始" → 加载本场景 → 自动装入 Hub
# Player + Camera + HUD 在这里持续存在，房间换来换去
# ============================================================

@export var initial_room: String = "res://scenes/levels/hub/Hub.tscn"
@export var initial_spawn_id: String = "default"

@onready var player: Player = $Player
@onready var room_container: Node3D = $RoomContainer


func _ready() -> void:
	# 向 SceneManager 注册自己（让其它系统能找到房间容器与玩家）
	SceneManager.register_world(room_container, player)
	# 优先用 PlayerProgress 上次残响碑（来自存档），否则默认 Hub
	var room: String = PlayerProgress.last_stele_room
	if room.is_empty():
		room = initial_room
	var spawn: String = PlayerProgress.last_stele_spawn
	if spawn.is_empty():
		spawn = initial_spawn_id
	SceneManager.change_room(room, spawn)
