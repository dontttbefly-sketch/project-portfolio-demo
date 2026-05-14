extends Marker3D
class_name SpawnPoint

# 房间内的玩家落点。由 SceneManager 在房间切换后查找。

@export var spawn_id: String = "default"


func _ready() -> void:
	add_to_group("spawn_point")
