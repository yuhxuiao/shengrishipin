# V9 执行计划

执行方式:本会话直接实现(创作型迭代需要连续上下文);读图/读视频一律交 agy(`agy -p ... --model gemini-3.8-flash-high --dangerously-skip-permissions`),本会话负责检查与数值验证。

## 检查清单

1. [x] 渲染基础设施
   - `web/render.mjs` 增加 `--http`、`--gpu`,默认 Chrome 改为 `~/.local/share/browser-binaries/puppeteer/chrome-headless-shell/.../chrome-headless-shell`
   - `web/v9.html` 骨架 + `web/src/v9/util.js`
   - 验证:`node render.mjs --page=v9.html --http --gpu --stills=0 --out=out/v9probe` 出图且日志显示 D3D12 渲染器
2. [x] 角色 `kaikai.js`
   - 按规格书建模 + 骨骼 + 表情/口型接口
   - 验证:转台静帧(正面/3/4/侧面/背面 + 挖掘姿态 + 眨眼/张嘴)→ agy 对照 banana 基线挑错,修至"可辨认为开开、无穿插、无接缝"
3. [x] 世界 `world.js` + 光照 + `post.js`
   - 天空/IBL/草地/草簇/远山/树/彩旗/气球/礼物/土堆;HDR 累积、泛光、景深、调色
   - 验证:英雄镜头静帧 → agy 审光影一致性与质感
4. [x] 时间轴 + 音频
   - `timeline.json`(旁白短语重排 + beats + 音效 + 镜头 + UI)
   - `scripts/v9_sfx.py`、`scripts/v9_audio.py` → `output/v9/v9_master.wav`、`web/src/v9/lipsync.json`
   - 验证:ebur128 实测 −16±1 LUFS、TP ≤ −1.0 dBTP;逐句切片起止与文本一致
5. [x] 导演 `director.js` + 特效 `fx.js` + UI `overlay.js`
   - 全部镜头表演、运镜、挖土形变、泥块物理、彩纸、闪光、字幕/卡片/引导手/徽章
   - 验证:每镜 2–3 张关键静帧联系表 → agy 审;修
6. [x] 分段试渲(r1/r2 两轮已审已修;probe6/7/8 探针复核全绿)
   - 低成本预览(K=2、JPEG 0.85)全片 → 编码 → agy 看运动节奏与音画同步 → 修
   - r2 修复(已落码):两处同轴跳切(shot6 真侧视/shot7 前左低角度,shot8 并入长镜)、挖掘 FX 改 FK 斗齿采样+swing -0.85/MOUND 迎 0.12m(fk_check.mjs 标定)、三处削顶(挥手/跳舞/lift2)、徽章右上+40.2 退出、挖抬卡四拆分+动一动卡、cut_b 7.0 对齐 pop、车门 3/4 构图、气球窗臂压低、彩带爆点/阻力、引擎 Q 弹/灯闪对齐 1.7s、眨眼避让切点/倾听/跳舞、口型静默窗闭合
   - 探针复核:probe6 13/15 生效;probe7 复审彩带/挖掘 2 项(评审中)
7. [x] 终版渲染
   - K=8 全帧(1440 帧,3.8 min,页面错误 0)→ `output/v9/kaikai-v9-demo.mp4`
   - AC1 ✓ 1920×1080/30fps/yuv420p+AAC 192k/48.00s;AC3 ✓ blackdetect 无黑帧;AC2 ✓ -16.3 LUFS / TP -1.3 dBTP(loudnorm 目标降至 -1.3 留 AAC 过冲余量,成片实测达标)
8. [x] 终审
   - agy 4×12s 分段终审(终版 K=8,对照 v8 重渲静帧):**全部无阻断,seg0-3 = 9.4/9.5/9.5/9.7,均"明显且决定性地超越 V8"**(AC4 ✓ 指令响应 0.05-0.40s、SFX 帧对齐;AC5 ✓ ≥8/10)
9. [x] 收尾
   - README V9 章节 + implementation-status.md 已更新(AC6);spec `.trellis/spec/frontend/v9-render-pipeline.md` 9 条契约沉淀;journal Session 8;通知用户验收

## 复现命令(完成后以实际为准)

```bash
/home/yuhuxiao/.local/opt/venv-media/bin/python scripts/v9_sfx.py
/home/yuhuxiao/.local/opt/venv-media/bin/python scripts/v9_audio.py
cd web && node render.mjs --page=v9.html --http --gpu --total=<T> --frames=0:<T> --dir=out/v9frames --workers=4
bash scripts/v9_build.sh
```

## 回滚点

- 所有 V9 产物为新增文件;`render.mjs` 改动为可选参数,不加参数时行为不变。
- 任一阶段失败:保留上一轮通过的静帧/视频于 `output/v9/qa/`,不覆盖。
