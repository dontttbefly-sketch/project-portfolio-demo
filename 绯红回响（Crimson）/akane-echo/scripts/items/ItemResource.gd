extends Resource
class_name ItemResource

# ============================================================
# 道具数据资源（.tres）
# 一件道具 = 一个 ItemResource 实例
# 数值与效果脚本分离：本资源只描述"是什么"，效果在 ItemSystem 里 dispatch
# ============================================================

enum ItemType {
	ACTIVE,   ## 主动：装备到 4 槽位之一，按 1234 触发
	PASSIVE,  ## 被动：装备就生效
}

@export var id: String = ""
@export var display_name: String = ""
@export_multiline var description: String = ""
@export var item_type: ItemType = ItemType.ACTIVE
@export var max_charges: int = 1            ## 主动道具：每次残响碑回满
@export var icon_color: Color = Color(1, 1, 1, 1)
@export var use_effect_id: String = ""      ## ItemSystem 内 dispatch 的 key
