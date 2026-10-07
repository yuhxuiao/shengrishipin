# Design: V11 导演版

详见评审文档 §4-§7。本文件固化**模块接口契约**(各子代理按此并行开发, 互不改对方文件)。

## 0. 时长与分镜总表 (目标 225s)
| 幕 | 时间 | 内容 | 强度 |
|---|---|---|---|
| 1 生日早晨 | 0-36 | 清晨院子→挖挖入场→看镜头问好(第四面墙)→布鲁伊跳入击掌→指远方金X一闪 | 2 |
| 2a 线索1 花园·气球 | 36-62 | 走路视差→X1→专注预备→挖(尘土/震动)→气球破土→挖挖惊喜反应→气球飘走 | 3 |
| 2b 线索2 沙坑·派对帽 | 62-92 | 挖到空盒/旧鞋(意外, 歪头)→再挖→帽子飞出落挖挖头(戴上, 弹性)→得意转圈→宾果大跳入场 | 5 |
| 2c 线索3 树下·骨头 | 92-124 | 宾果抢着刨→挖挖帮忙→骨头弹出→宾果扑骨头与布鲁伊拉扯(追逐跟拍)→挖挖"不是这个~"→金X现 | 6 |
| 3 大礼物 | 124-164 | 全员静听+音乐留白2s→挖挖深呼吸→特写斗齿入土(震动+尘)→礼物角露出(慢推)→停顿1s→慢动作破土→辉光→全员欢呼纸屑→挖挖看镜头"开开你看!" | 10 |
| 4 庆生 | 164-225 | 取蛋糕(场景换派对桌)→托蛋糕跟拍(小心表情)→放蛋糕特写→点蜡烛→合唱(每句换角色特写)→吹蜡烛大特写→纸屑雨拉远→挖挖看镜头"开开, 两岁生日快乐!"→标题大字+定格5s | 8 |
互动节拍≥6 处: 问好挥手(~10s)/ 数气球(~54s)/ 拍手庆祝(~86s)/ 找骨头(~110s)/ 一起喊"挖呀挖"(~134s)/ 吹蜡烛(~205s)。

## 1. 坐标与渲染
- 画布 1920×1080, 渲染入口 `window.renderAt(t, type, q)` 纯函数 (同 v10)。
- 世界坐标 x∈[0, 5760] (3 屏宽), y 与画布同; camera `{x,y,zoom}` (x,y=画面中心的世界坐标, zoom≥1 缩放)。屏幕 = (world - cam) * zoom + (960,540)。
- 分层 parallax (相机 x 位移乘系数): sky 0.05 / far 0.2 / mid 0.5 / main 1.0 / fg 1.5。

## 2. 模块与接口 (全部挂 window 全局, classic script, 与 v10 一致; node 下 module.exports)
### 2.1 `web/src/v11/camera.js` → `V11Cam`
- `V11Cam.state(shot, t)` → `{x,y,zoom,shake:[dx,dy]}`; `V11Cam.begin(ctx, st, parallax=1)` / `end(ctx)`。
- ease: inOutCubic, outBack, hold。shake 为确定性 (sin 叠加, 无随机状态)。
### 2.2 `web/src/v11/shots.js` → `V11Shots`
- 数据: `[{id,t0,dur,type:'EWS|WS|MS|CU',cam:{from:{x,y,zoom},to:{x,y,zoom},ease},purpose,transition}]`; `V11Shots.at(t)` → `{shot,u}`; 总长 ≤240。
- 另含演员时间轴 (挖挖动作段/表情段/视线目标、配角动作段、道具事件), 单位秒, 全局时间。
### 2.3 `web/src/v11/face.js` → `V11Face` (子代理B)
- `V11Face.draw(ctx, mBody, expr)`; mBody = fk.assemble().mBody (body 局部→装配空间矩阵), 绘制在 body.png 之后、其它件之前; 先用脸米色盖住烘焙的眼/嘴/眉区域(FACE 实测值), 再程序化绘制。
- expr: `{look:[-1..1,-1..1], lidTop:0..1, lidBot:0..1, browL:{lift,tilt}, browR:{...}, mouth:{open:0..1,curve:-1..1,width}, cheek:0..1, sparkle:0..1}`。
- `V11Face.PRESETS`: neutral/happy/surprise/anticipate/focus/proud/shy/laugh/talk(+ 可拓展) ; `V11Face.blend(a,b,u)`; `V11Face.exprAt(track,t)` 按表情轨 `[[t0,name,dur(blend s)],...]` + 视线轨 `[[t0,targetXY,dur],...]` + 口型 (lipsync 开合包络数组) 计算; 眨眼叠加沿用 4s 周期并避开 surprise。
### 2.4 `web/src/v11/actions.js` → `V11Actions` (子代理B)
- 保持 `V10Actions` 全部 + 新增: anticipate_dig, settle, look_around, nod, hop_joy, reach_up, wiggle, bow, scoop_carry, breathe_big, talk_bob; 全部为 t 纯函数返回 pose `{boom,stick,bucket,bob,squash}`; `V11Actions.periods` 登记。
- 另给 `micro(t, seed)` 微表演轮换 (确定性)。新动作必过 probe L1+L2 (probe.mjs/probe_kin.mjs 在 v10 目录, 可复制 v11 版扩展, 不改 v10)。
### 2.5 `web/src/v11/pup.js` → `V11Pup` (子代理C)
- 分件骨骼: 头(含表情贴片/程序脸)、躯干、左右上臂/前臂、左右大腿/小腿、尾巴; 素材 `assets/images/v11/pups/{bluey,bingo}/<part>.png` + `rig.json` (铰点); 
- `V11Pup.draw(ctx, who, state, t)`; state={x,footY,facing:±1,pose,expr,look}; 姿势库≥6(站/指/跳起/落地/拍手/笑/捂嘴/跑/扑/抱骨头/鞠躬/跳舞); `V11Pup.pose(who,name,u)`; 接地椭圆影随高度缩放; 帽子(`hat`)挂头骨点带弹簧晃动。
### 2.6 `web/src/v11/scenery.js` + `fx.js` → `V11Scene`/`V11Fx` (子代理A)
- `V11Scene.drawLayer(ctx, layerName, locationId, camSt, t)`; 6 地点 {yard, garden, sandbox, tree, golden, party}; 环境活物 (云/蝶/花瓣/旗串摆/气球弹簧/草风); 光 (暗角/径向辉光/金色时刻渐变)。
- `V11Fx`: dust(土粒迸溅), burst(星星), confetti(分3形状+旋转+阻力), flame(蜡烛), smoke, glow; 全确定性 f(t, seed)。
### 2.7 `web/v11.html` + `web/src/v11/main.js` (子代理A 集成)
- 加载 v10 fk.js/actions.js (v10 保持) + v11 模块; `frame(t)`: shotAt → cam → 分层绘制: sky/far/mid → 地面 → 道具 → 挖挖(履带/车身/脸/臂/斗, 复用 v10 `V10Core.renderFrame` 逻辑或复制到 v11 并插入脸层) → 配角 → fg → fx → overlay(字幕/标题)。
- 允许复制 v10 `main.js` 的 renderFrame 并加脸层钩子; 不改 v10 原文件。
### 2.8 音频 `scripts/v11_vo.py` `scripts/v11_audio.py` (子代理D)
- 扩剧本 → `docs/剧本-v3-v11.md`; VO (edge-tts XiaoxiaoNeural -5%, 沿用 v10_feature_vo 管线) 约 40 句(含拟声/互动/看镜头台词); 输出 `output/v11/vo_durations.json` `lipsync.json` `v11_master.wav`; 混音规范沿用 v10 §6; 总长≤240s; BGM Carefree 循环+高潮留白+生日歌分句。
- shots.js 的时间点以 vo_durations.json 为准 (D 先出 durations, A/B 对齐)。

## 3. 渲染与合成
`env -C web node render.mjs --page=v11.html --frames=A:B --workers=5 --dir=out/v11_<tag>`; 合成 ffmpeg crf16 + aac192k → `output/v11_feature.mp4`; blackdetect 零黑帧。ffmpeg 在 ~/.local/bin/ffmpeg(无 ffprobe); python 媒体环境 `/home/yuhuxiao/.local/opt/venv-media/bin/python`。

## 4. 风险
程序脸与 body 接缝(先出单帧自检); 分件配角生图一致性(每角色 3 轮预算, 失败降级: 头+躯干+四肢粗分件); 工期(竖切片线索1 先交付)。
