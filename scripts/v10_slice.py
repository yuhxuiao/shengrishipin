"""V10 板件切分: 绿幕键控 + 连通域 → 每板件一张透明 PNG.

用法: uv run --with numpy,scipy,pillow python3 scripts/v10_slice.py <sheet.png> <out_dir> [名字按面积从左到右: part_1 part_2 ...]
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

def main():
    src, out_dir = sys.argv[1], sys.argv[2]
    im = Image.open(src).convert("RGB")
    a = np.asarray(im).astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # 绿幕判定: G 高且 R,B 低 (车身蓝 B 高/奶油 R 高/黄帽 R 高, 均不误杀)
    bg = (g > 150) & (r < 100) & (b < 100)
    fg = ~bg
    # 闭运算补描边缝, 再去小噪点
    fg = ndimage.binary_closing(fg, structure=np.ones((7, 7)))
    fg = ndimage.binary_fill_holes(fg)
    lab, n = ndimage.label(fg)
    print(f"components: {n}")
    objs = ndimage.find_objects(lab)
    parts = []
    for i, sl in enumerate(objs):
        if sl is None:
            continue
        area = int((lab[sl] == i + 1).sum())
        if area < 20000:  # 过滤噪点
            continue
        y0, y1 = sl[0].start, sl[0].stop
        x0, x1 = sl[1].start, sl[1].stop
        parts.append((x0, y0, x1, y1, area, i + 1))
    parts.sort(key=lambda p: p[0])  # 从左到右
    print(f"kept {len(parts)} parts")
    # alpha: 平滑后的前景掩码, 但原绿像素一律透明(铰孔洞还原为镂空, 不残留绿)
    alpha = (fg & ~bg) * 255
    rgba = np.dstack([a.astype(np.uint8), alpha.astype(np.uint8)])
    out_im = Image.fromarray(rgba, "RGBA")
    import os
    os.makedirs(out_dir, exist_ok=True)
    for k, (x0, y0, x1, y1, area, lid) in enumerate(parts, 1):
        pad = 6
        crop = out_im.crop((max(0, x0 - pad), max(0, y0 - pad),
                            min(im.width, x1 + pad), min(im.height, y1 + pad)))
        name = f"{out_dir}/part_{k}.png"
        crop.save(name)
        print(f"{name}: {crop.size} area={area}")

if __name__ == "__main__":
    main()
