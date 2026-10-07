#!/home/yuhuxiao/.local/opt/venv-media/bin/python3
"""
make_v14_storyboard.py — V14 双节曲臂曲腿 · 抗抽搐平滑 · 真实尺度物理 · 动态转场 37 镜全景故事板生成器
尺寸: 2936 x 2322 (6 列 x 7 行, 标注镜号、时间码、转场与剧情动作)
输出: output/v14_storyboard.jpg
"""
import os
import sys
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS_FILE = os.path.join(ROOT, "web", "src", "v14", "shots.js")
FRAMES_DIR = os.path.join(ROOT, "web", "out", "v14_frames")
OUT_FILE = os.path.join(ROOT, "output", "v14_storyboard.jpg")

SHOT_DESCS = {
    'S01': '片头标题：开开的生日大冒险 · 晨光',
    'S02': '挖挖沉稳驶入！低频悬挂与开阔构图',
    'S03': '打破第四面墙 1: 挖挖向开开问好',
    'S04': '大臂张望，神秘大任务灵光一闪',
    'S05': '布鲁伊二段式双腿轻盈飞奔，肘关节欢呼',
    'S06': '蹑手蹑脚，院子发现金色大秘密！',
    'S07': '[Iris全动态转场] 换景花园，穿梭探路',
    'S08': '布鲁伊二段臂曲肘指向第一个 X 记号',
    'S09': '真机物理挖掘：悬挂下压、咬土拉刮、重力下坠',
    'S10': '冲击星芒！挖出五彩气球飞升',
    'S11': '互动 1: 开开跟挖挖一起拍拍手 (双手胸前自然合掌)',
    'S12': '[Push推镜] 换景沙坑，小狗伴跑入场',
    'S13': '幽默意外：沙质凹坑挖出小鸭子，布鲁伊捧腹大笑',
    'S14': '加油再来一铲！猛烈暴击破土',
    'S15': '特写：挖挖戴上生日帽自豪摇摆',
    'S16': '速度线！宾果飞跃大抛物线曲腿入场',
    'S17': '[Wipe擦除] 换景大树，小狗急切蹦跳',
    'S18': '挖土大臂发力，大骨头破土而出',
    'S19': '宾果双臂环抱大骨头蹭蹭欢喜跳舞',
    'S20': '打破第四面墙 2: 挖挖对开开眨眼笑',
    'S21': '[StarWipe展开] 换景金色草地大金X',
    'S22': '留白蓄压，地面裂纹与金色光芒',
    'S23': '[ZoomBlur极速] 终极物理挖掘大宝藏',
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
    rows = (len(shots) + cols - 1) // cols
    cell_w = 480
    cell_h = 270
    margin = 8
    header_h = 44
    top_title_h = 60

    board_w = cols * (cell_w + margin) + margin
    board_h = rows * (cell_h + header_h + margin) + margin + top_title_h

    print(f"Generating contact sheet: {board_w} x {board_h}")
    board = Image.new("RGB", (board_w, board_h), (16, 20, 28))
    draw = ImageDraw.Draw(board)

    font_path = os.path.join(ROOT, "web", "fonts", "ZCOOLKuaiLe-Regular.ttf")
    if not os.path.exists(font_path):
        font_path = "/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc"

    try:
        font_title = ImageFont.truetype(font_path, 28)
        font_label = ImageFont.truetype(font_path, 16)
        font_sub = ImageFont.truetype(font_path, 13)
    except:
        font_title = font_label = font_sub = ImageFont.load_default()

    title_text = f"Wawa V14 Fluid Animation & Dynamic Physics Storyboard (Total {len(shots)} Shots, 228.0s @ 30fps)"
    draw.text((margin + 12, 16), title_text, fill=(255, 230, 110), font=font_title)

    for i, shot in enumerate(shots):
        r = i // cols
        c = i % cols

        x0 = margin + c * (cell_w + margin)
        y0 = top_title_h + margin + r * (cell_h + header_h + margin)

        t_mid = (shot['t0'] + shot['t1']) / 2.0
        frame_idx = int(round(t_mid * 30.0))
        frame_path = os.path.join(FRAMES_DIR, f"f{frame_idx:05d}.jpg")

        if os.path.exists(frame_path):
            try:
                with Image.open(frame_path) as im:
                    thumb = im.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
                    board.paste(thumb, (x0, y0))
            except Exception as e:
                print(f"Error loading frame {frame_path}: {e}")
                draw.rectangle([x0, y0, x0 + cell_w, y0 + cell_h], fill=(40, 20, 20))
        else:
            draw.rectangle([x0, y0, x0 + cell_w, y0 + cell_h], fill=(30, 35, 45))
            draw.text((x0 + cell_w//2 - 60, y0 + cell_h//2 - 10), f"Frame #{frame_idx} N/A", fill=(150, 150, 150), font=font_label)

        draw.rectangle([x0, y0, x0 + cell_w - 1, y0 + cell_h - 1], outline=(60, 80, 110), width=1)

        info_y0 = y0 + cell_h
        draw.rectangle([x0, info_y0, x0 + cell_w, info_y0 + header_h], fill=(22, 28, 38))

        sid = shot.get('id', f'S{i+1:02d}')
        t0 = shot.get('t0', 0)
        t1 = shot.get('t1', 0)
        dur = t1 - t0
        loc = shot.get('loc', '')

        tag = f"[{sid}] {t0:.1f}s - {t1:.1f}s ({dur:.1f}s) · {loc}"
        draw.text((x0 + 8, info_y0 + 4), tag, fill=(100, 220, 255), font=font_label)

        desc = SHOT_DESCS.get(sid, f"镜头 {sid}")
        draw.text((x0 + 8, info_y0 + 24), desc, fill=(210, 215, 225), font=font_sub)

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    board.save(OUT_FILE, quality=92)
    print(f"Saved contact sheet to {OUT_FILE} (size: {os.path.getsize(OUT_FILE)/(1024*1024):.2f} MB)")

if __name__ == '__main__':
    make_storyboard()
