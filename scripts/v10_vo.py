#!/usr/bin/env python3
"""v10_vo.py — V10 样片旁白 (edge-tts, 沿用 v9 声线).
产物: assets/audio/v10/{id}.mp3 + output/v10_vo_durations.json
用法: /home/yuhuxiao/.local/opt/venv-media/bin/python scripts/v10_vo.py
"""
import json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/audio/v10"
OUT.mkdir(parents=True, exist_ok=True)
NARRATOR = ("zh-CN-XiaoxiaoNeural", "-5%")
KAIKAI = ("zh-CN-YunxiaNeural", "+8%")   # 弃用: agy 评审 "k1 突然变成年男声, 与前文脱节", 统一用 NARRATOR

LINES = {
    "n1": (NARRATOR, "布鲁伊发现了生日秘密!"),
    "n2": (NARRATOR, "嘘——礼物就藏在这下面!"),
    "n3": (NARRATOR, "挖挖开挖啦!挖呀挖!"),
    "n4": (NARRATOR, "哇——挖出来啦!"),
    "k1": (NARRATOR, "开开, 两岁生日快乐!"),
    "n5": (NARRATOR, "最棒的挖挖!最棒的开开!"),
}

def synth(vid, voice, rate, text):
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
    for vid, ((voice, rate), text) in LINES.items():
        print(f"[{vid}] {text}")
        synth(vid, voice, rate, text)
        durs[vid] = {"text": text, "dur": round(dur_of(OUT / f"{vid}.mp3"), 2)}
        print(f"  -> {durs[vid]['dur']}s")
    (ROOT / "output/v10_vo_durations.json").write_text(json.dumps(durs, ensure_ascii=False, indent=2))
    print("done ->", OUT)
