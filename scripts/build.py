#!/usr/bin/env python3
"""生日视频主构建脚本。
流程: TTS(edge-tts) → 时间轴 → ASS 字幕 → 逐镜头 Ken Burns 片段 → 拼接 → 混音(BGM/生日歌/音效) → 烧字幕出片。
用法: python3 build.py            # 全流程
      python3 build.py --skip-tts # 复用已有音频
"""
import json, subprocess, sys, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SB = json.loads((ROOT / "scripts/storyboard.json").read_text())
IMG, AUD, CLIP, OUTP = (ROOT / p for p in ["assets/images", "assets/audio", "assets/clips", "output"])
for d in (AUD, CLIP, OUTP): d.mkdir(parents=True, exist_ok=True)
BGM = ROOT / "assets/bgm/Carefree.mp3"
FPS = 30
VOICES = {"narrator": ("zh-CN-XiaoxiaoNeural", "-5%"), "kaikai": ("zh-CN-YunxiaNeural", "+8%")}
SKIP_TTS = "--skip-tts" in sys.argv

def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        raise RuntimeError(f"命令失败: {' '.join(map(str,cmd))[:200]}\n{r.stderr[-800:]}")
    return r.stdout

def log(*a): print(f"[build]", *a, flush=True)

def dur_of(p: Path) -> float:
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)]).strip())

# ---------- 1. TTS ----------
def tts_shot(shot):
    """返回 [(mp3路径, 起始偏移), ...];song 镜头返回 []"""
    if shot["voice"] == "song":
        return []
    parts = [t for t in shot["narration"].split("||") if t.strip()]
    if shot["voice"] == "kaikai_then_narrator":
        voices = ["kaikai", "narrator"]
    else:
        voices = [shot["voice"]] * len(parts)
    out = []
    off = 0.5
    for i, (v, text) in enumerate(zip(voices, parts)):
        mp3 = AUD / f"{shot['id']}_{i}.mp3"
        voice, rate = VOICES[v]
        if not SKIP_TTS or not mp3.exists():
            run(["edge-tts", f"--voice={voice}", f"--rate={rate}", f"--text={text.strip()}",
                 f"--write-media={mp3}"])
        d = dur_of(mp3)
        out.append((mp3, off, d, text.strip(), v))
        off += d + 0.7
    return out

# ---------- 2. 时间轴 ----------
def build_timeline():
    tl, t = [], 0.0
    for shot in SB["shots"]:
        parts = tts_shot(shot)
        if shot["voice"] == "song":
            song_len = dur_of(AUD / "birthday_song.wav")
            dur = max(shot["min_dur"], song_len + 1.0)
        else:
            end = max((o + d for _, o, d, _, _ in parts), default=0)
            dur = max(shot["min_dur"], end + 1.0)
        tl.append({**shot, "parts": parts, "start": t, "dur": dur})
        t += dur
    return tl, t

def split_phrases(text):
    """旁白长句 → 短句(按标点切,过短并前,过长对半)"""
    parts = [p for p in re.split(r'(?<=[，！？、…,!?;])|(?<=——)', text) if p.strip()]
    merged = []
    for p in parts:
        if merged and len(p.strip()) <= 2:
            merged[-1] += p
        else:
            merged.append(p)
    out = []
    for p in merged:
        p = p.strip()
        if len(p) > 12:
            import math
            n = math.ceil(len(p) / 9)
            per = math.ceil(len(p) / n)
            out += [p[i * per:(i + 1) * per] for i in range(n)]
        else:
            out.append(p)
    return [p for p in out if p]

# ---------- 3. ASS 字幕 ----------
def ass_time(s):
    return f"{int(s//3600)}:{int(s%3600//60):02d}:{s%60:05.2f}"

def esc(t):  # ASS 文本转义
    return t.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}").replace("|", "\\N")

def write_ass(tl, path):
    head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Noto Sans CJK SC,52,&H00FFFFFF,&H00FFFFFF,&H80303040,&H00000000,1,0,0,0,100,100,1,0,1,3,1,2,60,60,55,1
Style: Banner,Noto Sans CJK SC,78,&H0000D7FF,&H0000D7FF,&H80303040,&H00000000,1,0,0,0,100,100,2,0,1,4,1,8,80,80,70,1
Style: Card,Noto Sans CJK SC,96,&H00FFFFFF,&H00FFFFFF,&H80303040,&H00000000,1,0,0,0,100,100,3,0,1,4,2,5,80,80,80,1
Style: Song,Noto Sans CJK SC,64,&H00FFFACD,&H00FFFACD,&H80303040,&H00000000,1,0,0,0,100,100,2,0,1,4,1,2,60,60,90,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for s in tl:
        st = s["start"]
        if s["voice"] == "song":
            lines = [x for x in s["narration"].split("|") if x.strip()]
            seg = (s["dur"] - 1.5) / len(lines)
            for i, ln in enumerate(lines):
                ev.append((0, st + 0.8 + i * seg, st + 0.8 + (i + 1) * seg, "Song", esc(ln.strip())))
        else:
            for mp3, off, d, text, v in s["parts"]:
                phrases = split_phrases(text)
                total = sum(len(p) for p in phrases) or 1
                tcur = st + off
                for ph in phrases:
                    pd = max(0.7, d * len(ph) / total)
                    ev.append((0, tcur, tcur + pd + 0.15, "Sub", esc(ph)))
                    tcur += pd
        if s.get("banner"):
            style = "Card" if s.get("ending_card") else "Banner"
            bstart = st + (s["dur"] - 8.5 if s.get("ending_card") else 1.2)
            ev.append((1, bstart, st + s["dur"] - 0.35, style, esc(s["banner"])))
    lines = [head]
    for layer, a, b, style, text in sorted(ev, key=lambda e: (e[1], e[0])):
        lines.append(f"Dialogue: {layer},{ass_time(a)},{ass_time(b)},{style},,0,0,0,,{{\\fad(200,200)}}{text}\n")
    path.write_text("".join(lines))
    log("字幕事件数:", len(ev))

# ---------- 4. 逐镜头片段 ----------
MOTION = {
    "zoom_in":  ("z='1+0.09*on/{F}'", "x='(iw-iw/zoom)/2'", "y='(ih-ih/zoom)/2'"),
    "zoom_out": ("z='1.09-0.09*on/{F}'", "x='(iw-iw/zoom)/2'", "y='(ih-ih/zoom)/2'"),
    "pan_right": ("z='1.07'", "x='(iw-iw/zoom)*on/{F}'", "y='(ih-ih/zoom)/2'"),
    "pan_left": ("z='1.07'", "x='(iw-iw/zoom)*(1-on/{F})'", "y='(ih-ih/zoom)/2'"),
}

def render_clip(s):
    clip = CLIP / f"{s['id']}.mp4"
    if clip.exists() and "--force-clips" not in sys.argv:
        log("片段已存在,跳过", s["id"])
        return clip
    frames = int(round(s["dur"] * FPS))
    z, x, y = (t.replace("{F}", str(frames)) for t in MOTION[s["motion"]])
    vf = (f"scale=3840:-2:flags=lanczos,zoompan={z}:{x}:{y}:d={frames}:fps={FPS}:s=1920x1080,"
          f"fade=t=in:st=0:d=0.4,fade=t=out:st={s['dur']-0.45:.2f}:d=0.4,format=yuv420p")
    run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-i", str(IMG / f"{s['id']}.png"),
         "-vf", vf, "-t", f"{s['dur']:.2f}", "-r", str(FPS),
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", str(clip)])
    return clip

# ---------- 5. 合成 ----------
def assemble(tl, total, ass):
    lst = CLIP / "list.txt"
    lst.write_text("".join(f"file '{CLIP/(s['id']+'.mp4')}'\n" for s in tl))
    base = ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst)]
    inputs, fc, mix = [], [], []
    idx = 1  # 输入序号(0 是视频)
    for s in tl:
        for mp3, off, d, text, v in s["parts"]:
            base += ["-i", str(mp3)]
            fc.append(f"[{idx}:a]aresample=44100,aformat=channel_layouts=stereo,adelay={int((s['start']+off)*1000)}:all=1[a{idx}]")
            mix.append(f"[a{idx}]"); idx += 1
        for fx in s.get("sfx", []):
            fp = AUD / f"{fx}.wav"
            if fp.exists():
                base += ["-i", str(fp)]
                fc.append(f"[{idx}:a]aresample=44100,aformat=channel_layouts=stereo,volume=0.5,adelay={int((s['start']+0.3)*1000)}:all=1[a{idx}]")
                mix.append(f"[a{idx}]"); idx += 1
        if s["voice"] == "song":
            base += ["-i", str(AUD / "birthday_song.wav")]
            fc.append(f"[{idx}:a]aresample=44100,aformat=channel_layouts=stereo,volume=0.9,adelay={int((s['start']+0.6)*1000)}:all=1[a{idx}]")
            mix.append(f"[a{idx}]"); idx += 1
    # BGM 循环垫底,生日歌时闪避
    song_spans = [(s["start"], s["start"] + s["dur"]) for s in tl if s["voice"] == "song"]
    duck = f"if(between(t,{song_spans[0][0]:.1f},{song_spans[0][1]:.1f}),0.05,0.16)" if song_spans else "0.16"
    base += ["-stream_loop", "-1", "-i", str(BGM)]
    fc.append(f"[{idx}:a]aresample=44100,aformat=channel_layouts=stereo,atrim={total:.2f},volume='{duck}':eval=frame[bgm]")
    mix.append("[bgm]")
    fc.append("".join(mix) + f"amix=inputs={len(mix)}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[aout]")
    sub = f"[0:v]subtitles={ass}:fontsdir=/usr/share/fonts/noto-cjk[vout]"
    full = base + ["-filter_complex", ";".join(fc) + ";" + sub,
                   "-map", "[vout]", "-map", "[aout]",
                   "-c:v", "h264_nvenc", "-preset", "p6", "-cq", "21", "-b:v", "8M",
                   "-r", str(FPS), "-pix_fmt", "yuv420p",
                   "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", f"{total:.2f}", str(OUTP / "kaikai-birthday-v1.mp4")]
    log("最终编码 ...")
    try:
        run(full)
    except RuntimeError:
        log("nvenc 失败,回退 libx264")
        i = full.index("-c:v")
        full[i + 1:i + 6] = ["libx264", "-preset", "medium", "-crf", "20"]
        run(full)

def main():
    subprocess.run([sys.executable, str(ROOT / "scripts/synth.py")], check=True)
    tl, total = build_timeline()
    log(f"时间轴: {len(tl)} 镜头, 总时长 {total:.1f}s")
    ass = ROOT / "assets/subs.ass"
    write_ass(tl, ass)
    for s in tl:
        if not (IMG / f"{s['id']}.png").exists():
            raise SystemExit(f"缺图: {s['id']}")
        log("渲染片段", s["id"], f"{s['dur']:.1f}s")
        render_clip(s)
    assemble(tl, total, ass)
    log("完成 → output/kaikai-birthday-v1.mp4")

if __name__ == "__main__":
    main()
