#!/usr/bin/env python3
"""合成音频:生日歌(音乐盒)、sparkle 叮铃、rumble 柔和轰隆、dig 挖掘哒哒。
纯 stdlib 生成 44.1kHz 16-bit WAV。用法: python3 synth.py
"""
import math, random, struct, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/audio"
OUT.mkdir(parents=True, exist_ok=True)
SR = 44100

NOTE = {"C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00,
        "A4": 440.00, "B4": 493.88, "C5": 523.25, "D5": 587.33, "E5": 659.25,
        "F5": 698.46, "G5": 783.99, "C6": 1046.50, "E5b": 622.25}

def music_box(freq, t):
    """音乐盒音色:基频+泛音,指数衰减"""
    return (math.sin(2*math.pi*freq*t) * math.exp(-2.2*t)
            + 0.45*math.sin(2*math.pi*2*freq*t) * math.exp(-3.5*t)
            + 0.18*math.sin(2*math.pi*3*freq*t) * math.exp(-5.0*t))

def soft_bass(freq, t):
    return math.sin(2*math.pi*freq/2*t) * math.exp(-1.2*t) * 0.5

def write_wav(path, samples):
    peak = max(1e-9, max(abs(s) for s in samples))
    norm = 0.85 / peak
    with wave.open(str(path), "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s*norm))*32767)) for s in samples))
    print("写出", path.name, f"{len(samples)/SR:.1f}s")

def birthday_song(path, unit=0.62):
    """祝你生日快乐 x2 遍,音乐盒风格"""
    verse = [
        ("G4", .75), ("G4", .25), ("A4", 1), ("G4", 1), ("C5", 1), ("B4", 2),
        ("G4", .75), ("G4", .25), ("A4", 1), ("G4", 1), ("D5", 1), ("C5", 2),
        ("G4", .75), ("G4", .25), ("G5", 1), ("E5", 1), ("C5", 1), ("B4", 1), ("A4", 2),
        ("F5", .75), ("F5", .25), ("E5", 1), ("C5", 1), ("D5", 1), ("C5", 2.5),
    ]
    seq = []
    for rep in range(2):
        seq += verse
        if rep == 0:  # 两遍之间的过门
            seq += [("C5", .5), ("E5", .5), ("G5", .5), ("C6", 1.5)]
    seq += [("C5", 2.5)]  # 尾音
    total = sum(d for _, d in seq) * unit
    n = int(total * SR)
    buf = [0.0] * n
    pos = 0.0
    for note, dur in seq:
        f = NOTE[note]; start = int(pos * SR); length = int(dur * unit * SR)
        for i in range(length):
            if start + i >= n: break
            t = i / SR
            buf[start + i] += music_box(f, t) * 0.8 + soft_bass(f, t)
        pos += dur * unit
    write_wav(path, buf)

def sparkle(path, dur=1.6):
    """上行叮铃:生日魔法时刻"""
    notes = ["C5", "E5", "G5", "C6"]
    n = int(dur * SR); buf = [0.0] * n
    for k, note in enumerate(notes):
        f = NOTE[note]; start = int(k * 0.18 * SR); length = int(0.9 * SR)
        for i in range(length):
            if start + i >= n: break
            buf[start + i] += music_box(f, i / SR) * 0.7
    write_wav(path, buf)

def rumble(path, dur=3.0):
    """柔和的低频轰隆(进场),无刺耳噪音"""
    random.seed(7)
    n = int(dur * SR); buf = []; v = 0.0
    for i in range(n):
        v += (random.random() * 2 - 1) * 0.02  # 布朗噪声
        v *= 0.998
        env = math.sin(math.pi * i / n) ** 1.5  # 渐入渐出
        buf.append(v * env * 3.0)
    write_wav(path, buf)

def dig(path, dur=3.6):
    """哒哒挖掘声:4 下柔和的低通噪声敲击"""
    random.seed(11)
    n = int(dur * SR); buf = [0.0] * n
    for k in range(4):
        start = int((k * 0.85 + 0.1) * SR); length = int(0.22 * SR)
        prev = 0.0
        for i in range(length):
            if start + i >= n: break
            x = random.random() * 2 - 1
            prev = 0.85 * prev + 0.15 * x  # 简易低通
            env = math.exp(-18 * i / SR)
            buf[start + i] += prev * env * 2.2
    write_wav(path, buf)

if __name__ == "__main__":
    birthday_song(OUT / "birthday_song.wav")
    sparkle(OUT / "sparkle.wav")
    rumble(OUT / "rumble.wav")
    dig(OUT / "dig.wav")
