extends Node

# ============================================================
# Hub 终幕控制器
# 挂在 Hub.tscn 中，根据 PlayerProgress.post_boss4_state 切换显示
# - 终幕：隐藏 咏 / 铸炉 / 4 石阵 / 祭坛门，显示 Boat + 触发独白
# - 平时：相反
# ============================================================

const FINALE_HIDDEN_NODE_NAMES: Array[String] = [
	"Yong",
	"ForgeAltar",
	"StelePortalForest",
	"StelePortalLibrary",
	"StelePortalSea",
	"StelePortalGarden",
	"SanctumPortal",
]

const FINALE_VISIBLE_NODE_NAMES: Array[String] = [
	"Boat",
]


func _ready() -> void:
	# 确保 Hub 节点已准备好
	call_deferred("_apply_state")


func _apply_state() -> void:
	var hub: Node = get_parent()
	if hub == null:
		return
	var post_boss4: bool = PlayerProgress.post_boss4_state
	for n in FINALE_HIDDEN_NODE_NAMES:
		var nd := hub.get_node_or_null(n)
		if nd != null:
			_set_node_visible(nd, not post_boss4)
	for n in FINALE_VISIBLE_NODE_NAMES:
		var nd := hub.get_node_or_null(n)
		if nd != null:
			_set_node_visible(nd, post_boss4)
	# 终幕首次进入时给玩家独白
	if post_boss4 and not PlayerProgress.ending_chosen:
		# 等一下让 SceneManager 黑屏淡完再说话
		await get_tree().create_timer(1.5).timeout
		MonologueSystem.show_monologue("「咏的小屋空了。门虚掩着。\n渡口的船等着。船头的红色绳索特别明显。」", 6.0)


# Sprite3D / Node3D 都有 visible，PromptArea 需禁用
func _set_node_visible(nd: Node, vis: bool) -> void:
	if "visible" in nd:
		nd.visible = vis
	# 子 PromptArea / 其他 Area3D 也需要禁用，否则隐藏 sprite 仍能交互
	for c in nd.get_children():
		if c is Area3D:
			(c as Area3D).monitoring = vis
