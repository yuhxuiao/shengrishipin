#!/usr/bin/env bash
# agy_review.sh <prompt-file> <out-file> — 调 agy(Gemini 3.8 Flash)做多模态审查,地区/网络瞬时错误自动重试 3 次
set -u
prompt="$1"; out="$2"
for i in 1 2 3; do
  timeout 1500 agy -p "$(cat "$prompt")" --model "${AGY_MODEL:-gemini-3.8-flash-high}" ${AGY_EFFORT:+--effort "$AGY_EFFORT"} --dangerously-skip-permissions > "$out" 2>&1
  if ! grep -q -E 'AGY_ERROR|FAILED_PRECONDITION|UNAVAILABLE|^error:' "$out" && [ -s "$out" ]; then exit 0; fi
  sleep 20
done
exit 1
