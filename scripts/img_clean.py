#!/usr/bin/env python3
"""img_clean.py — 生图素材净化 (布鲁伊两轮门禁参数固化, 宾果/道具/未来素材通用)
流程: ①边缘 flood-fill 杀米白底 ②erode 1px 去白边 ③feather 0.8px 平滑
     ④alpha<48 薄雾斩杀 (GPT 生图全图矩形低 alpha 雾 = 评审"白底"真凶) ⑤autocrop ⑥2x LANCZOS upscale
用法: /home/yuhuxiao/.local/opt/venv-media/bin/python scripts/img_clean.py in.png out.png
"""
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter


def main(inp, outp):
    im = Image.open(inp).convert("RGBA")
    a = np.array(im)
    h, w = a.shape[:2]
    rgb = a[..., :3].astype(int)
    # 近白 mask (米白也算: min 通道 >222 且通道间差 <28)
    near_white = (rgb.min(axis=2) > 222) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 28)
    # 边缘 BFS flood-fill (只杀与边缘连通的近白, 角色眼白/肚皮白保命)
    kill = np.zeros((h, w), bool)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near_white[y, x] and not kill[y, x]:
                kill[y, x] = 1; dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near_white[y, x] and not kill[y, x]:
                kill[y, x] = 1; dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and near_white[ny, nx] and not kill[ny, nx]:
                kill[ny, nx] = 1; dq.append((ny, nx))
    a[kill, 3] = 0
    # erode 1px + feather 0.8px
    al = Image.fromarray(a[..., 3]).filter(ImageFilter.MinFilter(3))
    a[..., 3] = np.array(al)
    al = Image.fromarray(a[..., 3]).filter(ImageFilter.GaussianBlur(0.8))
    a[..., 3] = np.array(al)
    # 薄雾斩杀
    a[a[..., 3] < 48, 3] = 0
    # autocrop + 2x upscale
    ys, xs = np.where(a[..., 3] > 0)
    if len(ys):
        pad = 6
        y0, y1 = max(0, ys.min() - pad), min(h, ys.max() + 1 + pad)
        x0, x1 = max(0, xs.min() - pad), min(w, xs.max() + 1 + pad)
        a = a[y0:y1, x0:x1]
    out = Image.fromarray(a)
    out = out.resize((out.width * 2, out.height * 2), Image.LANCZOS)
    out.save(outp)
    print(f"OK {outp} {out.width}x{out.height} (kill {kill.mean() * 100:.1f}%)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
