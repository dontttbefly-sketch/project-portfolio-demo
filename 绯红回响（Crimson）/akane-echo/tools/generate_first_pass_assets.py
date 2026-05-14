#!/usr/bin/env python3
"""Generate first-pass art replacement assets for Akane's Echo.

These are production-path placeholders: they follow the v3 prompt-pack
constraints closely enough to replace block placeholders while final imagegen
batches are produced over time.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "generated"

CRIMSON = (200, 16, 46, 255)
DEEP_CRIMSON = (139, 10, 26, 255)
ECHO_WHITE = (245, 241, 232, 245)
SILENT_WHITE = (250, 250, 247, 255)
FOG_GREY = (168, 168, 168, 255)
INK_GREY = (58, 58, 58, 255)
VOID = (15, 15, 18, 255)
PALE_CYAN = (159, 184, 194, 255)
LOW_BROWN = (111, 91, 77, 255)


def ensure_dirs() -> None:
    for name in ["ui", "enemies", "bosses", "props", "environment", "characters"]:
        (OUT / name).mkdir(parents=True, exist_ok=True)


def add_paper_grain(img: Image.Image, amount: int = 18, alpha: int = 22) -> Image.Image:
    rng = random.Random(8102)
    base = img.convert("RGBA")
    base_alpha = base.getchannel("A")
    grain = Image.new("RGBA", img.size, (0, 0, 0, 0))
    px = grain.load()
    for y in range(img.height):
        for x in range(img.width):
            if base_alpha.getpixel((x, y)) == 0:
                continue
            v = rng.randint(-amount, amount)
            if v >= 0:
                px[x, y] = (255, 255, 255, min(alpha, v + 4))
            else:
                px[x, y] = (0, 0, 0, min(alpha, -v + 4))
    return Image.alpha_composite(base, grain)


def watercolor_blob(size: tuple[int, int], fill: tuple[int, int, int, int], seed: int) -> Image.Image:
    rng = random.Random(seed)
    w, h = size
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer, "RGBA")
    for _ in range(18):
        cx = rng.randint(w // 5, w * 4 // 5)
        cy = rng.randint(h // 5, h * 4 // 5)
        rx = rng.randint(w // 9, w // 3)
        ry = rng.randint(h // 12, h // 3)
        color = (*fill[:3], rng.randint(18, fill[3]))
        draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=color)
    return layer.filter(ImageFilter.GaussianBlur(radius=max(2, min(size) // 45)))


def save(img: Image.Image, rel: str) -> Path:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    return path


def title_background() -> Path:
    w, h = 1920, 1080
    img = Image.new("RGBA", (w, h), VOID)
    draw = ImageDraw.Draw(img, "RGBA")

    for i in range(h):
        t = i / h
        r = int(18 + 56 * (1 - t))
        g = int(18 + 45 * (1 - t))
        b = int(23 + 50 * (1 - t))
        draw.line((0, i, w, i), fill=(r, g, b, 255))

    img.alpha_composite(watercolor_blob((w, h), (90, 79, 92, 100), 1))
    img.alpha_composite(watercolor_blob((w, h), (159, 184, 194, 46), 2))

    river_y = int(h * 0.68)
    draw.rectangle((0, river_y, w, h), fill=(38, 42, 48, 185))
    for n in range(18):
        y = river_y + n * 18 + (n % 3) * 4
        draw.line((0, y, w, y + 12), fill=(230, 230, 226, 14), width=2)
    draw.line((w * 0.18, river_y + 76, w * 0.82, river_y + 60), fill=(200, 16, 46, 72), width=3)

    # Dock and ferry silhouette.
    draw.polygon([(220, 760), (920, 740), (1050, 790), (250, 820)], fill=(38, 35, 34, 220))
    draw.polygon([(1160, 710), (1500, 710), (1430, 765), (1210, 765)], fill=(32, 28, 27, 230))
    draw.line((1215, 732, 1430, 730), fill=CRIMSON, width=4)

    # Akane back silhouette.
    cx, ground = 910, 740
    draw.ellipse((cx - 24, ground - 240, cx + 24, ground - 192), fill=(232, 232, 226, 245))
    draw.polygon([(cx - 38, ground - 190), (cx + 38, ground - 190), (cx + 26, ground - 72), (cx - 28, ground - 72)], fill=(236, 235, 229, 238))
    draw.polygon([(cx - 32, ground - 72), (cx + 30, ground - 72), (cx + 54, ground - 10), (cx - 50, ground - 10)], fill=(70, 70, 72, 235))
    draw.rectangle((cx - 42, ground - 126, cx + 44, ground - 119), fill=CRIMSON)
    draw.line((cx + 54, ground - 178, cx + 104, ground - 4), fill=(232, 232, 226, 210), width=5)
    draw.line((cx + 56, ground - 160, cx + 94, ground - 125), fill=CRIMSON, width=3)
    draw.polygon([(cx - 34, ground - 214), (cx - 90, ground - 196), (cx - 37, ground - 188)], fill=CRIMSON)

    img = add_paper_grain(img, 12, 22)
    return save(img, "ui/title_wangchuan_first_pass.png")


def draw_enemy(kind: str, size: int, elite: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img, "RGBA")
    cx, cy = size // 2, int(size * 0.55)
    scale = size / 256

    body_w = int((46 if not elite else 70) * scale)
    body_h = int((128 if not elite else 160) * scale)
    blob = watercolor_blob((size, size), ECHO_WHITE, 20 if not elite else 21)
    img.alpha_composite(blob)
    draw.ellipse((cx - body_w // 2, cy - body_h // 2, cx + body_w // 2, cy + body_h // 2), fill=(245, 241, 232, 220))
    draw.ellipse((cx - int(26 * scale), cy - body_h // 2 - int(44 * scale), cx + int(26 * scale), cy - body_h // 2 + int(10 * scale)), fill=(248, 246, 240, 230))
    for side in [-1, 1]:
        draw.line((cx + side * body_w // 3, cy - int(25 * scale), cx + side * int(62 * scale), cy + int(38 * scale)), fill=(230, 228, 222, 180), width=max(2, int(5 * scale)))
        draw.line((cx + side * int(16 * scale), cy + body_h // 2 - int(8 * scale), cx + side * int(34 * scale), cy + body_h // 2 + int(50 * scale)), fill=(230, 228, 222, 180), width=max(2, int(6 * scale)))

    if elite:
        draw.arc((cx - int(90 * scale), cy - int(150 * scale), cx + int(90 * scale), cy + int(24 * scale)), 200, 340, fill=(238, 236, 230, 220), width=max(3, int(8 * scale)))
        draw.line((cx - int(62 * scale), cy - int(52 * scale), cx + int(70 * scale), cy + int(58 * scale)), fill=(74, 70, 68, 210), width=max(3, int(7 * scale)))
        weak = (cx + int(44 * scale), cy - int(82 * scale))
    else:
        weak = (cx, cy - int(32 * scale))

    draw.ellipse((weak[0] - int(6 * scale), weak[1] - int(6 * scale), weak[0] + int(6 * scale), weak[1] + int(6 * scale)), fill=CRIMSON)
    img = img.filter(ImageFilter.GaussianBlur(radius=0.25))
    return add_paper_grain(img, 10, 18)


def boss_silhouette() -> Path:
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img, "RGBA")
    cx, cy = size // 2, 270
    img.alpha_composite(watercolor_blob((size, size), (245, 241, 232, 70), 30))

    draw.ellipse((cx - 46, cy - 190, cx + 46, cy - 100), fill=(232, 230, 224, 238))
    draw.polygon([(cx - 76, cy - 112), (cx + 76, cy - 112), (cx + 104, cy + 150), (cx - 92, cy + 150)], fill=(74, 72, 70, 235))
    draw.polygon([(cx - 110, cy - 148), (cx + 110, cy - 148), (cx + 76, cy - 92), (cx - 76, cy - 92)], fill=(238, 236, 230, 215))
    draw.line((cx - 108, cy - 108, cx - 158, cy + 52), fill=(226, 224, 218, 220), width=14)
    draw.line((cx + 98, cy - 92, cx + 164, cy + 42), fill=(226, 224, 218, 220), width=14)
    draw.arc((cx - 168, cy - 260, cx + 168, cy - 24), 196, 344, fill=(230, 227, 220, 235), width=14)
    draw.line((cx - 110, cy - 146, cx + 118, cy - 142), fill=DEEP_CRIMSON, width=4)
    draw.ellipse((cx + 98, cy - 108, cx + 116, cy - 90), fill=CRIMSON)
    return save(add_paper_grain(img, 10, 18), "bosses/boss_faded_umbrella_first_pass.png")


def stele() -> Path:
    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img, "RGBA")
    cx = size // 2
    draw.rounded_rectangle((76, 32, 180, 224), radius=26, fill=(168, 168, 168, 230))
    draw.rounded_rectangle((88, 48, 168, 210), radius=20, fill=(216, 212, 204, 238))
    for i in range(7):
        x = 96 + i * 11
        draw.line((x, 70 + i * 10, x + 22, 92 + i * 13), fill=(94, 92, 90, 75), width=2)
    draw.line((cx, 74, cx, 176), fill=CRIMSON, width=4)
    draw.ellipse((cx - 8, 118, cx + 8, 134), fill=CRIMSON)
    draw.ellipse((66, 212, 190, 238), fill=(40, 40, 44, 48))
    return save(add_paper_grain(img, 14, 20), "props/echo_stele_first_pass.png")


def red_prop(name: str) -> Image.Image:
    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img, "RGBA")
    if name == "forge":
        draw.polygon([(62, 180), (88, 96), (168, 96), (194, 180)], fill=(48, 45, 44, 245))
        draw.rectangle((80, 160, 176, 204), fill=(66, 60, 58, 245))
        draw.ellipse((94, 108, 162, 172), fill=(20, 18, 18, 255))
        draw.polygon([(108, 154), (126, 98), (142, 154)], fill=CRIMSON)
        draw.polygon([(124, 158), (138, 116), (154, 158)], fill=DEEP_CRIMSON)
    elif name == "umbrella":
        draw.arc((36, 40, 220, 210), 200, 340, fill=CRIMSON, width=16)
        draw.pieslice((42, 42, 214, 210), 200, 340, fill=(200, 16, 46, 210))
        draw.line((128, 124, 128, 218), fill=(48, 42, 42, 255), width=8)
        draw.arc((98, 182, 156, 238), 20, 180, fill=(48, 42, 42, 255), width=7)
    elif name == "boat":
        draw.polygon([(34, 150), (214, 150), (178, 202), (62, 202)], fill=(48, 38, 34, 245))
        draw.line((62, 162, 180, 160), fill=CRIMSON, width=5)
        draw.line((128, 148, 128, 72), fill=(72, 64, 60, 255), width=6)
        draw.polygon([(132, 78), (192, 132), (132, 132)], fill=(230, 228, 222, 205))
    elif name == "grapple":
        draw.ellipse((82, 82, 174, 174), outline=CRIMSON, width=9)
        for a in range(0, 360, 60):
            r1, r2 = 34, 70
            x1 = 128 + math.cos(math.radians(a)) * r1
            y1 = 128 + math.sin(math.radians(a)) * r1
            x2 = 128 + math.cos(math.radians(a)) * r2
            y2 = 128 + math.sin(math.radians(a)) * r2
            draw.line((x1, y1, x2, y2), fill=(232, 228, 222, 220), width=4)
        draw.ellipse((118, 118, 138, 138), fill=CRIMSON)
    elif name == "portal":
        draw.ellipse((58, 38, 198, 218), outline=(232, 228, 222, 220), width=10)
        draw.ellipse((76, 58, 180, 198), outline=(200, 16, 46, 160), width=5)
        for y in range(72, 190, 16):
            draw.line((96, y, 160, y + 8), fill=(250, 250, 247, 72), width=2)
    elif name == "trace":
        draw.line((42, 184, 92, 136, 134, 148, 206, 76), fill=CRIMSON, width=8)
        draw.line((42, 184, 92, 136, 134, 148, 206, 76), fill=(245, 241, 232, 128), width=3)
        for x, y in [(58, 174), (112, 142), (152, 126), (196, 84)]:
            draw.ellipse((x - 5, y - 5, x + 5, y + 5), fill=CRIMSON)
    else:
        draw.polygon([(128, 40), (172, 118), (128, 216), (84, 118)], fill=(232, 228, 222, 224))
        draw.polygon([(128, 64), (150, 120), (128, 186), (106, 120)], fill=(200, 16, 46, 220))
    return add_paper_grain(img, 10, 18)


def yong_npc() -> Path:
    size = 320
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img, "RGBA")
    cx, cy = size // 2, 168
    img.alpha_composite(watercolor_blob((size, size), (245, 241, 232, 42), 70))
    draw.ellipse((cx - 44, cy - 112, cx + 44, cy - 44), fill=(222, 222, 218, 232))
    draw.polygon([(cx - 82, cy - 92), (cx + 82, cy - 92), (cx + 56, cy - 54), (cx - 56, cy - 54)], fill=(218, 218, 214, 240))
    draw.polygon([(cx - 64, cy - 58), (cx + 56, cy - 58), (cx + 82, cy + 120), (cx - 78, cy + 120)], fill=(188, 188, 186, 235))
    draw.polygon([(cx - 44, cy - 60), (cx + 44, cy - 60), (cx + 18, cy - 18), (cx - 22, cy - 18)], fill=(44, 44, 46, 220))
    draw.line((cx + 54, cy + 0, cx + 96, cy + 54), fill=(210, 210, 206, 220), width=6)
    draw.rounded_rectangle((cx + 78, cy + 48, cx + 122, cy + 108), radius=10, outline=(235, 235, 230, 230), width=5)
    draw.ellipse((cx + 88, cy + 66, cx + 112, cy + 92), fill=(230, 230, 224, 130))
    draw.ellipse((cx - 88, cy + 112, cx + 98, cy + 140), fill=(0, 0, 0, 44))
    return save(add_paper_grain(img, 10, 18), "characters/yong_first_pass.png")


def environment_tile(kind: str) -> Image.Image:
    size = 256
    base = {
        "floor": (78, 82, 82, 255),
        "wall": (82, 84, 88, 255),
        "faded_wall": (152, 148, 146, 230),
    }[kind]
    img = Image.new("RGBA", (size, size), base)
    draw = ImageDraw.Draw(img, "RGBA")
    rng = random.Random({"floor": 50, "wall": 51, "faded_wall": 52}[kind])
    for _ in range(60):
        x, y = rng.randint(0, size), rng.randint(0, size)
        length = rng.randint(20, 90)
        col = (255, 255, 255, rng.randint(12, 32)) if rng.random() > 0.45 else (0, 0, 0, rng.randint(10, 25))
        draw.line((x, y, x + length, y + rng.randint(-8, 8)), fill=col, width=rng.randint(1, 3))
    if kind == "faded_wall":
        draw.line((50, 84, 196, 174), fill=(200, 16, 46, 55), width=5)
        draw.line((88, 52, 138, 220), fill=(200, 16, 46, 35), width=3)
    return add_paper_grain(img, 14, 22)


def main() -> None:
    ensure_dirs()
    manifest: list[dict[str, str]] = []

    assets = {
        "UI_Title_01": title_background(),
        "ENM_Generic_white_01": save(draw_enemy("white", 256), "enemies/enemy_white_first_pass.png"),
        "ELT_Generic_faded_01": save(draw_enemy("elite", 384, elite=True), "enemies/enemy_elite_first_pass.png"),
        "BOS_Generic_umbrella_01": boss_silhouette(),
        "YNG_REF_side_01": yong_npc(),
        "PRP_EchoStele_01": stele(),
        "PRP_Forge_01": save(red_prop("forge"), "props/crimson_forge_first_pass.png"),
        "PRP_RedUmbrella_01": save(red_prop("umbrella"), "props/red_umbrella_first_pass.png"),
        "PRP_Boat_01": save(red_prop("boat"), "props/ferry_boat_first_pass.png"),
        "PRP_GrapplePoint_01": save(red_prop("grapple"), "props/grapple_point_first_pass.png"),
        "PRP_SanctumPortal_01": save(red_prop("portal"), "props/sanctum_portal_first_pass.png"),
        "PRP_EchoTrace_01": save(red_prop("trace"), "props/echo_trace_first_pass.png"),
        "PRP_EchoShard_01": save(red_prop("shard"), "props/echo_shard_first_pass.png"),
        "ENV_Floor_01": save(environment_tile("floor"), "environment/floor_wet_stone_first_pass.png"),
        "ENV_Wall_01": save(environment_tile("wall"), "environment/wall_gray_wash_first_pass.png"),
        "ENV_FadedWall_01": save(environment_tile("faded_wall"), "environment/faded_wall_first_pass.png"),
    }

    for asset_id, path in assets.items():
        manifest.append(
            {
                "asset_id": asset_id,
                "path": "res://" + str(path.relative_to(ROOT)),
                "batch": "first_pass_replacement",
                "red_rule": "Only #C8102E as saturated accent.",
            }
        )

    manifest_path = OUT / "first_pass_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
