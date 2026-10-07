#!/usr/bin/env bash
# v6 合成:v6 渲染帧(需先 render.mjs --frames 重新生成到 web/out/frames-v6)+ 主音轨 + ASS 字幕 → output/kaikai-birthday-v6.mp4
# 音源:assets/audio/master-mix.m4a(2026-09-27 自清空的 v1 成片抽取的主混音轨,237.03s)
set -euo pipefail
cd "$(dirname "$0")/.."
MIX=assets/audio/master-mix.m4a
OUT=output/kaikai-birthday-v6.mp4
TOTAL=237.03
ffmpeg -y -v error -framerate 30 -i web/out/frames-v6/f%05d.jpg -i "$MIX" \
  -filter_complex "[0:v]subtitles=assets/subs-v5.ass:fontsdir=/usr/share/fonts/noto-cjk,format=yuv420p[v]" \
  -map "[v]" -map 1:a -c:v h264_nvenc -preset p6 -cq 21 -b:v 8M -r 30 -c:a copy -t "$TOTAL" "$OUT" \
|| { echo "nvenc 失败,回退 libx264"; ffmpeg -y -v error -framerate 30 -i web/out/frames-v6/f%05d.jpg -i "$MIX" \
  -filter_complex "[0:v]subtitles=assets/subs-v5.ass:fontsdir=/usr/share/fonts/noto-cjk,format=yuv420p[v]" \
  -map "[v]" -map 1:a -c:v libx264 -preset medium -crf 20 -r 30 -c:a copy -t "$TOTAL" "$OUT"; }
echo "完成 → $OUT"
