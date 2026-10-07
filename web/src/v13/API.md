# V12 动画引擎接口规范契约 (API.md)

本文档定义 V12 动画渲染引擎的统一接口标准。这是后续角色动画师 (P1)、场景美术 (P1)、特效设计 (P1) 以及全片编排导演 (P2) 代理之间的**唯一接口契约**。

---

## 1. 架构核心约束: 纯函数渲染与无状态保证

- **纯函数契约**: `window.renderAt(t, type, q)` 必须是输入绝对时间 `t`（秒）的严格纯函数。
- **禁止跨帧状态**: 任何模块严禁在模块作用域保存 `lastT`、`frameCounter`、`lastPos` 等跨帧持久化变量。
- **确定性支持**: 渲染器使用多 Worker 并行乱序渲染（例如 Worker 1 渲染 20s，Worker 2 渲染 35s），在任何时刻 `t` 任意次调用必须输出完全一致的像素。
- **解析重放原则**: 凡涉及物理振荡、步态摆动、里程累计、粒子运动，一律以 `t` 为自变量解析计算（或以 `shot.t0` 起算）。

---

## 2. 镜头结构规范 (Shots Schema)

在 `shots.js` 中，每个镜头为 `SHOTS` 数组的一项：

```javascript
{
  id: 'S07',                 // 镜头编号
  t0: 36.0,                  // 镜头起始绝对秒 (严格对齐 VO，严禁改动)
  t1: 43.0,                  // 镜头结束绝对秒 (严格对齐 VO，严禁改动)
  type: 'WS',                // 景别: EWS | WS | MS | MCU | CU
  loc: 'garden',             // 场景地点: 'yard' | 'garden' | 'sandbox' | 'tree' | 'lake' | 'party'
  transitionIn: {            // 入场转场 (可选，见 §6)
    type: 'iris',            // 'cut' | 'dissolve' | 'iris' | 'wipe' | 'whip' | 自定义
    dur: 0.6,                // 转场跨度时长 (秒)
  },
  cam: {                     // 摄像机运镜
    from: { x: 750, y: 540, zoom: 1.0 },
    to: { x: 1100, y: 540, zoom: 1.0 },
    ease: 'linear',          // 'linear' | 'outCubic' | 'easeInOut'
    shake: { amt: 0, freq: 24 } // 可选抖动
  },
  wawa: {                    // 挖挖配置 (见 §3)
    visible: true,
    track: [ /* beats */ ]
  },
  bluey: {                   // 布鲁伊配置 (见 §3)
    visible: true,
    track: [ /* beats */ ]
  },
  bingo: {                   // 宾果配置 (见 §3)
    visible: false
  },
  fx: [                      // 通用特效数组 (见 §5)
    { type: 'stars', at: 36.5, dur: 1.2, x: 800, y: 500, layer: 'world' }
  ],
  props: {                   // 场景道具交互 (向后兼容)
    hole: { x: 740, y: 860, at: 36.5 }
  },
  title: {                   // 大字幕 (可选)
    text: '第一幕标题', sub: '副标题文本', at: 36.2, dur: 4.0
  }
}
```

---

## 3. 角色 Track 与 Beat 时间轴规范

V12 采用 **Track / Beat** 体系彻底消灭“每镜一个死板 pose”与“切镜瞬间硬换”。

### 3.1 配角 Track (Bluey & Bingo)

```javascript
bluey: {
  visible: true,
  track: [
    { t: 22.0, x: -200, pose: 'run', move: 'run', facing: 1, ease: 'outCubic' },
    { t: 23.4, x: 500, pose: 'land', move: 'none', facing: 1, blend: 0.25 },
    { t: 24.2, x: 500, pose: 'point', move: 'none', facing: 1, expr: 'happy', look: [1, 0] },
    { t: 26.0, x: 500, pose: 'run', move: 'run', facing: 1 },
    { t: 28.0, x: 2250, pose: 'run', move: 'run', facing: 1, ease: 'linear' }
  ]
}
```

#### Beat 字段定义:
- `t`: **绝对秒** (Float)。必须单调递增。
- `x`: 舞台水平坐标 (主舞台 0~1920)。
- `footY`: 脚底 Y 坐标 (默认 880)。
- `h`: 角色立身高度 (Bluey 默认 420, Bingo 默认 360)。
- `pose`: 姿势名称 (字符串，在 `Pup.POSES` 注册，见 §4)。
- `move`: 运动步态类型:
  - `'run'`: 2.5Hz 轻快跳跃跑，自动叠加双腿交替摆动 (±30°)、双臂摆动 (±22°)、垂直跳跃 (`dy = -14*|sin|`) 与头部微晃。
  - `'walk'`: 1.8Hz 舒适踱步，双腿摆动 (±20°)、双臂摆动 (±15°)、微起伏 (`dy = -6*|sin|`)。
  - `'hop'`: 1.4Hz 幼儿式蹦跳，抛物线腾空收腿与落地 squash 缓冲。
  - `'tiptoe'`: 2.0Hz 踮脚蹑手蹑脚，脚跟抬高、小心探步。
  - `'drive'`: 随车身机械微震动。
  - `'none'`: 静止，无步态摆动。
- `ease`: 位置在相邻 beat 之间的插值曲线 (`'linear'` | `'outCubic'` | `'inCubic'` | `'easeInOut'` | `'backOut'`)。
- `blend`: 切换到新 pose 时的交叉混合时长 (秒，默认 0.25s)。
  - 混合过程**自动注入预备 (反向 ~3%) 与过冲回弹 (~3%)**，彻底杜绝关节角硬跳。
- `facing`: 角色面朝方向 (`1` 向右, `-1` 向左)。
  - 当相邻 beat 的 `facing` 发生翻转时，引擎在 0.15s 内以水平余弦缩放平滑完成转身，避免瞬间跳帧翻转。
- `expr`: 脸部表情 (`'happy'` | `'laugh'` | `'surprise'` | `'focus'` | `'anticipate'` 等)。
- `look`: 视线偏移 `[x, y]` (范围 -1.0 ~ 1.0)。视线切换自动以 0.12s 完成扫视 (saccade)。
- `item`: 手持道具 (`null` | `'bone'`)。
- `hasHat`: 是否佩戴派对帽 (默认 `true`)。

#### 入场与出场判定规则:
- **入场**: 首个 beat 的 `x < -300` (从左侧画外跑入) 或 `x > 2220` (从右侧画外跑入)。
- **出场**: 尾个 beat 的 `x < -300` (跑向左侧画外) 或 `x > 2220` (跑向右侧画外)。
- **可见范围**: 当 `t < track[0].t` 或 `t > track[last].t` 时，角色自动隐藏 (`visible: false`)。

---

### 3.2 挖挖 Track (Wawa)

```javascript
wawa: {
  visible: true,
  track: [
    { t: 36.0, action: 'walk', dx: -160, move: 'drive', expr: 'happy' },
    { t: 39.5, action: 'idle', dx: 0, move: 'none', expr: 'happy' },
    { t: 41.5, action: 'walk', dx: 160, move: 'drive', expr: 'happy' }
  ]
}
```

#### Beat 字段定义:
- `t`: 绝对秒。
- `action`: 挖挖动作名称 (在 `Actions` 注册，见 §4.2)。
  - 动作切换在 0.3s 窗口内对 FK 五通道 (`boom`, `stick`, `bucket`, `bob`, `squash`) 自动进行预备+过冲平滑插值。
- `dx`: 相对于基准位置 (1040) 的车身位移偏移。
- `move`: `'drive'` (机械路面起伏) | `'walk'` (大幅行驶摇晃) | `'none'`。
- `trackScroll`: 引擎按位移纯函数自动计算累计履带滚动距离与销钉旋转。
- `expr`: 挖挖面部表情 (`'happy'` | `'talk'` | `'focus'` | `'strain'` | `'surprise'` | `'proud'` | `'blow'`)。
- `look`: 视线方向 `[x, y]`。
- `scale`: 车身整体缩放 (默认 0.52)。
- `mirror`: 车身镜像朝向 (布尔值)。

---

## 4. 动作与姿势注册表规范 (Registries)

### 4.1 配角姿势注册表 (`Pup.registerPose`)

在 `pup.js` 中定义基础姿势并暴露注册接口：

```javascript
Pup.registerPose('wave', {
  torso: { y: 0, rot: -2, squash: 0 },
  head: { rot: 4 },
  armL: { rot: -120 }, // 前爪高高举起挥手
  armR: { rot: 0 },
  legL: { rot: 0 },
  legR: { rot: 0 },
  tail: { rot: 30 }
});
```

#### 关节定义键名与约定:
- `torso`: `{ y: number, rot: number, squash: number }` (y 单位 px, rot 顺时针度数, squash 压扁拉伸率)
- `head`: `{ rot: number }`
- `armL`: `{ rot: number }` (左爪/靠近观众前爪)
- `armR`: `{ rot: number }` (右爪/后爪)
- `legL`: `{ rot: number }` (左腿)
- `legR`: `{ rot: number }` (右腿)
- `tail`: `{ rot: number }` (尾巴)

---

### 4.2 挖挖动作注册表 (`Actions.registerAction`)

在 `actions.js` 中定义挖挖动作函数并暴露注册接口：

```javascript
Actions.registerAction('my_action', (lt) => {
  // lt: 镜头内局部时间 (t - shot.t0)
  return {
    boom: 47.5 + 5 * Math.sin(lt * 2),
    stick: -26 + 3 * Math.cos(lt * 2),
    bucket: -5,
    bob: 2 * Math.sin(lt * 4),
    squash: 0.02 * Math.sin(lt * 2)
  };
}, 2.0 /* 可选周期秒 */);
```

#### 通道范围与物理约束:
- `boom`: 大臂角度 (40° ~ 65°)
- `stick`: 斗杆角度 (-45° ~ -10°)
- `bucket`: 铲斗角度 (-45° ~ 50°)
- `bob`: 车身竖直浮动 (-8px ~ +8px)
- `squash`: 受力形变 (-0.12 ~ +0.12)

---

## 5. 通用特效注册表规范 (`Fx.register`)

在 `fx.js` 中注册特效渲染函数：

```javascript
Fx.register('speed_lines', (ctx, u, params, t) => {
  // ctx: 当前绘图上下文
  // u: 进度 (0.0 ~ 1.0)
  // params: shots.js 中传入的完整参数对象
  // t: 绝对秒
  const count = params.count || 8;
  ctx.save();
  ctx.strokeStyle = params.color || 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 4;
  for (let i = 0; i < count; i++) {
    // 确定性绘制
  }
  ctx.restore();
});
```

#### 渲染层级区分:
- **World 层** (`layer !== 'screen'`): 在世界坐标系内绘制，自动绑定摄像机矩阵与 1.00 主场景视差。
- **Screen 层** (`params.layer === 'screen'`): 在 1920×1080 屏幕像素坐标系内绘制，不受摄像机平移与缩放影响 (如冲击帧、画面边框特效)。

---

## 6. 离屏转场合成系统 (`Transitions.register`)

在 `transitions.js` 中注册双镜头合成函数：

```javascript
Transitions.register('star', (ctx, canvasA, canvasB, u, params) => {
  // canvasA: 上一镜头离屏画布
  // canvasB: 本镜头离屏画布
  // u: 切换进度 (0.0 ~ 1.0)
  ctx.drawImage(canvasA, 0, 0);
  ctx.save();
  // 建立五角星形剪裁路径并绘制 canvasB
  ctx.restore();
});
```

#### 内置转场列表:
1. `cut`: 中间点瞬切。
2. `dissolve`: 柔和全屏交叉叠化。
3. `iris`: 2D 经典圆形收放遮罩 (支持 `params.cx`, `params.cy`, `params.borderWidth`)。
4. `wipe`: 方向线性擦除 (支持 `params.dir: 'right'|'left'|'down'|'up'`)。
5. `whip`: 高速甩镜横向位移 + 动态多重曝光运动模糊。

---

## 7. 后期处理钩子 (Post-Processing Hooks)

在 `main.js` 渲染流水线中，内置了两个可选全局钩子，如未定义则安全静默跳过：

1. **全屏调色与暗角钩子 (`root.V12Grade`)**:
   ```javascript
   root.V12Grade = {
     apply(ctx, loc, t, cam) {
       // 在台词字幕之前执行，可按场景 loc 施加色温滤镜、暗角晕影、金色微光
     }
   };
   ```

2. **片头片尾大标题钩子 (`root.V12Titles`)**:
   ```javascript
   root.V12Titles = {
     draw(ctx, titleDef, t) {
       // 绘制富有动画质感的出入场艺术标题
     }
   };
   ```

---

## 8. 渲染流水线层级顺序 (Layer Hierarchy)

每帧画布自底向上的绘制层序严格固定为：

```
[底]
 1. 清屏 (1920×1080)
 2. 视差层 1: 天空 (Sky, depth = 0.05)
 3. 视差层 2: 远景山水 (Far, depth = 0.20)
 4. 视差层 3: 中景建筑与林木 (Mid, depth = 0.55)
 5. 主世界层 (Main World, depth = 1.00):
    - 地面与草皮 (Ground)
    - 挖掘凹坑 (Excavation Hole)
    - 挖挖挖掘机 (Wawa)
    - 派对长桌 (Party Table)
    - 场景交互道具 (Props)
    - World 层通用特效 (Fx layer = 'world')
    - 配角小狗 (Bluey & Bingo)
 6. 视差层 4: 前景遮挡草丛与花瓣 (Foreground, depth = 1.45)
 7. [如果是跨镜转场]: 执行 Transitions 离屏合成覆盖 1~6
 8. 屏幕层通用特效 (Fx layer = 'screen')
 9. 礼花彩带层 (Confetti)
10. 全屏调色与暗角 (V12Grade.apply)
11. 大标题层 (V12Titles.draw 或 drawTitle)
12. 角色配音台词字幕 (Subtitles, 最顶层深蓝圆角底框)
[顶]
```
