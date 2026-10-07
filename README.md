# 生日视频

为黄山遥(小名"开开")两周岁生日(**2026-10-18**)制作的 4 分钟儿童动画视频。

- 主角:蓝色 Q 版挖掘机"开开"与工程车小队
- 风格目标:Nano Banana(Gemini)3D 皮克斯毛绒风 + 金色时刻光线,慢节奏、适合 2 岁宝宝(参考 `output/bananan/` 用户心头好素材)

## 最新进度(2026-10-04): V11 导演版正片 (output/v11_feature.mp4) 制作完成！

- **成片交付**: `output/v11_feature.mp4` (228.0s / 3分48秒, 1080p@30, H.264 CRF 16 + AAC 192k, -16.0 LUFS)
- **故事板全览**: [`output/v11_storyboard.jpg`](output/v11_storyboard.jpg) (34 镜全片连续故事板)
- **剧本与分镜总谱**: [`docs/剧本-v3-v11.md`](docs/剧本-v3-v11.md) 与 [`web/src/v11/shots.js`](web/src/v11/shots.js)
- **V11 核心技术突破**:
  1. **34 个专业镜头调度**: 彻底终结 V10 固定单一机位，涵盖大远景、全景、中景、特写、推拉摇移与镜头微震，叙事节奏跌宕起伏。
  2. **布鲁伊与宾果分件骨骼动画系统**: 告别单图贴纸感，布鲁伊与宾果全切件绑定，支持 13 套动态姿势（奔跑、欢呼、拍手、抱骨头、翻跳、吹蜡烛等），落地动态阴影与弹跳。
  3. **挖挖程序化灵动表情与口型**: 支持 9 套动态表情，眼睛追焦 lookAt，开合口型与小红舌头随 6840 帧包络自然开合，多次打破第四面墙对宝宝开开说话互动。
  4. **四层视差与沉浸环境**: 天顶白云随风流动、远山起伏、中景篱笆与沙坑树干、前景花草叶片视差滑过，彻底消除扁平感。
  5. **三大宝宝互动节拍**: 拍手欢呼、加油助威、共同吹灭生日蜡烛，极具代入感与情绪价值。

## 当前状态(2026-09-29,r4 终版)

**V9 真 3D 导演版 Demo r4 终版已出片,三维评审全绿,待用户验收**:`output/v9/kaikai-v9-demo.mp4`(49.0s,1920×1080@30,H.264 yuv420p + AAC 192k,-16.2 LUFS / TP -1.3 dBTP,零黑帧)。K=8 子帧累积,AC 复验达标。

角色命名:**挖掘机叫"挖挖"**(车门贴字+自称),宝宝"开开"是观众不出场。互动全为宝宝↔朋友式(拍拍手/举举小手/咔嚓咔嚓/挖呀挖/鼓鼓掌)。

r3/r4 迭代(用户验收反馈驱动):
- **物理**:履带积分位移(不滑移)、悬挂 bob(不腾空)、squash≤0.12、液压缸定长、贴地挤土、卸土质量守恒、全局 WIND 风场 —— agy 8 维物理复审 4 段零阻断
- **幼儿直觉**:新 VO 10 条(edge-tts,`assets/audio/v9r3/`)、卡片 8 张全部 ≥2.5s、拍手掌声+即时夸奖闭环
- **风格**(对照 `output/bananan/` 参考图 + `output/buluyicankao.mp4` 布鲁伊):曝光 1.6/材质级治死白(车漆 clearcoat 0.7、白眉哑光、镀铬 0.18)、草地奶柔(叶宽×1.7,40000)、土堆梦幻细沙(两圈黑碎渣全清)、眼睛+14% ø17mm 眼神光、shot6 镜像 -x 脸侧(挖掘不背身)、wink 星芒外移 —— 探针终审 7/7"准予全片渲染"

- 渲染页:`web/v9.html`;源码:`web/src/v9/`(kaikai.js 角色 / world.js 场景 / director.js 导演 / fx.js 特效 / overlay.js UI / post.js 后期 / timeline.json 时间轴)
- 渲染管线契约:`.trellis/spec/frontend/v9-render-pipeline.md`(9 条管线契约 + r3 物理契约 4 条 + r4 评审投喂契约 3 条)
- 复现:`cd web && node render.mjs --page=v9.html --http --gpu '--hash=#K=8' --frames=0:49 --total=49.03 --dir=out/v9frames_k8_r3 --workers=5 && bash scripts/v9_build.sh web/out/v9frames_k8_r3 output/v9/kaikai-v9-demo.mp4 16`(注意 render.mjs 跳过已存在帧,重渲必须换新目录)
- 评审:`scripts/agy_review.sh`(视频 ≤3MB/≤16s,多模态拆视频/图片双通道)
- 待办:① 用户验收 r4 成片 ② 验收后提交 239+ 改动路径(用户授权才提交) ③ backlog:铲斗四连杆摇臂机构(观众不可见,暂不修)
- 下一步:V9 标杆全片化(s01 开场 + s05–s15 各镜)

### 历史:v8 方向(2026-09-27)

**v8 方向已确认**(后被 V9 取代):Gemini/Imagen 生成模块化拼装板件资产(车身+独立大臂+独立小臂斗,自带圆柱轴承槽),代码骨骼引擎做正运动学驱动与物理粒子——彻底解决了 v7 硬裁切方案的关节断裂问题。已迭代三版 Demo(覆盖剧本 s02–s04 互动段;视频已清理,可随时用引擎重新渲染):

| 迭代 | 时长 | 渲染页 | 说明 |
|---|---|---|---|
| cinematic | 43s | `web/demo_v8_cinematic.html` | banana 原图资产 + 电影感运镜 |
| rigged | 43s | `web/demo8.html` | 模块拼装 + 骨骼绑定初版(紫沙) |
| director | 38s | `web/demo_v8_director.html` | **导演版(当前基准)**:真实泥土材质、发光小手虚影引导、毫秒级音画同步 |

用户评价:**大方向正确,画面质感仍需打磨** → 由此诞生 V9 真 3D 路线(见上节)。

## 制作方式(V9 管线,现役)

```
程序化建模/导演(无任何 AI 资产)
  → web/src/v9/*(kaikai/world/director/fx/overlay/post,timeline.json 单一时间轴权威)
  → scripts/v9_sfx.py + v9_audio.py(音效合成 + 混音/闪避/loudnorm → v9_master.wav + lipsync.json)
  → web/render.mjs(headless GPU,K 子帧累积,纯函数 renderAt 可并行可续跑)
  → scripts/v9_build.sh(ffmpeg libx264 + AAC,blackdetect 校验)
```

## 制作方式(v8 管线,历史)

```
Gemini/Imagen 生资产(模块化板件+背景板,绿幕键控切件)
  → web/src/v8_director.js 导演引擎(骨骼 FK + 物理粒子 + 音画同步)
  → web/render.mjs(headless Chrome 逐帧渲染)
  → ffmpeg 合成(音轨沿用 assets/audio/master-mix.m4a 主混音)
```

- v8 引擎:`web/src/v8_director.js`(导演版)、`v8_engine.js`(紫沙初版)、`demo8.js`(拼装验证)
- v8 资产:`output/tests/v8/`(板件 PNG + 音频)、`output/tests/ai/bg-party.png`(AI 背景板)
- 资产生产工具:`output/tests/v8/{gen_v8_parts,slice_parts,mix_audio,test_fk_pose}.py`
- 预览页:`web/demo_v8_director.html` / `demo_v8_cinematic.html` / `demo8.html`
- 渲染:`cd web && node render.mjs --page=demo_v8_director.html --total=38 --frames=0:38 --workers=5`

## 成片版本(历史)

> 全部成片与 Demo 视频已于 2026-09-27 清理(v1–v8 方案均不满意,将全部重做);主混音轨已留存 `assets/audio/master-mix.m4a`(237s),各版视觉记录见 `archive/` 抽帧。重新渲染:对应渲染页 + `web/render.mjs`。

- v1.1:Ken Burns 保底版(237s)— AI 静帧 + ffmpeg 平移缩放
- v2:2D 扁平精灵分层动画
- v3:高质量 2D 分镜帧(布鲁伊+宾果)
- v4:Nano Banana 帧 + rembg 抠图动画(抠图痕迹明显,弃用)
- v5:全手绘第一版(角色太糙,弃用)
- v6:全代码手绘,角色按 banana 图像素级复刻(**最后一版全片**;用户:有进步但太丑)
- v7:三路线探索(纯代码扁平 / AI 融合整图 / 硬裁切骨骼)→ 硬裁切关节断裂被否定
- v8:模块化骨骼 × 三版迭代 — **当前方向**

## 目录结构

| 路径 | 内容 |
|---|---|
| `docs/剧本-v2.md` | 剧本定稿(v1 已归档) |
| `docs/制作方案.md` | 初版制作方案(历史,已被实际管线取代) |
| `docs/research/` | 调研:精美动画升级方案(v7/v8 路线论证)、AI 资源、工具链 |
| `docs/plantree/` | 长期规划(PlanTree,路线图/决策/待解问题) |
| `assets/audio/` | TTS 旁白、角色台词、`master-mix.m4a`(全片主混音轨,自 v1 沿用) |
| `assets/bgm/` | 背景音乐、音效 |
| `assets/subs-v5.ass` | 短句跟随字幕(v6 起用) |
| `assets/images/` `assets/clips/` | 空(v1–v4 素材已归档) |
| `scripts/` | 现役脚本:`build.py`(TTS/字幕/音轨)、`synth.py`(音效合成)、`export_timeline.py`、`storyboard.json`(分镜权威)、`encode_v6.sh`(v6 出片) |
| `web/src/` | 动画引擎:v8 三件套 + v6 全代码手绘班底(engine/kaikai/cast/scenery/scenes/camera/scenery2/rig) |
| `output/` | 成片输出(旧视频已全部清理,待 v8 全片重新生成) |
| `output/tests/` | 现役试验场:`ai/`(AI 精灵与背景板)、`v8/`(v8 板件资产与工具) |
| `output/bananan/` | 用户提供的 Nano Banana 参考素材(审美基线,勿动) |
| `archive/` | 归档的历史素材/QA/旧脚本(中间帧与视频已删,~514MB,不入 git) |
| `.trellis/` | Trellis 任务/规范/工作日志 |

## 历史管线备查

- v6 全片管线(全代码零位图):`web/src/{kaikai,cast,scenery,scenes}.js` → `render.mjs --frames` → `scripts/encode_v6.sh`(帧+master-mix 音轨+subs-v5.ass)
- v1–v5 管线脚本与素材均在 `archive/`,细节见 `archive/README.md`
- 密钥:`.secrets/api.env`(wisart gpt-image-2 可用;grok2api 视频已弃用)
