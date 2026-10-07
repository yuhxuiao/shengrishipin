# PRD — v1 成片制作(首版 4 分钟生日视频)

## 需求

今晚(2026-09-24,用户离线休息)自主产出一版完整生日视频:约 4 分钟、2 岁宝宝、主角蓝色 Q 版挖掘机开开、寿星黄山遥(开开)2026-10-18 两周岁。多路径可用:grok 视频(429 中)、wisart 生图、edge-tts、ffmpeg。

## 验收与证据

- [x] 成片 `output/kaikai-birthday-v1.mp4`:237s、1920x1080@30、h264(nvenc)+ AAC 48kHz
- [x] 15 镜头全片:剧本 `docs/剧本-v2.md` + 机读分镜 `scripts/storyboard.json`
- [x] 关键帧 16 张(wisart gpt-image-2;edit 模式以 `assets/images/char-master.png` 锁形象)
- [x] 旁白 edge-tts(XiaoxiaoNeural/YunxiaNeural)+ 音乐盒生日歌与音效(synth.py 合成)
- [x] 字幕 ASS 烧录(底部旁白/顶部互动横幅/结尾卡片),抽帧目检通过(f3/f45/f135/f225/v11-*)
- [x] 音频体检:mean -19.2dB / max -1.5dB,各时间段有声

## 已知留待 v2

- grok 视频 429 未恢复 → 全片 Ken Burns 静帧动画;恢复后替换 s02/s10/s15(cron 自动探测)
- s10 群像中车辆配色与各车登场镜头略有漂移
- 159MB 偏大,分发时再出压缩版

## 交接

明早用户审片:重点看文案、音色、节奏;改动入口 `scripts/storyboard.json` → `build.py --skip-tts`(改词要重跑 TTS,去掉 --skip-tts)。
