#!/usr/bin/env python3
"""
v11_showcase.py — 生成 V11 导演版 34 镜故事板长图与视频技术质量报告
"""
import os
import sys
import glob
from PIL import Image, ImageDraw, ImageFont

def make_storyboard():
    frames_dir = "web/out/v11_frames"
    out_img = "output/v11_storyboard.jpg"
    
    # 选取代表 34 镜的关键时间戳帧
    # 34 镜大约在以下时刻：
    timestamps = [
        2.5,   # S01 开场标题
        8.0,   # S02 挖挖走入
        13.5,  # S03 挖挖看镜头打招呼
        19.0,  # S04 挖挖环顾四顾
        25.0,  # S05 布鲁伊入场
        32.0,  # S06 布鲁伊指路
        40.0,  # S07 跑向花园
        45.0,  # S08 锁定泥土
        51.0,  # S09 挖掘特写
        57.0,  # S10 气球破土飞升
        63.0,  # S11 一起拍手互动
        69.0,  # S12 奔向沙坑
        75.0,  # S13 挖出小黄鸭
        82.0,  # S14 再次挖掘
        88.0,  # S15 挖挖戴上帽子骄傲
        94.0,  # S16 宾果飞跃入场
        101.0, # S17 大树下发现新线索
        107.0, # S18 挖掘大树下
        114.0, # S19 宾果抱骨头
        121.0, # S20 挖挖对镜头眨眼
        128.0, # S21 金色大 X 显现
        135.0, # S22 蓄压准备
        141.0, # S23 全力挖掘大特写
        148.0, # S24 礼盒微光初现
        155.0, # S25 金色大礼物破土飞升
        162.0, # S26 礼物落地闪耀
        169.0, # S27 挖挖问开开喜不喜欢
        175.0, # S28 运送生日蛋糕
        182.0, # S29 蛋糕安放点亮
        194.0, # S30 生日歌欢唱
        207.0, # S31 吹灭蜡烛
        213.0, # S32 愿望成真彩带雨
        219.0, # S33 最终祝福
        225.0, # S34 定格祝福大字幕
    ]

    cols = 5
    rows = (len(timestamps) + cols - 1) // cols
    w, h = 384, 216 # 1/5 缩略图
    grid_w = cols * w
    grid_h = rows * h

    canvas = Image.new("RGB", (grid_w, grid_h), (20, 25, 35))

    for idx, t in enumerate(timestamps):
        frame_idx = min(6839, int(t * 30))
        frame_file = os.path.join(frames_dir, f"f{frame_idx:05d}.jpg")
        r = idx // cols
        c = idx % cols
        pos = (c * w, r * h)

        if os.path.exists(frame_file):
            im = Image.open(frame_file)
            thumb = im.resize((w, h), Image.Resampling.LANCZOS)
            canvas.paste(thumb, pos)

    os.makedirs(os.path.dirname(out_img), exist_ok=True)
    canvas.save(out_img, quality=92)
    print(f"Storyboard saved: {out_img} ({grid_w}x{grid_h})")

if __name__ == "__main__":
    make_storyboard()
