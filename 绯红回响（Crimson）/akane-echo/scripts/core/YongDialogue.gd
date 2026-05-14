extends Node

# ============================================================
# 咏的对白库（autoload 单例）
# 策划案 §3.3：30 句不重复，进入枢纽随机抽 1 句
# 已说过的标记，全部说完后重新洗牌
# ============================================================

# 30 句按情境分组（M6.4 占位文本，正式版按策划案补全）
const LINES_WELCOME: Array[String] = [
	"「又回来了。这里没什么变化，是吧。」",
	"「水声永远是这个调子。我数过的。」",
	"「你眼里有红色。我以前认识一个人也这样。」",
	"「记得多少，就走多远。」",
	"「不用谢我。船是它自己想渡你的。」",
]

const LINES_EXPLORING: Array[String] = [
	"「林子东边湿。书馆南边热。海北面冷。庭子西边白。你自己挑。」",
	"「那把伞还没回来。它会回来的。」",
	"「字会消失。但写过的事不会。」",
	"「钟声往哪里走，是钟自己的事。」",
	"「白栀花没有香味。她说过，没有香味才美。」",
	"「这里的雨不是天上来的。是有人没说完的话。」",
	"「我不问你在找谁。问了也答不上来。」",
	"「累了就坐残响碑前。会比你想的还安静。」",
]

const LINES_POST_BOSS: Array[String] = [
	"「他终于松开伞了。这是好事。」",
	"「写完了？……写完就好。」",
	"「灯灭了，但海还在。海不需要灯。」",
	"「她举剑了。这一次是为自己。」",
	"「你又长大了一些。我看得出来。」",
]

const LINES_GENERIC: Array[String] = [
	"「红是这里唯一的颜色。其他都褪了。」",
	"「时间在这里很慢。慢到能看见每一个被忘记的人。」",
	"「不要回头看自己。镜子也是会撒谎的。」",
	"「绯红丝缕是别人来过的证据。攒着。」",
	"「碎片不只是碎片。每一块都是一个名字。」",
	"「问题问到第三遍，答案才会变成自己的。」",
	"「我也在等一个人。等了很久了。」",
	"「你和她有点像。但又不是她。」",
	"「不要急着记起。有时候忘记是疗愈。」",
	"「斩开雨水的剑，是温柔的。」",
	"「我不会跟着你出去。我留下来。总要有人留下来。」",
]

const LINES_FINAL: Array[String] = [
	"「如果有一天我不在这里了……请你也不要难过。我们都是被记起来的人。」",
]

# 二周目专属（M7v2 NG+）
const LINES_NG_PLUS: Array[String] = [
	"「又是你。又一次。」",
	"「这次你认得路了。我也认得你了。」",
	"「我也想起来一些事。但我说不出来。」",
	"「红色再多看一会儿，就不疼了。」",
	"「她还在等。我知道。」",
	"「灯笼现在是淡红的。你看出来了吗？」",
	"「这一周，敌人会更狠。但你也更会打了。」",
	"「不要太快。这里值得慢慢看。」",
	"「我学会了一句新话。不告诉你。」",
	"「你回来了我就放心。其实也没什么放心不放心。」",
	"「白栀花上一周开错了。这周开得对。」",
	"「上一周你死过几次？我数过的。」",
	"「碎片有时候是同一片。只是你两次见到。」",
	"「我以为我会忘掉你。结果我没有。」",
	"「我也曾经是阿茜。但是很久之前的事了。」",
]

var _all_lines: Array[String] = []
var _spoken: Dictionary = {}    ## line → true


func _ready() -> void:
	_all_lines.append_array(LINES_WELCOME)
	_all_lines.append_array(LINES_EXPLORING)
	_all_lines.append_array(LINES_POST_BOSS)
	_all_lines.append_array(LINES_GENERIC)


# 抽 1 句还没说过的；全部说完则重新洗牌
func pick_line() -> String:
	# 通关临界（4 Boss 全击败）：用 final 句
	if PlayerProgress.killed_bosses.size() >= 4 and not _spoken.has(LINES_FINAL[0]):
		_spoken[LINES_FINAL[0]] = true
		return LINES_FINAL[0]

	# NG+ 优先抽 NG+ 库（70% 概率），剩 30% 用普通库
	var pool: Array[String] = _all_lines
	if PlayerProgress.ng_plus_count > 0 and randf() < 0.7:
		pool = LINES_NG_PLUS

	var available: Array[String] = []
	for line in pool:
		if not _spoken.has(line):
			available.append(line)
	if available.is_empty():
		# 全部说完，重洗（仅清这个池子）
		for line in pool:
			_spoken.erase(line)
		available = pool.duplicate()
	var picked: String = available[randi() % available.size()]
	_spoken[picked] = true
	return picked
