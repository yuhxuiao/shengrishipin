#!/usr/bin/env python3
"""v10_audio.py — V10 样片 (24s) 音轨混音 v3: VO + SFX + BGM → loudnorm 两 pass.

v3 修复 (agy 音频评审报告 + 根因定位):
  [根因] v2 把 float32 数据配 PCM(s32) 头写临时 wav → ffmpeg 按整数解读 =
         全曲方波失真 (440Hz 正弦实测出 1.3/2.2/3k 奇次谐波), "刺耳"真凶.
         v3 临时文件写标准 s16 PCM.
  1. 生日歌换八音盒音色 (内置合成, 落盘 assets 供正片复用), 原 8-bit 源废弃.
  2. VO 闪避 (ducking): 旁白窗内音乐 x0.40 / 音效 x0.63, 余弦进出.
  3. 音乐接力: Carefree 19.7-20.8 淡出至 0, 八音盒 20.4 淡入 0.4s, 不叠双曲.
  4. SFX 全部低通柔化 + 相邻事件间隔 >=0.35s (15.6/16.05/16.35 拉开).
  5. VO n2 齿音削 (treble -6dB @5kHz), 全部高通 70Hz 去 TTS 低频嗡.
  6. 电平层级 (绝对 LUFS): VO -16 > SFX -24+trim 点状 > 生日歌 -25 > BGM -31 垫底.

产物: output/v10/v10_master.wav 48kHz 立体声 s16, -16 LUFS ±1, 真峰值 <= -1.3 dBTP
用法: /home/yuhuxiao/.local/opt/venv-media/bin/python scripts/v10_audio.py
"""
import json
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 48000
ROOT = Path(__file__).resolve().parent.parent
VO_DIR = ROOT / "assets/audio/v10"
SFX_DIR = ROOT / "assets/sfx/v9"
BGM = ROOT / "assets/bgm/Carefree.mp3"
SONG = ROOT / "assets/audio/v10/birthday_musicbox.wav"   # 本脚本合成
OUTDIR = ROOT / "output/v10"
TMP = OUTDIR / "_mix_tmp.wav"
OUTW = OUTDIR / "v10_master.wav"
TOTAL = 24.5

# VO 时刻表 (秒, 文件, 去齿音)  n1 由 3.2 挪 3.55 避开布鲁伊起跳 whoosh
VO = [(3.55, "n1", 0), (7.2, "n2", 1), (10.3, "n3", 0),
      (15.9, "n4", 0), (18.2, "k1", 0), (21.8, "n5", 0)]
# SFX 时刻表 (秒, 文件, 微调 dB, 低通 Hz)  事件间隔 >=0.35s, 高频全削
# v4: sparkle 删除 (撞 n4); confetti 低频 6000 压嘶嘶声; applause 低频 7000 压爆豆;
#     全部 SFX 另加峰值帽 0.30 (-10.5dBFS), 高峰值因数素材的尖峰不再失控
SFX = [
    (2.95, "whoosh.wav", -2, 8000),    # 布鲁伊起跳 (提前 0.05s 给 n1 让路)
    (4.05, "hop.wav", -2, 8000),       # 布鲁伊落地
    (8.5, "engine.wav", -4, 3200),     # 履带走位
    (10.55, "scoop.wav", -9, 3600),    # 挖掘 1 咬土点 (n3 之后, 错开 0.25s)
    (12.9, "scoop.wav", -9, 3600),     # 挖掘 2 咬土点
    (13.95, "crunch.wav", -6, 4500),   # 第二铲拔起出土
    (15.6, "boing.wav", -3, 7500),     # 礼物破土弹出
    (16.35, "confetti.wav", -7, 6000), # 纸屑 1 (由 15.65 挪开)
    (19.0, "confetti.wav", -9, 6000),  # 纸屑 2 (落地庆祝)
    (19.45, "applause.wav", -7, 7000), # 欢呼 (由 19.2 挪开)
]
SFX_PEAK_CAP = 0.30                    # 放置后峰值帽 (线性)
SONG_AT = 20.2
BGM_FADE = (19.5, 20.9)                # Carefree 淡出窗口 → 0
DUCK_M, DUCK_S = 0.50, 0.60            # 闪避深度: 音乐 -6dB / 音效 -4.4dB (再深旁白间隙会死寂)


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
        w.setsampwidth(2)               # 标准 s16 PCM (v2 根因修复: 不再 float32 配 PCM 头)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def synth_music_box(path):
    """八音盒版《祝你生日快乐》第一乐句: sol sol la sol do' ti.
    部分音 + 指数衰减 = 八音盒钢片琴音色; 右声道微失谐出宽度."""
    NOTES = [(392.00, 0.00, 0.33), (392.00, 0.33, 0.33), (440.00, 0.66, 0.60),
             (392.00, 1.26, 0.60), (523.25, 1.86, 0.60), (493.88, 2.46, 1.50)]
    PARTS = [(1.00, 1.00, 1.30), (2.00, 0.28, 0.70), (3.01, 0.15, 0.45),
             (4.20, 0.09, 0.28), (5.40, 0.05, 0.18)]
    dur = 4.0
    t = np.arange(int(dur * SR)) / SR
    ch = [np.zeros_like(t), np.zeros_like(t)]
    for ci, det in enumerate((1.0, 1.0012)):          # 右声道 +2 音分
        for f, t0, _nd in NOTES:
            st = t - t0
            mask = st >= 0
            stm = st[mask]
            sig = np.zeros_like(stm)
            for m, a, tau in PARTS:
                sig += a * np.sin(2 * np.pi * m * f * det * stm) * np.exp(-stm / tau)
            ch[ci][mask] += sig * np.exp(-stm / 1.15)  # 乐句总衰减, 自然叠音
    out = np.stack(ch, axis=1)
    fi = int(0.5 * SR)                                # 片尾淡出 0.5s
    out[-fi:] *= np.linspace(1, 0, fi)[:, None]
    out = np.tanh(out * 1.3) * 0.7
    path.parent.mkdir(parents=True, exist_ok=True)
    write_s16(path, out)
    print("synth ->", path)


def place(bus, clip, at, gain_db):
    g = 10 ** (gain_db / 20)
    i0 = int(at * SR)
    i1 = min(bus.shape[0], i0 + clip.shape[0])
    if i1 > i0:
        bus[i0:i1] += clip[: i1 - i0] * g


def duck_env(n, windows, depth):
    """旁白窗闪避包络: 窗前 0.12s 余弦下压 → 窗内保持 depth → 窗后 0.5s 余弦恢复."""
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

    if not SONG.exists():
        synth_music_box(SONG)

    # ---- 音乐总线: Carefree (-31 LUFS 垫底, 19.7-20.8 淡出) + 八音盒 (-25, 20.4 淡入) ----
    music = np.zeros((n, 2))
    bgm = decode(BGM)
    if bgm.shape[0] < n:
        bgm = np.tile(bgm, (n // bgm.shape[0] + 1, 1))
    bgm = bgm[:n]
    g_bgm = -30.0 - lufs_of(BGM)
    fade = np.ones(n)
    f0, f1 = (int(x * SR) for x in BGM_FADE)
    fade[f0:f1] = np.linspace(1, 0, f1 - f0)
    fade[f1:] = 0
    music += bgm * (10 ** (g_bgm / 20)) * fade[:, None]
    print(f"BGM: {g_bgm:+.1f}dB -> -31 LUFS, 淡出 {BGM_FADE[0]}-{BGM_FADE[1]}s")

    song = decode(SONG)
    g_song = -27.0 - lufs_of(SONG)
    seg = song[: n - int(SONG_AT * SR)]
    fi = int(0.8 * SR)
    env = np.ones(seg.shape[0]); env[:fi] = np.linspace(0, 1, fi) ** 2   # 慢淡入, 音符不"砸进来"
    music[int(SONG_AT * SR): int(SONG_AT * SR) + seg.shape[0]] += seg * (10 ** (g_song / 20)) * env[:, None]
    print(f"SONG: {g_song:+.1f}dB -> -27 LUFS @ {SONG_AT}s")

    # ---- 音效总线: 统一 -24 LUFS + 微调 + 低通 + 峰值帽 ----
    sfx = np.zeros((n, 2))
    for at, fn, trim, lp in SFX:
        p = SFX_DIR / fn
        clip = decode(p, af=f"lowpass=f={lp}")
        gs = -24.0 - lufs_of(p) + trim
        pk = np.abs(clip).max()
        if pk * 10 ** (gs / 20) > SFX_PEAK_CAP:                    # 高峰值因数尖峰压制
            gs = 20 * np.log10(SFX_PEAK_CAP / pk)
        place(sfx, clip, at, gs)
        print(f"SFX {fn}: {gs:+.1f}dB @ {at}s (lp {lp})")

    # ---- 人声总线: 逐句 -16 LUFS, 增益后再限幅 0.45 削爆点 (顺序反了限幅会被增益顶回), n2 去齿音 ----
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
        print(f"VO {vid}: {g:+.1f}dB @ {at}s dur {clip.shape[0] / SR:.2f}s")

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
