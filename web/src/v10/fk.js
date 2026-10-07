// fk.js — 挖挖 2D 骨骼: 数据 + 纯 FK 数学 (浏览器 classic script / node require 双用)
// 数据来源: assets/images/v10/rig.json (09-30 v1, 网格实测铰点) + 板件网格测量(眼/油缸挂点/齿尖)
// 角度约定(与 rig.json / v10_assemble.py 一致): 绝对世界角, 度, 视觉逆时针为正.
//   boom 正=向左上方扬起, stick 负=向左下摆, bucket 正=向机身卷曲.
// 中性姿态(试拼装验证过): boom=40, stick=-25, bucket=25.
(function (root) {
  'use strict';

  // ---- 板件 (件内像素坐标系) ----
  const PARTS = {
    body:   { file: 'body.png',   w: 819, h: 961 },
    boom:   { file: 'boom.png',   w: 369, h: 885 },
    stick:  { file: 'stick.png',  w: 393, h: 785 },
    bucket: { file: 'bucket.png', w: 551, h: 598 },
    track:  { file: 'track.png',  w: 983, h: 401 },
  };

  // ---- 铰点 (rig.json v2, 图像实测: navy 盖质心 / alpha 孔心, 件内像素) ----
  const PIV = {
    boom_root:    [95, 790],   // boom 根铰盖中心 (navy 质心)
    boom_elbow:   [281, 95],   // boom 肘铰盖中心 (navy 质心; v1 [260,80] 偏 26px 已修正)
    stick_elbow:  [83, 86],    // stick 肘孔中心 (alpha 孔心)
    stick_bucket: [300, 698],  // stick 铲斗孔中心 (alpha 孔心)
    bucket_pin:   [215, 65],   // bucket 铰孔中心 (navy 质心)
    body_root:    [55, 740],   // body 根铰贴附位 (v6: 铰盖全进车身被完全遮挡, 臂从车身后伸出; 真机 3/4 转台在车内)
  };

  // ---- 装配布局 (装配空间 px, 沿用 scripts/v10_assemble.py 的实测相对位) ----
  const LAYOUT = {
    track_tl: [500, 769],          // G=1150, 履带底 20px 沉入地面线
    ground_y: 1150,                // 地面线(履带底在 1170)
    body_dx: 120,                  // body 左上 = track 左上 + (120, ...)
    body_track_overlap: 70,        // 车底坐进履带顶部
  };
  // body 左上 y = ground - trackH - bodyH + overlap
  LAYOUT.body_tl = [LAYOUT.track_tl[0] + LAYOUT.body_dx,
                    LAYOUT.ground_y - PARTS.track.h - PARTS.body.h + LAYOUT.body_track_overlap];

  // ---- 脸部 (body 件内, 网格实测) — 眨眼盖片用 ----
  const FACE = {
    eye_l: { c: [185, 572], rx: 77, ry: 128 },
    eye_r: { c: [389, 573], rx: 86, ry: 122 },
    blue: '#3CB8FC',               // 车身蓝(抽帧实测均值)
    navy: '#0B2F6E',               // 描边/瞳/眉 navy
  };

  // ---- 程序化油缸挂点 (v3 板件轮廓实测: 全部落在实体内) ----
  const CYL = {
    c1: { a_part: 'body', a: [120, 780], b_part: 'boom',  b: [125, 420] },  // 车身前下部 → 动臂下腹 (y420 实体 x[87,270])
    c2: { a_part: 'boom', a: [184, 400], b_part: 'stick', b: [140, 90] },   // 动臂中段中线 (y400 x[92,276]) → 斗杆上耳 (y90 实体 x[8,175]; v2 [282,580]/[185,85] 双双出界悬空已修正)
  };

  // ---- 铲斗触地点 (bucket 件内, 网格实测) ----
  const BUCKET_TEETH = [350, 560];   // 中齿尖(齿区最低)
  const BUCKET_BELLY = [180, 575];   // 斗底弧线最低点
  const BUCKET_BACK  = [468, 400];   // 斗背右缘 (铲斗-履带避让扫描用)

  // ---- 2D 矩阵 [a,b,c,d,e,f]: (x,y) -> (a x + c y + e, b x + d y + f), 与 ctx.setTransform 兼容 ----
  const mTrans = (x, y) => [1, 0, 0, 1, x, y];
  const mScale = (sx, sy) => [sx, 0, 0, sy, 0, 0];
  const mRotCCW = deg => {                       // 视觉逆时针(屏幕 y 向下), 同 PIL rotate/assemble 约定
    const th = deg * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
    return [c, -s, s, c, 0, 0];                  // = canvas rotate(-deg)
  };
  const mMul = (m, n) => [                       // m∘n: 先 n 后 m
    m[0] * n[0] + m[2] * n[1],  m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],  m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],  m[1] * n[4] + m[3] * n[5] + m[5],
  ];
  const mApply = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];

  // ---- FK: pose -> 各件 局部→装配空间 矩阵 + 关键世界点 ----
  // pose: {boom, stick, bucket (度, 绝对), bob (px, 正=上抬), squash (0..0.12, 正=压扁)}
  function assemble(p) {
    const q = Math.max(-0.12, Math.min(0.12, p.squash || 0));   // v9 契约: squash 硬上限 0.12
    const bodyTL = [LAYOUT.body_tl[0], LAYOUT.body_tl[1] - (p.bob || 0)];
    // squash 锚在车底中心(悬挂坐于履带上, 履带不动)
    const bc = [bodyTL[0] + PARTS.body.w / 2, bodyTL[1] + PARTS.body.h];
    const mBody = mMul(mMul(mMul(mTrans(bc[0], bc[1]), mScale(1 + 0.6 * q, 1 - q)), mTrans(-bc[0], -bc[1])),
                       mTrans(bodyTL[0], bodyTL[1]));
    const rootW = mApply(mBody, PIV.body_root);
    const mBoom = mMul(mMul(mTrans(rootW[0], rootW[1]), mRotCCW(p.boom)), mTrans(-PIV.boom_root[0], -PIV.boom_root[1]));
    const elbowW = mApply(mBoom, PIV.boom_elbow);
    const mStick = mMul(mMul(mTrans(elbowW[0], elbowW[1]), mRotCCW(p.stick)), mTrans(-PIV.stick_elbow[0], -PIV.stick_elbow[1]));
    const hingeW = mApply(mStick, PIV.stick_bucket);
    const mBucket = mMul(mMul(mTrans(hingeW[0], hingeW[1]), mRotCCW(p.bucket)), mTrans(-PIV.bucket_pin[0], -PIV.bucket_pin[1]));
    return {
      mBody, mBoom, mStick, mBucket,
      rootW, elbowW, hingeW,
      teethW: mApply(mBucket, BUCKET_TEETH),
      bellyW: mApply(mBucket, BUCKET_BELLY),
      backW: mApply(mBucket, BUCKET_BACK),
      c1a: mApply(mBody, CYL.c1.a), c1b: mApply(mBoom, CYL.c1.b),
      c2a: mApply(mBoom, CYL.c2.a), c2b: mApply(mStick, CYL.c2.b),
    };
  }

  const NEUTRAL = { boom: 47.5, stick: -26, bucket: -5, bob: 0, squash: 0 };   // v6: 根铰全藏 [55,740]; 双贴地 back(437,994), idle 全组合浮动侵入 0

  root.V10FK = {
    PARTS, PIV, LAYOUT, FACE, CYL, BUCKET_TEETH, BUCKET_BELLY, BUCKET_BACK, NEUTRAL,
    mTrans, mScale, mRotCCW, mMul, mApply, assemble,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.V10FK;
})(typeof globalThis !== 'undefined' ? globalThis : this);
