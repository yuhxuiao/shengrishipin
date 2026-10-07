#!/usr/bin/env python3
"""v10_feature_audio.py — V10 正片 (237s) 音轨混音: VO 18 句 + SFX + Carefree + 生日歌完整版 → loudnorm 两 pass.

沿用 v10_audio.py v4.1 管线铁律 (规范 §6):
  - 中间文件标准 s16 PCM (禁 float 配 PCM 头 = 方波失真根因)
  - VO 逐句 -16 LUFS, 增益后限幅 0.45 (顺序反了会被增益顶回), 高通 70
  - SFX -24 LUFS+微调, 全低通, 峰值帽 0.30, 事件间隔 >=0.35s
  - 闪避: 旁白窗内音乐 x0.50 / 音效 x0.60, 余弦进 0.12s 出 0.5s
  - 双曲交接 = crossfade 不叠加
音乐结构: Carefree 0-185.5 (-30 LUFS, 开头 1.5s 淡入) → 185.5-186.8 淡出
  → 生日歌完整版八音盒 4 乐句 186.8-204.5 (-25) → 庆生段 Carefree 不回
  → 尾段 228 单乐句八音盒 (样片资产) -26, 235-237 淡出结束.
产物: output/v10_feature/feature_master.wav 48k s16, -16 LUFS, TP <= -1.3
用法: /home/yuhuxiao/.local/opt/venv-media/bin/python scripts/v10_feature_audio.py
"""
import json
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 48000
ROOT = Path(__file__).resolve().parent.parent
VO_DIR = ROOT / "assets/audio/feature"
SFX_DIR = ROOT / "assets/sfx/v9"
BGM = ROOT / "assets/bgm/Carefree.mp3"
SONG_FULL = ROOT / "assets/audio/feature/birthday_full.wav"      # 4 乐句 (本脚本合成)
SONG_TAIL = ROOT / "assets/audio/v10/birthday_musicbox.wav"      # 单乐句 (样片资产)
OUTDIR = ROOT / "output/v10_feature"
TMP = OUTDIR / "_mix_tmp.wav"
OUTW = OUTDIR / "feature_master.wav"
TOTAL = 237.2

# VO 时刻表 (秒, 文件, 去齿音)
VO = [(8, "n1", 0), (15, "n2", 0), (24, "n3", 1), (31, "n4", 0), (38, "n5", 0), (40.5, "n6", 0),
      (53, "n7", 0), (59, "n8", 0), (72, "n9", 0), (86, "n10", 0), (103, "n11", 0), (111, "n12", 0),
      (135.5, "n13", 0), (143, "n14", 0), (148, "n15", 0), (186.5, "n16", 0), (204.5, "n17", 0), (209, "n18", 0)]
# SFX 时刻表 (秒, 文件, 微调 dB, 低通 Hz)
SFX = [
    (6.0, "engine.wav", -4, 3200),      # 挖挖驶入
    (14.0, "whoosh.wav", -2, 8000),     # wave
    (22.0, "whoosh.wav", -2, 8000),     # 布鲁伊入场跳
    (23.1, "hop.wav", -2, 8000),        # 布鲁伊落地
    (23.7, "sparkle.wav", -6, 7000),    # X 伏笔一闪 (避开 n3 齿音叠加)
    (37.0, "sparkle.wav", -6, 9000),    # X1
    (40.55, "scoop.wav", -9, 3600),     # 挖 1
    (42.4, "boing.wav", -3, 7500),      # 气球破土
    (52.0, "ding.wav", -4, 8000),       # 气球挂桩
    (58.0, "engine.wav", -4, 3200),     # walk →X2
    (62.0, "sparkle.wav", -6, 9000),    # X2
    (65.55, "scoop.wav", -9, 3600),     # 挖 2
    (67.4, "boing.wav", -4, 7500),      # 帽子破土
    (70.0, "ding.wav", -3, 8000),       # 帽子戴稳
    (82.0, "engine.wav", -4, 3200),     # walk →X3
    (85.5, "whoosh.wav", -2, 8000),     # 宾果入场
    (86.6, "hop.wav", -3, 8000),        # 宾果落地
    (89.0, "sparkle.wav", -6, 9000),    # X3
    (92.55, "scoop.wav", -9, 3600),     # 挖 3
    (94.4, "boing.wav", -5, 7500),      # 骨头破土
    (95.6, "thud.wav", -4, 6000),       # 骨头落地
    (98.5, "fwoop.wav", -3, 7000),      # 宾果扑
    (100.0, "click.wav", -4, 7000),     # 叼住
    (116.0, "sparkle.wav", -3, 9000),   # 金 X (隆重 1)
    (116.15, "ding.wav", -2, 8000),     # 金 X (隆重 2)
    (121.0, "engine.wav", -4, 3200),    # walk →金 X
    (135.55, "scoop.wav", -9, 3600),    # 大挖 1
    (137.95, "scoop.wav", -9, 3600),    # 大挖 2
    (139.8, "crunch.wav", -6, 4500),    # 拔起出土
    (142.0, "boing.wav", -2, 7500),     # 礼物破土
    (142.2, "confetti.wav", -7, 6000),  # 纸屑 1
    (145.0, "sparkle.wav", -4, 9000),   # 守礼物辉光
    (158.0, "hop.wav", -3, 8000),       # cheer 1
    (160.0, "hop.wav", -3, 8000),       # cheer 2
    (162.0, "thud.wav", -3, 6000),      # 礼物落地
    (170.0, "engine.wav", -4, 3200),    # 取蛋糕
    (173.5, "engine.wav", -5, 3200),    # 托蛋糕回
    (179.5, "thud.wav", -2, 6000),      # 蛋糕落地
    (186.0, "sparkle.wav", -5, 9000),   # 蜡烛点亮
    (205.3, "fwoop.wav", -5, 5000),     # 吹蜡烛 (n17 起音后, 低频气声)
    (208.5, "applause.wav", -5, 7000),  # 欢呼
    (208.6, "confetti.wav", -6, 6000),  # 纸屑大雨 1
    (209.5, "confetti.wav", -7, 6000),  # 纸屑大雨 2
    (216.0, "confetti.wav", -8, 6000),  # 纸屑尾
    (220.0, "whoosh.wav", -3, 8000),    # wave 致意
]
SFX_PEAK_CAP = 0.30
SONG_AT = 186.8
TAIL_AT = 228.0
BGM_FADEOUT = (185.5, 186.8)           # Carefree 让位生日歌
DUCK_M, DUCK_S = 0.50, 0.60

# 生日歌 4 乐句 (祝你生日快乐, C 大调): (音名, 拍长 s)
PITCH = {"G4": 392.00, "A4": 440.00, "B4": 493.88, "C5": 523.25,
         "D5": 587.33, "E5": 659.25, "F5": 698.46, "G5": 783.99}
PHRASES = [
    [("G4", .3), ("G4", .3), ("A4", .6), ("G4", .6), ("C5", .6), ("B4", 1.05)],
    [("G4", .3), ("G4", .3), ("A4", .6), ("G4", .6), ("D5", .6), ("C5", 1.05)],
    [("G4", .3), ("G4", .3), ("G5", .6), ("E5", .6), ("C5", .6), ("B4", .6), ("A4", 1.05)],
    [("F5", .3), ("F5", .3), ("E5", .6), ("C5", .6), ("D5", .6), ("C5", 1.60)],
]
PARTS = [(1.00, 1.00, 1.30), (2.00, 0.28, 0.70), (3.01, 0.15, 0.45),
         (4.20, 0.09, 0.28), (5.40, 0.05, 0.18)]


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


def synth_birthday_full(path):
    """八音盒完整生日歌 4 乐句 (钢片琴泛音+指数衰减, 右声道 +2 音分)."""
    notes = []
    t0 = 0.0
    for phrase in PHRASES:
        for name, d in phrase:
            notes.append((PITCH[name], t0, d))
            t0 += d
        t0 += 0.18                                    # 乐句间呼吸
    dur = t0 + 2.0                                    # 尾音 ring
    t = np.arange(int(dur * SR)) / SR
    ch = [np.zeros_like(t), np.zeros_like(t)]
    for ci, det in enumerate((1.0, 1.0012)):
        for f, st0, _d in notes:
            st = t - st0
            mask = st >= 0
            stm = st[mask]
            sig = np.zeros_like(stm)
            for m, a, tau in PARTS:
                sig += a * np.sin(2 * np.pi * m * f * det * stm) * np.exp(-stm / tau)
            ch[ci][mask] += sig * np.exp(-stm / 1.15)
    out = np.stack(ch, axis=1)
    fi = int(1.2 * SR)
    out[-fi:] *= np.linspace(1, 0, fi)[:, None]
    out = np.tanh(out * 1.3) * 0.7
    path.parent.mkdir(parents=True, exist_ok=True)
    write_s16(path, out)
    print(f"synth -> {path} ({dur:.1f}s)")


def place(bus, clip, at, gain_db):
    g = 10 ** (gain_db / 20)
    i0 = int(at * SR)
    i1 = min(bus.shape[0], i0 + clip.shape[0])
    if i1 > i0:
        bus[i0:i1] += clip[: i1 - i0] * g


def duck_env(n, windows, depth):
    env = np.ones(n)
    for s, e in windows:
        i0 = max(0, int((s - 0.12) * SR)); i1 = min(n, int((e + 0.5) * SR))
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


def main():
    OUTDIR.mkdir(parents=True, exist_ok=True)
    n = int(TOTAL * SR)

    if not SONG_FULL.exists():
        synth_birthday_full(SONG_FULL)

    # ---- 音乐总线 ----
    music = np.zeros((n, 2))
    bgm = decode(BGM)
    if bgm.shape[0] < n:
        bgm = np.tile(bgm, (n // bgm.shape[0] + 1, 1))
    bgm = bgm[:n]
    g_bgm = -30.0 - lufs_of(BGM)
    fade = np.ones(n)
    fi0 = int(1.5 * SR)
    fade[:fi0] = np.linspace(0, 1, fi0)                # 开头淡入
    f0, f1 = (int(x * SR) for x in BGM_FADEOUT)
    fade[f0:f1] = np.linspace(1, 0, f1 - f0)           # 让位生日歌
    fade[f1:] = 0
    music += bgm * (10 ** (g_bgm / 20)) * fade[:, None]
    print(f"BGM: {g_bgm:+.1f}dB -> -30 LUFS, 0-186s")

    song = decode(SONG_FULL)
    g_song = -25.0 - lufs_of(SONG_FULL)
    seg = song[: n - int(SONG_AT * SR)]
    fi = int(0.5 * SR)
    env = np.ones(seg.shape[0]); env[:fi] = np.linspace(0, 1, fi) ** 2
    music[int(SONG_AT * SR): int(SONG_AT * SR) + seg.shape[0]] += seg * (10 ** (g_song / 20)) * env[:, None]
    print(f"SONG full: {g_song:+.1f}dB -> -25 LUFS @ {SONG_AT}s ({seg.shape[0] / SR:.1f}s)")

    tail = decode(SONG_TAIL)
    g_tail = -26.0 - lufs_of(SONG_TAIL)
    seg2 = tail[: n - int(TAIL_AT * SR)]
    fade2 = np.ones(seg2.shape[0])
    fo = int(2.0 * SR)
    if seg2.shape[0] > fo:
        fade2[-fo:] = np.linspace(1, 0, fo)
    music[int(TAIL_AT * SR): int(TAIL_AT * SR) + seg2.shape[0]] += seg2 * (10 ** (g_tail / 20)) * fade2[:, None]
    print(f"SONG tail: {g_tail:+.1f}dB -> -26 LUFS @ {TAIL_AT}s")

    # ---- 音效总线 ----
    sfx = np.zeros((n, 2))
    for at, fn, trim, lp in SFX:
        p = SFX_DIR / fn
        clip = decode(p, af=f"lowpass=f={lp}")
        gs = -24.0 - lufs_of(p) + trim
        pk = np.abs(clip).max()
        if pk * 10 ** (gs / 20) > SFX_PEAK_CAP:
            gs = 20 * np.log10(SFX_PEAK_CAP / pk)
        place(sfx, clip, at, gs)
    print(f"SFX: {len(SFX)} events placed")

    # ---- 人声总线 ----
    vo = np.zeros((n, 2))
    windows = []
    for at, vid, deess in VO:
        p = VO_DIR / f"{vid}.mp3"
        g = -16.0 - lufs_of(p)
        af = f"highpass=f=70,volume={g}dB"
        if deess:
            af += ",treble=g=-6:f=5000"
        clip = decode(p, af=af + ",alimiter=limit=0.45:attack=4:release=60:level=false")
        place(vo, clip, at, 0)
        windows.append((at - 0.10, at + clip.shape[0] / SR + 0.25))
    print(f"VO: {len(VO)} lines placed")

    # ---- 闪避 + 求和 ----
    mix = music * duck_env(n, windows, DUCK_M)[:, None] \
        + sfx * duck_env(n, windows, DUCK_S)[:, None] \
        + vo

    peak = np.abs(mix).max()
    print(f"mix peak before loudnorm: {peak:.3f}")
    write_s16(TMP, mix / max(peak, 1.0) * 0.95)

    # ---- loudnorm 两 pass ----
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
