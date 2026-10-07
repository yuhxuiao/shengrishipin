# V9 渲染管线契约(经 r1/r2/r3 三轮迭代验证)

> three.js 真 3D 导演版(`web/v9.html` + `web/src/v9/`)的硬约定。每条都是踩坑后的定论,改动前先读。

---

## 1. 帧渲染:renderAt(t) 必须是纯函数

- 所有世界/角色/相机/UI 状态只能依赖时间 `t`,不允许跨帧累加状态。
- 粒子特效在 init 时一次性**预模拟**(`fx.js simulate()`),`update(t)` 只按 t 采样——保证任意单帧可独立渲染(`--stills` 探针依赖此性质)。
- K 子帧累积(运动模糊 + Halton 抖动 AA)在 `renderAt` 外层做,姿势函数不感知 K。

## 2. render.mjs 跳过已存在帧(陈旧帧陷阱)

- 重渲同一 `--dir` 是 no-op。要么用**新目录**(`out/v9frames_r3`、`out/v9frames_k8`),要么先把旧帧移去 `out/_trash/`。
- 渲染日志末尾有 `page errors: N`,N≠0 先修页面错误再往下走。
- Bash cwd 不跨调用持久:每次调用都加 `env -C /home/yuhuxiao/projects/生日视频/web`。
- 别忘了 `--page=v9.html`(默认页是 2D 卡通版,渲错页浪费整轮)。

## 3. WSL2 GPU 无头渲染

- 命令形态:`node render.mjs --page=v9.html --http --gpu '--hash=#K=2|8' --frames=0:48 --total=48.03 --dir=... --workers=5`
- 依赖 `GALLIUM_DRIVER=d3d12 MESA_D3D12_DEFAULT_ADAPTER_NAME=NVIDIA` + chrome-headless-shell `--use-angle=gl`(render.mjs 已内置);日志应出现 `D3D12 (NVIDIA GeForce RTX 2060)`。
- K=2 全片(1440 帧)≈2.5 min;K=8 ≈4 min(2026-09 RTX 2060 实测)。

## 4. 特效锚点:一律 FK 采样,禁止硬编码世界坐标

- 泥块/尘雾的爆发原点必须用 FK:`kk.setPose(接触瞬间姿势)` → `kk.bucketTip(out)` 取斗齿世界位,粒子从该点生成(见 `director.js digBurst/dumpClods`)。
- 反例:r1/r2 把挖掘特效锚在 `moundTop` 常量,铲斗在堆缘、烟尘在山顶爆开,0.45m 空间脱节,两轮评审才根除。
- 挖掘落点校准:`web/fk_check.mjs` 模式(node 里 stub `document` 跑 kaikai.js)离线算 bucketTip,反推 swing/MOUND——禁止盲调,FK 数据先行。
- 落点目标:斗齿距 mound 中心 ≤55% R(厚层 ≥0.2m);crater 位置与落点对齐。

## 5. 镜头语言

- **30° 原则**:相邻镜头视线夹角 ≥30°,否则是跳切(评审实测夹角 2.1°/10° 被判阻断)。改机位时算夹角,不许只前推。
- **Blink-on-Cut 禁忌**:全局眨眼表与切点保持 ±0.3s;同理避开倾听窗、舞蹈峰值等表情重拍。
- 铲斗/帽尖/斗顶与画框留 ≥8% 安全边距;Pose 峰值与机位联动标定(probe 静帧复测,不猜)。
- 短于 2s 的"鸡肋镜"并入邻镜;切点对齐 pop SFX/卡片入场(同帧,误差 ≤0.05s)。

## 6. UI overlay(2D 合成层)

- `ease.inCubic` **保号**:插值输入必须 `Math.max(0, Math.min(1, x))` 钳制,负输入会产生万级像素位移(r1 全片卡片不可见的根因)。
- 徽章/卡片不得跨镜头硬切点悬挂;生命周期在切点前 0.1-0.3s 结束。
- 徽章锚点避开斗臂运动包络(现定 `W*0.78, H*0.24` 右上)。
- 指令卡随台词即时短挂(≤2.5s),禁止合并长挂剧透后续动作。

## 7. 音频

- `v9_audio.py` loudnorm 两 pass:`I=-16:TP=-1.3:LRA=11`。TP 目标 **-1.3 而非 -1.0**——AAC 编码引入 ~0.1dB 真峰值过冲,成片实测才稳 ≤-1.0 dBTP。
- VO 包络 BGM 闪避平滑窗 450ms(220ms 有抽吸感)。
- 跳舞/律动段必须有拟音(boing/hop 对齐 bob 波峰),不能只有 BGM。

## 8. agy 评审工作流(读图/读视频一律交 agy)

- **视频 >16s 必挂**(`FAILED_PRECONDITION User location is not supported`);成片切 **4×12s** 540p 代理分段审。
- 文件路径写在 prompt 文本里(agy 是 agent CLI,自己读文件);**不支持位置参数传文件**。
- 单次调用只审一个文件;4-files-per-call 会失败。
- geo 配额间歇性关闭:后台重试循环 `for try in $(seq 1 12); do agy ... && break; sleep 75; done`,段间串行。
- 静帧探针不受限,优先用探针验证修复点,再烧整片评审配额。

## 9. 构建与验收

- `bash scripts/v9_build.sh <帧目录> <输出.mp4> <crf>`:libx264 crf 16(终版)/18(预览)+ AAC 192k + blackdetect。
- AC 自验三件套:`ebur128`(-16±1 LUFS, TP ≤-1.0)、`blackdetect`(无黑帧)、probe 流(1920×1080/30fps/yuv420p/48.00s±0.05)。
- 旧产物保留 `output/v9/qa/`(评审/探针/prompt 全归档),不覆盖——回滚点。

## 物理契约(r3 沉淀,评审硬约束)

10. **履带永不离地**:bob/挤压只作用于上车体悬挂(upperPivot),底盘履带接地;行驶位移由 travelT 积分表驱动(trackL/R = s ∓ W/2·yaw),禁直挂 posX 差分。
11. **squash ≤ 0.12 硬上限**;大臂/回转加速度经数值二阶导耦合 pitch/roll 反作用(系数 ≤0.0045,过大削顶)。
12. **液压缸定长**:L0 lazy-init,杆程下限 0.72·L0,禁随关节拉伸;铲斗翻斗峰值 ≤1.05rad(防穿斗杆)。
13. **粒子守恒**:payload 卷斗渐满/翻斗 90° 即卸/落点 dumpLips 堆积丘;挖掘粒子贴地切向挤出,禁凭空喷发;彩纸/尘土受重力+全局 WIND 风场。

## 评审投喂契约(r4 沉淀)

14. **agy 视频评审:单文件 ≤3MB(720p crf30+96k AAC)、≤16s**;超限必挂死或 "error: interrupted"。多模态拆通道:视频(物理/文案)与图片(风格抽帧)分会话送审。
15. 评审 prompt 必含 8 维物理清单(履带/重心/挖土/粒子/影子/风/机械/相机)+ 幼儿直觉检查(2 岁可理解、卡片 ≥2.5s);风格评审附 banana/布鲁伊参考。
16. agy_review.sh 成功判定过滤 `^error:`;"interrupted" 一律重试。
