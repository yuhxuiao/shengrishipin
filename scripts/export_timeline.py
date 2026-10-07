#!/usr/bin/env python3
"""从 storyboard.json + 已有 TTS 音频导出 web/timeline.js(与 build.py 同一时间轴,保证复用 v1 音频仍同步)。"""
import json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SB = json.loads((ROOT / "scripts/storyboard.json").read_text())
AUD = ROOT / "assets/audio"

def dur_of(p):
    return float(subprocess.run(["ffprobe","-v","error","-show_entries","format","-of","csv=p=0",str(p)],
                                capture_output=True, text=True).stdout.split(",")[1 if False else 0] or 0)

def dur(p: Path) -> float:
    out = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",str(p)],
                         capture_output=True, text=True).stdout.strip()
    return float(out)

tl, t = [], 0.0
for shot in SB["shots"]:
    if shot["voice"] == "song":
        d = max(shot["min_dur"], dur(AUD / "birthday_song.wav") + 1.0)
    else:
        parts = [x for x in shot["narration"].split("||") if x.strip()]
        end = 0.0
        for i in range(len(parts)):
            mp3 = AUD / f"{shot['id']}_{i}.mp3"
            off = 0.5 if i == 0 else end + 0.7
            end = off + dur(mp3)
        d = max(shot["min_dur"], end + 1.0)
    tl.append({"id": shot["id"], "start": round(t, 3), "dur": round(d, 3), "motion": shot["motion"], "name": shot["name"]})
    t += d

out = ROOT / "web/timeline.js"
out.parent.mkdir(exist_ok=True)
out.write_text("window.TIMELINE = " + json.dumps({"total": round(t, 3), "fps": 30, "shots": tl}, ensure_ascii=False, indent=1) + ";\n")
for s in tl:
    print(f"{s['id']}  start={s['start']:7.2f}  dur={s['dur']:5.2f}  {s['name']}")
print("total", round(t, 2), "→", out)
