// sample_timeline.js — V10 样片分镜 (24s, 布鲁伊引导挖挖挖出礼物)
// 动作段: [t0, t1, action, opts]; action∈{idle,wave,dig,walk,pose}; opts.dx 装配平移
window.V10TL = {
  total: 24,
  wawa: [
    [0.0, 3.0,  'idle', { dx: 400 }],                              // S1 开场站位 (右)
    [3.0, 5.0,  'wave', { dx: 400 }],                              // 布鲁伊出现, 挥斗欢迎
    [5.0, 8.5,  'idle', { dx: 400 }],                              // 听秘密
    [8.5, 10.0, 'walk', { dxFrom: 400, dxTo: 0 }],                 // 走到挖点
    [10.0, 14.8, 'dig', { dx: 0 }],                                // 挖掘×2 整循环 (2.4s 物理节奏)
    [14.8, 16.0, 'lift', { dx: 0 }],                               // 挖完举斗 (无跳变过渡, 礼物 14.7 露角)
    [16.0, 17.6, 'pose', { dx: 0, pose: { boom: 62.5, stick: -38, bucket: 49, bob: 0, squash: 0 } }],  // 举斗展示礼物
    [17.6, 18.8, 'lower', { dx: 0 }],                              // 放斗落地 (礼物放下)
    [18.8, 20.5, 'pose', { dx: 0, pose: { boom: 44, stick: -27.5, bucket: -14, bob: 0, squash: 0 } }],  // 低头看礼物
    [20.5, 24.0, 'cheer', { dx: 0 }],                              // 庆祝跳到结尾 (斗守礼物)
  ],
  bluey: {
    enterAt: 3.0, enterDur: 1.2, x0: -460, x1: 120,                // 屏幕 px, 从左滑入
    footY: 1006, h: 545,                                           // 脚底贴地 (地面≈1000)
    bounces: [ [5.0, 1], [16.4, 2], [19.2, 3] ],                   // [时刻, 跳数]: 停住/礼物出/欢呼
    hideAfter: 0,
  },
  xmark: { at: 7.2, till: 8.6, x: 745, y: 1000 },                 // X 标记 (挖点屏幕位)
  dirtpile: { x: 745, y: 1000, w: 190, h: 70, digAt: 10, goneAt: 14.8 },  // 土堆: 两铲挖走, 14s 后留浅坑
  gift: { at: 15.6, popDur: 0.65, w: 220 },                         // 15s 弹出, 挂斗内
  confetti: [ { at: 15.8, n: 22 }, { at: 19.0, n: 16 } ],          // 纸屑两批
  titles: [
    { at: 0.3, till: 2.8, text: '挖挖的生日惊喜', size: 92, y: 290, x: 520 },
    { at: 20.9, till: 24.0, text: '开开 2 岁生日快乐!', size: 96, y: 300, x: 560 },
  ],
  vo: [   // 仅注释用 (音轨合成以 v10_audio.py 为准)
    [3.2, 'n1'], [7.2, 'n2'], [10.2, 'n3'], [15.3, 'n4'], [18.6, 'k1'], [21.5, 'n5'],
  ],
};
