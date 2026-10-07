# Runtime Flows(制作数据流)

```
剧本(docs/剧本-v*.md)
  → 分镜表(待建)
  → 生图 prompt → chatgpt2api / grok2api → assets/images/
  → 图生视频 prompt(首帧=关键帧)→ grok2api → assets/clips/
  → 旁白文案 → edge-tts → assets/audio/
  → BGM/音效 → assets/bgm/
  → ffmpeg 合成(scripts/)→ output/*.mp4
```

关键约束:视频片段统一图生视频以保证角色一致性;每段 6–10s,多段 concat。
