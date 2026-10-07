# Implement: V11 导演版

## 阶段 G0 文档/契约 (本文件+design.md+spec) [x]
## 阶段 G1 并行模块开发 (各自独立文件, 互不改对方)
- [x] A 引擎/场景/特效/页: camera.js shots.js(骨架) scenery.js fx.js main.js v11.html; 画面完美无退化
- [x] B 表情/动作: face.js actions.js + probe(L1/L2) 全绿; 表情九宫格单帧自检完成
- [x] C 配角分件: 生图→净化→切件→rig.json→pup.js; 姿势库自检图通过
- [x] D 剧本/音频: 剧本-v3 + VO + lipsync + master.wav + 客观终检通过
## 阶段 G2 集成
- [x] shots.js 填全片演员轨 (34 镜全剧本时间轴 0~228s 对齐 vo_durations)
- [x] 静态与局部切片抽帧验证 (关键帧视觉质量 100% 达标)
## 阶段 G3 全片
- [x] 全片 6840 帧渲染完成 (0~228s) → 合成 output/v11_feature.mp4 (L5 度量全绿)
- [x] 生成 34 镜全览故事板 output/v11_storyboard.jpg
- [x] 用户交付

## 验证
- L1/L2: `env -C web node src/v11/probe.mjs <action>` / `probe_kin.mjs`
- L5: `python scripts/v11_metrics.py output/v11_feature.mp4` (镜头数/静止窗口)
