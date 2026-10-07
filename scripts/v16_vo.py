#!/usr/bin/env python3
"""v16_vo.py — V16 情感化少儿配音生成脚本 (XiaoxiaoNeural + YunxiNeural)

角色与音色设计:
  旁白 (Narrator): zh-CN-XiaoxiaoNeural (微软官方分类: Warm, Novel)
                  少儿动画大姐姐/母亲般的温暖、关爱、宠溺、抑扬顿挫的童话感与真挚深情
  挖挖 (Wawa):     zh-CN-YunxiNeural (微软官方分类: Lively, Sunshine, Novel)
                  阳光朝气、活泼勇敢、童真烂漫的小男童挖掘机，开开最好的伙伴

逐句台词情感升华与口语化润色:
  针对全片 37 句台词 (27 句旁白 + 10 句挖挖)，加入真实少儿动画的语气词与叹词:
  - n01: "太阳升起来啦！" (晨曦初升的元气欣喜)
  - n02: "今天是开开的两岁生日！" (充满爱意与仪式感)
  - w01: "开开！两岁生日快乐！我是挖挖！" (欢快真诚的大声问候)
  - n05: "嘘——院子里藏着一个大秘密哦！" (压低声音的神秘悄悄话)
  - w03: "咦？怎么是一只小鸭子呀？嘎嘎嘎！" (极具童趣的惊喜好笑)
  - n19: "开开，大声给挖挖加油：加油！加油！" (热情饱满的互动呼唤)
  - w07: "加把劲！嘿——哟！" (真实的用力呼吸与呐喊感)
  - n21: "哇——！挖出来啦！" (情绪最高潮的大欢呼)
  - n25: "开开，跟挖挖一起吹蜡烛喽！呼——！" (真实的吹气互动感)
  - w10: "开开！两周岁生日快乐！你要健康快乐地长大哦！" (真挚宠溺的伙伴祝福)
  - n27: "开开，生日快乐！我们永远爱你！" (全片最具泪点与温情的深情表白)

产物:
  - assets/audio/v16/{id}.mp3
  - assets/audio/v16/ssml/{id}.xml
  - output/v16/vo_durations.json
"""
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets/audio/v16"
SSML_DIR = OUT_DIR / "ssml"
INFO_FILE = ROOT / "output/v16/vo_durations.json"

OUT_DIR.mkdir(parents=True, exist_ok=True)
SSML_DIR.mkdir(parents=True, exist_ok=True)
INFO_FILE.parent.mkdir(parents=True, exist_ok=True)

VOICES = {
    "narrator": "zh-CN-XiaoxiaoNeural",
    "wawa": "zh-CN-YunxiNeural",
}

# 37 句精雕细琢情感台词 (包含 27 句旁白与 10 句挖挖全量台词)
LINES = {
    # --- 开场篇 (0.0s - 17.0s) ---
    "n01": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "cheerful_sunrise",
        "description": "晨曦初升的元气欣喜，阳光大姐姐般的温暖破晓宣告",
        "rate": "+6%",
        "pitch": "+5Hz",
        "volume": "+0%",
        "text": "太阳升起来啦！",
        "at": 0.8,
    },
    "n02": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "celebratory_warm",
        "description": "充满爱意与仪式感，郑重而欢悦地宣告两岁生日",
        "rate": "+4%",
        "pitch": "+4Hz",
        "volume": "+0%",
        "text": "今天是开开的两岁生日！",
        "at": 5.5,
    },
    "w01": {
        "speaker": "wawa",
        "voice": VOICES["wawa"],
        "emotion": "greeting_joyful",
        "description": "欢快真诚的大声问候，阳光小男孩跳跃招手",
        "rate": "+5%",
        "pitch": "+8Hz",
        "volume": "+0%",
        "text": "开开！两岁生日快乐！我是挖挖！",
        "at": 11.5,
    },

    # --- 寻宝出发篇 (17.5s - 36.0s) ---
    "n03": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "mysterious_playful",
        "description": "俏皮好奇的悬念引介，神秘大任务充满未知惊喜",
        "rate": "+4%",
        "pitch": "+4Hz",
        "volume": "+0%",
        "text": "挖挖今天，有一个超级神秘的大任务哦！",
        "at": 17.5,
    },
    "n04": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "welcoming_cheerful",
        "description": "欢快引介小伙伴，布鲁伊跃入镜头的惊喜",
        "rate": "+6%",
        "pitch": "+6Hz",
        "volume": "+0%",
        "text": "快看，布鲁伊也来啦！",
        "at": 22.5,
    },
    "n05": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "whispering",
        "description": "压低声音的神秘悄悄话，引导宝宝集中注意力",
        "rate": "+4%",
        "pitch": "-2Hz",
        "volume": "-2%",
        "text": "嘘——院子里藏着一个大秘密哦！",
        "at": 28.2,
    },
    "w02": {
        "speaker": "wawa",
        "voice": VOICES["wawa"],
        "emotion": "adventurous",
        "description": "朝气蓬勃、吹响号角般的寻宝召唤",
        "rate": "+6%",
        "pitch": "+9Hz",
        "volume": "+0%",
        "text": "走喽！我们一起去寻宝！",
        "at": 31.8,
    },

    # --- 记号一：花园气球篇 (37.0s - 66.0s) ---
    "n06": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "sing-song_playful",
        "description": "童谣般的节奏韵律，轻快跳跃的寻踪调",
        "rate": "+4%",
        "pitch": "+5Hz",
        "volume": "+0%",
        "text": "跟着小脚印，找一找，瞧一瞧~",
        "at": 37.0,
    },
    "n07": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "discovery_delight",
        "description": "豁然开朗的发现喜悦，成就感拉满",
        "rate": "+6%",
        "pitch": "+7Hz",
        "volume": "+0%",
        "text": "发现第一个记号啦！",
        "at": 43.5,
    },
    "n08": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "rhythmic_working",
        "description": "少儿律动劳动号子，欢快开铲",
        "rate": "+4%",
        "pitch": "+5Hz",
        "volume": "+0%",
        "text": "挖呀挖，挖呀挖——",
        "at": 48.8,
    },
    "n09": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "wonder_delight",
        "description": "由衷的赞叹与惊喜，气球破土升空的美丽",
        "rate": "+6%",
        "pitch": "+7Hz",
        "volume": "+0%",
        "text": "哇！是五彩气球！好漂亮呀！",
        "at": 54.5,
    },
    "n10": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "interactive_encouraging",
        "description": "热情洋溢的亲子互动指令，邀请开开拍手参与",
        "rate": "+6%",
        "pitch": "+6Hz",
        "volume": "+0%",
        "text": "开开，快跟挖挖一起拍拍手！",
        "at": 60.5,
    },

    # --- 记号二：沙坑生日帽篇 (67.0s - 90.0s) ---
    "n11": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "curious_leading",
        "description": "转换场景的明快引导，充满期待",
        "rate": "+5%",
        "pitch": "+5Hz",
        "volume": "+0%",
        "text": "第二个记号在沙坑里哦！",
        "at": 67.0,
    },
    "w03": {
        "speaker": "wawa",
        "voice": VOICES["wawa"],
        "emotion": "surprise_humor",
        "description": "极具童趣的惊喜好笑，歪头学鸭叫嘎嘎嘎",
        "rate": "+4%",
        "pitch": "+9Hz",
        "volume": "+0%",
        "text": "咦？怎么是一只小鸭子呀？嘎嘎嘎！",
        "at": 73.0,
    },
    "n12": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "encouraging_gentle",
        "description": "温柔抚慰与积极鼓励，童趣引导",
        "rate": "+6%",
        "pitch": "+5Hz",
        "volume": "+0%",
        "text": "别着急，再来一铲！",
        "at": 78.8,
    },
    "w04": {
        "speaker": "wawa",
        "voice": VOICES["wawa"],
        "emotion": "effort_triumph",
        "description": "用力一拔随后的欢天喜地，胜利的欢跃",
        "rate": "+6%",
        "pitch": "+8Hz",
        "volume": "+0%",
        "text": "嘿——哟！出来啦！",
        "at": 81.5,
    },
    "n13": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "excited_praise",
        "description": "高调赞美戴上生日帽的帅气挖挖",
        "rate": "+6%",
        "pitch": "+7Hz",
        "volume": "+0%",
        "text": "哇！好漂亮的生日帽！挖挖戴上啦！",
        "at": 85.5,
    },

    # --- 记号三：树下骨头与宾果篇 (91.0s - 123.0s) ---
    "n14": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "lively_announcement",
        "description": "宾果飞奔入场的活泼通报",
        "rate": "+6%",
        "pitch": "+6Hz",
        "volume": "+0%",
        "text": "快看！宾果也跑来帮忙啦！",
        "at": 91.8,
    },
    "n15": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "anticipation_eager",
        "description": "迫不及待的跃动感，锁定大树下目标",
        "rate": "+6%",
        "pitch": "+6Hz",
        "volume": "+0%",
        "text": "第三个记号在大树下！宾果已经等不及啦！",
        "at": 99.0,
    },
    "w05": {
        "speaker": "wawa",
        "voice": VOICES["wawa"],
        "emotion": "teamwork_effort",
        "description": "仗义热心的小伙伴号子，一二起！",
        "rate": "+5%",
        "pitch": "+8Hz",
        "volume": "+0%",
        "text": "挖挖来帮你！一、二、起！",
        "at": 104.5,
    },
    "n16": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "humorous_laughing",
        "description": "忍俊不禁的欢快笑意，宾果心满意足",
        "rate": "+6%",
        "pitch": "+6Hz",
        "volume": "+0%",
        "text": "哈哈！是小狗的大骨头！宾果最喜欢啦！",
        "at": 110.8,
    },
    "w06": {
        "speaker": "wawa",
        "voice": VOICES["wawa"],
        "emotion": "naughty_revealing",
        "description": "聪明狡黠的小得意，为终极宝藏埋下最大期待",
        "rate": "+5%",
        "pitch": "+7Hz",
        "volume": "+0%",
        "text": "开开，骨头是给宾果的，真正的宝藏还在后面呢！",
        "at": 118.5,
    },

    # --- 终极宝藏破土篇 (124.0s - 171.0s) ---
    "n17": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "grand_reveal",
        "description": "史诗般宏大的悬念揭幕，高潮序曲",
        "rate": "+3%",
        "pitch": "+6Hz",
        "volume": "+0%",
        "text": "快看！真正的终极大宝藏……在这里！",
        "at": 124.8,
    },
    "n18": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "climax_anticipation",
        "description": "全场屏息以待的提问，能量积聚",
        "rate": "+6%",
        "pitch": "+7Hz",
        "volume": "+0%",
        "text": "准备好了吗？最大的秘密要出来啦！",
        "at": 132.5,
    },
    "n19": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "interactive_cheer",
        "description": "热情饱满的互动呼唤，齐声呐喊加油",
        "rate": "+10%",
        "pitch": "+8Hz",
        "volume": "+0%",
        "text": "开开，大声给挖挖加油：加油！加油！",
        "at": 136.8,
    },
    "w07": {
        "speaker": "wawa",
        "voice": VOICES["wawa"],
        "emotion": "effort_grunt",
        "description": "真实的用力呼吸与呐喊感，使劲用力的重音",
        "rate": "-2%",
        "pitch": "+6Hz",
        "volume": "+0%",
        "text": "加把劲！嘿——哟！",
        "at": 141.5,
    },
    "n20": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "wonder_climax",
        "description": "宝藏露角的震撼惊奇，超大体量",
        "rate": "+6%",
        "pitch": "+7Hz",
        "volume": "+0%",
        "text": "露出来啦！是一个超级大礼物！",
        "at": 145.8,
    },
    "n21": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "excited_climax",
        "description": "情绪最高潮的大欢呼！全片情绪最高顶点",
        "rate": "+8%",
        "pitch": "+10Hz",
        "volume": "+0%",
        "text": "哇——！挖出来啦！",
        "at": 151.5,
    },
    "w08": {
        "speaker": "wawa",
        "voice": VOICES["wawa"],
        "emotion": "proud_triumph",
        "description": "童真男孩自豪万分的宣告，大获成功",
        "rate": "+6%",
        "pitch": "+9Hz",
        "volume": "+0%",
        "text": "开开的大礼物破土而出啦！太棒啦！",
        "at": 154.5,
    },
    "n22": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "grand_dedication",
        "description": "庄重深情的礼物献词，两岁专属荣耀",
        "rate": "+4%",
        "pitch": "+4Hz",
        "volume": "+0%",
        "text": "这是送给两岁开开的专属生日大宝藏！",
        "at": 159.8,
    },
    "w09": {
        "speaker": "wawa",
        "voice": VOICES["wawa"],
        "emotion": "affectionate_asking",
        "description": "软萌期盼的贴心询问，等待最好朋友的首肯",
        "rate": "+3%",
        "pitch": "+7Hz",
        "volume": "+0%",
        "text": "开开，喜欢挖挖为你挖出的大礼物吗？",
        "at": 166.5,
    },

    # --- 生日蛋糕与许愿篇 (172.0s - 228.0s) ---
    "n23": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "gentle_anticipation",
        "description": "小心翼翼的温馨期待，美味蛋糕闪亮登场",
        "rate": "+4%",
        "pitch": "+5Hz",
        "volume": "+0%",
        "text": "小心，小心，美味的生日蛋糕来喽！",
        "at": 173.0,
    },
    "n24": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "magical_warmth",
        "description": "烛光摇曳的温暖宁静，神圣美好的生日瞬间",
        "rate": "+3%",
        "pitch": "+4Hz",
        "volume": "+0%",
        "text": "两岁的生日蜡烛点亮啦！好美呀！",
        "at": 179.8,
    },
    "n25": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "interactive_blowing",
        "description": "真实的吹气互动感，呼——带动开开一起吹灭蜡烛",
        "rate": "+5%",
        "pitch": "+6Hz",
        "volume": "+0%",
        "text": "开开，跟挖挖一起吹蜡烛喽！呼——！",
        "at": 204.5,
    },
    "n26": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "sparkle_blessing",
        "description": "星光璀璨的美好祝福，愿望成真",
        "rate": "+4%",
        "pitch": "+5Hz",
        "volume": "+0%",
        "text": "吹灭蜡烛，愿望成真啦！",
        "at": 210.5,
    },
    "w10": {
        "speaker": "wawa",
        "voice": VOICES["wawa"],
        "emotion": "affectionate_friendship",
        "description": "真挚宠溺的伙伴祝福，健康快乐长大的深情祝愿",
        "rate": "+8%",
        "pitch": "+7Hz",
        "volume": "+0%",
        "text": "开开！两周岁生日快乐！你要健康快乐地长大哦！",
        "at": 216.5,
    },
    "n27": {
        "speaker": "narrator",
        "voice": VOICES["narrator"],
        "emotion": "loving_finale",
        "description": "全片最具泪点与温情的深情表白，永远爱你的真挚承诺",
        "rate": "-2%",
        "pitch": "+4Hz",
        "volume": "+0%",
        "text": "开开，生日快乐！我们永远爱你！",
        "at": 222.0,
    },
}


def build_ssml(item: dict) -> str:
    """生成符合 W3C 标准的高阶情感化 SSML XML 文档。"""
    voice = item["voice"]
    rate = item["rate"]
    pitch = item["pitch"]
    volume = item["volume"]
    text = item["text"]
    emotion = item["emotion"]
    desc = item["description"]

    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
        'xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">\n'
        f'  <!-- Emotion: {emotion} | Note: {desc} -->\n'
        f'  <voice name="{voice}">\n'
        f'    <prosody pitch="{pitch}" rate="{rate}" volume="{volume}">\n'
        f'      {text}\n'
        f'    </prosody>\n'
        '  </voice>\n'
        '</speak>\n'
    )


def get_duration(path: Path) -> float:
    """使用 ffmpeg 测量音频精确时长。"""
    cmd = ["ffmpeg", "-i", str(path)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    for line in r.stderr.splitlines():
        if "Duration" in line:
            t = line.split("Duration:")[1].split(",")[0].strip()
            parts = t.split(":")
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    return 0.0


def synthesize_line(vid: str, item: dict, max_retries: int = 4) -> float:
    """调用 edge-tts 生成音频，带有指数退避重试以抵御网络抖动。"""
    voice = item["voice"]
    rate = item["rate"]
    pitch = item["pitch"]
    volume = item["volume"]
    text = item["text"]
    out_mp3 = OUT_DIR / f"{vid}.mp3"

    cmd = [
        "uvx", "edge-tts",
        "--voice", voice,
        f"--rate={rate}",
        f"--pitch={pitch}",
        f"--volume={volume}",
        "--text", text,
        "--write-media", str(out_mp3),
    ]

    for attempt in range(1, max_retries + 1):
        # 尝试前清理旧残留
        if out_mp3.exists() and out_mp3.stat().st_size == 0:
            out_mp3.unlink(missing_ok=True)

        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0 and out_mp3.exists() and out_mp3.stat().st_size > 1000:
            dur = get_duration(out_mp3)
            if dur > 0.1:
                return dur

        print(f"[{vid}] Attempt {attempt}/{max_retries} failed ({res.stderr.strip()[:60]}...). Retrying...")
        time.sleep(1.2 * attempt)

    raise RuntimeError(f"Failed to generate {vid} after {max_retries} attempts.")


def main():
    print(f"=== V16 情感化少儿配音生成 (共 {len(LINES)} 轨) ===")
    print(f"旁白音色: {VOICES['narrator']} (Warm, Motherly / Big Sister)")
    print(f"挖挖音色: {VOICES['wawa']} (Lively, Sunshine Boy Companion)")
    print("-" * 65)

    results = {}
    for vid, item in LINES.items():
        spk = item["speaker"]
        voice = item["voice"]
        rate = item["rate"]
        pitch = item["pitch"]
        volume = item["volume"]
        text = item["text"]
        emotion = item["emotion"]
        desc = item["description"]
        start_at = item["at"]

        # 1. 保存对应的专属 SSML XML 文件
        ssml_content = build_ssml(item)
        ssml_file = SSML_DIR / f"{vid}.xml"
        with open(ssml_file, "w", encoding="utf-8") as f:
            f.write(ssml_content)

        # 2. 调用 edge-tts 生成音频 (带网络平滑与重试)
        dur = synthesize_line(vid, item)
        time.sleep(0.35)  # 优雅请求间隔，保护连接平稳

        end_at = round(start_at + dur, 2)
        results[vid] = {
            "speaker": spk,
            "voice": voice,
            "emotion": emotion,
            "description": desc,
            "rate": rate,
            "pitch": pitch,
            "volume": volume,
            "text": text,
            "start": start_at,
            "dur": round(dur, 2),
            "end": end_at,
            "file": str((OUT_DIR / f"{vid}.mp3").relative_to(ROOT)),
            "ssml_file": str(ssml_file.relative_to(ROOT)),
        }
        print(f"[{vid:3s}] ({spk:8s}) [{emotion:22s}] {start_at:5.1f}s - {end_at:5.1f}s ({dur:.2f}s) | {text}")

    with open(INFO_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print("-" * 65)
    print(f"全部 {len(results)}/{len(LINES)} 轨音频生成完毕！")
    print(f"元数据已写入: {INFO_FILE}")


if __name__ == "__main__":
    main()
