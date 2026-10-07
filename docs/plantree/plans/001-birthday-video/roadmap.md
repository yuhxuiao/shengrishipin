# P001 Roadmap

任务 ID 为本 Plan 内稳定引用;状态权威仅此文件。

## Done

- T001 项目初始化(Trellis + Git + 目录结构)— 2026-09-24
- T002 基础调研:AI 资源与本机工具链 → `docs/research/` — 2026-09-24
- T003 剧本 v1:开场片头 + 互动环节(00:00–00:58)— 2026-09-24(v1 已归档,定稿为 剧本-v2.md)
- T004 API 落实:grok2api key 连通;wisart gpt-image-2 生图+编辑实测可用 — 2026-09-24
- T005 剧本全片定稿 v2 → `docs/剧本-v2.md` — 2026-09-24
- T006 edge-tts 安装;音色:旁白 XiaoxiaoNeural / 开开 YunxiaNeural(待用户试听确认)— 2026-09-24
- T007 BGM(Kevin MacLeod《Carefree》等 3 首,CC-BY)+ 合成音效/生日歌(scripts/synth.py)— 2026-09-24
- T008 管线试产:全片 15 镜头端到端跑通 — 2026-09-24
- T009 角色设定集:`char-master.png`,edit 模式锁形象(已归档)— 2026-09-24
- T010 分镜表:`scripts/storyboard.json`(15 镜头,机读权威)— 2026-09-24
- T011 批量生产:16 张关键帧(wisart)+ 全部旁白音频 — 2026-09-24
- T012 合成与审片:v1.1 / v2 / v3 均出片自检通过 — 2026-09-24/25
- T014a grok 视频弃用(Web 文生视频内容错乱;图生视频需 Build/Console 不可用),动画走 HTML Canvas — 2026-09-25
- T017 v3 分镜:15 帧高质量定稿(已归档 `archive/assets-v1-v4/v3-frames/`)— 2026-09-25
- T018 v4:转 Nano Banana 3D 皮克斯风,rembg 抠图+Canvas 角色级动画(抠图痕迹被用户否定)— 2026-09-25
- T020 v5 字幕短句跟随(`build.py split_phrases` → `assets/subs-v5.ass`)— 2026-09-26
- T021 v6 全手绘复刻版出片(237s 1080p48k,最后一版全片;视频已清理)— 2026-09-26
- T022 v7 三路线 Demo(纯代码扁平 / AI 融合整图 / 硬裁切骨骼;视频已清理);结论:AI 融合方向正确,硬裁切关节断裂不可行 — 2026-09-27
- T023 v8 模块化骨骼方案突破:Gemini/Imagen 直出模块化板件(车身+独立大臂+独立小臂斗,自带轴承槽),三版 Demo 迭代(cinematic 43s → rigged 43s → **director 38s 当前基准**)— 2026-09-27
- T024 项目整理:v1–v7 过程文件归档 `archive/`;经用户确认删除全部中间帧与视频成片/Demo(v1–v8 方案均不满意,将重做;主音轨留存 `assets/audio/master-mix.m4a`),共释放 ~17GB;文档全面更新 — 2026-09-27

## In Progress

- T025 v8 打磨(用户:v8 大方向对,但仍不满意)——板件质感(真实泥土/光影一致性/材质细节)、粒子物理、音画同步微调;导演版为基准

## Next

- T026 v8 全片化:s05–s08 及全片 15 镜场景资产(Gemini 板件 + AI 背景板)→ 全片渲染 → 音轨整合出片
- T013 用户审片 v8 director:收集具体镜头意见
- T015 出分发压缩版(微信分享用,~50MB)

## Deferred

- 真人照片风格化合成进片尾(见 ideas/inbox.md,待用户确认)
- 工程车小队个体形象设定图(v1 群像中车辆配色略有漂移,v8 全片化时用 Gemini 板件方案统一锁定)
- T016 中间帧清理:已完成(归档后删除 ~17GB 渲染帧与全部旧视频);定稿后可整体删除 archive/(~514MB)
