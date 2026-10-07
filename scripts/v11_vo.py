#!/usr/bin/env python3
"""v11_vo.py — V11 导演版语音生成脚本 (edge-tts)
旁白: zh-CN-XiaoxiaoNeural (-5%)
挖挖: zh-CN-YunxiNeural (+0%, pitch=+5Hz)
产物: assets/audio/v11/{id}.mp3 + output/v11/vo_durations.json
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets/audio/v11"
OUT_DIR.mkdir(parents=True, exist_ok=True)
INFO_FILE = ROOT / "output/v11/vo_durations.json"
INFO_FILE.parent.mkdir(parents=True, exist_ok=True)

VOICES = {
    "narrator": ("zh-CN-XiaoxiaoNeural", "-5%", "+0Hz"),
    "wawa": ("zh-CN-YunxiNeural", "+0%", "+5Hz"),
}

LINES = {
    "n01": {"speaker": "narrator", "text": "太阳升起来啦！", "at": 0.8},
    "n02": {"speaker": "narrator", "text": "今天是开开的两岁生日！", "at": 5.5},
    "w01": {"speaker": "wawa", "text": "开开！两岁生日快乐！我是挖挖！", "at": 11.5},
    "n03": {"speaker": "narrator", "text": "挖挖今天，有一个超级神秘的大任务！", "at": 17.5},
    "n04": {"speaker": "narrator", "text": "看，布鲁伊也来啦！", "at": 22.5},
    "n05": {"speaker": "narrator", "text": "嘘——院子里藏着大秘密！", "at": 28.5},
    "w02": {"speaker": "wawa", "text": "走！我们一起去寻宝！", "at": 31.8},
    "n06": {"speaker": "narrator", "text": "跟着小脚印，找一找，瞧一瞧~", "at": 37.0},
    "n07": {"speaker": "narrator", "text": "发现第一个记号啦！", "at": 43.5},
    "n08": {"speaker": "narrator", "text": "挖呀挖，挖呀挖——", "at": 48.8},
    "n09": {"speaker": "narrator", "text": "哇！是五彩气球！真漂亮！", "at": 54.5},
    "n10": {"speaker": "narrator", "text": "开开，快跟挖挖一起拍拍手！", "at": 60.5},
    "n11": {"speaker": "narrator", "text": "第二个记号在沙坑里！", "at": 67.0},
    "w03": {"speaker": "wawa", "text": "咦？怎么是一只小鸭子呀？", "at": 73.0},
    "n12": {"speaker": "narrator", "text": "别着急，再来一铲！", "at": 78.8},
    "w04": {"speaker": "wawa", "text": "嘿哟！出来啦！", "at": 81.5},
    "n13": {"speaker": "narrator", "text": "哇！漂亮的生日帽！挖挖戴上啦！", "at": 85.5},
    "n14": {"speaker": "narrator", "text": "快看！宾果也跑来帮忙啦！", "at": 91.8},
    "n15": {"speaker": "narrator", "text": "第三个记号在大树下！宾果已经等不及啦！", "at": 99.0},
    "w05": {"speaker": "wawa", "text": "挖挖来帮你！一、二、起！", "at": 104.5},
    "n16": {"speaker": "narrator", "text": "哈哈！是小狗的大骨头！宾果最喜欢啦！", "at": 110.8},
    "w06": {"speaker": "wawa", "text": "开开，骨头是给宾果的，真正的宝藏还在后面呢！", "at": 118.5},
    "n17": {"speaker": "narrator", "text": "快看！真正的终极大宝藏……在这里！", "at": 124.8},
    "n18": {"speaker": "narrator", "text": "准备好了吗？最大的秘密要出来啦！", "at": 132.5},
    "n19": {"speaker": "narrator", "text": "开开，大声给挖挖加油：加油！加油！", "at": 137.5},
    "w07": {"speaker": "wawa", "text": "加把劲！嘿——哟！", "at": 141.5},
    "n20": {"speaker": "narrator", "text": "露出来啦！是一个超级大礼物！", "at": 145.8},
    "n21": {"speaker": "narrator", "text": "哇——！挖出来啦！", "at": 151.5},
    "w08": {"speaker": "wawa", "text": "开开的大礼物破土而出啦！", "at": 154.5},
    "n22": {"speaker": "narrator", "text": "这是送给两岁开开的专属生日大宝藏！", "at": 159.8},
    "w09": {"speaker": "wawa", "text": "开开，喜欢挖挖为你挖出的大礼物吗？", "at": 166.5},
    "n23": {"speaker": "narrator", "text": "小心，小心，美味的生日蛋糕来喽！", "at": 173.0},
    "n24": {"speaker": "narrator", "text": "两岁的生日蜡烛点亮啦！", "at": 179.8},
    "n25": {"speaker": "narrator", "text": "开开，跟挖挖一起吹蜡烛喽！呼——！", "at": 204.5},
    "n26": {"speaker": "narrator", "text": "吹灭蜡烛，愿望成真啦！", "at": 210.5},
    "w10": {"speaker": "wawa", "text": "开开！两周岁生日快乐！你要健康快乐地长大哦！", "at": 216.5},
    "n27": {"speaker": "narrator", "text": "开开，生日快乐！我们永远爱你！", "at": 221.5},
}


def get_duration(path: Path) -> float:
    cmd = ["ffmpeg", "-i", str(path)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    for line in r.stderr.splitlines():
        if "Duration" in line:
            t = line.split("Duration:")[1].split(",")[0].strip()
            parts = t.split(":")
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    return 0.0


def main():
    print(f"Generating {len(LINES)} VO tracks with uvx edge-tts...")
    results = {}
    for vid, item in LINES.items():
        spk = item["speaker"]
        voice, rate, pitch = VOICES[spk]
        text = item["text"]
        out_mp3 = OUT_DIR / f"{vid}.mp3"

        cmd = [
            "uvx", "edge-tts",
            "--voice", voice,
            f"--rate={rate}",
            f"--pitch={pitch}",
            "--text", text,
            "--write-media", str(out_mp3),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"Error generating {vid}: {res.stderr}")
            continue

        dur = get_duration(out_mp3)
        results[vid] = {
            "speaker": spk,
            "text": text,
            "start": item["at"],
            "dur": round(dur, 2),
            "end": round(item["at"] + dur, 2),
            "file": str(out_mp3.relative_to(ROOT)),
        }
        print(f"[{vid}] ({spk}) start={item['at']}s dur={dur:.2f}s: {text}")

    with open(INFO_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Saved durations to {INFO_FILE}")


if __name__ == "__main__":
    main()
