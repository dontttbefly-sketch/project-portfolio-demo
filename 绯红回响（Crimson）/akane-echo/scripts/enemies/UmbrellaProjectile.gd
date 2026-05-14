extends Node3D
class_name UmbrellaProjectile

# ============================================================
# Boss 阶段 2 的伞骨投掷物：直线飞行 + Area3D 检测玩家
# ============================================================

@export var speed: float = 12.0
@export var damage: int = 12
@export var lifetime: float = 4.0
@export var direction: Vector3 = Vector3(0, 0, -1)

var _alive: float = 0.0


func _ready() -> void:
	# 自动设置 HitBox 数值与一次性 timer 自毁
	var hb := get_node_or_null("HitBox")
	if hb != null and "damage" in hb:
		hb.damage = damage
		hb.knockback_force = 4.0
	if hb != null and hb.has_method("set_active"):
		hb.set_active(true)


func _physics_process(delta: float) -> void:
	_alive += delta
	if _alive >= lifetime:
		queue_free()
		return
	global_position += direction * speed * delta
