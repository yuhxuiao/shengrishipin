#!/usr/bin/env python3
"""scripts/v11_rig_pups.py — 切割并生成布鲁伊与宾果的分件骨骼素材 (数学严格对齐)"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT_BLUEY = ROOT / "assets/images/v11/pups/bluey"
OUT_BINGO = ROOT / "assets/images/v11/pups/bingo"
OUT_BLUEY.mkdir(parents=True, exist_ok=True)
OUT_BINGO.mkdir(parents=True, exist_ok=True)


def rig_character(char_name, im_path, out_dir, root_pt, parts_def, fill_colors):
    im = Image.open(im_path).convert("RGBA")
    W, H = im.size
    print(f"Rigging {char_name} ({W}x{H}) at root {root_pt}...")

    rx, ry = root_pt
    rig_data = {
        "scale_base": H,
        "root": [rx, ry],
        "parts": {}
    }

    for pname, pinfo in parts_def.items():
        box = pinfo["box"]
        pivot = pinfo["pivot"]
        pad = pinfo.get("pad", 0)
        cname = pinfo.get("color")
        color = fill_colors.get(cname)

        crop = im.crop(box)
        x0, y0, x1, y1 = box
        px, py = pivot

        if pad > 0 and color:
            pw, ph = crop.width + pad * 2, crop.height + pad * 2
            padded = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
            draw = ImageDraw.Draw(padded)
            # 垫片中心
            cx_pad = (px - x0) + pad
            cy_pad = (py - y0) + pad
            draw.ellipse([cx_pad - pad, cy_pad - pad, cx_pad + pad, cy_pad + pad], fill=color)
            padded.paste(crop, (pad, pad), crop)
            padded.save(out_dir / f"{pname}.png")

            # 记录在 padded 图内的 pivot 与在角色相对坐标中的 pivot
            rig_data["parts"][pname] = {
                "pivot_in_img": [cx_pad, cy_pad],
                "pivot_from_root": [px - rx, py - ry],
                "w": pw, "h": ph
            }
        else:
            crop.save(out_dir / f"{pname}.png")
            rig_data["parts"][pname] = {
                "pivot_in_img": [px - x0, py - y0],
                "pivot_from_root": [px - rx, py - ry],
                "w": crop.width, "h": crop.height
            }

    with open(out_dir / "rig.json", "w", encoding="utf-8") as f:
        json.dump(rig_data, f, indent=2)
    print(f"{char_name} rig saved to {out_dir / 'rig.json'}!")


def main():
    # 1. Bluey
    bluey_colors = {
        "light": (142, 203, 245, 255),
        "dark": (46, 68, 128, 255),
    }
    bluey_parts = {
        "tail":  {"box": (10, 1070, 370, 1310), "pivot": (330, 1140), "pad": 30, "color": "dark"},
        "leg_r": {"box": (540, 1110, 740, 1425), "pivot": (640, 1130), "pad": 30, "color": "light"},
        "leg_l": {"box": (320, 1110, 520, 1425), "pivot": (420, 1130), "pad": 30, "color": "light"},
        "arm_r": {"box": (720, 560, 1065, 960), "pivot": (750, 790), "pad": 35, "color": "light"},
        "torso": {"box": (230, 680, 820, 1160), "pivot": (530, 750), "pad": 0},
        "head":  {"box": (200, 10, 830, 780), "pivot": (530, 750), "pad": 0},
        "arm_l": {"box": (130, 730, 360, 1150), "pivot": (310, 770), "pad": 35, "color": "light"},
    }
    rig_character("Bluey", ROOT / "assets/images/v10/parts/bluey.png", OUT_BLUEY, (530, 1424), bluey_parts, bluey_colors)

    # 2. Bingo
    bingo_colors = {
        "light": (245, 170, 100, 255),
        "dark": (195, 105, 50, 255),
    }
    bingo_parts = {
        "tail":  {"box": (10, 1780, 390, 2250), "pivot": (350, 1960), "pad": 40, "color": "dark"},
        "leg_r": {"box": (840, 2100, 1180, 2730), "pivot": (1000, 2150), "pad": 40, "color": "light"},
        "leg_l": {"box": (480, 2100, 830, 2730), "pivot": (660, 2150), "pad": 40, "color": "light"},
        "arm_r": {"box": (1200, 1420, 1585, 2180), "pivot": (1260, 1500), "pad": 45, "color": "light"},
        "torso": {"box": (360, 1300, 1380, 2180), "pivot": (825, 1380), "pad": 0},
        "head":  {"box": (320, 15, 1350, 1420), "pivot": (825, 1380), "pad": 0},
        "arm_l": {"box": (190, 1420, 560, 2220), "pivot": (480, 1500), "pad": 45, "color": "light"},
    }
    rig_character("Bingo", ROOT / "assets/images/v10/parts/bingo.png", OUT_BINGO, (825, 2722), bingo_parts, bingo_colors)


if __name__ == "__main__":
    main()
