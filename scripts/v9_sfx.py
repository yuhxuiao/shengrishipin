#!/usr/bin/env python3
"""v9_sfx.py — 用 numpy 合成 V9 音效(48kHz 单声道 WAV)→ assets/sfx/v9/

用法: /home/yuhuxiao/.local/opt/venv-media/bin/python scripts/v9_sfx.py
设计:儿童向、圆润不刺耳;全部确定性(固定随机种子)。
"""
import wave
from pathlib import Path

import numpy as np

SR = 48000
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'sfx' / 'v9'
rng = np.random.default_rng(2026)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def env_ad(t, a, d, curve=4.0):
    """线性起音 a 秒 + 指数衰减(时间常数 d)"""
    e = np.minimum(1.0, t / max(a, 1e-4))
    return e * np.exp(-np.maximum(0.0, t - a) / d * (curve / 4.0))


def bandpass(x, lo, hi, order=2.0):
    """FFT 平滑带通(对数域高斯边)"""
    n = len(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    X = np.fft.rfft(x)
    lf = np.log2(np.maximum(f, 1.0))
    g = np.ones_like(f)
    if lo > 0:
        g *= 1 / (1 + np.exp(-(lf - np.log2(lo)) * 6 * order))
    if hi < SR / 2:
        g *= 1 / (1 + np.exp((lf - np.log2(hi)) * 6 * order))
    return np.fft.irfft(X * g, n)


def lowpass(x, hi):
    return bandpass(x, 0, hi)


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def bell(f, dur, decay=0.5, ratio=3.5, index=2.2, amp=1.0):
    t = t_axis(dur)
    idx = index * np.exp(-t / (decay * 0.6))
    m = np.sin(2 * np.pi * f * ratio * t) * idx
    return amp * np.sin(2 * np.pi * f * t + m) * env_ad(t, 0.003, decay)


def place(buf, x, at):
    i = int(at * SR)
    end = min(len(buf), i + len(x))
    buf[i:end] += x[:end - i]
    return buf


def norm(x, peak=0.89):
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


def fade(x, fi=0.004, fo=0.02):
    n = len(x)
    a, b = int(fi * SR), int(fo * SR)
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)
    return x


def write(name, x):
    OUT.mkdir(parents=True, exist_ok=True)
    x = fade(norm(x.astype(np.float64)))
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'{name:10s} {len(x) / SR:5.2f}s')


def sfx_engine(dur=5.0):
    """Q 版小引擎:9Hz 左右的"噗噗"脉冲 + 低频基音 + 轻微呜呜声"""
    t = t_axis(dur)
    y = np.zeros_like(t)
    rate = 9.0 + 0.6 * np.sin(2 * np.pi * 0.35 * t)
    phase = np.cumsum(rate) / SR
    pulses = np.where(np.diff(np.floor(phase), prepend=0) > 0)[0]
    for p in pulses:
        n = int(0.09 * SR)
        tt = np.arange(n) / SR
        f0 = 64 + rng.uniform(-4, 4)
        body = np.sin(2 * np.pi * f0 * tt) + 0.5 * np.sin(2 * np.pi * f0 * 2 * tt) + 0.25 * np.sin(2 * np.pi * f0 * 3 * tt)
        puff = lowpass(rng.standard_normal(n), 900) * 0.6
        y[p:p + n] += (body + puff)[:len(y) - p] * np.exp(-tt / 0.028)[:len(y) - p]
    whine = 0.08 * np.sin(2 * np.pi * (185 + 6 * np.sin(2 * np.pi * 0.5 * t)) * t)
    return lowpass(y, 2200) + whine


def sfx_clank(dur=4.0):
    """履带咔嗒:约 13Hz 的轻金属点击"""
    y = np.zeros(int(dur * SR))
    k = 0.0
    while k < dur - 0.05:
        n = int(0.03 * SR)
        tt = np.arange(n) / SR
        ping = np.sin(2 * np.pi * rng.uniform(820, 980) * tt) * np.exp(-tt / 0.008)
        click = bandpass(rng.standard_normal(n), 1800, 5200) * np.exp(-tt / 0.004)
        place(y, (ping * 0.5 + click) * rng.uniform(0.5, 1.0), k)
        k += 1 / 13.0 * rng.uniform(0.85, 1.15)
    return y


def sfx_boing(dur=0.6, f0=150, depth=90):
    t = t_axis(dur)
    f = f0 + depth * np.exp(-t * 6) * np.cos(2 * np.pi * 11 * t) + 40 * (1 - np.exp(-t * 3))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = (np.sin(ph) + 0.3 * np.sin(2 * ph)) * env_ad(t, 0.004, 0.22)
    return y


def sfx_hop():
    return sfx_boing(0.42, 240, 120)


def sfx_sparkle(dur=1.5):
    y = np.zeros(int(dur * SR))
    notes = [1046.5, 1318.5, 1568.0, 2093.0, 2637.0]
    for i, f in enumerate(notes):
        place(y, bell(f, 0.9, decay=0.35, ratio=2.76, index=1.4, amp=0.8 - i * 0.08), i * 0.055)
    sh = bandpass(noise(dur), 5000, 12000) * env_ad(t_axis(dur), 0.05, 0.35) * 0.18
    return y + sh


def sfx_pop(dur=0.14):
    t = t_axis(dur)
    f = 950 * np.exp(-t * 28) + 260
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(t, 0.001, 0.035)
    y += bandpass(noise(dur), 2000, 7000) * env_ad(t, 0.0005, 0.004) * 0.4
    return y


def sfx_fwoop(dur=0.9):
    t = t_axis(dur)
    f = 260 * (1 + 2.2 * (t / dur) ** 1.4)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 1.2
    air = bandpass(noise(dur), 600, 3000) * np.sin(np.pi * t / dur) * 0.25
    return y * 0.7 + air


def sfx_confetti(dur=1.9):
    y = np.zeros(int(dur * SR))
    for at in (0.0, 0.09):
        n = int(0.12 * SR)
        tt = np.arange(n) / SR
        pop = bandpass(rng.standard_normal(n), 400, 6000) * np.exp(-tt / 0.012)
        thump = np.sin(2 * np.pi * (140 * np.exp(-tt * 18) + 70) * tt) * np.exp(-tt / 0.04)
        place(y, pop + thump * 0.8, at)
    t = t_axis(dur)
    rustle = bandpass(noise(dur), 2500, 9000)
    crackle = (rng.random(len(t)) < 0.004) * rng.uniform(0.3, 1.0, len(t))
    crackle = bandpass(crackle, 3000, 10000) * 6
    e = env_ad(t, 0.03, 0.55)
    place(y, (rustle * 0.35 + crackle) * e, 0.05)
    for i, f in enumerate([1568.0, 2093.0, 2637.0]):
        place(y, bell(f, 1.0, decay=0.4, ratio=2.76, index=1.2, amp=0.35), 0.12 + i * 0.07)
    return y


def sfx_whoosh(dur=0.75):
    t = t_axis(dur)
    x = noise(dur)
    # 分段扫频带通,近似音高上扬的"呼"
    y = np.zeros_like(x)
    segs = 10
    for i in range(segs):
        a, b = int(i * len(x) / segs), int((i + 1) * len(x) / segs)
        c = 450 * (2.8 ** (i / segs))
        y[a:b] = bandpass(x, c * 0.7, c * 1.6)[a:b]
    return y * np.sin(np.pi * np.minimum(1, t / dur)) ** 1.5


def sfx_click():
    """"咔嚓":两下塑料/木质轻敲"""
    y = np.zeros(int(0.2 * SR))
    for at, f in ((0.0, 1250), (0.065, 980)):
        n = int(0.05 * SR)
        tt = np.arange(n) / SR
        k = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.01) + bandpass(rng.standard_normal(n), 1500, 4000) * np.exp(-tt / 0.004) * 0.7
        place(y, k, at)
    return y


def sfx_whir(dur=0.95):
    t = t_axis(dur)
    f = 118 + 22 * t / dur
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    y = lowpass(saw, 900) * 0.6 + np.sin(2 * ph) * 0.2 + bandpass(noise(dur), 1500, 5000) * 0.06
    return y * np.sin(np.pi * t / dur) ** 0.8


def granular_dirt(dur, density=0.02, lo=300, hi=3200):
    t = t_axis(dur)
    imp = (rng.random(len(t)) < density) * rng.uniform(0.2, 1.0, len(t))
    g = bandpass(imp, lo, hi) * 4
    return g + bandpass(noise(dur), lo, hi * 0.8) * 0.25


def sfx_crunch(dur=0.75):
    t = t_axis(dur)
    thump = np.sin(2 * np.pi * (95 * np.exp(-t * 14) + 55) * t) * env_ad(t, 0.002, 0.07)
    grit = granular_dirt(dur, 0.03, 250, 2800) * env_ad(t, 0.004, 0.18)
    return thump * 1.1 + grit * 0.8


def sfx_scoop(dur=0.55):
    t = t_axis(dur)
    return granular_dirt(dur, 0.018, 350, 2600) * np.sin(np.pi * t / dur) ** 0.7 * 0.8


def sfx_patter():
    dur = 0.06
    t = t_axis(dur)
    return bandpass(noise(dur), 900, 4200) * env_ad(t, 0.0008, 0.009) + np.sin(2 * np.pi * 420 * t) * env_ad(t, 0.001, 0.012) * 0.4


def sfx_applause(dur=1.6, seed=7):
    # 小群掌声:patter 瞬态按随机节奏叠放(2岁向,轻盈不炸)
    rng = np.random.default_rng(seed)
    y = np.zeros(int(dur * SR))
    n = 26
    for i in range(n):
        at = 0.05 + (dur - 0.25) * (i / n) + rng.uniform(-0.035, 0.035)
        clap = sfx_patter() * rng.uniform(0.35, 1.0)
        place(y, clap, max(0.0, at))
    bed = bandpass(noise(dur), 800, 5000) * env_ad(t_axis(dur), 0.08, 0.9) * 0.12
    return fade(y * 0.9 + bed, 0.01, 0.25)


def sfx_ding(dur=2.2):
    y = np.zeros(int(dur * SR))
    for i, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
        place(y, bell(f, 1.9, decay=0.9, ratio=3.5, index=1.6, amp=0.8), i * 0.07)
    place(y, sfx_sparkle(1.4) * 0.5, 0.22)
    return y


def sfx_thud(dur=0.7):
    t = t_axis(dur)
    thump = np.sin(2 * np.pi * (80 * np.exp(-t * 10) + 45) * t) * env_ad(t, 0.003, 0.1)
    return thump + granular_dirt(dur, 0.02, 250, 2000) * env_ad(t, 0.01, 0.2) * 0.6


def main():
    write('engine', sfx_engine())
    write('clank', sfx_clank())
    write('boing', sfx_boing())
    write('hop', sfx_hop())
    write('sparkle', sfx_sparkle())
    write('pop', sfx_pop())
    write('fwoop', sfx_fwoop())
    write('confetti', sfx_confetti())
    write('whoosh', sfx_whoosh())
    write('click', sfx_click())
    write('whir', sfx_whir())
    write('crunch', sfx_crunch())
    write('scoop', sfx_scoop())
    write('patter', sfx_patter())
    write('applause', sfx_applause())
    write('ding', sfx_ding())
    write('thud', sfx_thud())


if __name__ == '__main__':
    main()
