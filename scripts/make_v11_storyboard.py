#!/usr/bin/env python3
import os
import re
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS_FILE = os.path.join(ROOT, 'web', 'src', 'v11', 'shots.js')
FRAMES_DIR = os.path.join(ROOT, 'web', 'out', 'v11_frames')
OUT_FILE = os.path.join(ROOT, 'output', 'v11_storyboard.jpg')

def parse_shots():
    with open(SHOTS_FILE, 'r', encoding='utf-8') as f:
        text = f.read()

    # Regex match shots definitions
    pattern = re.compile(r"id:\s*'([^']+)',\s*t0:\s*([\d\.]+),\s*t1:\s*([\d\.]+),\s*type:\s*'([^']+)',\s*loc:\s*'([^']+)'(?:,\s*//\s*(.*))?")
    shots = []
    for line in text.split('\n'):
        m = pattern.search(line)
        if m:
            s_id, t0, t1, s_type, loc, desc = m.groups()
            shots.append({
                'id': s_id,
                't0': float(t0),
                't1': float(t1),
                'type': s_type,
                'loc': loc,
                'desc': (desc or '').strip()
            })
    return shots

def make_storyboard():
    shots = parse_shots()
    print(f"Parsed {len(shots)} shots")

    cols = 6
    rows = (len(shots) + cols - 1) // cols
    cell_w = 480
    cell_h = 270
    margin = 8
    header_h = 44

    board_w = cols * (cell_w + margin) + margin
    board_h = rows * (cell_h + header_h + margin) + margin + 60

    board = Image.new('RGB', (board_w, board_h), (24, 28, 36))
    draw = ImageDraw.Draw(board)

    # Title header
    font_path = os.path.join(ROOT, 'web', 'fonts', 'ZCOOLKuaiLe-Regular.ttf')
    if not os.path.exists(font_path):
        font_path = "/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc"
    try:
        font_title = ImageFont.truetype(font_path, 28)
        font_label = ImageFont.truetype(font_path, 16)
        font_sub = ImageFont.truetype(font_path, 14)
    except:
        font_title = font_label = font_sub = ImageFont.load_default()

    draw.text((margin + 10, 16), f"Wawa V11 Director's Cut Storyboard (Total {len(shots)} Shots, 228.0s @ 30fps)", fill=(255, 230, 120), font=font_title)

    for idx, s in enumerate(shots):
        c = idx % cols
        r = idx // cols
        x = margin + c * (cell_w + margin)
        y = 60 + margin + r * (cell_h + header_h + margin)

        t_mid = (s['t0'] + s['t1']) / 2.0
        frame_idx = min(6839, max(0, int(round(t_mid * 30))))
        frame_path = os.path.join(FRAMES_DIR, f"f{frame_idx:05d}.jpg")

        if os.path.exists(frame_path):
            img = Image.open(frame_path)
            img = img.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
            board.paste(img, (x, y))
        else:
            draw.rectangle([x, y, x + cell_w, y + cell_h], fill=(40, 44, 52))
            draw.text((x + 20, y + cell_h // 2), f"Frame {frame_idx:05d} missing", fill=(200, 100, 100))

        # Bottom label box
        label_y = y + cell_h
        draw.rectangle([x, label_y, x + cell_w, label_y + header_h], fill=(35, 40, 52))
        label_text = f"{s['id']} [{s['type']}] {s['t0']:.1f}-{s['t1']:.1f}s ({s['loc']})"
        draw.text((x + 8, label_y + 4), label_text, fill=(255, 220, 80), font=font_label)
        if s['desc']:
            clean_desc = s['desc'][:36]
            draw.text((x + 8, label_y + 24), clean_desc, fill=(200, 210, 225), font=font_sub)

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    board.save(OUT_FILE, "JPEG", quality=90)
    print(f"Storyboard saved to {OUT_FILE} ({board_w}x{board_h})")

if __name__ == '__main__':
    make_storyboard()
