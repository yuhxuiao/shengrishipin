# 决策 001:生成走云端 API,本机只做合成

- 日期:2026-09-24
- 状态:已接受

## 背景

需要 AI 生图(角色/关键帧)与 AI 生视频(片段)。本机 GPU 为 GTX 1650 Mobile(4GB VRAM,无 Tensor Core),本地跑生成模型不现实;本机已有可复用的云端 API 项目(chatgpt2api、grok2api)。

## 决定

- 生图/生视频全部调用云端 API(chatgpt2api 的 gpt-image-2、grok2api 的 grok-imagine 系列)。
- 本机职责:prompt 管理、素材下载整理、edge-tts 配音、ffmpeg 合成与 nvenc 编码。
- TTS 选 edge-tts(在线)而非本地大模型。

## 后果

- 优点:零本地算力需求,质量上限高;本机工具链(ffmpeg/字体/硬编)已就绪。
- 代价:依赖远程服务可用性与账号额度(见 baseline/risk-hotspots.md 第 1、2、6 条);密钥需妥善管理、不入库。
- 被否决方案:本地部署 SD/视频生成模型(显存不足);租用 GPU 实例(成本与复杂度不值,云端 API 已存在)。
