#!/usr/bin/env python3
"""v11_audio.py — V11 导演版音轨混音管线 (228s)
- VO 27 句 (双角色: Xiaoxiao 旁白 + Yunxi 挖挖)
- SFX 音效库 (工程车引擎、挖土 crunch、气球 boing、纸屑 confetti、吹气、烛光等)
- BGM Carefree + 4 乐句完整版八音盒生日歌 + 尾段八音盒
- 提取挖挖台词的 30fps 口型包络 (lipsync.json)
- 产物: output/v11/v11_master.wav + output/v11/lipsync.json
"""
import json
import subprocess
import wave
from pathlib import Path
import numpy as np

SR = 48000
ROOT = Path(__file__).resolve().parent.parent
VO_DIR = ROOT / "assets/audio/v11"
SFX_DIR = ROOT / "assets/sfx/v9"
BGM = ROOT / "assets/bgm/Carefree.mp3"
SONG_FULL = ROOT / "assets/audio/feature/birthday_full.wav"
SONG_TAIL = ROOT / "assets/audio/v10/birthday_musicbox.wav"
OUTDIR = ROOT / "output/v11"
TMP = OUTDIR / "_v11_mix_tmp.wav"
OUTW = OUTDIR / "v11_master.wav"
LIPSYNC_FILE = OUTDIR / "lipsync.json"
TOTAL = 228.0

SFX_EVENTS = [
    (5.0, "engine.wav", -4, 3200),        # 挖挖驶入
    (11.2, "whoosh.wav", -2, 8000),       # 挖挖向开开招手
    (11.5, "sparkle.wav", -5, 8000),      # 星光一闪
    (17.5, "click.wav", -3, 6000),        # 歪头思考
    (22.2, "whoosh.wav", -2, 8000),       # 布鲁伊入场跳
    (23.1, "hop.wav", -2, 8000),          # 布鲁伊落地
    (24.5, "ding.wav", -3, 8000),         # 击掌碰斗
    (28.0, "sparkle.wav", -5, 7000),      # 伏笔金光一闪
    (36.0, "engine.wav", -4, 3200),       # 开赴花园
    (43.2, "sparkle.wav", -6, 9000),      # X1
    (48.5, "scoop.wav", -8, 3600),        # 挖土 1
    (53.8, "boing.wav", -3, 7500),        # 气球破土升空
    (59.5, "ding.wav", -4, 8000),         # 气球挂在木桩
    (61.5, "applause.wav", -8, 7000),     # 拍手引导
    (66.0, "engine.wav", -4, 3200),       # 开往沙坑
    (72.5, "scoop.wav", -8, 3600),        # 挖土 2
    (73.2, "click.wav", -4, 5000),        # 挖出小鸭意外
    (81.2, "crunch.wav", -6, 4500),       # 再挖一铲
    (81.8, "boing.wav", -3, 7500),        # 帽子飞出
    (84.5, "ding.wav", -3, 8000),         # 帽子戴稳
    (91.2, "whoosh.wav", -2, 8000),       # 宾果大跳
    (92.2, "hop.wav", -3, 8000),          # 宾果落地
    (98.5, "engine.wav", -4, 3200),       # 开往大树
    (104.2, "scoop.wav", -8, 3600),       # 挖土 3
    (105.0, "boing.wav", -4, 7500),       # 骨头飞出
    (106.0, "thud.wav", -4, 6000),        # 骨头落地
    (110.5, "fwoop.wav", -3, 7000),       # 宾果扑过去
    (111.5, "click.wav", -4, 7000),       # 抱住骨头
    (124.0, "sparkle.wav", -3, 9000),     # 终极大金 X 现身 1
    (124.2, "ding.wav", -2, 8000),        # 终极大金 X 现身 2
    (131.0, "engine.wav", -4, 3200),      # 就位蓄力
    (137.0, "crunch.wav", -5, 4000),      # 大挖深扎入土
    (141.2, "scoop.wav", -7, 3600),       # 翻土卷土
    (145.5, "sparkle.wav", -4, 9000),     # 礼物露角金光
    (151.0, "crunch.wav", -5, 4500),      # 拔地而起
    (151.4, "boing.wav", -2, 7500),       # 破土弹出
    (151.6, "confetti.wav", -6, 6000),    # 礼花 1
    (152.5, "confetti.wav", -6, 6000),    # 礼花 2
    (158.8, "thud.wav", -3, 6000),        # 礼物落地安放
    (159.2, "sparkle.wav", -4, 9000),     # 守护辉光
    (172.5, "engine.wav", -4, 3200),      # 托蛋糕驶回
    (179.0, "thud.wav", -2, 6000),        # 蛋糕平稳落地
    (179.6, "sparkle.wav", -4, 9000),     # 蜡烛点燃
    (204.8, "fwoop.wav", -5, 4500),       # 呼——吹蜡烛气流
    (209.5, "applause.wav", -4, 7000),    # 欢呼鼓掌
    (209.8, "confetti.wav", -5, 6000),    # 彩带雨 1
    (210.8, "confetti.wav", -6, 6000),    # 彩带雨 2
    (216.0, "whoosh.wav", -2, 8000),      # 挥铲致敬开开
]

SFX_PEAK_CAP = 0.30
SONG_AT = 184.8
TAIL_AT = 219.0
BGM_FADEOUT = (183.5, 184.8)
DUCK_M, DUCK_S = 0.50, 0.60


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, check=True, **kw)


def decode(path, af=None):
    cmd = ["ffmpeg", "-v", "error", "-i", str(path)]
    if af:
        cmd += ["-af", af]
    cmd += ["-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    raw = run(cmd).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def lufs_of(path):
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", str(path), "-af",
                        "loudnorm=print_format=summary", "-f", "null", "-"],
                       capture_output=True, text=True)
    for line in r.stderr.splitlines():
        if "Input Integrated" in line:
            return float(line.split(":")[1].strip().split()[0])
    return -20.0


def write_s16(path, arr):
    data = (np.clip(arr, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def place(bus, clip, at, gain_db):
    g = 10 ** (gain_db / 20)
    i0 = int(at * SR)
    i1 = min(bus.shape[0], i0 + clip.shape[0])
    if i1 > i0:
        bus[i0:i1] += clip[: i1 - i0] * g


def duck_env(n, windows, depth):
    env = np.ones(n)
    for s, e in windows:
        i0 = max(0, int((s - 0.12) * SR))
        i1 = min(n, int((e + 0.5) * SR))
        local = np.ones(i1 - i0)
        a = int(0.12 * SR); r = int(0.5 * SR)
        local[:a] = 1 - (1 - depth) * (0.5 - 0.5 * np.cos(np.pi * np.arange(a) / a))
        hold = int((e - s) * SR)
        local[a:a + hold] = depth
        rr = local[a + hold:]
        k = min(len(rr), r)
        rr[:k] = depth + (1 - depth) * (0.5 - 0.5 * np.cos(np.pi * np.arange(k) / r))
        env[i0:i1] = np.minimum(env[i0:i1], local)
    return env


def extract_lipsync(vo_dict, total_s=228.0, fps=30):
    n_frames = int(total_s * fps)
    lipsync = [0.0] * n_frames
    
    for vid, item in vo_dict.items():
        if item.get("speaker") != "wawa":
            continue
        p = ROOT / item["file"]
        if not p.exists():
            continue
        audio_mono = decode(p)[:, 0]
        # Envelope follower
        win = int(SR / fps)
        st = item["start"]
        f0 = int(st * fps)
        for i in range(0, len(audio_mono) - win, win):
            f_idx = f0 + (i // win)
            if f_idx >= n_frames:
                break
            chunk = audio_mono[i:i + win]
            rms = float(np.sqrt(np.mean(chunk ** 2)))
            # Map RMS to mouth open value (0.0 to 1.0)
            open_amt = float(np.clip(rms * 8.0, 0.0, 1.0))
            lipsync[f_idx] = round(open_amt, 3)
            
    # Simple smooth
    smoothed = list(lipsync)
    for i in range(1, n_frames - 1):
        smoothed[i] = round(0.25 * lipsync[i - 1] + 0.5 * lipsync[i] + 0.25 * lipsync[i + 1], 3)
    return smoothed


def main():
    OUTDIR.mkdir(parents=True, exist_ok=True)
    n = int(TOTAL * SR)

    with open(ROOT / "output/v11/vo_durations.json", "r", encoding="utf-8") as f:
        vo_info = json.load(f)

    # 1. 提取挖挖口型
    lipsync = extract_lipsync(vo_info, TOTAL, 30)
    with open(LIPSYNC_FILE, "w", encoding="utf-8") as f:
        json.dump(lipsync, f)
    print(f"Lipsync saved to {LIPSYNC_FILE} ({len(lipsync)} frames)")

    # 2. 音乐总线
    music = np.zeros((n, 2))
    bgm = decode(BGM)
    if bgm.shape[0] < n:
        bgm = np.tile(bgm, (n // bgm.shape[0] + 1, 1))
    bgm = bgm[:n]
    g_bgm = -30.0 - lufs_of(BGM)
    fade = np.ones(n)
    fi0 = int(1.5 * SR)
    fade[:fi0] = np.linspace(0, 1, fi0)
    f0, f1 = (int(x * SR) for x in BGM_FADEOUT)
    fade[f0:f1] = np.linspace(1, 0, f1 - f0)
    fade[f1:] = 0
    music += bgm * (10 ** (g_bgm / 20)) * fade[:, None]
    print(f"BGM: {g_bgm:+.1f}dB -> -30 LUFS, 0-184s")

    # 生日歌完整版 (184.8s - 203.5s)
    song = decode(SONG_FULL)
    g_song = -25.0 - lufs_of(SONG_FULL)
    seg = song[: n - int(SONG_AT * SR)]
    fi = int(0.5 * SR)
    env = np.ones(seg.shape[0]); env[:fi] = np.linspace(0, 1, fi) ** 2
    music[int(SONG_AT * SR): int(SONG_AT * SR) + seg.shape[0]] += seg * (10 ** (g_song / 20)) * env[:, None]
    print(f"SONG full: {g_song:+.1f}dB -> -25 LUFS @ {SONG_AT}s")

    # 尾段八音盒 (219.0s - 228.0s)
    tail = decode(SONG_TAIL)
    g_tail = -26.0 - lufs_of(SONG_TAIL)
    seg2 = tail[: n - int(TAIL_AT * SR)]
    fade2 = np.ones(seg2.shape[0])
    fo = int(2.5 * SR)
    if seg2.shape[0] > fo:
        fade2[-fo:] = np.linspace(1, 0, fo)
    music[int(TAIL_AT * SR): int(TAIL_AT * SR) + seg2.shape[0]] += seg2 * (10 ** (g_tail / 20)) * fade2[:, None]
    print(f"SONG tail: {g_tail:+.1f}dB -> -26 LUFS @ {TAIL_AT}s")

    # 3. 音效总线
    sfx = np.zeros((n, 2))
    for at, fn, trim, lp in SFX_EVENTS:
        p = SFX_DIR / fn
        if not p.exists():
            continue
        clip = decode(p, af=f"lowpass=f={lp}")
        gs = -24.0 - lufs_of(p) + trim
        pk = np.abs(clip).max()
        if pk * 10 ** (gs / 20) > SFX_PEAK_CAP:
            gs = 20 * np.log10(SFX_PEAK_CAP / pk)
        place(sfx, clip, at, gs)
    print(f"SFX: {len(SFX_EVENTS)} events placed")

    # 4. 人声总线
    vo = np.zeros((n, 2))
    windows = []
    for vid, item in vo_info.items():
        p = ROOT / item["file"]
        at = item["start"]
        g = -16.0 - lufs_of(p)
        af = f"highpass=f=70,volume={g}dB,alimiter=limit=0.45:attack=4:release=60:level=false"
        clip = decode(p, af=af)
        place(vo, clip, at, 0)
        windows.append((at - 0.10, at + clip.shape[0] / SR + 0.25))
    print(f"VO: {len(vo_info)} lines placed")

    # 5. 闪避 + 求和
    mix = music * duck_env(n, windows, DUCK_M)[:, None] \
        + sfx * duck_env(n, windows, DUCK_S)[:, None] \
        + vo

    peak = np.abs(mix).max()
    print(f"mix peak before loudnorm: {peak:.3f}")
    write_s16(TMP, mix / max(peak, 1.0) * 0.95)

    # 6. loudnorm 两 pass
    r1 = run(["ffmpeg", "-v", "info", "-i", str(TMP), "-af",
              "loudnorm=I=-16:TP=-1.3:LRA=11:print_format=json", "-f", "null", "-"])
    txt = r1.stderr.decode()
    j = json.loads(txt[txt.rindex("{"): txt.rindex("}") + 1])
    print(f"loudnorm pass1: I={j['input_i']} TP={j['input_tp']} LRA={j['input_lra']}")
    run(["ffmpeg", "-y", "-v", "error", "-i", str(TMP), "-af",
         f"loudnorm=I=-16:TP=-1.3:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}"
         f":measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true",
         "-ar", str(SR), str(OUTW)])
    TMP.unlink(missing_ok=True)
    print("done ->", OUTW)


if __name__ == "__main__":
    main()
