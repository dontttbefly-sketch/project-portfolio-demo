# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Repository purpose

This repo contains the design documentation and a Godot prototype for *《茜响 / Akane's Echo》*, a **pure 2D side-scrolling Metroidvania** (Godot 4.6, macOS-first → Windows). Earlier notes that describe the project with an old engine or camera model are obsolete. All design and asset documentation is in **Chinese**; preserve Chinese when editing unless explicitly asked otherwise.

The root-level design package is two files that act as a pair:

- `茜响_完整策划案.md` (~3000 lines) — The single source of truth. Six volumes: ① core systems · ② world & story · ③ level design · ④ enemy/boss data · ⑤ art & music specs · ⑥ AI implementation route and acceptance criteria.
- `茜响_AI美术资源提示词包.md` — Derived Codex image-generation production prompts for characters, actions, bosses, enemies, regions, props, and UI. Every entry references designs defined in the 策划案.

When the 策划案 changes (a boss redesign, a new region, a palette tweak), the 提示词包 entry for that asset usually needs the same edit. Treat the prompt pack as downstream of the design doc, not independent.

The `akane-echo/` subdirectory is the Godot 4.6 project. Its `docs/` copies of the two Markdown files must stay synchronized with the root-level source documents.

## Hard design constraints (do not violate when editing)

These are stated in 策划案 §1.3 as the project's "三原则" and gate every content decision:

1. **「红是唯一的颜色」** — The world is desaturated grays/whites/pale tones; **crimson red `#C8102E` is the only saturated color**, used only for: the protagonist Akane, enemy weak points, interactables, hidden-path traces, and "memory hasn't faded" markers. Do not introduce other accent colors in design text or art prompts.
2. **「每个键都做两件事」** — Every input/resource is dual-purpose (attack also charges the 残响 gauge; the gauge is spent on combat *or* exploration; abilities solve combat *and* puzzles). When proposing new mechanics, justify the second use.
3. **「沉默胜过言语」** — Narrative is environmental. Keep dialogue minimal. Prefer 残响碎片 (memory shards) and scene composition over expository text.

## Cross-document invariants to preserve

Several entities appear in both files and in multiple sections of the 策划案. When editing one, search the others:

- **Protagonist 阿茜 / Akane** — design in 策划案 §1.9 & 第二卷 §2; visual spec in 第五卷 §3 and prompt-pack 第一部分.
- **NPC 咏** — 策划案 第二卷 §3 and 第四卷 §8 (hidden boss "最初的咏"); prompt-pack 第二部分 + §3.5.
- **Four bosses + hidden boss** — narrative in 第二卷 §5, combat data in 第四卷 §4–§8, art in prompt-pack 第三部分.
- **Six regions** — 中央枢纽 忘川渡口 + 4 main areas (濡羽之森 / 燃尽书馆 / 沉钟海 / 白栀庭) + hidden area 最初的咏. Defined in 第三卷 §2–§7; art in prompt-pack 第四部分.
- **残响 system** — the signature mechanic; spec in 第一卷 §4. Touches combat, exploration (破壁), and the late-game 弹反凝时斩 unlock.
- **Lock-and-key table** — 第三卷 §8 enumerates every gated path. Adding/removing an exploration ability or region requires updating this table.

If you change a number (HP, damage, frame data, gauge cost, region count, shard count, content hours), grep the whole repo — these values are quoted in summary tables and pacing/budget sections.

## Working with these files

- `茜响_完整策划案.md` is large; use targeted reads or `rg` rather than loading it all at once. The prompt pack is shorter but should still be searched by `asset_id`,角色名,区域名, or动作名 when syncing changes.
- The root directory is **not a git repo** (no `.git`). The `akane-echo/` subdirectory is a git repo and may already contain unrelated user changes; do not revert them.
- There is no README, no CI, no linters. Markdown is the only format. Heading style is `#`/`##`/`###` with emoji prefixes on top-level sections — match the surrounding style when adding new sections.
- Tables use Chinese full-width punctuation in many places (`｜`, `／`); follow the local convention of the section you're editing rather than normalizing globally.
