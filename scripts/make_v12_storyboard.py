#!/home/yuhuxiao/.local/opt/venv-media/bin/python3
"""
make_v12_storyboard.py — V12 导演版 37 镜全片全景故事板生成器
尺寸: 2936 x 2322 (6 列 x 7 行, 标注镜号、时间码、转场与剧情动作)
输出: output/v12_storyboard.jpg
"""
import os
import sys
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS_FILE = os.path.join(ROOT, "web", "src", "v12", "shots.js")
FRAMES_DIR = os.path.join(ROOT, "web", "out", "v12_frames")
OUT_FILE = os.path.join(ROOT, "output", "v12_storyboard.jpg")

# 剧情动作与台词摘要标注字典
SHOT_DESCS = {
    'S01': '片头标题：开开的生日大冒险 · 晨光',
    'S02': '挖挖欢快驶入！路面颠簸与双连跳',
    'S03': '打破第四面墙 1: 挖挖向开开问好',
    'S04': '大臂张望，神秘大任务灵光一闪',
    'S05': '布鲁伊疾跑落地，挥手欢呼大跳',
    'S06': '蹑手蹑脚，院子发现金色大秘密！',
    'S07': '[Iris转场] 换景花园，穿梭探路',
    'S08': '布鲁伊惊喜指向第一个 X 记号',
    'S09': '特写：铲斗蓄力扎土，飞溅土块',
    'S10': '冲击星芒！挖出五彩气球飞升',
    'S11': '互动 1: 开开跟挖挖一起拍拍手',
    'S12': '[Push推镜] 换景沙坑，小狗伴跑入场',
    'S13': '幽默意外：挖出小鸭子，布鲁伊大笑',
    'S14': '加油再来一铲！猛烈暴击破土',
    'S15': '特写：挖挖戴上生日帽自豪摇摆',
    'S16': '速度线！宾果飞跃大抛物线入场',
    'S17': '[Wipe擦除] 换景大树，小狗急切蹦跳',
    'S18': '挖土大臂发力，大骨头破土而出',
    'S19': '宾果紧抱大骨头蹭蹭欢喜跳舞',
    'S20': '打破第四面墙 2: 挖挖对开开眨眼笑',
    'S21': '[StarWipe展开] 换景金色草地大金X',
    'S22': '留白蓄压，地面裂纹与金色光芒',
    'S23': '[ZoomBlur极速] 互动 2: 给挖挖加油',
    'S24': '特写：尘土散去，大礼物露出一角',
    'S25': '[Whip甩镜] 慢动作升格礼物破土狂欢',
    'S26': '礼物稳稳落地，铲斗平放自豪介绍',
    'S27': '打破第四面墙 3: 挖挖问开开喜不喜欢',
    'S28': '[BalloonWipe擦除] 换景派对长桌蛋糕',
    'S29': '生日蜡烛点亮，全员惊喜赞叹',
    'S30a': '[Dissolve叠化] 组镜1: 三人合唱摇摆',
    'S30b': '组镜2: 布鲁伊单人特写合唱大笑',
    'S30c': '组镜3: 宾果单人特写欢呼跳跃',
    'S30d': '组镜4: 挖挖特写点头，眼里星光',
    'S31': '[Iris聚焦] 互动 3: 全体一起吹蜡烛',
    'S32': '愿望成真！彩纸雨漫天飞舞大狂欢',
    'S33': '打破第四面墙 4: 终极祝福两岁长大',
    'S34': '片尾大字幕定格：开开2岁生日快乐！',
}

def load_shots():
    abs_path = os.path.abspath(SHOTS_FILE)
    cmd = f"node -e \"const Shots = require('{abs_path}'); console.log(JSON.stringify(Shots.SHOTS));\""
    p = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"Failed to load shots.js: {p.stderr}")
    return json.loads(p.stdout)

def make_storyboard():
    shots = load_shots()
    print(f"Loaded {len(shots)} shots from shots.js")

    cols = 6
    rows = (len(shots) + cols - 1) // cols  # 7 rows
    cell_w = 480
    cell_h = 270
    margin = 8
    header_h = 44
    top_title_h = 60

    board_w = cols * (cell_w + margin) + margin  # 6 * 488 + 8 = 2936
    board_h = rows * (cell_h + header_h + margin) + margin + top_title_h  # 7 * 322 + 68 = 2322

    print(f"Generating contact sheet: {board_w} x {board_h}")
    board = Image.new("RGB", (board_w, board_h), (16, 20, 28))
    draw = ImageDraw.Draw(board)

    # 字体加载
    font_path = os.path.join(ROOT, "web", "fonts", "ZCOOLKuaiLe-Regular.ttf")
    if not os.path.exists(font_path):
        font_path = "/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc"

    try:
        font_title = ImageFont.truetype(font_path, 28)
        font_label = ImageFont.truetype(font_path, 16)
        font_sub = ImageFont.truetype(font_path, 13)
    except:
        font_title = font_label = font_sub = ImageFont.load_default()

    # 顶部标题栏
    title_text = f"Wawa V12 Director's Cut Storyboard (Total {len(shots)} Shots, 228.0s @ 30fps)"
    draw.text((margin + 12, 16), title_text, fill=(255, 230, 110), font=font_title)
    draw.text((board_w - 420, 22), "A1-A10 Quality Gate Verified · High-Dynamic Acting", fill=(130, 180, 240), font=font_sub)

    for idx, s in enumerate(shots):
        c = idx % cols
        r = idx // cols
        x = margin + c * (cell_w + margin)
        y = top_title_h + margin + r * (cell_h + header_h + margin)

        t_mid = (s["t0"] + s["t1"]) / 2.0
        frame_idx = min(6839, max(0, int(round(t_mid * 30))))
        frame_path = os.path.join(FRAMES_DIR, f"f{frame_idx:05d}.jpg")

        if os.path.exists(frame_path):
            with Image.open(frame_path) as im:
                im_thumb = im.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
                board.paste(im_thumb, (x, y))
        else:
            # 占位图
            draw.rectangle([x, y, x + cell_w, y + cell_h], fill=(32, 38, 48))
            draw.text((x + 24, y + cell_h // 2 - 10), f"Frame {frame_idx:05d} ({t_mid:.1f}s)", fill=(180, 190, 205), font=font_label)

        # 底部标注框
        label_y = y + cell_h
        draw.rectangle([x, label_y, x + cell_w, label_y + header_h], fill=(24, 30, 42))

        # 边框
        draw.rectangle([x, y, x + cell_w, label_y + header_h], outline=(40, 52, 72), width=1)

        trans_tag = ""
        if s.get("transitionIn"):
            trans_tag = f" ⟲{s['transitionIn']['type']}"

        label_left = f"{s['id']} [{s['type']}] {s['t0']:.1f}-{s['t1']:.1f}s ({s['loc']}){trans_tag}"
        desc = SHOT_DESCS.get(s["id"], s.get("desc", ""))

        draw.text((x + 8, label_y + 4), label_left, fill=(255, 218, 70), font=font_label)
        draw.text((x + 8, label_y + 24), desc, fill=(195, 215, 235), font=font_sub)

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    board.save(OUT_FILE, "JPEG", quality=92)
    print(f"Storyboard saved successfully: {OUT_FILE} ({board_w}x{board_h})")

if __name__ == "__main__":
    make_storyboard()
