"""V10 板件试拼装: 验证拆层套件能按真机连杆装回角色, 输出拼合图供目检.

uv run --with pillow python3 scripts/v10_assemble.py [boom_deg stick_deg bucket_deg]
角度为相对各件"图纸姿态"的旋转(度, 逆时针为正).
"""
import sys, math
from PIL import Image

P = "assets/images/v10/parts"
# 铰点(件内像素坐标, 网格实测)
PIV = {
    "boom_root": (95, 790),    # boom 根铰盖中心 (navy 质心)
    "boom_elbow": (281, 95),   # boom 肘铰盖中心 (navy 质心)
    "stick_elbow": (83, 86),   # stick 肘孔中心 (alpha 孔心)
    "stick_bucket": (300, 698),# stick 铲斗孔中心 (alpha 孔心)
    "bucket_pin": (215, 65),   # bucket 铰孔中心 (navy 质心)
}
BODY_ROOT = (-40, 740)         # body 上根铰应贴位置(车体左缘之外, 转台位; v2 修正: 臂全在脸左侧)

def _rot_img(part, deg):
    return part.rotate(deg, expand=True, resample=Image.BICUBIC)

def _world(local, part, deg, origin_px, origin_py):
    """件内 local 点 → 画布坐标. origin_px/origin_py 为旋转后图在画布上的左上."""
    cx, cy = part.width / 2, part.height / 2
    vx, vy = local[0] - cx, local[1] - cy
    th = math.radians(-deg)  # PIL rotate 逆时针为正(屏幕 y 向下时视觉上亦为逆时针)
    rx = vx * math.cos(th) - vy * math.sin(th)
    ry = vx * math.sin(th) + vy * math.cos(th)
    rot = _rot_img(part, deg)
    return (origin_px + rot.width / 2 + rx, origin_py + rot.height / 2 + ry)

def place(canvas, part, pivot_local, pos, deg, next_local=None):
    """把 part 以 pivot_local 为锚, 旋转 deg 后锚到画布 pos; 返回 next_local 的画布坐标."""
    rot = _rot_img(part, deg)
    cx, cy = part.width / 2, part.height / 2
    vx, vy = pivot_local[0] - cx, pivot_local[1] - cy
    th = math.radians(-deg)
    rx = vx * math.cos(th) - vy * math.sin(th)
    ry = vx * math.sin(th) + vy * math.cos(th)
    px = int(pos[0] - (rot.width / 2 + rx))
    py = int(pos[1] - (rot.height / 2 + ry))
    canvas.paste(rot, (px, py), rot)
    if next_local is None:
        return pos
    return _world(next_local, part, deg, px, py)

def main():
    boom_deg = float(sys.argv[1]) if len(sys.argv) > 1 else 61
    stick_deg = float(sys.argv[2]) if len(sys.argv) > 2 else 3.5
    bucket_deg = float(sys.argv[3]) if len(sys.argv) > 3 else -5

    body = Image.open(f"{P}/body.png")
    boom = Image.open(f"{P}/boom.png")
    stick = Image.open(f"{P}/stick.png")
    bucket = Image.open(f"{P}/bucket.png")
    track = Image.open(f"{P}/track.png")

    W, H = 1600, 1300
    cv = Image.new("RGBA", (W, H), (245, 243, 235, 255))

    ground = 1150
    # 履带
    cv.paste(track, (500, ground - track.height + 20), track)
    # 车身: 底边略坐进履带
    body_pos = (620, ground - track.height - body.height + 70)
    cv.paste(body, body_pos, body)
    root_world = (body_pos[0] + BODY_ROOT[0], body_pos[1] + BODY_ROOT[1])

    # 大臂: 根铰锚到车身根铰位, 返回肘铰世界坐标
    elbow_world = place(cv, boom, PIV["boom_root"], root_world, boom_deg, PIV["boom_elbow"])
    # 斗杆: 肘孔锚到肘铰, 返回铲斗孔世界坐标
    bucket_hinge_world = place(cv, stick, PIV["stick_elbow"], elbow_world, stick_deg, PIV["stick_bucket"])
    # 铲斗: 铰销锚到铲斗孔
    place(cv, bucket, PIV["bucket_pin"], bucket_hinge_world, bucket_deg)

    cv.save("scratch/v10/assemble_test.png")
    print(f"boom={boom_deg} stick={stick_deg} bucket={bucket_deg} -> scratch/v10/assemble_test.png")

if __name__ == "__main__":
    main()
