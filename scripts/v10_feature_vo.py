#!/usr/bin/env python3
"""v10_feature_vo.py — V10 正片旁白 18 句 (edge-tts, XiaoxiaoNeural -5% 全统一; Yunxia 已废弃).
产物: assets/audio/feature/{id}.mp3 + output/feature_vo_durations.json
用法: /home/yuhuxiao/.local/opt/venv-media/bin/python scripts/v10_feature_vo.py
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/audio/feature"
OUT.mkdir(parents=True, exist_ok=True)
NARRATOR = ("zh-CN-XiaoxiaoNeural", "-5%")

LINES = {
    "n1": "今天是开开的两岁生日!",
    "n2": "挖挖有个大任务!",
    "n3": "嘘——有秘密惊喜!",
    "n4": "跟着布鲁伊, 找一找!",
    "n5": "看! 第一个记号!",
    "n6": "挖呀挖!",
    "n7": "是气球! 真漂亮!",
    "n8": "下一个记号在哪儿?",
    "n9": "又一顶生日帽! 给布鲁伊戴上!",
    "n10": "宾果也来帮忙啦!",
    "n11": "哎呀, 是骨头! 不是这个~",
    "n12": "真正的宝藏, 在这里!",
    "n13": "挖挖开挖啦! 挖呀挖!",
    "n14": "哇——挖出来啦!",
    "n15": "开开的生日礼物!",
    "n16": "生日蛋糕来喽!",
    "n17": "吹蜡烛喽——",
    "n18": "开开, 两岁生日快乐! 最棒的开开!",
}


def synth(vid, text):
    voice, rate = NARRATOR
    out = OUT / f"{vid}.mp3"
    subprocess.run([
        "uvx", "edge-tts", "--voice", voice, f"--rate={rate}",
        "--text", text, "--write-media", str(out),
    ], check=True, capture_output=True)


def dur_of(p):
    r = subprocess.run(["ffmpeg", "-i", str(p)], capture_output=True, text=True)
    for line in r.stderr.splitlines():
        if "Duration" in line:
            t = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = t.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    return 0.0


if __name__ == "__main__":
    durs = {}
    for vid, text in LINES.items():
        print(f"[{vid}] {text}")
        synth(vid, text)
        durs[vid] = {"text": text, "dur": round(dur_of(OUT / f"{vid}.mp3"), 2)}
        print(f"  -> {durs[vid]['dur']}s")
    (ROOT / "output/feature_vo_durations.json").write_text(json.dumps(durs, ensure_ascii=False, indent=2))
    print("done ->", OUT)
