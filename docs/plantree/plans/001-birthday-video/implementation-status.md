# P001 交接状态(2026-09-29,V9 出片后)

## 当前阶段

- **V9 真 3D 导演版 Demo 已通过终审(2026-09-29)**:`output/v9/kaikai-v9-demo.mp4`(48s,1080p30,H.264 yuv420p+AAC 192k,-16.3 LUFS/TP -1.3)。three.js 程序化真 3D,RTX 2060 经 WSL2 Mesa d3d12 无头渲染,K=8 子帧累积。三轮 agy 审片(r1 7.4 → r2 7.7 → 终审 9.4+),阻断缺陷清零,明确优于 v8。AC1-AC5 达标。
- 渲染管线契约已沉淀:`.trellis/spec/frontend/v9-render-pipeline.md`(纯函数 renderAt/FX FK 锚点/30° 原则/blink-on-cut 禁忌/TP -1.3 余量/agy 分段评审工作流)。
- **下一步:V9 标杆全片化**——s01 开场 + s05–s15 各镜沿用 V9 管线扩镜,全片 ~237s。

## 历史阶段(2026-09-27,v8)

- **v8 方向已确认(用户:大方向对,但仍不满意,继续打磨)**。方案:Gemini/Imagen 以 Nano Banana 为参考直出**模块化拼装板件**(完整车身+独立大臂+独立小臂斗,自带圆柱轴承槽),代码骨骼引擎 FK 驱动 + 物理粒子,彻底根除 v7 硬裁切的关节断裂/黑洞撕裂/悬浮碎片。
- 三版 Demo 迭代(均覆盖剧本 s02–s04 互动段;**视频已于 2026-09-27 全部清理**,可随时用渲染页重新生成):
  - cinematic(43s,`web/demo_v8_cinematic.html`):banana 原图资产 + 电影感运镜
  - rigged(43s,`web/demo8.html`):模块拼装骨骼初版(紫沙,材质后被否定)
  - director(38s,`web/demo_v8_director.html`):**导演版,当前基准**——真实泥土材质(告别紫色)、发光小手虚影引导替代生硬符号、毫秒级音画同步、挖土凹坑形变+重力泥粒

## 用户审美基线(重要)

- 心头好:`output/bananan/`(Nano Banana 3D 皮克斯毛绒风,金色时刻光线,开开=布鲁伊脸的挖掘机,门上"开开"字)
- 参考项目:`/tmp/pdoom`(JohnHeibel/PDoomVideo)、`/tmp/gz`(op7418/guizang-product-video-skill)——若 /tmp 被清,重新 clone 到 /tmp 即可
- 已否定:抠图贴图(v4,有残边)、初版简陋手绘(v5)、纯代码 2D(v6"有进步但太丑")、v7 硬裁切骨骼(关节断裂)、v8 紫沙材质(改暖调泥土)
- 已接受:v6 的动画骨架与短句字幕形式;v8 的模块化骨骼+AI 资产大方向

## Last Landed

- v8 三版 Demo 出片(2026-09-27,cinematic → rigged → director);同日全部旧视频(v1–v6 成片、v7/v8 Demo、v1 片段)经用户确认清理,**全片主混音轨已留存 `assets/audio/master-mix.m4a`(237.03s)**
- v6 全代码手绘版出片自检通过(2026-09-26,237s 最后一版全片)
- 字幕:`assets/subs-v5.ass` 短句跟随(v6 起用);v8 demo 音轨切段:`output/tests/v8/audio_*.aac`(s02–s04)
- 2026-09-27 项目整理:v1–v7 过程文件归档 `archive/`,中间帧与视频(~17GB)已删除,渲染管线冒烟验证通过

## Next Target(v8 打磨 → 全片化)

1. **板件质感打磨**(用户不满意的核心):泥土/金属材质真实感、光影方向一致性(金色时刻左上来光)、部件接缝融合度;先出静帧对比 banana 原图再渲染
2. **粒子与物理细节**:泥粒飞溅的粒度/轨迹/着地、履带受压与回弹的节奏感
3. **音画同步微调**:互动口令("举""挖""抬")与动作帧级对齐复核
4. **全片化清单**:s01 开场 + s05–s15 各镜的 Gemini 板件与 AI 背景板资产清单(参照 v7 路线乙+ 清单:~15 张精灵 + 3-5 张背景板)、逐镜镜头动词、引擎内字幕全片化(从 `assets/subs-v5.ass` 导出 cues)

## Blocked By

无(Gemini/Imagen 与 wisart gpt-image-2 均可用;grok 视频接口已弃用)

## Active TODO

- 等用户对 demo-v8-director 的具体镜头意见
- v8 全片化资产生产(见 Next Target 4)
- 定稿后可整体删除 `archive/`(~514MB,用户确认后再清)

## 关键文件索引

- v8 现役:`web/src/v8_director.js`(导演版引擎)、`v8_engine.js`(紫沙初版)、`demo8.js`(拼装验证)、`rig.js`(FK 骨骼)、`camera.js`(运镜/字幕/转场)、`engine.js`(公共基元)
- v8 页面:`web/demo_v8_director.html` / `demo_v8_cinematic.html` / `demo8.html`
- v8 资产:`output/tests/v8/`(板件/土堆/引导手 PNG、`audio_*.aac`)、`output/tests/ai/bg-party.png`(AI 背景板,`kaikai-*.png` 为 v7 遗留精灵)
- v8 资产工具:`output/tests/v8/{gen_v8_parts,slice_parts,mix_audio,test_fk_pose}.py`
- 渲染:`cd web && node render.mjs --page=demo_v8_director.html --total=38 --frames=0:38 --workers=5`(`--sheet`/`--stills` 快速预览)
- 剧本/分镜:`scripts/storyboard.json`(机读权威)、`docs/剧本-v2.md`
- v6 全片管线(备查):`web/src/{kaikai,cast,scenery,scenes}.js` → `scripts/encode_v6.sh`;时间轴 `web/timeline.js`(由 `scripts/export_timeline.py` 生成,勿手改)
- 香蕉素材:`output/bananan/`(23 张 + 参考视频);历史归档:`archive/`(说明见 `archive/README.md`)
- 密钥:`.secrets/api.env`(wisart gpt-image-2 可用;grok2api 视频已弃用)
