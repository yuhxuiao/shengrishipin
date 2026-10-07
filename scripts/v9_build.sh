#!/usr/bin/env bash
# v9_build.sh — 合成 V9 Demo:帧序列 + v9_master.wav → output/v9/kaikai-v9-demo.mp4
# 用法: bash scripts/v9_build.sh [帧目录(默认 web/out/v9frames)] [输出(默认 output/v9/kaikai-v9-demo.mp4)] [crf(默认 16)]
set -euo pipefail
cd "$(dirname "$0")/.."
FRAMES=${1:-web/out/v9frames}
OUT=${2:-output/v9/kaikai-v9-demo.mp4}
CRF=${3:-16}
FFMPEG=$(command -v ffmpeg || echo "$HOME/.local/bin/ffmpeg")
FFPROBE=$(command -v ffprobe || true)
"$FFMPEG" -y -framerate 30 -i "$FRAMES/f%05d.jpg" -i output/v9/v9_master.wav \
  -c:v libx264 -preset slow -crf "$CRF" -pix_fmt yuv420p -c:a aac -b:a 192k \
  -shortest -movflags +faststart "$OUT"
echo "=== probe ==="
if [ -n "$FFPROBE" ]; then
  "$FFPROBE" -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames -of default=nw=1 "$OUT"
  "$FFPROBE" -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT"
else
  "$FFMPEG" -hide_banner -i "$OUT" 2>&1 | grep -E "Duration|Stream"
fi
echo "=== blackdetect (>0.10s) ==="
"$FFMPEG" -v info -i "$OUT" -vf "blackdetect=d=0.1:pix_th=0.06" -an -f null - 2>&1 | grep -i blackdetect || echo "no black frames"
