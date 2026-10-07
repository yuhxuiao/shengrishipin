#!/usr/bin/env python3
"""v9_audio.py — 按 timeline.json 混音 V9 Demo 音轨 + 生成开开口型包络

产物:
  output/v9/v9_master.wav  48kHz 立体声,-16 LUFS ±1,真峰值 ≤ -1.0 dBTP(目标 -1.3,留 AAC 过冲余量)(ffmpeg loudnorm 两 pass)
  web/src/v9/lipsync.json  开开每句旁白的 mouthOpen 包络(30Hz,0..1)
用法: /home/yuhuxiao/.local/opt/venv-media/bin/python scripts/v9_audio.py
"""
import json
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 48000
ROOT = Path(__file__).resolve().parent.parent
TL = json.load(open(ROOT / 'web/src/v9/timeline.json'))
SFX_DIR = ROOT / 'assets' / 'sfx' / 'v9'
TMP = ROOT / 'output/v9/_mix_tmp.wav'
OUTW = ROOT / 'output/v9/v9_master.wav'
OUTJ = ROOT / 'web/src/v9/lipsync.json'


def run(cmd):
    return subprocess.run(cmd, capture_output=True, check=True)


def decode(path):
    raw = run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-']).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def decode_seg(path, frm, to):
    raw = run(['ffmpeg', '-v', 'error', '-ss', str(frm), '-to', str(to), '-i', str(path),
               '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-']).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


TOTAL = TL['total'] + 0.5
N = int(TOTAL * SR)


def place(dst, x, at, gain_db=0.0, pan=0.0, fade=(0.0, 0.0)):
    g = 10 ** (gain_db / 20.0)
    th = (max(-1.0, min(1.0, pan)) + 1.0) * np.pi / 4.0  # 等功率声像
    x = x * g * np.array([np.cos(th), np.sin(th)])
    i0 = int(round(at * SR))
    n = min(len(x), N - i0)
    if n <= 0:
        return
    x = x[:n]
    fi, fo = fade
    if fi > 0:
        x = x * np.minimum(1.0, np.arange(n) / (fi * SR))[:, None]
    if fo > 0:
        x = x * np.minimum(1.0, (np.arange(n)[::-1] + 1) / (fo * SR))[:, None]
    dst[i0:i0 + n] += x


beats = TL['beats']


def resolve_at(a):
    return float(a) if isinstance(a, (int, float)) else float(beats[a])


def env30hz(mono):
    """30Hz 幅度包络 → 0..1 mouthOpen,快攻慢放"""
    hop = SR // 30
    n = max(1, len(mono) // hop)
    e = np.array([np.sqrt(np.mean(mono[i * hop:(i + 1) * hop] ** 2)) for i in range(n)])
    ref = np.percentile(e[e > 0], 85) + 1e-9
    e = np.clip(e / ref, 0.0, 1.0) ** 0.8
    out = np.zeros_like(e)
    cur = 0.0
    for i, v in enumerate(e):
        cur = max(v, cur * 0.72 + v * 0.28)  # 攻击跟随,释放平滑
        out[i] = cur
    return out


def main():
    vo_track = np.zeros((N, 2))
    lipsync = []
    for v in TL['vo']:
        x = decode_seg(ROOT / v['src'], v['from'], v['to'])
        place(vo_track, x, v['at'])
        if v.get('speaker') == 'kaikai':
            mono = x.mean(axis=1)
            lipsync.append({'id': v['id'], 'at': v['at'], 'dur': round(len(x) / SR, 3),
                            'env': [round(float(e), 3) for e in env30hz(mono)]})

    sfx_track = np.zeros((N, 2))
    for s in TL['sfx']:
        x = decode(SFX_DIR / f"{s['name']}.wav")
        pan = (s.get('pan') or [0.0])[0]
        place(sfx_track, x, resolve_at(s['at']), s.get('gain', 0.0), pan, s.get('fade', (0.0, 0.0)))

    m = TL['music']
    bgm = decode(ROOT / m['src'])
    need = int(TL['total'] * SR)
    if len(bgm) < need:
        bgm = np.tile(bgm, (need // len(bgm) + 1, 1))
    bgm = bgm[:need]
    # 人声闪避:VO 包络平滑后驱动 duck 增益
    vo_env = np.abs(vo_track).mean(axis=1)
    k = int(0.45 * SR)  # r1: 220→450ms,BGM 闪避回落更温润,消除抽吸感
    vo_sm = np.convolve(vo_env, np.ones(k) / k, 'same')
    act = vo_sm[vo_sm > 1e-5]
    ref = np.percentile(act, 55) if len(act) else 1.0
    duck = 1.0 - (1.0 - 10 ** (m['duck'] / 20.0)) * np.clip(vo_sm / (ref + 1e-9), 0.0, 1.0)
    bgm = bgm * duck[:len(bgm), None]
    music_track = np.zeros((N, 2))
    place(music_track, bgm, m['from'], m['gain'], 0.0, (m['fadeIn'], m['fadeOut']))

    mix = vo_track + sfx_track + music_track
    peak = np.abs(mix).max()
    if peak > 0.98:
        mix *= 0.98 / peak
    TMP.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(TMP), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())

    # loudnorm 两 pass:先测量,再线性校正
    p1 = run(['ffmpeg', '-v', 'info', '-i', str(TMP), '-af', 'loudnorm=I=-16:TP=-1.3:LRA=11:print_format=json', '-f', 'null', '-'])
    txt = p1.stderr.decode()
    meas = json.loads(txt[txt.rindex('{'):txt.rindex('}') + 1])
    af = (f"loudnorm=I=-16:TP=-1.3:LRA=11:measured_I={meas['input_i']}:measured_TP={meas['input_tp']}"
          f":measured_LRA={meas['input_lra']}:measured_thresh={meas['input_thresh']}:offset={meas['target_offset']}:linear=true")
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(TMP), '-af', af, '-ar', str(SR), str(OUTW)])
    TMP.unlink()

    # 验证:ebur128 峰值 + 综合响度
    p2 = run(['ffmpeg', '-v', 'info', '-i', str(OUTW), '-af', 'ebur128=peak=true', '-f', 'null', '-'])
    tail = p2.stderr.decode().splitlines()[-12:]
    print('\n'.join(tail))

    OUTJ.parent.mkdir(parents=True, exist_ok=True)
    json.dump({'fps': 30, 'phrases': lipsync}, open(OUTJ, 'w'), ensure_ascii=False)
    print(f'[v9_audio] {OUTW}  lipsync {len(lipsync)} phrases → {OUTJ}')


if __name__ == '__main__':
    main()
