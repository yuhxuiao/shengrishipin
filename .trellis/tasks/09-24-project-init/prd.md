# PRD — 项目初始化与基础调研

## 需求

为"生日视频"项目(4 分钟 2 岁宝宝生日动画,主角挖掘机开开,2026-10-18 用)完成:

1. 项目初始化:目录结构、Trellis 工作流、Git 仓库
2. AI 资源调研:gpt-image-2、grok-image、视频生成资源的可用性、端点、鉴权、调用方式
3. 本机工具链调研:ffmpeg、TTS、字体、GPU 等制作能力
4. 沉淀文档:剧本 v1(用户已提供开场+互动段)、制作方案、长期规划(PlanTree)

## 验收标准

- [x] `trellis init` 完成(kimi/claude/codex/opencode),Git 仓库建立
- [x] `docs/research/ai-资源调研.md`:三个 API 项目能力、端点、模型名、调用示例、在线状态实测
- [x] `docs/research/本机工具链调研.md`:工具清单、缺口与补充建议
- [x] `docs/剧本-v1.md`:用户已定稿部分原样收录,后半段给出待确认建议草案
- [x] `docs/制作方案.md`:端到端管线、角色一致性策略、工作量估算、前置依赖
- [x] `docs/plantree/`:P001 Plan(roadmap、open-questions、决策 001)

## 结论摘要

- 视频生成:仅 grok2api(`grok-imagine-video`,远程在线,需 g2a key + Super 账号,待验证)
- 生图:gpt-image-2 端点 502 待修复;`grok-imagine-image` 在线可顶替
- 本机:ffmpeg+中文字体+nvenc 就绪;缺 edge-tts 与 BGM 素材

## 交接

后续工作按 `docs/plantree/plans/001-birthday-video/roadmap.md` 的 Next 推进,首个阻塞项是 T004(密钥与账号)。
