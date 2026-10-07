# V9 技术设计

## 1. 路线选择

| 方案 | 结论 |
|---|---|
| A. 沿用 v8:AI 板件 PNG + 2D FK | 否。板件光向固定、关节接缝、换角度要重生图;Gemini 板件质感用户不满意 |
| B. 纯 2D 程序手绘 | 否。v6 已被评价"太丑" |
| **C. three.js 真 3D 程序化建模 + GPU 离线逐帧渲染** | **采用**。光影/关节/镜头天然一致,可做真实挖土形变、物理泥块、景深、运动模糊 |

GPU 探针(2026-09-28):`chrome-headless-shell` + `GALLIUM_DRIVER=d3d12` + `--use-gl=angle --use-angle=gl` → `ANGLE (D3D12 NVIDIA GeForce RTX 2060)`;1080p 阴影 + 泛光 + 景深约 10ms/帧(CPU llvmpipe 约 335ms)。瓶颈为页面内 JPEG 编码(约 150ms/帧),多 worker 并行摊薄。完整版 Chrome 在该配置下建 WebGL 上下文失败,只用 headless-shell。

## 2. 模块与文件

```
web/v9.html                 importmap(three) + 输出画布;暴露 window.ready / renderAt(t) / renderSheet(ts)
web/src/v9/
  timeline.json             唯一时间源:fps/total、旁白切片与落点、节拍 beats、音效事件、镜头表、UI 提示
  util.js                   数学/缓动/闭式弹簧/关键帧采样/种子随机/噪声
  kaikai.js                 开开程序化模型 + 骨骼:build() → { root, setPose(p) }
  world.js                  天空、IBL、草地/草簇/小花、远山树木、彩旗、气球、礼物、可形变土堆
  fx.js                     泥块预计算物理轨迹、尘土、彩纸、闪光(全部种子确定)
  director.js               t → 镜头 + 角色姿态 + 世界状态 + 特效触发 + UI 状态
  post.js                   HDR 累积(子帧运动模糊 + 亚像素抖动抗锯齿 + 软阴影抖动)→ 泛光/景深/调色/暗角/颗粒
  overlay.js                2D UI:字幕、跟做卡片、引导小手、奖励徽章
web/render.mjs              新增 --http(内置静态服务器,ES module 必需)与 --gpu(d3d12 环境 + headless-shell 参数)
scripts/v9_sfx.py           numpy 合成音效 → assets/sfx/v9/*.wav
scripts/v9_audio.py         timeline.json → 切片旁白 + BGM 闪避 + 音效 → 响度归一 master.wav + lipsync.json
scripts/v9_build.sh         渲帧 → 编码 → 合轨 → 抽帧联系表
```

v8 页面、资产、`render.mjs` 默认行为不变(仅修正已失效的默认 Chrome 路径)。

## 3. 时间轴契约(timeline.json)

```json
{
  "fps": 30, "total": 48.0,
  "vo":   [{ "id": "k1", "src": "assets/audio/s02_0.mp3", "from": 0.15, "to": 0.80,
             "at": 6.6, "speaker": "kaikai", "text": "大家好!" }],
  "beats": { "arrive": 6.0, "dig1": 30.2 },
  "sfx":  [{ "name": "dig_crunch", "at": "dig1", "gain": -6 }],
  "ui":   [{ "type": "card", "text": "...", "from": 12.0, "to": 20.0, "icon": "arms_up" }]
}
```

- 旁白按 silencedetect 测得的短语边界切片(`from/to` 为源文件秒),`at` 为成片落点;字幕区间 = `[at, at + (to - from) + hold]`。
- 音效 `at` 可写秒数或 beat 名;动画在 beat 时刻精确到达接触/峰值姿态 → 音画同帧。
- 泥块落地音效时刻由 `fx.js` 的同一份确定性模拟导出(node 直接 import),不手填。
- 开开口型:`v9_audio.py` 对开开声轨按帧算 RMS 包络 → `web/src/v9/lipsync.json`。

## 4. 渲染管线

每个输出帧 t:
1. 对 k = 0..K-1(默认 K=8):子帧时刻 `t_k = t + shutter·((k+0.5)/K − 0.5)`,shutter = 0.5/fps(180° 快门);`director.apply(t_k)`;相机按 Halton(2,3) 亚像素抖动(`setViewOffset`);太阳光源在小圆盘内抖动(累积出半影软阴影)。
2. 场景渲染到 HalfFloat 线性 HDR 目标(不做色调映射),以 1/K 权重加性累积。
3. 累积结果只做一次后期:泛光(HDR 阈值)→ 景深(中心时刻深度)→ 调色(曝光、ACES、暖色偏移、饱和、暗角、按帧号种子的颗粒)→ 画布。
4. 2D 输出画布合成:`drawImage(webgl)` + `overlay.draw(t)` → `toDataURL('image/jpeg', 0.95)`。

确定性:渲染期不用 `Math.random` / `Date.now`;粒子在加载时用固定步长(1/240s)预模拟并存轨迹,按 t 插值采样;弹簧用闭式阶跃响应叠加 `x(t) = v0 + Σ Δv_i · step(t − t_i)`,任意帧可独立计算。

## 5. 角色模型要点(单位:车身高 = 1.0)

- 以 `output/v9/qa/charspec.md` 为准:履带底盘 0.72×0.22×0.84、上车体 0.58×0.67×0.65(大圆角)、后配重、回转支承、金属裙边、车顶双琥珀灯、派对帽。
- 脸在车身正面(+Z):藏青面罩浮雕、椭圆大眼(眼白 + 深棕瞳 + 双高光,可眨眼/看向目标)、浅蓝胶囊眉、杏黄吻部(隆起 0.135)、藏青鼻头、嘴(微笑沟 ↔ 张嘴含舌,按口型值插值)、腮红。
- 动臂在 +X 侧外挂(不遮脸),鹅颈大臂 → 斗杆 → 4 齿铲斗;3 组液压缸按两端锚点每帧求解(缸筒固定一端,活塞杆滑出)。
- "开开"字标:画布纹理贴花,位于 −X 侧车门(3/4 英雄视角可同时见正脸与字标)。
- 履带:沿跑道形路径排布 32 块履带板,按行驶距离滚动;负重轮/诱导轮同步转动。
- 材质:车漆 MeshPhysical(清漆 + 轻微 sheen)、哑光软胶(面罩/吻部)、润泽瓷漆(眼/鼻)、压铸铝(铲斗/裙边)、硫化橡胶(履带)。

## 6. 光照与场景

- 金色时刻:暖色太阳(投影,左上后方,给轮廓光)+ 暖色前侧主光(不投影,照亮脸)+ 冷色半球天光 + 草地反弹 + 程序化天空 PMREM 做 IBL。
- 草地:地面噪声着色 + 近景 InstancedMesh 草簇与小花(顶点着色器按 t 摆动);远景起伏山丘与棒棒糖树;彩旗悬链线 + 旗面飘动;光泽气球束;礼物盒。
- 土堆:极坐标高度场网格,挖掘在铲斗入土点叠加凹坑函数(深度随时间单调增加,留下永久坑并在坑沿隆起);泥土噪声纹理 + 石子实例。

## 7. 音频

- 旁白切片重排(每个口令后留 1.5–2.5s 动作时间);BGM(Carefree)淡入淡出,按人声包络平滑闪避约 −9dB;音效由 `v9_sfx.py` 合成(驶入轰鸣、履带咔嗒、刹车弹簧、液压嗡鸣、挖土、泥块落地、闪光、彩纸礼炮、奖励叮)。
- 混音后 ffmpeg loudnorm 两遍法到 −16 LUFS / −1.5 dBTP;ebur128 复测。

## 8. 质量闭环

1. 角色转台静帧 → agy 对照 banana 基线打分挑错 → 修模型。
2. 每镜关键静帧联系表 → agy 审(构图/光影/表情/UI)→ 修。
3. 分镜短片 → agy 看运动与节奏 → 修。
4. 全片 → agy 带音频整片审(同步/节奏/缺陷)→ 修 → 终版。
5. 数值检查:帧数、黑帧(blackdetect)、响度(ebur128)、页面错误日志。

## 9. 风险与回滚

- "廉价 CG 感"风险:靠全倒角、清漆双层高光、冷暖光比、接触暗角、景深、调色压住;agy 每轮对照基线图评估。
- GPU 驱动不稳:渲染脚本保留 `--gpu` 开关,可退回 CPU(llvmpipe,约 30× 慢,仍可在数小时内出片)。
- 回滚:V9 全部是新增文件;不满意时 v8 可原样重渲。
