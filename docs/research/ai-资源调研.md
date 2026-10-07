# AI 资源调研(2026-09-24,第二次实测后更新)

## 结论总览

| 服务 | 能力 | Base URL | 状态 |
|---|---|---|---|
| grok2api(gcp-1panel) | 图像+视频+TTS+STT | `http://35.212.161.237:8000/v1` | ✅ 在线,key 有效;⚠️ 上游账号池额度/健康待恢复 |
| 智画创 wisart | gpt-image-2 生图+编辑 | `https://wisart.kuaileshifu.com/v1` | 未配置(key 未填) |
| chatgpt2api(tp) | gpt-image-2 | `https://tp.927788.xyz/v1` | ❌ 502,弃用 |
| 1p.927788.xyz:8000 | 旧 grok2api | — | 在线但 key 不通用(key 在 gcp-1panel 上创建) |

## grok2api(v3.1.6,ghcr.io/chenyme/grok2api)

鉴权:`Authorization: Bearer g2a_xxx`。已实测可用的模型列表(18 个):

- 图像:`grok-imagine-image-2.0`(推荐)、`grok-imagine-image`、`grok-imagine-image-quality`
- 视频:**`grok-imagine-video-1.5`**(最长 15s,非参考图模式可到 1080p)、`grok-imagine-video`(参考图模式最长 10s);480p/720p;`image` 首帧(1 张)或 `reference_images`(最多 7 张)
- **TTS:`POST /v1/tts`、`GET /v1/tts/voices`,OpenAI 兼容别名 `POST /v1/audio/speech`**——配音可不用 edge-tts,直接试 grok-voice 系列
- STT:`grok-stt`(`/v1/stt`、`/v1/audio/transcriptions`);另有 `/v1/videos/edits`、`/v1/videos/extensions`
- 聊天:grok-4.x 系列

调用示例:
```bash
source .secrets/api.env
# 生图(同步)
curl -X POST "$GROK2API_BASE_URL/images/generations" -H "Authorization: Bearer $GROK2API_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"grok-imagine-image-2.0","prompt":"...","aspect_ratio":"16:9","resolution":"1k","n":1,"response_format":"b64_json"}'
# 视频(异步:创建→轮询 GET /videos/{request_id})
curl -X POST "$GROK2API_BASE_URL/videos/generations" -H "Authorization: Bearer $GROK2API_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"grok-imagine-video-1.5","prompt":"...","duration":8,"aspect_ratio":"16:9","resolution":"720p"}'
```

## 实测踩坑记录(重要)

1. `.secrets/api.env` 曾有 CRLF 行尾 + BASE_URL 带尾斜杠且缺 `/v1`,导致拼出 `//models` 这类路径,服务端一律走 SPA 回退(GET 200 HTML / POST 404)。**已修复为 `http://35.212.161.237:8000/v1`**;排查方法:服务端 access log 看真实到达的 path。
2. key 无效时返回 JSON 401;SPA HTML 响应 = 路径没匹配上,先查 URL 拼接。
3. 2026-09-24 21:55 前后生图/视频均 429 `upstream_quota_exhausted`;服务端日志显示多个 console 账号"账号不存在"、build 账号 "User account is blocked"——**账号池需要清理/补充,或等额度恢复后重试**。

## wisart(gpt-image-2,备用生图)

OpenAI 兼容,`Bearer sk-xxx`;`/v1/images/generations`(同步,b64_json 默认)、`/v1/images/edits`(multipart 或 JSON,最多 16 图)。size 支持 `1200x675` 等任意宽高;quality medium→2K、high→4K。账号有 2265 积分。当前 key 未配置。
