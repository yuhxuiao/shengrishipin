// shots.js — V11 导演版 34 镜全片时间轴谱系与演员调度 (总长 228.0s)
// 严格对齐: docs/剧本-v3-v11.md 与 output/v11/vo_durations.json
(function (root) {
  'use strict';

  const SHOTS = [
    // ==================== 幕 1: 生日早晨 (0.0 - 36.0s) · Yard ====================
    {
      id: 'S01', t0: 0.0, t1: 5.0, type: 'EWS', loc: 'yard',
      cam: { from: { x: 960, y: 540, zoom: 1.0 }, to: { x: 960, y: 540, zoom: 1.08 }, ease: 'outCubic' },
      title: { text: '开开的生日大冒险', sub: '蓝天下的两周岁特别企划', at: 0.5, dur: 4.2 },
      wawa: { visible: false },
      bluey: { visible: false },
      bingo: { visible: false },
    },
    {
      id: 'S02', t0: 5.0, t1: 11.0, type: 'WS', loc: 'yard',
      cam: { from: { x: 1200, y: 540, zoom: 1.0 }, to: { x: 960, y: 540, zoom: 1.0 }, ease: 'easeInOut' },
      wawa: { visible: true, action: 'walk', dxFrom: 460, dxTo: 0, expr: 'happy' },
      bluey: { visible: false },
      bingo: { visible: false },
    },
    {
      id: 'S03', t0: 11.0, t1: 17.0, type: 'MCU', loc: 'yard', // 打破第四面墙 1: 挖挖向开开问好
      cam: { from: { x: 960, y: 500, zoom: 1.25 }, to: { x: 960, y: 500, zoom: 1.30 }, ease: 'linear' },
      wawa: { visible: true, action: 'wave', dx: 0, expr: 'talk', look: [0, 0] },
      bluey: { visible: false },
      bingo: { visible: false },
    },
    {
      id: 'S04', t0: 17.0, t1: 22.0, type: 'MS', loc: 'yard',
      cam: { from: { x: 960, y: 520, zoom: 1.12 }, to: { x: 960, y: 520, zoom: 1.12 } },
      wawa: { visible: true, action: 'look_around', dx: 0, expr: 'anticipate' },
      bluey: { visible: false },
      bingo: { visible: false },
    },
    {
      id: 'S05', t0: 22.0, t1: 28.0, type: 'WS', loc: 'yard',
      cam: { from: { x: 880, y: 540, zoom: 1.10 }, to: { x: 960, y: 540, zoom: 1.0 }, ease: 'outCubic' },
      wawa: { visible: true, action: 'idle', dx: 0, expr: 'happy', look: [-0.4, 0.2] },
      bluey: { visible: true, enterAt: 22.2, x: 500, footY: 880, h: 420, pose: 'hop', facing: 1 },
      bingo: { visible: false },
    },
    {
      id: 'S06', t0: 28.0, t1: 36.0, type: 'MS', loc: 'yard',
      cam: { from: { x: 960, y: 540, zoom: 1.08 }, to: { x: 1040, y: 540, zoom: 1.08 }, ease: 'easeInOut' },
      wawa: { visible: true, action: 'nod', dx: 0, expr: 'surprise', look: [-0.4, 0.2] },
      bluey: { visible: true, x: 500, footY: 880, h: 420, pose: 'point', facing: 1 },
      props: { xmark_flash: { x: 1450, y: 860, isGolden: true, at: 28.5, dur: 1.2 } },
      bingo: { visible: false },
    },

    // ==================== 幕 2a: 线索 1 · 花园气球 (36.0 - 66.0s) · Garden ====================
    {
      id: 'S07', t0: 36.0, t1: 43.0, type: 'WS', loc: 'garden',
      cam: { from: { x: 750, y: 540, zoom: 1.0 }, to: { x: 1100, y: 540, zoom: 1.0 }, ease: 'linear' },
      wawa: { visible: true, action: 'walk', dxFrom: -160, dxTo: 160, expr: 'happy' },
      bluey: { visible: true, x: 440, footY: 880, h: 420, pose: 'run', facing: 1 },
      bingo: { visible: false },
    },
    {
      id: 'S08', t0: 43.0, t1: 48.0, type: 'MS', loc: 'garden',
      cam: { from: { x: 960, y: 530, zoom: 1.15 }, to: { x: 960, y: 530, zoom: 1.15 } },
      wawa: { visible: true, action: 'anticipate_dig', dx: 160, expr: 'focus', look: [-0.3, 0.4] },
      bluey: { visible: true, x: 460, footY: 880, h: 420, pose: 'point', facing: 1 },
      props: { xmark: { x: 740, y: 860, isGolden: false } },
      bingo: { visible: false },
    },
    {
      id: 'S09', t0: 48.0, t1: 54.0, type: 'CU', loc: 'garden',
      cam: { from: { x: 740, y: 640, zoom: 1.45 }, to: { x: 740, y: 640, zoom: 1.48 }, shake: { amt: 12, freq: 24 } },
      wawa: { visible: true, action: 'dig', dx: 160, expr: 'strain' },
      bluey: { visible: false },
      props: { dust: { x: 740, y: 860, at: 48.5, dur: 4.8 }, hole: { x: 740, y: 860, at: 48.5 } },
      bingo: { visible: false },
    },
    {
      id: 'S10', t0: 54.0, t1: 60.0, type: 'MCU', loc: 'garden',
      cam: { from: { x: 960, y: 520, zoom: 1.25 }, to: { x: 960, y: 460, zoom: 1.25 }, ease: 'outCubic' },
      wawa: { visible: true, action: 'reach_up', dx: 160, expr: 'surprise', look: [0, -0.4] },
      bluey: { visible: true, x: 460, footY: 880, h: 420, pose: 'cover_mouth', facing: 1 },
      props: {
        hole: { x: 740, y: 860, at: 48.5 },
        balloons_pop: { x: 740, y0: 860, y1: 380, at: 54.2, dur: 4.5 },
        stars: { x: 740, y: 860, at: 54.0, dur: 1.5 },
      },
      bingo: { visible: false },
    },
    {
      id: 'S11', t0: 60.0, t1: 66.0, type: 'WS', loc: 'garden', // 互动 1: 拍拍手
      cam: { from: { x: 960, y: 540, zoom: 1.05 }, to: { x: 960, y: 540, zoom: 1.05 } },
      wawa: { visible: true, action: 'wiggle', dx: 160, expr: 'laugh', look: [0, 0] },
      bluey: { visible: true, x: 460, footY: 880, h: 420, pose: 'dance', facing: 1 },
      props: { hole: { x: 740, y: 860, at: 48.5 }, balloons_tied: { x: 1480, y: 420 } },
      bingo: { visible: false },
    },

    // ==================== 幕 2b: 线索 2 · 沙坑派对帽 (66.0 - 98.0s) · Sandbox ====================
    {
      id: 'S12', t0: 66.0, t1: 72.0, type: 'WS', loc: 'sandbox',
      cam: { from: { x: 750, y: 540, zoom: 1.0 }, to: { x: 960, y: 540, zoom: 1.0 }, ease: 'linear' },
      wawa: { visible: true, action: 'walk', dxFrom: -160, dxTo: 140, expr: 'happy' },
      bluey: { visible: true, x: 440, footY: 880, h: 420, pose: 'run', facing: 1 },
      props: { xmark: { x: 740, y: 860, isGolden: false } },
      bingo: { visible: false },
    },
    {
      id: 'S13', t0: 72.0, t1: 78.0, type: 'MS', loc: 'sandbox', // 幽默意外: 挖出小鸭子
      cam: { from: { x: 920, y: 540, zoom: 1.15 }, to: { x: 920, y: 540, zoom: 1.15 } },
      wawa: { visible: true, action: 'dig', dx: 140, expr: 'focus' },
      bluey: { visible: true, x: 440, footY: 880, h: 420, pose: 'stand', facing: 1 },
      props: { duck_pop: { x: 740, y: 860, at: 72.8, dur: 4.5 }, hole: { x: 740, y: 860, at: 72.0 } },
      bingo: { visible: false },
    },
    {
      id: 'S14', t0: 78.0, t1: 85.0, type: 'MS', loc: 'sandbox',
      cam: { from: { x: 920, y: 540, zoom: 1.15 }, to: { x: 920, y: 540, zoom: 1.15 } },
      wawa: { visible: true, action: 'nod', dx: 140, expr: 'talk', look: [-0.3, 0.4] },
      bluey: { visible: true, x: 440, footY: 880, h: 420, pose: 'laugh', facing: 1 },
      props: {
        hole: { x: 740, y: 860, at: 72.0 },
        duck_pop: { x: 740, y: 860, at: 72.8, dur: 12.0 },
      },
      bingo: { visible: false },
    },
    {
      id: 'S15', t0: 85.0, t1: 91.0, type: 'MCU', loc: 'sandbox',
      cam: { from: { x: 960, y: 510, zoom: 1.25 }, to: { x: 960, y: 510, zoom: 1.30 }, ease: 'outCubic' },
      wawa: { visible: true, action: 'wiggle', dx: 140, expr: 'proud', hasHat: true },
      bluey: { visible: true, x: 440, footY: 880, h: 420, pose: 'dance', facing: 1 },
      props: { hole: { x: 740, y: 860, at: 72.0 }, duck_pop: { x: 740, y: 860, at: 72.8, dur: 18.0 } },
      bingo: { visible: false },
    },
    {
      id: 'S16', t0: 91.0, t1: 98.0, type: 'WS', loc: 'sandbox', // 宾果飞跃入场!
      cam: { from: { x: 960, y: 540, zoom: 1.02 }, to: { x: 960, y: 540, zoom: 1.02 } },
      wawa: { visible: true, action: 'wave', dx: 140, expr: 'happy', hasHat: true, look: [0.4, 0.1] },
      bluey: { visible: true, x: 440, footY: 880, h: 420, pose: 'clap', facing: 1 },
      bingo: { visible: true, enterAt: 91.5, x0: 1920, x1: 1480, footY: 880, h: 360, pose: 'hop', facing: -1 },
    },

    // ==================== 幕 2c: 线索 3 · 大树下骨头 (98.0 - 132.0s) · Big Tree ====================
    {
      id: 'S17', t0: 98.0, t1: 104.0, type: 'WS', loc: 'tree',
      cam: { from: { x: 960, y: 540, zoom: 1.05 }, to: { x: 960, y: 540, zoom: 1.05 } },
      wawa: { visible: true, action: 'reach_up', dx: 0, expr: 'happy', hasHat: true, look: [-0.3, 0.3] },
      bluey: { visible: true, x: 460, footY: 880, h: 420, pose: 'point', facing: 1 },
      bingo: { visible: true, x: 1480, footY: 880, h: 360, pose: 'hug_bone', facing: -1, item: 'bone' },
      props: { xmark: { x: 680, y: 860, isGolden: false } },
    },
    {
      id: 'S18', t0: 104.0, t1: 110.0, type: 'MS', loc: 'tree',
      cam: { from: { x: 800, y: 550, zoom: 1.15 }, to: { x: 800, y: 550, zoom: 1.15 } },
      wawa: { visible: true, action: 'dig', dx: -60, expr: 'strain', hasHat: true },
      bluey: { visible: true, x: 460, footY: 880, h: 420, pose: 'stand', facing: 1 },
      bingo: { visible: true, x: 1480, footY: 880, h: 360, pose: 'dance', facing: -1 },
      props: {
        hole: { x: 680, y: 860, at: 104.0 },
        bone_pop: { x: 680, y: 860, at: 105.0, dur: 4.5 },
        stars: { x: 680, y: 860, at: 105.2, dur: 1.5 },
      },
    },
    {
      id: 'S19', t0: 110.0, t1: 118.0, type: 'MS', loc: 'tree', // 宾果抱骨头
      cam: { from: { x: 750, y: 540, zoom: 1.15 }, to: { x: 820, y: 540, zoom: 1.15 }, ease: 'easeInOut' },
      wawa: { visible: true, action: 'lift', dx: -60, expr: 'laugh', hasHat: true },
      bluey: { visible: true, x: 460, footY: 880, h: 420, pose: 'cover_mouth', facing: 1 },
      bingo: { visible: true, x: 1480, footY: 880, h: 360, pose: 'hug_bone', facing: -1, item: 'bone' },
      props: { hole: { x: 680, y: 860, at: 104.0 } },
    },
    {
      id: 'S20', t0: 118.0, t1: 124.0, type: 'MCU', loc: 'tree', // 打破第四面墙 2: 挖挖对开开眨眼
      cam: { from: { x: 880, y: 510, zoom: 1.30 }, to: { x: 880, y: 510, zoom: 1.32 } },
      wawa: { visible: true, action: 'wave', dx: -60, expr: 'talk', hasHat: true, look: [0, 0] },
      bluey: { visible: false },
      bingo: { visible: true, x: 1480, footY: 880, h: 360, pose: 'hug_bone', item: 'bone', facing: -1 },
    },
    {
      id: 'S21', t0: 124.0, t1: 132.0, type: 'WS', loc: 'golden', // 金色大 X 显现!
      cam: { from: { x: 960, y: 540, zoom: 1.12 }, to: { x: 960, y: 540, zoom: 1.0 }, ease: 'outCubic' },
      wawa: { visible: true, action: 'cheer', dx: 0, expr: 'surprise', hasHat: true, look: [0.3, 0.2] },
      bluey: { visible: true, x: 480, footY: 880, h: 420, pose: 'dance', facing: 1 },
      bingo: { visible: true, x: 1500, footY: 880, h: 360, pose: 'cheer', facing: -1, item: 'bone' },
      props: { golden_x: { x: 720, y: 860, isGolden: true, at: 124.2 } },
    },

    // ==================== 幕 3: 大礼物破土 (132.0 - 172.0s) · Golden ====================
    {
      id: 'S22', t0: 132.0, t1: 137.0, type: 'MS', loc: 'golden', // 留白蓄压
      cam: { from: { x: 960, y: 540, zoom: 1.12 }, to: { x: 960, y: 540, zoom: 1.18 }, ease: 'easeInOut' },
      wawa: { visible: true, action: 'anticipate_dig', dx: 100, expr: 'focus', hasHat: true, look: [0.2, 0.4] },
      bluey: { visible: true, x: 480, footY: 880, h: 420, pose: 'clap', facing: 1 },
      bingo: { visible: true, x: 1500, footY: 880, h: 360, pose: 'cheer', facing: -1 },
      props: { golden_x: { x: 720, y: 860, isGolden: true } },
    },
    {
      id: 'S23', t0: 137.0, t1: 145.0, type: 'CU', loc: 'golden', // 互动 2: 给挖挖加油!
      cam: { from: { x: 740, y: 640, zoom: 1.45 }, to: { x: 740, y: 640, zoom: 1.48 }, shake: { amt: 14, freq: 24 } },
      wawa: { visible: true, action: 'dig', dx: 100, expr: 'strain', hasHat: true },
      bluey: { visible: false },
      bingo: { visible: false },
      props: {
        hole: { x: 720, y: 860, at: 137.0 },
        dust: { x: 720, y: 860, at: 137.2, dur: 7.2 },
        golden_x: { x: 720, y: 860, isGolden: true },
      },
    },
    {
      id: 'S24', t0: 145.0, t1: 151.0, type: 'MCU', loc: 'golden',
      cam: { from: { x: 840, y: 580, zoom: 1.25 }, to: { x: 840, y: 580, zoom: 1.35 }, ease: 'linear' },
      wawa: { visible: true, action: 'settle', dx: 100, expr: 'anticipate', hasHat: true, look: [0.3, 0.2] },
      bluey: { visible: true, x: 480, footY: 880, h: 420, pose: 'point', facing: 1 },
      bingo: { visible: true, x: 1500, footY: 880, h: 360, pose: 'dance', facing: -1 },
      props: { hole: { x: 720, y: 860, at: 137.0 }, gift_corner: { x: 720, y: 840, at: 145.5 } },
    },
    {
      id: 'S25', t0: 151.0, t1: 159.0, type: 'WS', loc: 'golden', // 慢动作升格礼物破土!
      cam: { from: { x: 960, y: 540, zoom: 1.0 }, to: { x: 960, y: 510, zoom: 1.05 } },
      wawa: { visible: true, action: 'cheer', dx: 100, expr: 'laugh', hasHat: true },
      bluey: { visible: true, x: 480, footY: 880, h: 420, pose: 'dance', facing: 1 },
      bingo: { visible: true, x: 1500, footY: 880, h: 360, pose: 'cheer', facing: -1 },
      props: {
        hole: { x: 720, y: 860, at: 137.0 },
        gift_pop: { x0: 720, y: 840, x1: 960, y1: 720, at: 151.2, dur: 7.5 },
        stars: { x: 720, y: 840, at: 151.4, dur: 2.0 },
        confetti: { at: 151.5, dur: 7.5 },
      },
    },
    {
      id: 'S26', t0: 159.0, t1: 166.0, type: 'MS', loc: 'golden',
      cam: { from: { x: 960, y: 540, zoom: 1.15 }, to: { x: 960, y: 540, zoom: 1.15 } },
      wawa: { visible: true, action: 'lower', dx: 100, expr: 'happy', hasHat: true },
      bluey: { visible: true, x: 480, footY: 880, h: 420, pose: 'clap', facing: 1 },
      bingo: { visible: true, x: 1500, footY: 880, h: 360, pose: 'hug_bone', item: 'bone', facing: -1 },
      props: { gift_landed: { x: 960, y: 820 }, glow: { x: 960, y: 820, r: 180, col: '#FFE57F' } },
    },
    {
      id: 'S27', t0: 166.0, t1: 172.0, type: 'MCU', loc: 'golden', // 打破第四面墙 3: 挖挖问开开喜不喜欢
      cam: { from: { x: 1040, y: 510, zoom: 1.28 }, to: { x: 1040, y: 510, zoom: 1.30 } },
      wawa: { visible: true, action: 'wave', dx: 100, expr: 'talk', hasHat: true, look: [0, 0] },
      bluey: { visible: false },
      bingo: { visible: false },
      props: { gift_landed: { x: 620, y: 820 } },
    },

    // ==================== 幕 4: 派对与祝福 (172.0 - 228.0s) · Party Table ====================
    {
      id: 'S28', t0: 172.0, t1: 179.0, type: 'WS', loc: 'party',
      cam: { from: { x: 800, y: 540, zoom: 1.0 }, to: { x: 1020, y: 540, zoom: 1.0 }, ease: 'linear' },
      wawa: { visible: true, action: 'walk', dxFrom: -160, dxTo: 120, expr: 'focus', hasHat: true, hasCake: true },
      bluey: { visible: true, x: 460, footY: 880, h: 420, pose: 'run', facing: 1 },
      bingo: { visible: true, x: 1520, footY: 880, h: 360, pose: 'run', facing: -1 },
    },
    {
      id: 'S29', t0: 179.0, t1: 186.0, type: 'MS', loc: 'party',
      cam: { from: { x: 960, y: 540, zoom: 1.15 }, to: { x: 960, y: 540, zoom: 1.15 } },
      wawa: { visible: true, action: 'settle', dx: 120, expr: 'happy', hasHat: true },
      bluey: { visible: true, x: 460, footY: 880, h: 420, pose: 'clap', facing: 1 },
      bingo: { visible: true, x: 1500, footY: 880, h: 360, pose: 'dance', facing: -1 },
      props: {
        cake_landed: { x: 960, y: 820 },
        candle_lit: { at: 179.6 },
        stars: { x: 960, y: 680, at: 179.6, dur: 1.8 },
      },
    },

    // ===== S30 精细化拆解 4 个组镜 (186.0 - 204.5s) =====
    {
      id: 'S30a', t0: 186.0, t1: 191.0, type: 'WS', loc: 'party', // 全景：三人卡点欢快摇摆
      cam: { from: { x: 960, y: 530, zoom: 1.10 }, to: { x: 960, y: 530, zoom: 1.15 }, ease: 'linear' },
      wawa: { visible: true, action: 'wiggle', dx: 120, expr: 'happy', hasHat: true },
      bluey: { visible: true, x: 460, footY: 880, h: 420, pose: 'clap', facing: 1 },
      bingo: { visible: true, x: 1500, footY: 880, h: 360, pose: 'dance', facing: -1 },
      props: { cake_landed: { x: 960, y: 820 }, candle_lit: true },
    },
    {
      id: 'S30b', t0: 191.0, t1: 195.5, type: 'CU', loc: 'party', // 特写：布鲁伊拍手大笑合唱 (单人特写)
      cam: { from: { x: 460, y: 720, zoom: 1.50 }, to: { x: 460, y: 720, zoom: 1.54 }, ease: 'linear' },
      wawa: { visible: false },
      bluey: { visible: true, x: 460, footY: 880, h: 460, pose: 'clap', facing: 1 },
      bingo: { visible: false },
      props: { cake_landed: { x: 960, y: 820 }, candle_lit: true },
    },
    {
      id: 'S30c', t0: 195.5, t1: 200.0, type: 'CU', loc: 'party', // 特写：宾果晃耳朵欢呼跳跃 (单人特写)
      cam: { from: { x: 1500, y: 720, zoom: 1.50 }, to: { x: 1500, y: 720, zoom: 1.54 }, ease: 'linear' },
      wawa: { visible: false },
      bluey: { visible: false },
      bingo: { visible: true, x: 1500, footY: 880, h: 400, pose: 'dance', facing: -1 },
      props: { cake_landed: { x: 960, y: 820 }, candle_lit: true },
    },
    {
      id: 'S30d', t0: 200.0, t1: 204.5, type: 'MCU', loc: 'party', // 中特写：挖挖微笑点头，眼里星光
      cam: { from: { x: 1040, y: 490, zoom: 1.34 }, to: { x: 1040, y: 490, zoom: 1.38 }, ease: 'linear' },
      wawa: { visible: true, action: 'nod', dx: 120, expr: 'proud', hasHat: true, look: [0, 0] },
      bluey: { visible: false },
      bingo: { visible: false },
      props: { cake_landed: { x: 960, y: 820 }, candle_lit: true },
    },

    // ===== S31 吹蜡烛核心镜头 (204.5 - 210.5s)：全员聚齐大特写 =====
    {
      id: 'S31', t0: 204.5, t1: 210.5, type: 'CU', loc: 'party', // 互动 3: 一起吹蜡烛! 黄金三角构图
      cam: { from: { x: 960, y: 640, zoom: 1.25 }, to: { x: 960, y: 640, zoom: 1.28 } },
      wawa: { visible: true, action: 'idle', dx: 0, expr: 'blow', hasHat: true, look: [0, 0.35] },
      bluey: { visible: true, x: 500, footY: 900, h: 440, pose: 'blow', facing: 1 },
      bingo: { visible: true, x: 1420, footY: 900, h: 380, pose: 'blow', facing: -1 },
      props: {
        cake_landed: { x: 960, y: 820 },
        candle_blow: { at: 206.0, dur: 4.5 },
      },
    },

    // ===== S32 - S34 尾声祝福 =====
    {
      id: 'S32', t0: 210.5, t1: 216.0, type: 'WS', loc: 'party', // 吹灭愿望成真, 欢呼纸屑雨
      cam: { from: { x: 960, y: 540, zoom: 1.15 }, to: { x: 960, y: 540, zoom: 1.0 }, ease: 'outCubic' },
      wawa: { visible: true, action: 'cheer', dx: 120, expr: 'laugh', hasHat: true },
      bluey: { visible: true, x: 480, footY: 880, h: 420, pose: 'dance', facing: 1 },
      bingo: { visible: true, x: 1480, footY: 880, h: 360, pose: 'cheer', facing: -1 },
      props: {
        cake_landed: { x: 960, y: 820 },
        candle_blown: true,
        confetti: { at: 210.6, dur: 5.4 },
      },
    },
    {
      id: 'S33', t0: 216.0, t1: 222.0, type: 'MCU', loc: 'party', // 打破第四面墙 4: 终极祝福
      cam: { from: { x: 960, y: 510, zoom: 1.25 }, to: { x: 960, y: 510, zoom: 1.28 } },
      wawa: { visible: true, action: 'wave', dx: 0, expr: 'talk', hasHat: true, look: [0, 0] },
      bluey: { visible: true, x: 480, footY: 880, h: 420, pose: 'clap', facing: 1 },
      bingo: { visible: true, x: 1480, footY: 880, h: 360, pose: 'dance', facing: -1 },
      props: { confetti: { at: 216.0, dur: 6.0 }, cake_landed: { x: 960, y: 820 }, candle_blown: true },
    },
    {
      id: 'S34', t0: 222.0, t1: 228.0, type: 'WS', loc: 'party', // 缓缓拉远, 定格祝福大字幕
      cam: { from: { x: 960, y: 510, zoom: 1.20 }, to: { x: 960, y: 540, zoom: 0.95 }, ease: 'easeInOut' },
      wawa: { visible: true, action: 'bow', dx: 0, expr: 'happy', hasHat: true, look: [0, 0] },
      bluey: { visible: true, x: 480, footY: 880, h: 420, pose: 'stand', facing: 1 },
      bingo: { visible: true, x: 1480, footY: 880, h: 360, pose: 'stand', facing: -1 },
      title: { text: '开开 2 岁生日快乐！', sub: '愿你每天都像挖土机一样充满活力！', at: 222.5, dur: 5.5 },
      props: { cake_landed: { x: 960, y: 820 }, candle_blown: true },
    }
  ];

  // 查表返回 t 时刻所属镜头
  function getShotAt(t) {
    t = Math.max(0, Math.min(228.0, t));
    for (const s of SHOTS) {
      if (t >= s.t0 && t <= s.t1) return s;
    }
    return SHOTS[SHOTS.length - 1];
  }

  root.V11Shots = {
    TOTAL: 228.0,
    SHOTS,
    getShotAt,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.V11Shots;
})(typeof globalThis !== 'undefined' ? globalThis : this);
