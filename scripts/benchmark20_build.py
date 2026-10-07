#!/usr/bin/env python3
"""Build the 20-second sample using local audio; retain each revision."""
import argparse
import io
import json
import re
import subprocess
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
FF = Path('/home/yuhuxiao/.local/bin/ffmpeg')
RATE = 48000
TOTAL = 20


def run(args, data=None):
    return subprocess.run([str(FF), '-hide_banner', *map(str, args)], input=data,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)


def decode(path, seconds, loudness):
    audio = run(['-v', 'error', '-i', path, '-t', seconds, '-vn', '-af',
                 f'loudnorm=I={loudness}:TP=-5:LRA=7,lowpass=f=6500',
                 '-ar', RATE, '-ac', '2', '-f', 'f32le', 'pipe:1']).stdout
    return np.frombuffer(audio, dtype='<f4').reshape(-1, 2).copy()


def envelope(n, fade_in=.025, fade_out=.09):
    e = np.ones(n)
    a, b = min(n, int(fade_in * RATE)), min(n, int(fade_out * RATE))
    if a:
        e[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if b:
        e[-b:] *= np.cos(np.linspace(0, np.pi / 2, b)) ** 2
    return e[:, None]


def write_pcm(path, data):
    pcm = np.rint(np.clip(data, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(pcm.tobytes())


def tone(kind):
    n = int(RATE * (.36 if kind == 'notice' else .27))
    t = np.arange(n) / RATE
    if kind == 'notice':
        a = (np.sin(2 * np.pi * 784 * t) + .22 * np.sin(2 * np.pi * 1568 * t)) * np.exp(-10 * t) * .07
    else:
        phase = 2 * np.pi * (480 * t + 95 * t * t)
        a = (.8 * np.sin(phase) + .2 * np.sin(phase * 2)) * .075
    return np.column_stack((a, a)) * envelope(n)


def mix_audio(out):
    music = decode(ROOT / 'assets/bgm/Carefree.mp3', TOTAL, -29)
    audio = np.zeros((TOTAL * RATE, 2), dtype=np.float64)
    audio[:min(len(music), len(audio))] = music[:len(audio)]
    audio *= envelope(len(audio), .45, .8)
    events = json.loads(subprocess.check_output([
        'node', '-e', "console.log(JSON.stringify(require('./web/src/benchmark20/shots.js').EVENTS))"
    ], cwd=ROOT, text=True))
    for event in events:
        kind = event['kind']
        if kind == 'engine':
            clip = decode(ROOT / 'assets/sfx/v9/engine.wav', 1.95, -25)
        elif kind == 'scoop':
            clip = decode(ROOT / 'assets/sfx/v9/scoop.wav', 1.3, -23)
        else:
            clip = tone(kind)
        clip *= envelope(len(clip), .08, .15)
        start = round(event['t'] * RATE)
        count = min(len(clip), len(audio) - start)
        audio[start:start + count] += clip[:count]
    peak = float(np.abs(audio).max())
    if peak > .60:
        audio *= .60 / peak
    raw = out / 'mix-s16.wav'
    write_pcm(raw, audio)
    # Verify the actual PCM container, not just its intended dtype.
    with wave.open(str(raw)) as f:
        assert (f.getsampwidth(), f.getnchannels(), f.getframerate(), f.getnframes()) == (2, 2, RATE, RATE * TOTAL)
    master = out / 'master.wav'
    run(['-v', 'error', '-n', '-i', raw, '-af', 'loudnorm=I=-16:TP=-2:LRA=7',
         '-ar', RATE, '-ac', '2', '-c:a', 'pcm_s16le', master])
    return master, events


def frame(video, t, width=640):
    data = run(['-v', 'error', '-ss', t, '-i', video, '-frames:v', '1', '-vf',
                f'scale={width}:-1', '-f', 'image2pipe', '-c:v', 'mjpeg', 'pipe:1']).stdout
    return Image.open(io.BytesIO(data)).convert('RGB')


def sheet(video, times, path, cols=3):
    w, h, label = 640, 360, 30
    image = Image.new('RGB', (w * cols, (h + label) * ((len(times) + cols - 1) // cols)), '#F6F1E5')
    draw = ImageDraw.Draw(image)
    for i, t in enumerate(times):
        x, y = (i % cols) * w, (i // cols) * (h + label)
        image.paste(frame(video, t), (x, y))
        draw.text((x + 12, y + h + 7), f'{t:.2f}s', fill='#34435F')
    image.save(path, quality=94)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--revision', required=True)
    p.add_argument('--frames', required=True)
    args = p.parse_args()
    if not re.fullmatch(r'r\d{2,3}', args.revision):
        raise ValueError('revision must be rNN')
    frames = (ROOT / args.frames).resolve()
    expected = [frames / f'f{i:05}.jpg' for i in range(600)]
    if any(not f.is_file() for f in expected) or len(list(frames.glob('f*.jpg'))) != 600:
        raise ValueError('exactly frames 00000..00599 are required')
    out = ROOT / 'output/benchmark20' / args.revision
    out.mkdir(parents=True, exist_ok=True)
    for name in ['sample.mp4', 'sample-silent.mp4', 'master.wav', 'mix-s16.wav']:
        if (out / name).exists():
            raise FileExistsError(f'{name} already exists; use a new revision')
    master, events = mix_audio(out)
    silent = out / 'sample-silent.mp4'
    run(['-v', 'error', '-n', '-framerate', '30', '-start_number', '0', '-i', frames / 'f%05d.jpg',
         '-frames:v', '600', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
         '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent])
    movie = out / 'sample.mp4'
    run(['-v', 'error', '-n', '-i', silent, '-i', master, '-map', '0:v:0', '-map', '1:a:0',
         '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', '20', '-movflags', '+faststart', movie])
    measure = run(['-i', movie, '-map', '0:v:0', '-an', '-vf', 'blackdetect=d=0.1:pix_th=0.04', '-f', 'null', '-']).stderr.decode()
    counts = re.findall(r'frame=\s*(\d+)', measure)
    duration = re.search(r'Duration: (\d+):(\d+):([\d.]+)', measure)
    seconds = int(duration[1]) * 3600 + int(duration[2]) * 60 + float(duration[3])
    assert counts and int(counts[-1]) == 600, measure
    assert abs(seconds - 20) <= 1 / 30, measure
    assert '1920x1080' in measure and '30 fps' in measure and 'yuv420p' in measure, measure
    assert 'black_start:' not in measure, 'unexpected black segment'
    loud = run(['-i', movie, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.decode()
    lufs = re.findall(r'I:\s*([\-\d.]+) LUFS', loud)
    peaks = re.findall(r'Peak:\s*([\-\d.]+) dBFS', loud)
    metadata = {'revision': args.revision, 'video_frames': 600, 'duration_s': seconds,
                'width': 1920, 'height': 1080, 'fps': 30, 'unexpected_black_segments': 0,
                'integrated_lufs': float(lufs[-1]) if lufs else None,
                'true_peak_dbfs': float(peaks[-1]) if peaks else None,
                'events': events, 'aesthetic_and_audio_comfort': 'pending user review'}
    (out / 'media-verification.json').write_text(json.dumps(metadata, indent=2, ensure_ascii=False))
    (out / 'ffmpeg-probe.txt').write_text(measure + '\n' + loud[-1700:])
    sheet(movie, [.4, 1.9, 3.9, 5.2, 7.4, 9.7, 10.8, 12.5, 14.5, 16, 17.5, 19.2], out / 'keyposes.jpg')
    strips = out / 'motion-strips'
    strips.mkdir()
    for name, start in [('discover', .9), ('invite', 3.4), ('step', 6.0), ('dig', 10.1), ('response', 17.0)]:
        sheet(movie, [start + i * .18 for i in range(12)], strips / f'{name}.jpg', 4)
    print(json.dumps(metadata, indent=2, ensure_ascii=False))
    print(movie)


if __name__ == '__main__':
    main()
