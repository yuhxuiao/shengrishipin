# Implement: V10 正片 237s

## 阶段 F1: 新素材定稿 ← 当前
- [x] F1.1 宾果 bingo.png: 项目生图 API (参考 bluey.png 风格提示词) → 净化 (米白边 kill+erode+feather+2x upscale+alpha<48 斩杀) → agy 静帧审 (结构/风格) → **用户门禁**
- [x] F1.2 蛋糕 cake.png / 派对帽 party_hat.png / 骨头 bone.png: 同链路 (三件可一批审)
- [x] F1.3 素材尺寸/锚点登记进 assets/images/v10/parts/ + rig.json

## 阶段 F2: 分镜时间轴 + 分段渲染
- [x] F2.1 feature_timeline.js + feature.js + v10_feature.html (从 sample 链路平移泛化: drawPup/drawProp)
- [x] F2.2 幕 1 (0-30s) 渲染 900 帧 → L1 (无新姿态=快速复扫) + L3 帧条目检 → 用户分段门禁
- [x] F2.3 幕 2 (30-130s) 渲染 3000 帧 → L3 + 用户门禁
- [x] F2.4 幕 3 (130-170s) 渲染 1200 帧 → L1 (守礼物 pose 复扫) + L3 + 用户门禁
- [x] F2.5 幕 4 (170-237s) 渲染 2010 帧 → L1 (托蛋糕 pose 必扫) + L3 + 用户门禁

## 阶段 F3: 音频 + 合成 + 终审
- [x] F3.1 旁白 18 句 edge-tts (XiaoxiaoNeural -5%) + 逐句 -16 LUFS+限幅
- [x] F3.2 synth_music_box 扩 4 乐句生日歌完整版
- [x] F3.3 v10_feature_audio.py 混音 (v4.1 管线) → 客观终验 (-16 LUFS/TP≤-1.3/峰值≤0.65/刺耳窗 0)
- [x] F3.4 全片合成 output/v10_feature.mp4 (7110 帧 crf16+aac 192k, blackdetect 零黑帧)
- [ ] F3.5 **用户终审** (画面+音频) → 任务完成

## 验证命令
- L1: `env -C web node src/v10/probe.mjs <action|pose>`; L2: `env -C web node src/v10/probe_kin.mjs <action>`
- 渲染: `env -C web node render.mjs --page=v10_feature.html --frames=A:B --workers=5 --dir=<新目录>` (重渲必新目录)
- 混音: `/home/yuhuxiao/.local/opt/venv-media/bin/python scripts/v10_feature_audio.py`
- 合成: `ffmpeg -framerate 30 -i f%05d.jpg -i master.wav -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart`

## 回滚点
- 分幕渲染分目录, 单幕返工不动他幕; 素材净化前原图留 .bak; 样片 output/v10_sample.mp4 与备份 output/v10_sample_audio_v2.mp4.bak 不动。
