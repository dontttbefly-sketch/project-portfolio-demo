extends Object
class_name V2Assets

const AKANE_IDLE: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_idle_second_pass.png")
const AKANE_WALK: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_walk_second_pass.png")

const AKANE_ACT_IDLE: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_idle_second_pass.png")
const AKANE_ACT_WALK: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_walk_second_pass.png")
const AKANE_ACT_JUMP: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_jump_second_pass.png")
const AKANE_ACT_FALL: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_fall_second_pass.png")
const AKANE_ACT_LAND: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_land_second_pass.png")
const AKANE_ACT_ATK1: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_atk1_second_pass.png")
const AKANE_ACT_ATK2: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_atk2_second_pass.png")
const AKANE_ACT_ATK3: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_atk3_second_pass.png")
const AKANE_ACT_CHARGE: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_charge_second_pass.png")
const AKANE_ACT_DASH_SLASH: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_dash_slash_second_pass.png")
const AKANE_ACT_SHADOWDASH: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_shadowdash_second_pass.png")
const AKANE_ACT_THREAD: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_thread_second_pass.png")
const AKANE_ACT_PARRY: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_parry_second_pass.png")
const AKANE_ACT_TIMECUT: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_timecut_second_pass.png")
const AKANE_ACT_ECHO: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_echo_second_pass.png")
const AKANE_ACT_HIT: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_hit_second_pass.png")
const AKANE_ACT_DEATH: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_death_second_pass.png")
const AKANE_ACT_READ: Texture2D = preload("res://assets/generated/characters/akane_actions/akane_read_second_pass.png")

const AKANE_FRAME_SIZE := Vector2i(384, 384)
const AKANE_SHEET_IDLE := "res://assets/generated/characters/akane_actions/sheets/akane_idle_sheet.png"
const AKANE_SHEET_WALK := "res://assets/generated/characters/akane_actions/sheets/akane_walk_sheet.png"
const AKANE_SHEET_ATK1 := "res://assets/generated/characters/akane_actions/sheets/akane_atk1_sheet.png"
const AKANE_SHEET_ATK2 := "res://assets/generated/characters/akane_actions/sheets/akane_atk2_sheet.png"
const AKANE_SHEET_ATK3 := "res://assets/generated/characters/akane_actions/sheets/akane_atk3_sheet.png"
const AKANE_SHEET_DASH_SLASH := "res://assets/generated/characters/akane_actions/sheets/akane_dash_slash_sheet.png"
const AKANE_SHEET_SHADOWDASH := "res://assets/generated/characters/akane_actions/sheets/akane_shadowdash_sheet.png"
const AKANE_SHEET_HIT := "res://assets/generated/characters/akane_actions/sheets/akane_hit_sheet.png"
const AKANE_SHEET_ECHO := "res://assets/generated/characters/akane_actions/sheets/akane_echo_sheet.png"

const AKANE_FALLBACK_IDLE: Texture2D = AKANE_ACT_IDLE
const AKANE_FALLBACK_WALK: Texture2D = AKANE_ACT_WALK
const AKANE_FALLBACK_ATK1: Texture2D = AKANE_ACT_ATK1
const AKANE_FALLBACK_ATK2: Texture2D = AKANE_ACT_ATK2
const AKANE_FALLBACK_ATK3: Texture2D = AKANE_ACT_ATK3
const AKANE_FALLBACK_DASH_SLASH: Texture2D = AKANE_ACT_DASH_SLASH
const AKANE_FALLBACK_SHADOWDASH: Texture2D = AKANE_ACT_SHADOWDASH
const AKANE_FALLBACK_HIT: Texture2D = AKANE_ACT_HIT
const AKANE_FALLBACK_ECHO: Texture2D = AKANE_ACT_ECHO

const ENEMY_WHITE: Texture2D = preload("res://assets/generated/enemies/enemy_wanderer_second_pass.png")
const ENEMY_ELITE: Texture2D = preload("res://assets/generated/enemies/elite_umbrella_breaker_second_pass.png")
const BOSS_UMBRELLA: Texture2D = preload("res://assets/generated/bosses/boss_umbrella_man_second_pass.png")
const ENEMY_CRYING_CROW: Texture2D = preload("res://assets/generated/enemies/enemy_crying_crow_second_pass.png")
const ENEMY_UMBRELLA_CARRIER: Texture2D = preload("res://assets/generated/enemies/enemy_umbrella_carrier_second_pass.png")
const ENEMY_FISHER_SHADOW: Texture2D = preload("res://assets/generated/enemies/enemy_fisher_shadow_second_pass.png")
const ENEMY_PAGE_FLIPPER: Texture2D = preload("res://assets/generated/enemies/enemy_page_flipper_second_pass.png")
const ENEMY_RECITER: Texture2D = preload("res://assets/generated/enemies/enemy_reciter_second_pass.png")
const ENEMY_WAVE_WHISPERER: Texture2D = preload("res://assets/generated/enemies/enemy_wave_whisperer_second_pass.png")
const ENEMY_FLOWER_BEARER: Texture2D = preload("res://assets/generated/enemies/enemy_flower_bearer_second_pass.png")
const ENEMY_MIRROR_WALKER: Texture2D = preload("res://assets/generated/enemies/enemy_mirror_walker_second_pass.png")
const ENEMY_GARDEN_GUARDIAN: Texture2D = preload("res://assets/generated/enemies/enemy_garden_guardian_second_pass.png")
const ENEMY_EMBER: Texture2D = preload("res://assets/generated/enemies/enemy_ember_second_pass.png")
const ENEMY_RUSTY_BELL_RINGER: Texture2D = preload("res://assets/generated/enemies/enemy_rusty_bell_ringer_second_pass.png")
const ENEMY_TEST_DUMMY: Texture2D = preload("res://assets/generated/enemies/enemy_test_dummy_second_pass.png")
const ELITE_UMBRELLA_BREAKER: Texture2D = preload("res://assets/generated/enemies/elite_umbrella_breaker_second_pass.png")
const ELITE_BOOK_BURNER: Texture2D = preload("res://assets/generated/enemies/elite_book_burner_second_pass.png")
const ELITE_BELL_GUARD: Texture2D = preload("res://assets/generated/enemies/elite_bell_guard_second_pass.png")
const ELITE_ETERNAL_MIRROR: Texture2D = preload("res://assets/generated/enemies/elite_eternal_mirror_second_pass.png")
const BOSS_UNWRITTEN_ONE: Texture2D = preload("res://assets/generated/bosses/boss_unwritten_one_second_pass.png")
const BOSS_LIGHTHOUSE_KEEPER: Texture2D = preload("res://assets/generated/bosses/boss_lighthouse_keeper_second_pass.png")
const BOSS_SWORD_MAIDEN: Texture2D = preload("res://assets/generated/bosses/boss_sword_maiden_second_pass.png")
const BOSS_FIRST_YONG: Texture2D = preload("res://assets/generated/bosses/boss_first_yong_second_pass.png")
const BOSS_ORIGINAL_YONG: Texture2D = preload("res://assets/generated/bosses/boss_original_yong_second_pass.png")
const YONG: Texture2D = preload("res://assets/generated/characters/yong_first_pass.png")

const FLOOR_WET_STONE: Texture2D = preload("res://assets/generated/environment/floor_wet_stone_first_pass.png")
const WALL_GRAY_WASH: Texture2D = preload("res://assets/generated/environment/wall_gray_wash_first_pass.png")
const FADED_WALL: Texture2D = preload("res://assets/generated/environment/faded_wall_first_pass.png")
const MAP_HUB: Texture2D = preload("res://assets/generated/environment/maps/map_hub_key_second_pass.png")
const MAP_FOREST: Texture2D = preload("res://assets/generated/environment/maps/map_forest_key_second_pass.png")
const MAP_LIBRARY: Texture2D = preload("res://assets/generated/environment/maps/map_library_key_second_pass.png")
const MAP_SEA: Texture2D = preload("res://assets/generated/environment/maps/map_sea_key_second_pass.png")
const MAP_GARDEN: Texture2D = preload("res://assets/generated/environment/maps/map_garden_key_second_pass.png")
const MAP_SECRET: Texture2D = preload("res://assets/generated/environment/maps/map_secret_key_second_pass.png")
const TITLE_WANGCHUAN: Texture2D = preload("res://assets/generated/ui/title_wangchuan_first_pass.png")

const ECHO_STELE: Texture2D = preload("res://assets/generated/props/echo_stele_first_pass.png")
const ECHO_SHARD: Texture2D = preload("res://assets/generated/props/echo_shard_first_pass.png")
const ECHO_TRACE: Texture2D = preload("res://assets/generated/props/echo_trace_first_pass.png")
const FERRY_BOAT: Texture2D = preload("res://assets/generated/props/ferry_boat_first_pass.png")
const CRIMSON_FORGE: Texture2D = preload("res://assets/generated/props/crimson_forge_first_pass.png")
const RED_UMBRELLA: Texture2D = preload("res://assets/generated/props/red_umbrella_first_pass.png")
const GRAPPLE_POINT: Texture2D = preload("res://assets/generated/props/grapple_point_first_pass.png")
const SANCTUM_PORTAL: Texture2D = preload("res://assets/generated/props/sanctum_portal_first_pass.png")


static func get_akane_sheet_path(action_name: String) -> String:
	match action_name:
		"idle": return AKANE_SHEET_IDLE
		"walk": return AKANE_SHEET_WALK
		"atk1": return AKANE_SHEET_ATK1
		"atk2": return AKANE_SHEET_ATK2
		"atk3": return AKANE_SHEET_ATK3
		"dash_slash": return AKANE_SHEET_DASH_SLASH
		"shadowdash": return AKANE_SHEET_SHADOWDASH
		"hit": return AKANE_SHEET_HIT
		"echo": return AKANE_SHEET_ECHO
		_:
			return ""


static func get_akane_fallback(action_name: String) -> Texture2D:
	match action_name:
		"idle": return AKANE_FALLBACK_IDLE
		"walk": return AKANE_FALLBACK_WALK
		"jump": return AKANE_ACT_JUMP
		"fall": return AKANE_ACT_FALL
		"land": return AKANE_ACT_LAND
		"atk1": return AKANE_FALLBACK_ATK1
		"atk2": return AKANE_FALLBACK_ATK2
		"atk3": return AKANE_FALLBACK_ATK3
		"charged": return AKANE_ACT_CHARGE
		"dash_slash": return AKANE_FALLBACK_DASH_SLASH
		"shadowdash": return AKANE_FALLBACK_SHADOWDASH
		"thread": return AKANE_ACT_THREAD
		"parry": return AKANE_ACT_PARRY
		"timecut": return AKANE_ACT_TIMECUT
		"echo": return AKANE_FALLBACK_ECHO
		"hit": return AKANE_FALLBACK_HIT
		"death": return AKANE_ACT_DEATH
		"read": return AKANE_ACT_READ
		_:
			return AKANE_ACT_IDLE
