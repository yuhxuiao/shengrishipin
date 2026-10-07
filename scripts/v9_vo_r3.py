#!/usr/bin/env python3
"""v9_vo_r3.py — V9 r3 幼儿直觉化旁白重录(edge-tts)。
原则:开开(挖掘机)是宝宝的好朋友,不是宝宝自己——互动指令改为"开开做开开的,宝宝做宝宝的"(布鲁伊/巧虎句式),
宝宝动作限定为 2 岁直觉可做的:拍手/举手/跟念象声词/欢呼/指认。
产物: assets/audio/v9r3/{id}.mp3 + output/v9/vo_r3_durations.json(供 timeline.json 重排)
用法: /home/yuhuxiao/.local/opt/venv-media/bin/python scripts/v9_vo_r3.py
      (edge-tts 经 uvx 调用,无需预装)
"""
import json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/audio/v9r3"
OUT.mkdir(parents=True, exist_ok=True)
NARRATOR = ("zh-CN-XiaoxiaoNeural", "-5%")
KAIKAI = ("zh-CN-YunxiaNeural", "+8%")

# 注意:开开=宝宝(小寿星),挖掘机是朋友,起名"挖挖"(工程队叠词名,2 岁可发音可指认)
# id → (voice, text, 备注)
LINES = {
    "k2":  (KAIKAI, "我叫挖挖!", "原'我是开开挖掘机!'——挖掘机不叫开开(开开是宝宝),起名挖挖;布鲁伊超短句原则 ≤7 字,名字由 8.95s 车门'挖挖'字闪光视觉强化"),
    # —— 新录(narrator):互动指令幼儿直觉化 ——
    "n2":  (NARRATOR, "跟挖挖一起拍拍手!", "原'跟着挖掘机一起动一动!',拍手=2 岁直觉动作,挖挖铲斗开合打节拍"),
    "n3":  (NARRATOR, "挖挖举得好高呀!宝宝也举举小手!", "原'小手举高高!'——挖掘机臂≠宝宝小手的隐式映射宝宝听不懂,改显式桥接"),
    "n4":  (NARRATOR, "挖斗张开啦,咔嚓咔嚓!", "原'变成大挖斗!','变成'抽象,改象声词"),
    "n5":  (NARRATOR, "挖挖挖土啦,挖呀挖!", "原'往下挖一挖!',指令式→朋友表演+叠词"),
    "n6":  (NARRATOR, "抬起来啦,好高呀!", "原'往上抬一抬!'"),
    "n7":  (NARRATOR, "哇——做得太棒啦!给挖挖鼓鼓掌!", "原句保留+鼓掌(宝宝直觉动作)"),
    "n9":  (NARRATOR, "挖呀挖,", "原'挖一挖,'"),
    "n10": (NARRATOR, "抬起来!", "原'抬一抬!'"),
    # —— 保留原音频(沿用 assets/audio/s02_0/s03_0/s04_0.mp3 切段):k1, k3-k5, n1, n8 ——
}

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"失败: {' '.join(cmd)[:160]}\n{r.stderr[-400:]}")
    return r.stdout

def dur_of(p):
    # 无 ffprobe;用 ffmpeg -i 的 stderr 解析 Duration(与 scripts/v9_build.sh 同一约定:~/.local/bin/ffmpeg)
    ff = str(Path.home() / ".local/bin/ffmpeg")
    r = subprocess.run([ff, "-hide_banner", "-i", str(p)], capture_output=True, text=True)
    import re
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr)
    if not m:
        raise RuntimeError(f"时长解析失败: {p}")
    h, mnt, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
    return h * 3600 + mnt * 60 + s

def main():
    durs = {}
    for vid, ((voice, rate), text, note) in LINES.items():
        mp3 = OUT / f"{vid}.mp3"
        if "--force" in sys.argv or not mp3.exists():
            run(["uvx", "edge-tts", f"--voice={voice}", f"--rate={rate}",
                 f"--text={text}", f"--write-media={mp3}"])
        d = dur_of(mp3)
        durs[vid] = {"text": text, "dur": round(d, 3), "note": note}
        print(f"[vo_r3] {vid}: {d:.2f}s  {text}")
    out = ROOT / "output/v9/vo_r3_durations.json"
    out.write_text(json.dumps(durs, ensure_ascii=False, indent=2))
    print(f"[vo_r3] → {out}")

if __name__ == "__main__":
    main()
