"""V10 生图脚本(chatgpt2api gpt-image-2, edit 模式锁形象)。

用法:
  source .secrets/api.env
  python3 scripts/v10_gen.py <out.png> [--ref <参考图>] [--size 1920x1080]
  prompt 从 stdin 读(heredoc 或管道).

例:
  source .secrets/api.env && python3 scripts/v10_gen.py scratch/v10/candidates/wawa_side_v3.png --ref assets/images/v10/wawa_master.png << 'P'
  ...prompt...
  P
"""
import base64, json, os, subprocess, sys

def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    out = args[0]
    ref = None
    size = "1920x1080"
    i = 1
    while i < len(args):
        if args[i] == "--ref":
            ref = args[i + 1]; i += 2
        elif args[i] == "--size":
            size = args[i + 1]; i += 2
        else:
            i += 1
    base = os.environ["CHATGPT2API_BASE_URL"].rstrip("/")
    key = os.environ["CHATGPT2API_API_KEY"]
    prompt = sys.stdin.read().strip()
    if not prompt:
        print("empty prompt")
        return 2

    if ref:
        cmd = ["curl", "-s", "-m", "300", "-X", "POST", f"{base}/images/edits",
               "-H", f"Authorization: Bearer {key}",
               "-F", "model=gpt-image-2",
               "-F", f"prompt={prompt}",
               "-F", f"size={size}", "-F", f"image=@{ref}"]
    else:
        body = {"model": "gpt-image-2", "prompt": prompt, "size": size,
                "quality": "high", "n": 1, "response_format": "b64_json"}
        tmp = out + ".req.json"
        with open(tmp, "w") as f:
            json.dump(body, f, ensure_ascii=False)
        cmd = ["curl", "-s", "-m", "300", "-X", "POST", f"{base}/images/generations",
               "-H", f"Authorization: Bearer {key}", "-H", "Content-Type: application/json",
               "-d", f"@{tmp}"]

    r = subprocess.run(cmd, capture_output=True, timeout=320)
    txt = r.stdout.decode("utf-8", "replace")
    try:
        resp = json.loads(txt)
    except Exception:
        print(f"FAIL: non-json response: {txt[:300]}")
        return 1
    data = resp.get("data")
    if data and (data[0].get("b64_json") or data[0].get("url")):
        if data[0].get("b64_json"):
            with open(out, "wb") as f:
                f.write(base64.b64decode(data[0]["b64_json"]))
        else:
            subprocess.run(["curl", "-s", "-m", "120", "-o", out, data[0]["url"]], check=True)
        print(f"OK {out} ({os.path.getsize(out)//1024}KB)")
        return 0
    print(f"FAIL: {txt[:400]}")
    return 1

if __name__ == "__main__":
    sys.exit(main())
