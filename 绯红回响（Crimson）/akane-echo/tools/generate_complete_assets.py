#!/usr/bin/env python3
"""Generate second-pass coverage assets for Akane's Echo.

This expands the first replacement batch from generic silhouettes into
per-entity art handles for the current Godot prototype. It intentionally stays
procedural and deterministic so the project always has complete local assets;
future imagegen outputs can replace the same filenames.
"""

from __future__ import annotations

import json
import math
import random
import zlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from generate_first_pass_assets import (
    CRIMSON,
    DEEP_CRIMSON,
    ECHO_WHITE,
    FOG_GREY,
    INK_GREY,
    LOW_BROWN,
    OUT,
    PALE_CYAN,
    ROOT,
    SILENT_WHITE,
    VOID,
    add_paper_grain,
    ensure_dirs,
    save,
    watercolor_blob,
)


def stable_seed(value: str) -> int:
    return zlib.crc32(value.encode("utf-8")) & 0xFFFFFFFF


def add_transparent_grain(img: Image.Image, intensity: int, alpha: int) -> Image.Image:
    original_alpha = img.getchannel("A")
    edge = ImageDraw.Draw(original_alpha)
    for inset in range(4):
        edge.rectangle(
            (inset, inset, img.width - 1 - inset, img.height - 1 - inset),
            outline=0,
        )
    textured = add_paper_grain(img, intensity, alpha)
    textured.putalpha(original_alpha)
    return textured


def draw_akane_action(name: str) -> Image.Image:
    size = 384
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img, "RGBA")
    cx, ground = 184, 300
    pose = {
        "idle": (0, 0, 0),
        "walk": (-18, 8, -10),
        "jump": (0, -44, 10),
        "fall": (0, -12, 14),
        "land": (0, 22, -4),
        "atk1": (18, 0, -18),
        "atk2": (8, 0, 12),
        "atk3": (0, 0, -24),
        "charge": (-8, 4, -12),
        "dash_slash": (36, 8, -18),
        "shadowdash": (42, 4, -10),
        "thread": (-4, 0, -8),
        "parry": (0, 0, 0),
        "timecut": (0, -38, -22),
        "echo": (0, 0, 0),
        "hit": (-22, 8, 18),
        "death": (-4, 42, 76),
        "read": (0, 0, 0),
    }.get(name, (0, 0, 0))
    ox, oy, rot = pose
    cx += ox
    ground += oy

    if name in {"shadowdash", "timecut"}:
        for offset, alpha in [(-46, 48), (-24, 74)]:
            draw.polygon(
                [(cx - 22 + offset, ground - 160), (cx + 24 + offset, ground - 160), (cx + 20 + offset, ground - 62), (cx - 18 + offset, ground - 62)],
                fill=(200, 16, 46, alpha),
            )
    if name == "echo":
        draw.ellipse((cx - 76, ground - 206, cx + 76, ground - 46), outline=(200, 16, 46, 125), width=5)
    if name == "timecut":
        for i in range(5):
            draw.arc((cx - 100 + i * 16, ground - 236 + i * 8, cx + 110 + i * 16, ground - 20 + i * 8), 215, 298, fill=(200, 16, 46, 125), width=4)

    # Legs.
    leg_shift = 18 if name in {"walk", "dash_slash", "shadowdash"} else 8
    if name == "death":
        draw.line((cx - 16, ground - 44, cx - 70, ground - 10), fill=(245, 241, 232, 230), width=14)
        draw.line((cx + 10, ground - 42, cx + 58, ground - 12), fill=(245, 241, 232, 230), width=14)
    else:
        draw.line((cx - 12, ground - 88, cx - leg_shift, ground - 8), fill=(245, 241, 232, 238), width=16)
        draw.line((cx + 12, ground - 88, cx + leg_shift, ground - 8), fill=(245, 241, 232, 238), width=16)

    # Skirt, body, head.
    draw.polygon([(cx - 34, ground - 104), (cx + 34, ground - 104), (cx + 46, ground - 62), (cx - 44, ground - 62)], fill=(62, 62, 64, 245))
    draw.polygon([(cx - 30, ground - 176), (cx + 30, ground - 176), (cx + 24, ground - 104), (cx - 24, ground - 104)], fill=(245, 241, 232, 245))
    draw.line((cx - 32, ground - 122, cx + 32, ground - 120), fill=CRIMSON, width=5)
    draw.ellipse((cx - 25, ground - 224, cx + 25, ground - 176), fill=(238, 238, 232, 250))
    draw.polygon([(cx - 28, ground - 202), (cx - 76, ground - 188), (cx - 30, ground - 180)], fill=CRIMSON)
    draw.ellipse((cx + 9, ground - 205, cx + 15, ground - 199), fill=CRIMSON)

    # Arms and sword.
    sword_angle = {
        "atk1": -22,
        "atk2": 10,
        "atk3": -40,
        "charge": -72,
        "dash_slash": 0,
        "parry": -86,
        "timecut": -72,
        "hit": 28,
        "death": 82,
    }.get(name, -12)
    length = 112
    sx, sy = cx + 32, ground - 146
    ex = sx + math.cos(math.radians(sword_angle)) * length
    ey = sy + math.sin(math.radians(sword_angle)) * length
    draw.line((cx + 20, ground - 154, sx, sy), fill=(238, 226, 214, 235), width=10)
    draw.line((sx, sy, ex, ey), fill=(245, 245, 242, 235), width=5)
    draw.line((sx - 4, sy + 4, sx + 10, sy - 3), fill=CRIMSON, width=4)

    if name.startswith("atk") or name in {"dash_slash", "parry", "charge"}:
        draw.arc((cx - 78, ground - 230, cx + 156, ground + 20), 212, 312, fill=(200, 16, 46, 150), width=5)
    if name == "thread":
        draw.line((cx + 30, ground - 150, cx + 170, ground - 246), fill=CRIMSON, width=4)
        draw.ellipse((cx + 162, ground - 254, cx + 178, ground - 238), outline=CRIMSON, width=4)
    if name == "read":
        draw.ellipse((cx + 70, ground - 138, cx + 88, ground - 120), fill=CRIMSON)

    img = img.rotate(rot, resample=Image.Resampling.BICUBIC, center=(cx, ground - 130))
    return add_transparent_grain(img, 8, 14)


def draw_specific_enemy(kind: str, elite: bool = False) -> Image.Image:
    size = 384 if elite else 320
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img, "RGBA")
    cx, cy = size // 2, int(size * 0.58)
    s = size / 320
    img.alpha_composite(watercolor_blob((size, size), (245, 241, 232, 70), stable_seed(kind) & 255))

    body = (245, 241, 232, 224)
    line = (72, 72, 74, 180)
    weak = (cx, cy - int(44 * s))
    if "crow" in kind:
        draw.polygon([(cx - 92*s, cy - 34*s), (cx, cy - 92*s), (cx + 92*s, cy - 34*s), (cx + 18*s, cy + 34*s), (cx - 18*s, cy + 34*s)], fill=body)
        draw.arc((cx - 95*s, cy - 98*s, cx + 95*s, cy + 70*s), 205, 335, fill=line, width=int(5*s))
        weak = (cx + int(12*s), cy - int(58*s))
    elif "page" in kind or "reciter" in kind:
        for i in range(5):
            x = cx - 58 + i * 25
            draw.polygon([(x, cy - 120), (x + 46, cy - 100), (x + 28, cy + 74), (x - 18, cy + 48)], fill=(245, 241, 232, 170))
        draw.ellipse((cx - 24, cy - 112, cx + 24, cy - 64), fill=body)
        weak = (cx, cy - 24)
    elif "fisher" in kind or "wave" in kind:
        draw.polygon([(cx - 42, cy - 130), (cx + 36, cy - 130), (cx + 58, cy + 82), (cx - 54, cy + 82)], fill=(220, 226, 226, 205))
        draw.line((cx + 36, cy - 68, cx + 104, cy - 8), fill=line, width=5)
        draw.arc((cx + 88, cy - 8, cx + 130, cy + 48), 80, 260, fill=CRIMSON, width=4)
        weak = (cx + 108, cy + 20)
    elif "flower" in kind:
        draw.polygon([(cx - 42, cy - 116), (cx + 38, cy - 116), (cx + 48, cy + 84), (cx - 50, cy + 84)], fill=body)
        for a in range(0, 360, 60):
            x = cx + math.cos(math.radians(a)) * 28
            y = cy - 18 + math.sin(math.radians(a)) * 22
            draw.ellipse((x - 15, y - 10, x + 15, y + 10), fill=(250, 250, 247, 210))
        weak = (cx, cy - 18)
    elif "mirror" in kind:
        draw.polygon([(cx - 46, cy - 138), (cx + 50, cy - 116), (cx + 36, cy + 82), (cx - 56, cy + 62)], outline=(235, 235, 232, 230), fill=(210, 214, 214, 120))
        draw.line((cx - 32, cy - 78, cx + 34, cy + 24), fill=line, width=4)
        weak = (cx + 6, cy - 24)
    elif "ember" in kind:
        draw.ellipse((cx - 44, cy - 78, cx + 44, cy + 10), fill=(245, 241, 232, 185))
        draw.line((cx - 58, cy + 24, cx + 58, cy - 64), fill=CRIMSON, width=7)
        weak = (cx, cy - 32)
    else:
        draw.ellipse((cx - 26*s, cy - 128*s, cx + 26*s, cy - 78*s), fill=body)
        draw.polygon([(cx - 40*s, cy - 82*s), (cx + 42*s, cy - 82*s), (cx + 52*s, cy + 94*s), (cx - 50*s, cy + 94*s)], fill=body)
        draw.line((cx - 42*s, cy - 30*s, cx + 56*s, cy + 38*s), fill=line, width=max(4, int(6*s)))
        if elite:
            draw.arc((cx - 92*s, cy - 152*s, cx + 92*s, cy - 8*s), 202, 338, fill=(240, 238, 232, 220), width=max(7, int(9*s)))
            weak = (cx + int(48*s), cy - int(90*s))

    r = int(7 * s)
    draw.ellipse((weak[0] - r, weak[1] - r, weak[0] + r, weak[1] + r), fill=CRIMSON)
    return add_transparent_grain(img, 9, 16)


def draw_boss(kind: str) -> Image.Image:
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img, "RGBA")
    cx, cy = size // 2, 286
    img.alpha_composite(watercolor_blob((size, size), (245, 241, 232, 68), stable_seed(kind) & 255))

    if kind == "unwritten":
        for i in range(8):
            x = cx - 100 + i * 28
            draw.polygon([(x, cy - 186), (x + 58, cy - 160), (x + 34, cy + 148), (x - 22, cy + 116)], fill=(245, 241, 232, 150))
        draw.ellipse((cx - 38, cy - 180, cx + 38, cy - 104), fill=(245, 241, 232, 230))
        draw.ellipse((cx + 62, cy - 128, cx + 78, cy - 112), fill=CRIMSON)
    elif kind == "lighthouse":
        draw.polygon([(cx - 82, cy - 170), (cx + 84, cy - 170), (cx + 110, cy + 154), (cx - 104, cy + 154)], fill=(58, 58, 58, 245))
        draw.ellipse((cx - 44, cy - 228, cx + 44, cy - 140), fill=(220, 220, 214, 230))
        draw.rounded_rectangle((cx + 88, cy - 96, cx + 144, cy - 18), radius=12, outline=CRIMSON, width=7)
        draw.ellipse((cx + 102, cy - 76, cx + 132, cy - 42), fill=(200, 16, 46, 160))
    elif kind == "sword_maiden":
        ak = draw_akane_action("parry").resize((512, 512), Image.Resampling.LANCZOS)
        img.alpha_composite(ak)
        draw.ellipse((cx - 62, cy + 122, cx + 62, cy + 166), fill=(200, 16, 46, 120))
    elif kind == "first_yong" or kind == "original_yong":
        draw.polygon([(cx - 72, cy - 180), (cx + 68, cy - 180), (cx + 96, cy + 154), (cx - 100, cy + 154)], fill=(240, 240, 236, 235))
        draw.polygon([(cx - 98, cy - 210), (cx + 98, cy - 210), (cx + 70, cy - 158), (cx - 70, cy - 158)], fill=(250, 250, 247, 235))
        draw.rounded_rectangle((cx + 76, cy - 60, cx + 128, cy + 30), radius=10, outline=(42, 42, 46, 255), width=7)
        if kind == "first_yong":
            draw.ellipse((cx + 90, cy - 36, cx + 114, cy - 8), fill=(42, 42, 46, 180))
    else:
        draw.ellipse((cx - 46, cy - 190, cx + 46, cy - 100), fill=(232, 230, 224, 238))
        draw.polygon([(cx - 76, cy - 112), (cx + 76, cy - 112), (cx + 104, cy + 150), (cx - 92, cy + 150)], fill=(74, 72, 70, 235))
        draw.polygon([(cx - 110, cy - 148), (cx + 110, cy - 148), (cx + 76, cy - 92), (cx - 76, cy - 92)], fill=(238, 236, 230, 215))
        draw.arc((cx - 168, cy - 260, cx + 168, cy - 24), 196, 344, fill=(230, 227, 220, 235), width=14)
        draw.line((cx - 110, cy - 146, cx + 118, cy - 142), fill=DEEP_CRIMSON, width=4)
    return add_transparent_grain(img, 9, 16)


def draw_region_key(region: str) -> Image.Image:
    w, h = 1920, 1080
    palettes = {
        "hub": ((45, 42, 48), (90, 79, 92), "river"),
        "forest": ((28, 38, 34), (46, 74, 61), "trees"),
        "library": ((34, 29, 24), (112, 101, 82), "shelves"),
        "sea": ((44, 54, 60), (122, 138, 149), "bells"),
        "garden": ((226, 224, 218), (250, 250, 247), "flowers"),
        "secret": ((10, 10, 13), (38, 38, 42), "void"),
    }
    low, high, motif = palettes[region]
    img = Image.new("RGBA", (w, h), (*low, 255))
    draw = ImageDraw.Draw(img, "RGBA")
    for y in range(h):
        t = y / h
        col = tuple(int(high[i] * (1 - t) + low[i] * t) for i in range(3))
        draw.line((0, y, w, y), fill=(*col, 255))
    img.alpha_composite(watercolor_blob((w, h), (*high, 62), stable_seed(region) & 255))

    ground = 770
    if motif == "trees":
        for x in range(-60, w + 80, 140):
            draw.polygon([(x, ground), (x + 48, ground), (x + 28, 210), (x + 2, 210)], fill=(18, 22, 20, 220))
        draw.line((280, ground - 58, 420, ground - 44), fill=CRIMSON, width=6)
    elif motif == "shelves":
        for x in range(120, w, 280):
            draw.rectangle((x, 260, x + 170, ground), fill=(34, 28, 24, 210))
            for yy in range(300, ground, 48):
                draw.line((x + 10, yy, x + 160, yy + 8), fill=(218, 210, 196, 55), width=3)
        draw.ellipse((w - 340, 420, w - 320, 440), fill=CRIMSON)
    elif motif == "bells":
        draw.ellipse((w - 520, 190, w - 210, 520), outline=(214, 212, 204, 140), width=18)
        for x in range(80, w, 220):
            draw.line((x, 250, x + 120, ground), fill=(90, 82, 74, 130), width=8)
        draw.rounded_rectangle((w - 260, ground - 120, w - 214, ground - 48), radius=9, outline=CRIMSON, width=5)
    elif motif == "flowers":
        for x in range(0, w, 80):
            draw.ellipse((x, ground - 30, x + 70, ground + 22), fill=(250, 250, 247, 190))
        draw.ellipse((w // 2 - 28, ground - 64, w // 2 + 28, ground - 8), fill=CRIMSON)
    elif motif == "void":
        draw.rectangle((0, ground, w, h), fill=(5, 5, 7, 255))
        draw.line((0, ground + 68, w, ground + 34), fill=(250, 250, 247, 170), width=18)
        for x in range(100, w, 160):
            draw.text((x, random.Random(x).randint(260, 620)), "茜", fill=(250, 250, 247, 58))
    else:
        draw.rectangle((0, ground, w, h), fill=(35, 38, 42, 220))
        for y in range(ground + 20, h, 28):
            draw.line((0, y, w, y + 8), fill=(250, 250, 247, 42), width=2)
        draw.polygon([(190, ground - 40), (860, ground - 60), (1030, ground - 6), (220, ground + 32)], fill=(34, 30, 28, 220))
        draw.line((600, ground + 20, 1500, ground - 6), fill=(200, 16, 46, 80), width=4)
    return add_paper_grain(img, 12, 20)


def main() -> None:
    ensure_dirs()
    (OUT / "characters" / "akane_actions").mkdir(parents=True, exist_ok=True)
    (OUT / "environment" / "maps").mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, str]] = []

    action_names = [
        "idle", "walk", "jump", "fall", "land", "atk1", "atk2", "atk3",
        "charge", "dash_slash", "shadowdash", "thread", "parry", "timecut",
        "echo", "hit", "death", "read",
    ]
    for name in action_names:
        path = save(draw_akane_action(name), f"characters/akane_actions/akane_{name}_second_pass.png")
        manifest.append({"asset_id": f"AKN_ACT_{name}", "path": "res://" + str(path.relative_to(ROOT)), "batch": "second_pass_complete"})

    enemies = {
        "wanderer": "enemy_wanderer_second_pass.png",
        "crying_crow": "enemy_crying_crow_second_pass.png",
        "umbrella_carrier": "enemy_umbrella_carrier_second_pass.png",
        "fisher_shadow": "enemy_fisher_shadow_second_pass.png",
        "page_flipper": "enemy_page_flipper_second_pass.png",
        "reciter": "enemy_reciter_second_pass.png",
        "wave_whisperer": "enemy_wave_whisperer_second_pass.png",
        "flower_bearer": "enemy_flower_bearer_second_pass.png",
        "mirror_walker": "enemy_mirror_walker_second_pass.png",
        "garden_guardian": "enemy_garden_guardian_second_pass.png",
        "ember": "enemy_ember_second_pass.png",
        "rusty_bell_ringer": "enemy_rusty_bell_ringer_second_pass.png",
        "test_dummy": "enemy_test_dummy_second_pass.png",
    }
    for kind, filename in enemies.items():
        path = save(draw_specific_enemy(kind), f"enemies/{filename}")
        manifest.append({"asset_id": f"ENM_{kind}", "path": "res://" + str(path.relative_to(ROOT)), "batch": "second_pass_complete"})

    elites = {
        "umbrella_breaker": "elite_umbrella_breaker_second_pass.png",
        "book_burner": "elite_book_burner_second_pass.png",
        "bell_guard": "elite_bell_guard_second_pass.png",
        "eternal_mirror": "elite_eternal_mirror_second_pass.png",
    }
    for kind, filename in elites.items():
        path = save(draw_specific_enemy(kind, elite=True), f"enemies/{filename}")
        manifest.append({"asset_id": f"ELT_{kind}", "path": "res://" + str(path.relative_to(ROOT)), "batch": "second_pass_complete"})

    bosses = {
        "umbrella": "boss_umbrella_man_second_pass.png",
        "unwritten": "boss_unwritten_one_second_pass.png",
        "lighthouse": "boss_lighthouse_keeper_second_pass.png",
        "sword_maiden": "boss_sword_maiden_second_pass.png",
        "first_yong": "boss_first_yong_second_pass.png",
        "original_yong": "boss_original_yong_second_pass.png",
    }
    for kind, filename in bosses.items():
        path = save(draw_boss(kind), f"bosses/{filename}")
        manifest.append({"asset_id": f"BOS_{kind}", "path": "res://" + str(path.relative_to(ROOT)), "batch": "second_pass_complete"})

    for region in ["hub", "forest", "library", "sea", "garden", "secret"]:
        path = save(draw_region_key(region), f"environment/maps/map_{region}_key_second_pass.png")
        manifest.append({"asset_id": f"MAP_{region}", "path": "res://" + str(path.relative_to(ROOT)), "batch": "second_pass_complete"})

    (OUT / "second_pass_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
