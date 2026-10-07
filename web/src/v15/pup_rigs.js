// pup_rigs.js — 布鲁伊与宾果 2D 分件骨骼与铰点配置 (V12 升级版)
// 包含: 分件尺寸、骨骼锚点、旋转铰点、同色铰点遮盖圆配置与调色契约
globalThis.V12PupRigs = globalThis.V11PupRigs = {
  "bluey": {
    "scale_base": 1432,
    "root": [
      530,
      1424
    ],
    "colors": {
      "body": "#8EC5EC",
      "body_dark": "#2B3B6D",
      "belly": "#D4EBFA",
      "outline": "#1A2E44",
      "leg": "#8EC5EC"
    },
    "joints": {
      "hip_l": { "pos": [-110, -294], "r": 62, "color": "#8EC5EC" },
      "hip_r": { "pos": [110, -294], "r": 62, "color": "#8EC5EC" },
      "shoulder_l": { "pos": [-220, -654], "r": 54, "color": "#8EC5EC" },
      "shoulder_r": { "pos": [220, -634], "r": 54, "color": "#8EC5EC" },
      "neck": { "pos": [0, -674], "r": 65, "color": "#8EC5EC" }
    },
    "parts": {
      "tail": {
        "pivot_in_img": [
          350,
          100
        ],
        "pivot_from_root": [
          -200,
          -284
        ],
        "w": 420,
        "h": 300
      },
      "leg_r": {
        "pivot_in_img": [
          130,
          50
        ],
        "pivot_from_root": [
          110,
          -294
        ],
        "w": 260,
        "h": 375
      },
      "leg_l": {
        "pivot_in_img": [
          130,
          50
        ],
        "pivot_from_root": [
          -110,
          -294
        ],
        "w": 260,
        "h": 375
      },
      "arm_r": {
        "pivot_in_img": [
          65,
          265
        ],
        "pivot_from_root": [
          220,
          -634
        ],
        "w": 415,
        "h": 470
      },
      "torso": {
        "pivot_in_img": [
          300,
          70
        ],
        "pivot_from_root": [
          0,
          -674
        ],
        "w": 590,
        "h": 480
      },
      "head": {
        "pivot_in_img": [
          330,
          740
        ],
        "pivot_from_root": [
          0,
          -674
        ],
        "w": 630,
        "h": 770
      },
      "arm_l": {
        "pivot_in_img": [
          215,
          75
        ],
        "pivot_from_root": [
          -220,
          -654
        ],
        "w": 300,
        "h": 490
      }
    }
  },
  "bingo": {
    "scale_base": 2736,
    "root": [
      825,
      2722
    ],
    "colors": {
      "body": "#F8A055",
      "body_dark": "#BA5924",
      "belly": "#FCEAD2",
      "outline": "#1A2E44",
      "leg": "#F8A055"
    },
    "joints": {
      "hip_l": { "pos": [-165, -572], "r": 110, "color": "#F8A055" },
      "hip_r": { "pos": [175, -572], "r": 110, "color": "#F8A055" },
      "shoulder_l": { "pos": [-345, -1222], "r": 95, "color": "#F8A055" },
      "shoulder_r": { "pos": [435, -1222], "r": 95, "color": "#F8A055" },
      "neck": { "pos": [0, -1342], "r": 110, "color": "#F8A055" }
    },
    "parts": {
      "tail": {
        "pivot_in_img": [
          380,
          220
        ],
        "pivot_from_root": [
          -475,
          -762
        ],
        "w": 460,
        "h": 550
      },
      "leg_r": {
        "pivot_in_img": [
          200,
          90
        ],
        "pivot_from_root": [
          175,
          -572
        ],
        "w": 420,
        "h": 710
      },
      "leg_l": {
        "pivot_in_img": [
          220,
          90
        ],
        "pivot_from_root": [
          -165,
          -572
        ],
        "w": 430,
        "h": 710
      },
      "arm_r": {
        "pivot_in_img": [
          105,
          125
        ],
        "pivot_from_root": [
          435,
          -1222
        ],
        "w": 475,
        "h": 850
      },
      "torso": {
        "pivot_in_img": [
          465,
          80
        ],
        "pivot_from_root": [
          0,
          -1342
        ],
        "w": 1020,
        "h": 880
      },
      "head": {
        "pivot_in_img": [
          505,
          1365
        ],
        "pivot_from_root": [
          0,
          -1342
        ],
        "w": 1030,
        "h": 1405
      },
      "arm_l": {
        "pivot_in_img": [
          335,
          125
        ],
        "pivot_from_root": [
          -345,
          -1222
        ],
        "w": 460,
        "h": 890
      }
    }
  }
};
