// shots.js — V12 导演与全片编排时间轴谱系与演员调度 (总长 228.0s / 6840 帧 @ 30fps)
// 严格对齐: docs/剧本-v3-v11.md 与 output/v11/vo_durations.json
// 遵循: V12 规范 A1-A10 验收契约, 全面升级 track/beats 动态微表演
(function (root) {
  'use strict';

  const SHOTS = [
    // ==================== 幕 1: 生日早晨 (0.0 - 36.0s) · Yard ====================
    {
      id: 'S01', t0: 0.0, t1: 5.0, type: 'EWS', loc: 'yard',
      cam: { from: { x: 960, y: 540, zoom: 1.0 }, to: { x: 960, y: 540, zoom: 1.08 }, ease: 'outCubic' },
      title: { text: '开开的生日大冒险', sub: '蓝天下的两周岁特别企划', at: 0.5, dur: 4.2, style: 'opening' },
      wawa: { visible: false },
      bluey: { visible: false },
      bingo: { visible: false },
      fx: [
        { type: 'sparkle_trail', at: 1.0, dur: 3.2, x: 960, y: 260, radius: 240, count: 22, layer: 'world' },
        { type: 'emote', at: 1.8, dur: 2.0, x: 960, y: 380, kind: 'sparkle', scale: 1.2, layer: 'world' },
      ],
    },
    {
      id: 'S02', t0: 5.0, t1: 11.0, type: 'WS', loc: 'yard',
      cam: { from: { x: 1200, y: 540, zoom: 1.0 }, to: { x: 960, y: 540, zoom: 1.0 }, ease: 'easeInOut' },
      wawa: {
        visible: true,
        track: [
          { t: 5.0, action: 'drive_in', dx: 1400, move: 'drive', expr: 'happy', ease: 'outCubic' },
          { t: 7.2, action: 'drive_in', dx: 300, move: 'drive', expr: 'happy', ease: 'outCubic' },
          { t: 8.8, action: 'bounce_happy', dx: 0, move: 'none', expr: 'proud', blend: 0.25 },
          { t: 10.2, action: 'wave', dx: 0, move: 'none', expr: 'happy', blend: 0.25, look: [0, 0] },
        ],
      },
      bluey: { visible: false },
      bingo: { visible: false },
      fx: [
        { type: 'drive_dust', at: 5.2, dur: 2.6, x: 1300, y: 920, dir: -1, scale: 1.2, layer: 'world' },
        { type: 'land_dust', at: 8.6, dur: 1.2, x: 1040, y: 940, dir: 0, scale: 1.4, layer: 'world' },
        { type: 'emote', at: 6.2, dur: 2.0, x: 1180, y: 640, kind: 'music', scale: 1.1, layer: 'world' },
      ],
    },
    {
      id: 'S03', t0: 11.0, t1: 17.0, type: 'MCU', loc: 'yard', // 打破第四面墙 1: 挖挖向开开问好
      transitionIn: { type: 'dissolve', dur: 0.5 },
      cam: { from: { x: 960, y: 500, zoom: 1.25 }, to: { x: 960, y: 500, zoom: 1.30 }, ease: 'linear' },
      wawa: {
        visible: true,
        track: [
          { t: 11.0, action: 'wave', dx: 0, expr: 'talk', look: [0, 0] },
          { t: 13.0, action: 'talk_bob', dx: 0, expr: 'talk', look: [0, -0.1] },
          { t: 14.8, action: 'bounce_happy', dx: 0, expr: 'laugh', look: [0, 0] },
          { t: 16.0, action: 'proud', dx: 0, expr: 'proud', look: [0, 0] },
        ],
      },
      bluey: { visible: false },
      bingo: { visible: false },
      fx: [
        { type: 'emote', at: 11.8, dur: 2.2, x: 960, y: 460, kind: 'sparkle', scale: 1.2, layer: 'world' },
        { type: 'heart_pop', at: 14.5, dur: 1.8, x: 960, y: 420, scale: 1.2, layer: 'world' },
      ],
    },
    {
      id: 'S04', t0: 17.0, t1: 22.0, type: 'MS', loc: 'yard',
      cam: { from: { x: 960, y: 520, zoom: 1.12 }, to: { x: 960, y: 520, zoom: 1.15 } },
      wawa: {
        visible: true,
        track: [
          { t: 17.0, action: 'look_around', dx: 0, expr: 'anticipate', look: [-0.4, 0.2] },
          { t: 19.0, action: 'turn_look', dx: 0, expr: 'focus', look: [0.4, 0.1] },
          { t: 20.8, action: 'wiggle', dx: 0, expr: 'anticipate', look: [0, 0] },
        ],
      },
      bluey: { visible: false },
      bingo: { visible: false },
      fx: [
        { type: 'emote', at: 17.8, dur: 1.8, x: 960, y: 520, kind: 'bulb', scale: 1.1, layer: 'world' },
      ],
    },
    {
      id: 'S05', t0: 22.0, t1: 28.0, type: 'WS', loc: 'yard',
      cam: { from: { x: 880, y: 540, zoom: 1.10 }, to: { x: 960, y: 540, zoom: 1.0 }, ease: 'outCubic' },
      wawa: {
        visible: true,
        track: [
          { t: 22.0, action: 'idle', dx: 0, expr: 'happy', look: [-0.4, 0.2] },
          { t: 24.2, action: 'wave', dx: 0, expr: 'talk', look: [-0.3, 0.1] },
          { t: 26.2, action: 'nod', dx: 0, expr: 'happy', look: [-0.3, 0.1] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 22.0, x: -300, pose: 'run', move: 'run', facing: 1, ease: 'outCubic' },
          { t: 23.4, x: 500, pose: 'land', move: 'none', facing: 1, blend: 0.22, expr: 'surprise' },
          { t: 24.2, x: 500, pose: 'wave', move: 'none', facing: 1, expr: 'happy', look: [0.4, 0] },
          { t: 25.8, x: 500, pose: 'jump_cheer', move: 'hop', facing: 1, expr: 'laugh' },
          { t: 27.2, x: 500, pose: 'dance', move: 'none', facing: 1, expr: 'happy' },
        ],
      },
      bingo: { visible: false },
      fx: [
        { type: 'land_dust', at: 23.35, dur: 0.9, x: 500, y: 920, dir: 1, scale: 1.3, layer: 'world' },
        { type: 'emote', at: 23.6, dur: 1.6, x: 500, y: 520, kind: 'exclamation', scale: 1.1, layer: 'world' },
      ],
    },
    {
      id: 'S06', t0: 28.0, t1: 36.0, type: 'MS', loc: 'yard',
      cam: { from: { x: 960, y: 540, zoom: 1.08 }, to: { x: 1040, y: 540, zoom: 1.08 }, ease: 'easeInOut' },
      wawa: {
        visible: true,
        track: [
          { t: 28.0, action: 'peek', dx: 0, expr: 'anticipate', look: [-0.4, 0.2] },
          { t: 30.2, action: 'nod', dx: 0, expr: 'surprise', look: [-0.4, 0.2] },
          { t: 32.0, action: 'proud', dx: 0, expr: 'talk', look: [0, 0] },
          { t: 34.2, action: 'bounce_happy', dx: 0, expr: 'laugh', look: [0.4, 0] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 28.0, x: 500, pose: 'tiptoe', move: 'tiptoe', facing: 1, expr: 'focus' },
          { t: 29.8, x: 520, pose: 'whisper', move: 'none', facing: 1, expr: 'anticipate', look: [0.3, 0] },
          { t: 31.8, x: 520, pose: 'point', move: 'none', facing: 1, expr: 'happy', look: [1, 0] },
          { t: 33.6, x: 520, pose: 'run', move: 'run', facing: 1 },
          { t: 35.8, x: 2250, pose: 'run', move: 'run', facing: 1, ease: 'linear' },
        ],
      },
      bingo: { visible: false },
      props: { xmark_flash: { x: 1450, y: 860, isGolden: true, at: 28.5, dur: 1.2 } },
      fx: [
        { type: 'sparkle_trail', at: 28.5, dur: 2.2, x: 1450, y: 860, count: 18, radius: 140, layer: 'world' },
        { type: 'xmark', at: 28.5, dur: 7.0, x: 1450, y: 860, isGolden: true, layer: 'world' },
        { type: 'drive_dust', at: 34.0, dur: 1.8, x: 600, y: 920, dir: 1, scale: 1.1, layer: 'world' },
      ],
    },

    // ==================== 幕 2a: 线索 1 · 花园气球 (36.0 - 66.0s) · Garden ====================
    {
      id: 'S07', t0: 36.0, t1: 43.0, type: 'WS', loc: 'garden',
      transitionIn: { type: 'iris', dur: 0.6, cx: 960, cy: 540 },
      cam: { from: { x: 750, y: 540, zoom: 1.0 }, to: { x: 1100, y: 540, zoom: 1.0 }, ease: 'linear' },
      wawa: {
        visible: true,
        track: [
          { t: 36.0, action: 'drive_in', dx: -160, move: 'drive', expr: 'happy' },
          { t: 38.5, action: 'turn_look', dx: 0, move: 'none', expr: 'anticipate', look: [0.3, 0.2] },
          { t: 40.8, action: 'drive_out', dx: 160, move: 'drive', expr: 'happy' },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 36.0, x: -280, pose: 'run', move: 'run', facing: 1, ease: 'linear' },
          { t: 38.2, x: 440, pose: 'run', move: 'run', facing: 1 },
          { t: 40.5, x: 1020, pose: 'hop', move: 'hop', facing: 1, expr: 'happy' },
          { t: 42.8, x: 2260, pose: 'run', move: 'run', facing: 1 },
        ],
      },
      bingo: { visible: false },
      fx: [
        { type: 'drive_dust', at: 36.5, dur: 2.0, x: 300, y: 920, dir: 1, scale: 1.0, layer: 'world' },
        { type: 'drive_dust', at: 41.0, dur: 2.0, x: 1000, y: 920, dir: 1, scale: 1.0, layer: 'world' },
      ],
    },
    {
      id: 'S08', t0: 43.0, t1: 48.0, type: 'MS', loc: 'garden',
      cam: { from: { x: 960, y: 530, zoom: 1.15 }, to: { x: 960, y: 530, zoom: 1.15 } },
      wawa: {
        visible: true,
        track: [
          { t: 43.0, action: 'idle', dx: 160, expr: 'happy', look: [-0.3, 0.4] },
          { t: 44.5, action: 'anticipate_dig', dx: 160, expr: 'focus', look: [-0.3, 0.4] },
          { t: 46.5, action: 'nod', dx: 160, expr: 'focus', look: [-0.3, 0.4] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 43.0, x: -260, pose: 'run', move: 'run', facing: 1, ease: 'outCubic' },
          { t: 44.2, x: 460, pose: 'land', move: 'none', facing: 1, expr: 'surprise' },
          { t: 45.0, x: 460, pose: 'point', move: 'none', facing: 1, expr: 'anticipate', look: [1, 0.2] },
          { t: 46.5, x: 460, pose: 'clap', move: 'none', facing: 1, expr: 'laugh' },
        ],
      },
      props: { xmark: { x: 740, y: 860, isGolden: false } },
      bingo: { visible: false },
      fx: [
        { type: 'land_dust', at: 44.15, dur: 0.8, x: 460, y: 920, scale: 1.2, layer: 'world' },
        { type: 'emote', at: 44.3, dur: 1.8, x: 460, y: 500, kind: 'exclamation', scale: 1.2, layer: 'world' },
        { type: 'xmark', at: 43.0, dur: 5.0, x: 740, y: 860, isGolden: false, layer: 'world' },
      ],
    },
    {
      id: 'S09', t0: 48.0, t1: 54.0, type: 'CU', loc: 'garden',
      cam: { from: { x: 740, y: 640, zoom: 1.45 }, to: { x: 740, y: 640, zoom: 1.48 }, shake: { amt: 12, freq: 24 } },
      wawa: {
        visible: true,
        track: [
          { t: 48.0, action: 'anticipate_dig', dx: 160, expr: 'focus' },
          { t: 49.0, action: 'dig', dx: 160, expr: 'strain' },
          { t: 51.5, action: 'lift', dx: 160, expr: 'strain' },
          { t: 53.0, action: 'sneeze_or_shake', dx: 160, expr: 'happy' },
        ],
      },
      bluey: { visible: false },
      bingo: { visible: false },
      props: { dust: { x: 740, y: 860, at: 48.5, dur: 4.8 }, hole: { x: 740, y: 860, at: 48.5 } },
      fx: [
        { type: 'smear', at: 48.8, dur: 0.6, x: 740, y: 800, r: 180, startAngle: -0.8, endAngle: 1.2, layer: 'world' },
        { type: 'dirt_chunks', at: 49.2, dur: 2.2, x: 740, y: 860, count: 10, dir: -1, power: 1.2, layer: 'world' },
        { type: 'dust', at: 48.5, dur: 4.8, x: 740, y: 860, layer: 'world' },
      ],
    },
    {
      id: 'S10', t0: 54.0, t1: 60.0, type: 'MCU', loc: 'garden',
      cam: { from: { x: 960, y: 520, zoom: 1.25 }, to: { x: 960, y: 460, zoom: 1.25 }, ease: 'outCubic' },
      wawa: {
        visible: true,
        track: [
          { t: 54.0, action: 'lift', dx: 160, expr: 'surprise', look: [0, -0.4] },
          { t: 55.2, action: 'reach_up', dx: 160, expr: 'surprise', look: [0, -0.4] },
          { t: 57.5, action: 'cheer', dx: 160, expr: 'happy', look: [0, 0] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 54.0, x: 460, pose: 'cover_mouth', move: 'none', facing: 1, expr: 'surprise', look: [0, -0.3] },
          { t: 55.8, x: 460, pose: 'look_up', move: 'none', facing: 1, expr: 'happy', look: [0, -0.8] },
          { t: 57.5, x: 460, pose: 'jump_cheer', move: 'hop', facing: 1, expr: 'laugh' },
          { t: 59.0, x: 460, pose: 'dance', move: 'none', facing: 1, expr: 'happy' },
        ],
      },
      props: {
        hole: { x: 740, y: 860, at: 48.5 },
        balloons_pop: { x: 740, y0: 860, y1: 380, at: 54.2, dur: 4.5 },
        stars: { x: 740, y: 860, at: 54.0, dur: 1.5 },
      },
      bingo: { visible: false },
      fx: [
        { type: 'impact_burst', at: 54.2, dur: 1.5, x: 740, y: 840, r: 240, spikeCount: 12, color: '#FF7096', flash: true, layer: 'world' },
        { type: 'stars', at: 54.0, dur: 2.0, x: 740, y: 860, layer: 'world' },
        { type: 'emote', at: 54.8, dur: 2.2, x: 460, y: 480, kind: 'sparkle', scale: 1.2, layer: 'world' },
      ],
    },
    {
      id: 'S11', t0: 60.0, t1: 66.0, type: 'WS', loc: 'garden', // 互动 1: 拍拍手
      cam: { from: { x: 960, y: 540, zoom: 1.05 }, to: { x: 960, y: 540, zoom: 1.05 } },
      wawa: {
        visible: true,
        track: [
          { t: 60.0, action: 'talk_bob', dx: 160, expr: 'happy', look: [0, 0] },
          { t: 61.8, action: 'wiggle', dx: 160, expr: 'laugh', look: [0, 0] },
          { t: 64.0, action: 'cheer', dx: 160, expr: 'happy', look: [0, 0] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 60.0, x: 460, pose: 'clap_overhead', move: 'none', facing: 1, expr: 'happy' },
          { t: 62.0, x: 460, pose: 'clap', move: 'none', facing: 1, expr: 'laugh' },
          { t: 64.2, x: 460, pose: 'dance2', move: 'none', facing: 1, expr: 'laugh' },
        ],
      },
      props: { hole: { x: 740, y: 860, at: 48.5 }, balloons_tied: { x: 1480, y: 420 } },
      bingo: { visible: false },
      fx: [
        { type: 'music_notes', at: 60.8, dur: 4.5, x: 960, y: 500, count: 8, spreadX: 280, spreadY: 220, layer: 'world' },
        { type: 'emote', at: 61.5, dur: 2.0, x: 460, y: 480, kind: 'music', scale: 1.2, layer: 'world' },
      ],
    },

    // ==================== 幕 2b: 线索 2 · 沙坑派对帽 (66.0 - 98.0s) · Sandbox ====================
    {
      id: 'S12', t0: 66.0, t1: 72.0, type: 'WS', loc: 'sandbox',
      transitionIn: { type: 'push', dir: 'left', dur: 0.7 },
      cam: { from: { x: 750, y: 540, zoom: 1.0 }, to: { x: 960, y: 540, zoom: 1.0 }, ease: 'linear' },
      wawa: {
        visible: true,
        track: [
          { t: 66.0, action: 'drive_in', dx: -260, move: 'drive', expr: 'happy', ease: 'outCubic' },
          { t: 68.2, action: 'drive_in', dx: 140, move: 'drive', expr: 'happy', ease: 'outCubic' },
          { t: 70.0, action: 'turn_look', dx: 140, move: 'none', expr: 'anticipate', look: [-0.3, 0.4] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 66.0, x: -280, pose: 'run', move: 'run', facing: 1, ease: 'outCubic' },
          { t: 67.8, x: 440, pose: 'land', move: 'none', facing: 1, expr: 'happy' },
          { t: 69.0, x: 440, pose: 'point', move: 'none', facing: 1, expr: 'anticipate', look: [1, 0.2] },
          { t: 70.8, x: 440, pose: 'clap', move: 'none', facing: 1, expr: 'happy' },
        ],
      },
      props: { xmark: { x: 740, y: 860, isGolden: false } },
      bingo: { visible: false },
      fx: [
        { type: 'drive_dust', at: 66.8, dur: 2.2, x: 400, y: 920, dir: 1, scale: 1.1, layer: 'world' },
        { type: 'land_dust', at: 67.7, dur: 0.9, x: 440, y: 920, scale: 1.2, layer: 'world' },
        { type: 'xmark', at: 66.0, dur: 6.0, x: 740, y: 860, isGolden: false, layer: 'world' },
      ],
    },
    {
      id: 'S13', t0: 72.0, t1: 78.0, type: 'MS', loc: 'sandbox', // 幽默意外: 挖出小鸭子
      cam: { from: { x: 920, y: 540, zoom: 1.15 }, to: { x: 920, y: 540, zoom: 1.15 } },
      wawa: {
        visible: true,
        track: [
          { t: 72.0, action: 'dig', dx: 140, expr: 'focus' },
          { t: 73.8, action: 'lift', dx: 140, expr: 'surprise', look: [-0.3, 0.4] },
          { t: 75.5, action: 'turn_look', dx: 140, expr: 'talk', look: [0, 0] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 72.0, x: 440, pose: 'peek', move: 'none', facing: 1, expr: 'focus', look: [1, 0.3] },
          { t: 73.8, x: 440, pose: 'cover_mouth', move: 'none', facing: 1, expr: 'surprise' },
          { t: 75.5, x: 440, pose: 'laugh', move: 'none', facing: 1, expr: 'laugh' },
        ],
      },
      props: { duck_pop: { x: 740, y: 860, at: 72.8, dur: 4.5 }, hole: { x: 740, y: 860, at: 72.0 } },
      bingo: { visible: false },
      fx: [
        { type: 'smear', at: 72.5, dur: 0.5, x: 740, y: 820, r: 160, layer: 'world' },
        { type: 'dirt_chunks', at: 72.8, dur: 2.0, x: 740, y: 860, count: 8, dir: 1, power: 1.0, layer: 'world' },
        { type: 'emote', at: 74.0, dur: 2.0, x: 960, y: 500, kind: 'question', scale: 1.3, layer: 'world' },
        { type: 'emote', at: 74.5, dur: 1.8, x: 1040, y: 520, kind: 'sweat', scale: 1.0, layer: 'world' },
      ],
    },
    {
      id: 'S14', t0: 78.0, t1: 85.0, type: 'MS', loc: 'sandbox',
      cam: { from: { x: 920, y: 540, zoom: 1.15 }, to: { x: 920, y: 540, zoom: 1.15 } },
      wawa: {
        visible: true,
        track: [
          { t: 78.0, action: 'nod', dx: 140, expr: 'talk', look: [-0.3, 0.4] },
          { t: 79.5, action: 'anticipate_dig', dx: 140, expr: 'focus' },
          { t: 81.0, action: 'dig', dx: 140, expr: 'strain' },
          { t: 83.2, action: 'lift', dx: 140, expr: 'laugh' },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 78.0, x: 440, pose: 'clap', move: 'none', facing: 1, expr: 'happy' },
          { t: 80.0, x: 440, pose: 'cheer', move: 'none', facing: 1, expr: 'anticipate' },
          { t: 82.0, x: 440, pose: 'jump_cheer', move: 'hop', facing: 1, expr: 'laugh' },
          { t: 83.8, x: 440, pose: 'dance', move: 'none', facing: 1, expr: 'laugh' },
        ],
      },
      props: {
        hole: { x: 740, y: 860, at: 72.0 },
        duck_pop: { x: 740, y: 860, at: 72.8, dur: 12.0 },
      },
      bingo: { visible: false },
      fx: [
        { type: 'dirt_chunks', at: 81.4, dur: 2.2, x: 740, y: 860, count: 12, dir: -1, power: 1.3, layer: 'world' },
        { type: 'impact_burst', at: 81.8, dur: 1.2, x: 740, y: 840, r: 220, spikeCount: 10, color: '#FFE082', flash: false, layer: 'world' },
        { type: 'shine_ring', at: 83.2, dur: 1.5, x: 740, y: 780, maxR: 200, layer: 'world' },
      ],
    },
    {
      id: 'S15', t0: 85.0, t1: 91.0, type: 'MCU', loc: 'sandbox',
      cam: { from: { x: 960, y: 510, zoom: 1.25 }, to: { x: 960, y: 510, zoom: 1.30 }, ease: 'outCubic' },
      wawa: {
        visible: true,
        track: [
          { t: 85.0, action: 'wiggle', dx: 140, expr: 'proud', hasHat: true, look: [0, 0] },
          { t: 87.0, action: 'bounce_happy', dx: 140, expr: 'laugh', hasHat: true, look: [0, 0] },
          { t: 89.2, action: 'proud', dx: 140, expr: 'proud', hasHat: true, look: [0, 0] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 85.0, x: 440, pose: 'dance', move: 'none', facing: 1, expr: 'happy' },
          { t: 87.2, x: 440, pose: 'clap_overhead', move: 'none', facing: 1, expr: 'laugh' },
          { t: 89.2, x: 440, pose: 'wave', move: 'none', facing: 1, expr: 'happy' },
        ],
      },
      props: { hole: { x: 740, y: 860, at: 72.0 }, duck_pop: { x: 740, y: 860, at: 72.8, dur: 18.0 } },
      bingo: { visible: false },
      fx: [
        { type: 'sparkle_trail', at: 85.2, dur: 2.5, x: 960, y: 440, radius: 180, count: 20, layer: 'world' },
        { type: 'emote', at: 86.0, dur: 2.0, x: 960, y: 380, kind: 'sparkle', scale: 1.3, layer: 'world' },
      ],
    },
    {
      id: 'S16', t0: 91.0, t1: 98.0, type: 'WS', loc: 'sandbox', // 宾果飞跃入场!
      cam: { from: { x: 960, y: 540, zoom: 1.02 }, to: { x: 960, y: 540, zoom: 1.02 } },
      wawa: {
        visible: true,
        track: [
          { t: 91.0, action: 'wave', dx: 140, expr: 'happy', hasHat: true, look: [0.4, 0.1] },
          { t: 93.5, action: 'bounce_happy', dx: 140, expr: 'laugh', hasHat: true, look: [0.4, 0.1] },
          { t: 95.8, action: 'cheer', dx: 140, expr: 'happy', hasHat: true, look: [0.4, 0.1] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 91.0, x: 440, pose: 'clap', move: 'none', facing: 1, expr: 'happy', look: [0.4, 0] },
          { t: 93.0, x: 440, pose: 'jump_cheer', move: 'hop', facing: 1, expr: 'laugh' },
          { t: 95.5, x: 440, pose: 'dance', move: 'none', facing: 1, expr: 'happy' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 91.0, x: 2260, pose: 'run', move: 'run', facing: -1, ease: 'outCubic' },
          { t: 92.4, x: 1480, pose: 'land', move: 'none', facing: -1, expr: 'surprise' },
          { t: 93.4, x: 1480, pose: 'jump_cheer', move: 'hop', facing: -1, expr: 'laugh' },
          { t: 95.5, x: 1480, pose: 'dance', move: 'none', facing: -1, expr: 'happy' },
        ],
      },
      fx: [
        { type: 'speed_lines', at: 91.2, dur: 1.2, x: 1600, y: 540, count: 12, layer: 'world' },
        { type: 'land_dust', at: 92.35, dur: 1.0, x: 1480, y: 920, scale: 1.4, layer: 'world' },
        { type: 'emote', at: 92.6, dur: 1.8, x: 1480, y: 520, kind: 'exclamation', scale: 1.2, layer: 'world' },
      ],
    },

    // ==================== 幕 2c: 线索 3 · 大树下骨头 (98.0 - 132.0s) · Big Tree ====================
    {
      id: 'S17', t0: 98.0, t1: 104.0, type: 'WS', loc: 'tree',
      transitionIn: { type: 'wipe', dir: 'right', dur: 0.6 },
      cam: { from: { x: 960, y: 540, zoom: 1.05 }, to: { x: 960, y: 540, zoom: 1.05 } },
      wawa: {
        visible: true,
        track: [
          { t: 98.0, action: 'drive_in', dx: -60, move: 'drive', expr: 'happy', hasHat: true },
          { t: 100.2, action: 'reach_up', dx: -60, move: 'none', expr: 'happy', hasHat: true, look: [-0.3, 0.3] },
          { t: 102.2, action: 'nod', dx: -60, move: 'none', expr: 'talk', hasHat: true, look: [0.3, 0.1] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 98.0, x: 460, pose: 'point', move: 'none', facing: 1, expr: 'anticipate', look: [1, 0.2] },
          { t: 100.0, x: 460, pose: 'clap', move: 'none', facing: 1, expr: 'happy' },
          { t: 102.0, x: 460, pose: 'dance', move: 'none', facing: 1, expr: 'happy' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 98.0, x: 1480, pose: 'tiptoe', move: 'tiptoe', facing: -1, expr: 'anticipate' },
          { t: 100.0, x: 1480, pose: 'jump_cheer', move: 'hop', facing: -1, expr: 'laugh' },
          { t: 102.0, x: 1480, pose: 'clap_overhead', move: 'none', facing: -1, expr: 'laugh' },
        ],
      },
      props: { xmark: { x: 680, y: 860, isGolden: false } },
      fx: [
        { type: 'emote', at: 99.2, dur: 1.8, x: 1480, y: 520, kind: 'sparkle', scale: 1.1, layer: 'world' },
        { type: 'xmark', at: 98.0, dur: 6.0, x: 680, y: 860, isGolden: false, layer: 'world' },
      ],
    },
    {
      id: 'S18', t0: 104.0, t1: 110.0, type: 'MS', loc: 'tree',
      cam: { from: { x: 800, y: 550, zoom: 1.15 }, to: { x: 800, y: 550, zoom: 1.15 } },
      wawa: {
        visible: true,
        track: [
          { t: 104.0, action: 'anticipate_dig', dx: -60, expr: 'focus', hasHat: true },
          { t: 105.2, action: 'dig', dx: -60, expr: 'strain', hasHat: true },
          { t: 107.5, action: 'lift', dx: -60, expr: 'laugh', hasHat: true },
          { t: 109.0, action: 'proud', dx: -60, expr: 'proud', hasHat: true },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 104.0, x: 460, pose: 'stand', move: 'none', facing: 1, expr: 'focus' },
          { t: 106.0, x: 460, pose: 'cover_mouth', move: 'none', facing: 1, expr: 'surprise' },
          { t: 108.2, x: 460, pose: 'cheer', move: 'none', facing: 1, expr: 'laugh' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 104.0, x: 1480, pose: 'dance', move: 'none', facing: -1, expr: 'anticipate' },
          { t: 106.2, x: 1480, pose: 'spin', move: 'none', facing: -1, expr: 'laugh' },
          { t: 108.2, x: 1480, pose: 'jump_cheer', move: 'hop', facing: -1, expr: 'laugh' },
        ],
      },
      props: {
        hole: { x: 680, y: 860, at: 104.0 },
        bone_pop: { x: 680, y: 860, at: 105.0, dur: 4.5 },
        stars: { x: 680, y: 860, at: 105.2, dur: 1.5 },
      },
      fx: [
        { type: 'dirt_chunks', at: 105.4, dur: 2.0, x: 680, y: 860, count: 10, dir: 1, power: 1.1, layer: 'world' },
        { type: 'impact_burst', at: 105.0, dur: 1.2, x: 680, y: 840, r: 200, spikeCount: 8, color: '#FFFFFF', layer: 'world' },
        { type: 'stars', at: 105.2, dur: 1.5, x: 680, y: 860, layer: 'world' },
        { type: 'shine_ring', at: 105.0, dur: 1.5, x: 680, y: 800, maxR: 200, layer: 'world' },
      ],
    },
    {
      id: 'S19', t0: 110.0, t1: 118.0, type: 'MS', loc: 'tree', // 宾果抱骨头
      cam: { from: { x: 750, y: 540, zoom: 1.15 }, to: { x: 820, y: 540, zoom: 1.15 }, ease: 'easeInOut' },
      wawa: {
        visible: true,
        track: [
          { t: 110.0, action: 'lift', dx: -60, expr: 'laugh', hasHat: true, look: [0.4, 0] },
          { t: 112.5, action: 'wiggle', dx: -60, expr: 'happy', hasHat: true, look: [0.4, 0] },
          { t: 115.0, action: 'cheer', dx: -60, expr: 'happy', hasHat: true, look: [0.4, 0] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 110.0, x: 460, pose: 'cover_mouth', move: 'none', facing: 1, expr: 'laugh', look: [0.4, 0] },
          { t: 112.5, x: 460, pose: 'clap', move: 'none', facing: 1, expr: 'laugh', look: [0.4, 0] },
          { t: 115.5, x: 460, pose: 'dance', move: 'none', facing: 1, expr: 'happy' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 110.0, x: 1480, pose: 'hug_bone', move: 'none', facing: -1, item: 'bone', expr: 'happy' },
          { t: 112.5, x: 1480, pose: 'hug_bone', move: 'none', facing: -1, item: 'bone', expr: 'laugh' },
          { t: 115.2, x: 1480, pose: 'jump_cheer', move: 'hop', facing: -1, item: 'bone', expr: 'laugh' },
        ],
      },
      props: { hole: { x: 680, y: 860, at: 104.0 } },
      fx: [
        { type: 'heart_pop', at: 111.5, dur: 2.0, x: 1480, y: 520, scale: 1.3, layer: 'world' },
        { type: 'emote', at: 113.0, dur: 2.0, x: 1480, y: 480, kind: 'sparkle', scale: 1.2, layer: 'world' },
      ],
    },
    {
      id: 'S20', t0: 118.0, t1: 124.0, type: 'MCU', loc: 'tree', // 打破第四面墙 2: 挖挖对开开眨眼
      cam: { from: { x: 880, y: 510, zoom: 1.30 }, to: { x: 880, y: 510, zoom: 1.32 } },
      wawa: {
        visible: true,
        track: [
          { t: 118.0, action: 'wave', dx: -60, expr: 'talk', hasHat: true, look: [0, 0] },
          { t: 120.0, action: 'talk_bob', dx: -60, expr: 'talk', hasHat: true, look: [0, 0] },
          { t: 122.2, action: 'turn_look', dx: -60, expr: 'proud', hasHat: true, look: [0.3, 0] },
        ],
      },
      bluey: { visible: false },
      bingo: {
        visible: true,
        track: [
          { t: 118.0, x: 1480, pose: 'hug_bone', move: 'none', item: 'bone', facing: -1, expr: 'happy' },
          { t: 120.2, x: 1480, pose: 'sit', move: 'none', item: 'bone', facing: -1, expr: 'happy' },
          { t: 122.5, x: 1480, pose: 'hug_bone', move: 'none', item: 'bone', facing: -1, expr: 'happy' },
        ],
      },
      fx: [
        { type: 'emote', at: 119.2, dur: 2.0, x: 880, y: 460, kind: 'bulb', scale: 1.2, layer: 'world' },
      ],
    },
    {
      id: 'S21', t0: 124.0, t1: 132.0, type: 'WS', loc: 'golden', // 金色大 X 显现!
      transitionIn: { type: 'star_wipe', dur: 0.8, cx: 960, cy: 540 },
      cam: { from: { x: 960, y: 540, zoom: 1.12 }, to: { x: 960, y: 540, zoom: 1.0 }, ease: 'outCubic' },
      wawa: {
        visible: true,
        track: [
          { t: 124.0, action: 'turn_look', dx: 0, expr: 'surprise', hasHat: true, look: [-0.4, 0.3] },
          { t: 126.0, action: 'bounce_happy', dx: 0, expr: 'laugh', hasHat: true, look: [-0.4, 0.3] },
          { t: 128.5, action: 'cheer', dx: 0, expr: 'happy', hasHat: true, look: [0, 0] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 124.0, x: -280, pose: 'run', move: 'run', facing: 1, ease: 'outCubic' },
          { t: 125.6, x: 480, pose: 'land', move: 'none', facing: 1, expr: 'surprise' },
          { t: 126.8, x: 480, pose: 'point', move: 'none', facing: 1, expr: 'laugh', look: [1, 0.2] },
          { t: 129.2, x: 480, pose: 'jump_cheer', move: 'hop', facing: 1, expr: 'laugh' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 124.0, x: 1500, pose: 'cheer', move: 'none', facing: -1, item: 'bone', expr: 'laugh' },
          { t: 126.5, x: 1500, pose: 'dance2', move: 'none', facing: -1, item: 'bone', expr: 'happy' },
          { t: 129.5, x: 1500, pose: 'jump_cheer', move: 'hop', facing: -1, item: 'bone', expr: 'laugh' },
        ],
      },
      props: { golden_x: { x: 720, y: 860, isGolden: true, at: 124.2 } },
      fx: [
        { type: 'land_dust', at: 125.5, dur: 0.8, x: 480, y: 920, scale: 1.2, layer: 'world' },
        { type: 'sparkle_trail', at: 124.5, dur: 6.0, x: 720, y: 860, radius: 220, count: 24, layer: 'world' },
        { type: 'shine_ring', at: 124.6, dur: 2.0, x: 720, y: 860, maxR: 260, layer: 'world' },
      ],
    },

    // ==================== 幕 3: 大礼物破土 (132.0 - 172.0s) · Golden ====================
    {
      id: 'S22', t0: 132.0, t1: 137.0, type: 'MS', loc: 'golden', // 留白蓄压
      cam: { from: { x: 960, y: 540, zoom: 1.12 }, to: { x: 960, y: 540, zoom: 1.18 }, ease: 'easeInOut' },
      wawa: {
        visible: true,
        track: [
          { t: 132.0, action: 'peek', dx: 100, expr: 'focus', hasHat: true, look: [-0.3, 0.4] },
          { t: 134.0, action: 'anticipate_dig', dx: 100, expr: 'focus', hasHat: true, look: [-0.3, 0.4] },
          { t: 135.8, action: 'nod', dx: 100, expr: 'strain', hasHat: true, look: [-0.3, 0.4] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 132.0, x: 480, pose: 'clap', move: 'none', facing: 1, expr: 'anticipate' },
          { t: 134.0, x: 480, pose: 'crouch_anticipate', move: 'none', facing: 1, expr: 'focus' },
          { t: 135.8, x: 480, pose: 'cheer', move: 'none', facing: 1, expr: 'anticipate' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 132.0, x: 1500, pose: 'tiptoe', move: 'tiptoe', facing: -1, expr: 'focus' },
          { t: 134.0, x: 1500, pose: 'crouch_anticipate', move: 'none', facing: -1, expr: 'focus' },
          { t: 135.8, x: 1500, pose: 'cheer', move: 'none', facing: -1, expr: 'anticipate' },
        ],
      },
      props: { golden_x: { x: 720, y: 860, isGolden: true } },
      fx: [
        { type: 'ground_crack', at: 133.5, dur: 3.5, x: 720, y: 860, length: 220, branchCount: 6, glow: true, layer: 'world' },
        { type: 'sparkle_trail', at: 132.5, dur: 4.5, x: 720, y: 860, radius: 180, count: 16, layer: 'world' },
      ],
    },
    {
      id: 'S23', t0: 137.0, t1: 145.0, type: 'CU', loc: 'golden', // 互动 2: 给挖挖加油!
      transitionIn: { type: 'zoom_blur', dur: 0.5, cx: 740, cy: 640 },
      cam: { from: { x: 740, y: 640, zoom: 1.45 }, to: { x: 740, y: 640, zoom: 1.48 }, shake: { amt: 14, freq: 24 } },
      wawa: {
        visible: true,
        track: [
          { t: 137.0, action: 'dig', dx: 100, expr: 'strain', hasHat: true },
          { t: 139.5, action: 'dig', dx: 100, expr: 'strain', hasHat: true },
          { t: 142.0, action: 'anticipate_dig', dx: 100, expr: 'strain', hasHat: true },
          { t: 143.5, action: 'lift', dx: 100, expr: 'laugh', hasHat: true },
        ],
      },
      bluey: { visible: false },
      bingo: { visible: false },
      props: {
        hole: { x: 720, y: 860, at: 137.0 },
        dust: { x: 720, y: 860, at: 137.2, dur: 7.2 },
        golden_x: { x: 720, y: 860, isGolden: true },
      },
      fx: [
        { type: 'speed_lines', at: 137.5, dur: 6.5, x: 740, y: 640, count: 18, layer: 'screen' },
        { type: 'smear', at: 138.0, dur: 0.6, x: 720, y: 800, r: 200, layer: 'world' },
        { type: 'smear', at: 140.5, dur: 0.6, x: 720, y: 800, r: 200, layer: 'world' },
        { type: 'dirt_chunks', at: 138.2, dur: 2.5, x: 720, y: 860, count: 14, dir: -1, power: 1.5, layer: 'world' },
        { type: 'dirt_chunks', at: 141.0, dur: 2.5, x: 720, y: 860, count: 14, dir: 1, power: 1.5, layer: 'world' },
        { type: 'dust', at: 137.2, dur: 7.2, x: 720, y: 860, layer: 'world' },
      ],
    },
    {
      id: 'S24', t0: 145.0, t1: 151.0, type: 'MCU', loc: 'golden',
      cam: { from: { x: 840, y: 580, zoom: 1.25 }, to: { x: 840, y: 580, zoom: 1.35 }, ease: 'linear' },
      wawa: {
        visible: true,
        track: [
          { t: 145.0, action: 'settle', dx: 100, expr: 'anticipate', hasHat: true, look: [-0.3, 0.4] },
          { t: 147.0, action: 'peek', dx: 100, expr: 'surprise', hasHat: true, look: [-0.3, 0.4] },
          { t: 149.2, action: 'bounce_happy', dx: 100, expr: 'laugh', hasHat: true, look: [0, 0] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 145.0, x: 480, pose: 'point', move: 'none', facing: 1, expr: 'surprise', look: [1, 0.2] },
          { t: 147.2, x: 480, pose: 'jump_cheer', move: 'hop', facing: 1, expr: 'laugh' },
          { t: 149.2, x: 480, pose: 'clap', move: 'none', facing: 1, expr: 'laugh' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 145.0, x: 1500, pose: 'dance', move: 'none', facing: -1, expr: 'happy' },
          { t: 147.2, x: 1500, pose: 'clap_overhead', move: 'none', facing: -1, expr: 'laugh' },
          { t: 149.2, x: 1500, pose: 'jump_cheer', move: 'hop', facing: -1, expr: 'laugh' },
        ],
      },
      props: { hole: { x: 720, y: 860, at: 137.0 }, gift_corner: { x: 720, y: 840, at: 145.5 } },
      fx: [
        { type: 'emote', at: 146.0, dur: 2.2, x: 480, y: 500, kind: 'sparkle', scale: 1.3, layer: 'world' },
        { type: 'sparkle_trail', at: 145.5, dur: 4.5, x: 720, y: 840, radius: 180, count: 20, layer: 'world' },
        { type: 'shine_ring', at: 146.5, dur: 2.0, x: 720, y: 840, maxR: 240, layer: 'world' },
      ],
    },
    {
      id: 'S25', t0: 151.0, t1: 159.0, type: 'WS', loc: 'golden', // 慢动作升格礼物破土!
      transitionIn: { type: 'whip', dir: 'left', dur: 0.5 },
      cam: { from: { x: 960, y: 540, zoom: 1.0 }, to: { x: 960, y: 510, zoom: 1.05 } },
      wawa: {
        visible: true,
        track: [
          { t: 151.0, action: 'proud', dx: 100, expr: 'laugh', hasHat: true },
          { t: 153.5, action: 'cheer', dx: 100, expr: 'laugh', hasHat: true },
          { t: 156.0, action: 'bounce_happy', dx: 100, expr: 'laugh', hasHat: true },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 151.0, x: 480, pose: 'dance', move: 'none', facing: 1, expr: 'laugh' },
          { t: 153.5, x: 480, pose: 'jump_cheer', move: 'hop', facing: 1, expr: 'laugh' },
          { t: 156.2, x: 480, pose: 'dance2', move: 'none', facing: 1, expr: 'laugh' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 151.0, x: 1500, pose: 'cheer', move: 'none', facing: -1, expr: 'laugh' },
          { t: 153.5, x: 1500, pose: 'jump_cheer', move: 'hop', facing: -1, expr: 'laugh' },
          { t: 156.2, x: 1500, pose: 'spin', move: 'none', facing: -1, expr: 'laugh' },
        ],
      },
      props: {
        hole: { x: 720, y: 860, at: 137.0 },
        gift_pop: { x0: 720, y0: 840, x1: 960, y1: 720, at: 151.2, dur: 7.5 },
        stars: { x: 720, y: 840, at: 151.4, dur: 2.0 },
        confetti: { at: 151.5, dur: 7.5 },
      },
      fx: [
        { type: 'impact_burst', at: 151.2, dur: 1.6, x: 720, y: 840, r: 300, spikeCount: 14, color: '#FFE082', flash: true, layer: 'world' },
        { type: 'confetti_burst', at: 151.4, dur: 5.0, x: 960, y: 600, count: 48, radius: 320, layer: 'world' },
        { type: 'stars', at: 151.4, dur: 2.0, x: 720, y: 840, layer: 'world' },
      ],
    },
    {
      id: 'S26', t0: 159.0, t1: 166.0, type: 'MS', loc: 'golden',
      cam: { from: { x: 960, y: 540, zoom: 1.15 }, to: { x: 960, y: 540, zoom: 1.15 } },
      wawa: {
        visible: true,
        track: [
          { t: 159.0, action: 'lower', dx: 100, expr: 'happy', hasHat: true },
          { t: 161.2, action: 'present', dx: 100, expr: 'proud', hasHat: true, look: [-0.2, 0.2] },
          { t: 163.8, action: 'nod', dx: 100, expr: 'happy', hasHat: true, look: [0, 0] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 159.0, x: 480, pose: 'clap', move: 'none', facing: 1, expr: 'happy' },
          { t: 161.5, x: 480, pose: 'point', move: 'none', facing: 1, expr: 'laugh', look: [1, 0] },
          { t: 164.0, x: 480, pose: 'wave', move: 'none', facing: 1, expr: 'happy' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 159.0, x: 1500, pose: 'hug_bone', move: 'none', item: 'bone', facing: -1, expr: 'happy' },
          { t: 161.5, x: 1500, pose: 'cheer', move: 'none', item: 'bone', facing: -1, expr: 'laugh' },
          { t: 164.0, x: 1500, pose: 'dance', move: 'none', item: 'bone', facing: -1, expr: 'happy' },
        ],
      },
      props: { gift_landed: { x: 960, y: 820 }, glow: { x: 960, y: 820, r: 180, col: '#FFE57F' } },
      fx: [
        { type: 'glow', at: 159.0, dur: 7.0, x: 960, y: 820, r: 180, col: '#FFE57F', layer: 'world' },
        { type: 'sparkle_trail', at: 159.2, dur: 6.0, x: 960, y: 820, radius: 200, count: 20, layer: 'world' },
        { type: 'emote', at: 160.5, dur: 2.0, x: 960, y: 640, kind: 'sparkle', scale: 1.3, layer: 'world' },
      ],
    },
    {
      id: 'S27', t0: 166.0, t1: 172.0, type: 'MCU', loc: 'golden', // 打破第四面墙 3: 挖挖问开开喜不喜欢
      cam: { from: { x: 1040, y: 510, zoom: 1.28 }, to: { x: 1040, y: 510, zoom: 1.30 } },
      wawa: {
        visible: true,
        track: [
          { t: 166.0, action: 'wave', dx: 100, expr: 'talk', hasHat: true, look: [0, 0] },
          { t: 168.0, action: 'talk_bob', dx: 100, expr: 'talk', hasHat: true, look: [0, 0] },
          { t: 170.0, action: 'proud', dx: 100, expr: 'proud', hasHat: true, look: [0, 0] },
        ],
      },
      bluey: { visible: false },
      bingo: { visible: false },
      props: { gift_landed: { x: 620, y: 820 } },
      fx: [
        { type: 'heart_pop', at: 167.2, dur: 2.2, x: 1040, y: 460, scale: 1.3, layer: 'world' },
        { type: 'emote', at: 169.5, dur: 1.8, x: 1040, y: 480, kind: 'heart', scale: 1.1, layer: 'world' },
      ],
    },

    // ==================== 幕 4: 派对与祝福 (172.0 - 228.0s) · Party Table ====================
    {
      id: 'S28', t0: 172.0, t1: 179.0, type: 'WS', loc: 'party',
      transitionIn: { type: 'balloon_wipe', dur: 0.9, dir: 'left' },
      cam: { from: { x: 800, y: 540, zoom: 1.0 }, to: { x: 1020, y: 540, zoom: 1.0 }, ease: 'linear' },
      wawa: {
        visible: true,
        track: [
          { t: 172.0, action: 'drive_in', dx: -220, move: 'drive', expr: 'focus', hasHat: true, hasCake: true, ease: 'outCubic' },
          { t: 175.0, action: 'drive_in', dx: 120, move: 'drive', expr: 'focus', hasHat: true, hasCake: true, ease: 'outCubic' },
          { t: 177.2, action: 'settle', dx: 120, move: 'none', expr: 'happy', hasHat: true, hasCake: true },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 172.0, x: -280, pose: 'run', move: 'run', facing: 1, ease: 'outCubic' },
          { t: 174.0, x: 460, pose: 'land', move: 'none', facing: 1, expr: 'happy' },
          { t: 175.5, x: 460, pose: 'clap', move: 'none', facing: 1, expr: 'laugh' },
          { t: 177.5, x: 460, pose: 'dance', move: 'none', facing: 1, expr: 'happy' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 172.0, x: 2260, pose: 'run', move: 'run', facing: -1, ease: 'outCubic' },
          { t: 174.0, x: 1520, pose: 'land', move: 'none', facing: -1, expr: 'happy' },
          { t: 175.5, x: 1520, pose: 'dance', move: 'none', facing: -1, expr: 'laugh' },
          { t: 177.5, x: 1520, pose: 'jump_cheer', move: 'hop', facing: -1, expr: 'laugh' },
        ],
      },
      fx: [
        { type: 'drive_dust', at: 172.8, dur: 2.2, x: 200, y: 920, dir: 1, scale: 1.0, layer: 'world' },
        { type: 'land_dust', at: 174.0, dur: 0.8, x: 460, y: 920, scale: 1.2, layer: 'world' },
        { type: 'land_dust', at: 174.0, dur: 0.8, x: 1520, y: 920, scale: 1.2, layer: 'world' },
      ],
    },
    {
      id: 'S29', t0: 179.0, t1: 186.0, type: 'MS', loc: 'party',
      cam: { from: { x: 960, y: 540, zoom: 1.15 }, to: { x: 960, y: 540, zoom: 1.15 } },
      wawa: {
        visible: true,
        track: [
          { t: 179.0, action: 'settle', dx: 120, expr: 'happy', hasHat: true },
          { t: 181.2, action: 'proud', dx: 120, expr: 'proud', hasHat: true },
          { t: 183.8, action: 'wiggle', dx: 120, expr: 'laugh', hasHat: true },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 179.0, x: 460, pose: 'clap', move: 'none', facing: 1, expr: 'surprise' },
          { t: 181.0, x: 460, pose: 'jump_cheer', move: 'hop', facing: 1, expr: 'laugh' },
          { t: 183.5, x: 460, pose: 'dance', move: 'none', facing: 1, expr: 'happy' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 179.0, x: 1500, pose: 'dance', move: 'none', facing: -1, expr: 'surprise' },
          { t: 181.0, x: 1500, pose: 'clap_overhead', move: 'none', facing: -1, expr: 'laugh' },
          { t: 183.5, x: 1500, pose: 'jump_cheer', move: 'hop', facing: -1, expr: 'laugh' },
        ],
      },
      props: {
        cake_landed: { x: 960, y: 820 },
        candle_lit: { at: 179.6 },
        stars: { x: 960, y: 680, at: 179.6, dur: 1.8 },
      },
      fx: [
        { type: 'shine_ring', at: 179.6, dur: 1.8, x: 960, y: 680, maxR: 220, layer: 'world' },
        { type: 'stars', at: 179.6, dur: 2.0, x: 960, y: 680, layer: 'world' },
        { type: 'sparkle_trail', at: 179.8, dur: 5.5, x: 960, y: 680, radius: 160, count: 18, layer: 'world' },
      ],
    },

    // ===== S30 精细化拆解 4 个组镜 (186.0 - 204.5s) =====
    {
      id: 'S30a', t0: 186.0, t1: 191.0, type: 'WS', loc: 'party', // 全景：三人卡点欢快摇摆
      transitionIn: { type: 'dissolve', dur: 0.5 },
      cam: { from: { x: 960, y: 530, zoom: 1.10 }, to: { x: 960, y: 530, zoom: 1.15 }, ease: 'linear' },
      wawa: {
        visible: true,
        track: [
          { t: 186.0, action: 'wiggle', dx: 120, expr: 'happy', hasHat: true },
          { t: 188.2, action: 'bounce_happy', dx: 120, expr: 'laugh', hasHat: true },
          { t: 190.0, action: 'cheer', dx: 120, expr: 'happy', hasHat: true },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 186.0, x: 460, pose: 'dance', move: 'none', facing: 1, expr: 'laugh' },
          { t: 188.0, x: 460, pose: 'clap_overhead', move: 'none', facing: 1, expr: 'laugh' },
          { t: 190.0, x: 460, pose: 'dance2', move: 'none', facing: 1, expr: 'happy' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 186.0, x: 1500, pose: 'dance2', move: 'none', facing: -1, expr: 'laugh' },
          { t: 188.0, x: 1500, pose: 'jump_cheer', move: 'hop', facing: -1, expr: 'laugh' },
          { t: 190.0, x: 1500, pose: 'spin', move: 'none', facing: -1, expr: 'happy' },
        ],
      },
      props: { cake_landed: { x: 960, y: 820 }, candle_lit: true },
      fx: [
        { type: 'music_notes', at: 186.2, dur: 4.5, x: 960, y: 480, count: 10, spreadX: 340, spreadY: 260, layer: 'world' },
      ],
    },
    {
      id: 'S30b', t0: 191.0, t1: 195.5, type: 'CU', loc: 'party', // 特写：布鲁伊拍手大笑合唱
      cam: { from: { x: 460, y: 720, zoom: 1.50 }, to: { x: 460, y: 720, zoom: 1.54 }, ease: 'linear' },
      wawa: { visible: false },
      bluey: {
        visible: true,
        track: [
          { t: 191.0, x: 460, footY: 880, h: 460, pose: 'clap', move: 'none', facing: 1, expr: 'talk' },
          { t: 192.5, x: 460, footY: 880, h: 460, pose: 'jump_cheer', move: 'hop', facing: 1, expr: 'laugh' },
          { t: 194.2, x: 460, footY: 880, h: 460, pose: 'dance', move: 'none', facing: 1, expr: 'laugh' },
        ],
      },
      bingo: { visible: false },
      props: { cake_landed: { x: 960, y: 820 }, candle_lit: true },
      fx: [
        { type: 'music_notes', at: 191.2, dur: 4.0, x: 460, y: 640, count: 6, spreadX: 180, spreadY: 200, layer: 'world' },
        { type: 'emote', at: 192.5, dur: 2.0, x: 460, y: 520, kind: 'music', scale: 1.2, layer: 'world' },
      ],
    },
    {
      id: 'S30c', t0: 195.5, t1: 200.0, type: 'CU', loc: 'party', // 特写：宾果晃耳朵欢呼跳跃
      cam: { from: { x: 1500, y: 720, zoom: 1.50 }, to: { x: 1500, y: 720, zoom: 1.54 }, ease: 'linear' },
      wawa: { visible: false },
      bluey: { visible: false },
      bingo: {
        visible: true,
        track: [
          { t: 195.5, x: 1500, footY: 880, h: 400, pose: 'dance', move: 'none', facing: -1, expr: 'talk' },
          { t: 197.0, x: 1500, footY: 880, h: 400, pose: 'clap_overhead', move: 'none', facing: -1, expr: 'laugh' },
          { t: 198.8, x: 1500, footY: 880, h: 400, pose: 'jump_cheer', move: 'hop', facing: -1, expr: 'laugh' },
        ],
      },
      props: { cake_landed: { x: 960, y: 820 }, candle_lit: true },
      fx: [
        { type: 'music_notes', at: 195.8, dur: 4.0, x: 1500, y: 640, count: 6, spreadX: 180, spreadY: 200, layer: 'world' },
        { type: 'emote', at: 197.0, dur: 2.0, x: 1500, y: 520, kind: 'sparkle', scale: 1.2, layer: 'world' },
      ],
    },
    {
      id: 'S30d', t0: 200.0, t1: 204.5, type: 'MCU', loc: 'party', // 中特写：挖挖微笑点头，眼里星光
      cam: { from: { x: 1040, y: 490, zoom: 1.34 }, to: { x: 1040, y: 490, zoom: 1.38 }, ease: 'linear' },
      wawa: {
        visible: true,
        track: [
          { t: 200.0, action: 'talk_bob', dx: 120, expr: 'talk', hasHat: true, look: [0, 0] },
          { t: 201.5, action: 'nod', dx: 120, expr: 'proud', hasHat: true, look: [0, 0] },
          { t: 203.2, action: 'wiggle', dx: 120, expr: 'happy', hasHat: true, look: [0, 0] },
        ],
      },
      bluey: { visible: false },
      bingo: { visible: false },
      props: { cake_landed: { x: 960, y: 820 }, candle_lit: true },
      fx: [
        { type: 'emote', at: 201.0, dur: 2.2, x: 1040, y: 440, kind: 'heart', scale: 1.2, layer: 'world' },
        { type: 'sparkle_trail', at: 200.5, dur: 3.5, x: 1040, y: 460, radius: 140, count: 14, layer: 'world' },
      ],
    },

    // ===== S31 吹蜡烛核心镜头 (204.5 - 210.5s)：全员聚齐大特写 =====
    {
      id: 'S31', t0: 204.5, t1: 210.5, type: 'CU', loc: 'party', // 互动 3: 一起吹蜡烛! 黄金三角构图
      transitionIn: { type: 'iris', dur: 0.6, cx: 960, cy: 640 },
      cam: { from: { x: 960, y: 640, zoom: 1.25 }, to: { x: 960, y: 640, zoom: 1.28 } },
      wawa: {
        visible: true,
        track: [
          { t: 204.5, action: 'anticipate_dig', dx: 0, expr: 'focus', hasHat: true, look: [0, 0.35] },
          { t: 206.0, action: 'idle', dx: 0, expr: 'blow', hasHat: true, look: [0, 0.35] },
          { t: 208.5, action: 'settle', dx: 0, expr: 'happy', hasHat: true, look: [0, 0] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 204.5, x: 500, footY: 900, h: 440, pose: 'blow', move: 'none', facing: 1, expr: 'focus' },
          { t: 206.5, x: 500, footY: 900, h: 440, pose: 'blow', move: 'none', facing: 1, expr: 'happy' },
          { t: 208.5, x: 500, footY: 900, h: 440, pose: 'cheer', move: 'none', facing: 1, expr: 'laugh' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 204.5, x: 1420, footY: 900, h: 380, pose: 'blow', move: 'none', facing: -1, expr: 'focus' },
          { t: 206.5, x: 1420, footY: 900, h: 380, pose: 'blow', move: 'none', facing: -1, expr: 'happy' },
          { t: 208.5, x: 1420, footY: 900, h: 380, pose: 'cheer', move: 'none', facing: -1, expr: 'laugh' },
        ],
      },
      props: {
        cake_landed: { x: 960, y: 820 },
        candle_blow: { at: 206.0, dur: 4.5 },
      },
      fx: [
        { type: 'speed_lines', at: 206.0, dur: 2.0, x: 960, y: 700, angle: 1.57, count: 12, layer: 'world' },
      ],
    },

    // ===== S32 - S34 尾声祝福 =====
    {
      id: 'S32', t0: 210.5, t1: 216.0, type: 'WS', loc: 'party', // 吹灭愿望成真, 欢呼纸屑雨
      cam: { from: { x: 960, y: 540, zoom: 1.15 }, to: { x: 960, y: 540, zoom: 1.0 }, ease: 'outCubic' },
      wawa: {
        visible: true,
        track: [
          { t: 210.5, action: 'cheer', dx: 120, expr: 'laugh', hasHat: true },
          { t: 212.5, action: 'bounce_happy', dx: 120, expr: 'laugh', hasHat: true },
          { t: 214.5, action: 'wave', dx: 120, expr: 'happy', hasHat: true },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 210.5, x: 480, pose: 'jump_cheer', move: 'hop', facing: 1, expr: 'laugh' },
          { t: 212.8, x: 480, pose: 'dance2', move: 'none', facing: 1, expr: 'laugh' },
          { t: 214.5, x: 480, pose: 'clap_overhead', move: 'none', facing: 1, expr: 'laugh' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 210.5, x: 1480, pose: 'jump_cheer', move: 'hop', facing: -1, expr: 'laugh' },
          { t: 212.8, x: 1480, pose: 'spin', move: 'none', facing: -1, expr: 'laugh' },
          { t: 214.5, x: 1480, pose: 'cheer', move: 'none', facing: -1, expr: 'laugh' },
        ],
      },
      props: {
        cake_landed: { x: 960, y: 820 },
        candle_blown: true,
        confetti: { at: 210.6, dur: 5.4 },
      },
      fx: [
        { type: 'confetti_burst', at: 210.6, dur: 5.0, x: 960, y: 500, count: 50, radius: 360, layer: 'world' },
        { type: 'music_notes', at: 211.0, dur: 4.8, x: 960, y: 500, count: 12, layer: 'world' },
      ],
    },
    {
      id: 'S33', t0: 216.0, t1: 222.0, type: 'MCU', loc: 'party', // 打破第四面墙 4: 终极祝福
      cam: { from: { x: 960, y: 510, zoom: 1.25 }, to: { x: 960, y: 510, zoom: 1.28 } },
      wawa: {
        visible: true,
        track: [
          { t: 216.0, action: 'wave', dx: 0, expr: 'talk', hasHat: true, look: [0, 0] },
          { t: 218.0, action: 'talk_bob', dx: 0, expr: 'talk', hasHat: true, look: [0, 0] },
          { t: 220.2, action: 'present', dx: 0, expr: 'proud', hasHat: true, look: [0, 0] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 216.0, x: 480, pose: 'clap', move: 'none', facing: 1, expr: 'laugh' },
          { t: 218.0, x: 480, pose: 'wave', move: 'none', facing: 1, expr: 'happy', look: [0, 0] },
          { t: 220.0, x: 480, pose: 'cheer', move: 'none', facing: 1, expr: 'laugh' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 216.0, x: 1480, pose: 'dance', move: 'none', facing: -1, expr: 'laugh' },
          { t: 218.0, x: 1480, pose: 'wave', move: 'none', facing: -1, expr: 'happy', look: [0, 0] },
          { t: 220.0, x: 1480, pose: 'jump_cheer', move: 'hop', facing: -1, expr: 'laugh' },
        ],
      },
      props: { confetti: { at: 216.0, dur: 6.0 }, cake_landed: { x: 960, y: 820 }, candle_blown: true },
      fx: [
        { type: 'heart_pop', at: 217.0, dur: 2.5, x: 960, y: 440, scale: 1.5, layer: 'world' },
        { type: 'sparkle_trail', at: 216.5, dur: 5.0, x: 960, y: 460, radius: 200, count: 20, layer: 'world' },
      ],
    },
    {
      id: 'S34', t0: 222.0, t1: 228.0, type: 'WS', loc: 'party', // 缓缓拉远, 定格祝福大字幕
      cam: { from: { x: 960, y: 510, zoom: 1.20 }, to: { x: 960, y: 540, zoom: 0.95 }, ease: 'easeInOut' },
      wawa: {
        visible: true,
        track: [
          { t: 222.0, action: 'bow', dx: 0, expr: 'happy', hasHat: true, look: [0, 0] },
          { t: 224.2, action: 'wave', dx: 0, expr: 'happy', hasHat: true, look: [0, 0] },
          { t: 226.2, action: 'proud', dx: 0, expr: 'proud', hasHat: true, look: [0, 0] },
        ],
      },
      bluey: {
        visible: true,
        track: [
          { t: 222.0, x: 480, pose: 'bow', move: 'none', facing: 1, expr: 'happy' },
          { t: 224.0, x: 480, pose: 'wave', move: 'none', facing: 1, expr: 'happy', look: [0, 0] },
          { t: 226.0, x: 480, pose: 'hug', move: 'none', facing: 1, expr: 'laugh' },
        ],
      },
      bingo: {
        visible: true,
        track: [
          { t: 222.0, x: 1480, pose: 'bow', move: 'none', facing: -1, expr: 'happy' },
          { t: 224.0, x: 1480, pose: 'wave', move: 'none', facing: -1, expr: 'happy', look: [0, 0] },
          { t: 226.0, x: 1480, pose: 'hug', move: 'none', facing: -1, expr: 'laugh' },
        ],
      },
      title: { text: '开开 2 岁生日快乐！', sub: '愿你每天都像挖土机一样充满活力！', at: 222.5, dur: 5.5, style: 'ending' },
      props: { cake_landed: { x: 960, y: 820 }, candle_blown: true },
      fx: [
        { type: 'heart_pop', at: 223.5, dur: 3.0, x: 960, y: 460, scale: 1.6, layer: 'world' },
      ],
    }
  ];

  // 查表返回 t 时刻所属镜头
  function getShotAt(t) {
    t = Math.max(0, Math.min(228.0, t));
    for (let i = 0; i < SHOTS.length; i++) {
      const s = SHOTS[i];
      if (i === SHOTS.length - 1) {
        if (t >= s.t0 && t <= s.t1) return s;
      } else {
        if (t >= s.t0 && t < s.t1) return s;
      }
    }
    return SHOTS[SHOTS.length - 1];
  }

  const Shots = {
    TOTAL: 228.0,
    SHOTS,
    getShotAt,
  };

  root.V12Shots = Shots;
  root.V11Shots = Shots;
  if (typeof module !== 'undefined' && module.exports) module.exports = Shots;
})(typeof globalThis !== 'undefined' ? globalThis : this);
