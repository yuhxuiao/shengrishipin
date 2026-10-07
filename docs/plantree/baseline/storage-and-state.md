# Storage and State

- 素材产物:`assets/{images,clips,audio,bgm}/`,文件命名建议 `<镜头号>-<内容>-<日期>.<ext>`。
- 成片:`output/`(gitignore,不入库)。
- 密钥:统一放 `.secrets/api.env`(已被 .gitignore 排除),变量约定 `GROK2API_BASE_URL/GROK2API_API_KEY`(图像+视频,base 含 /v1)、`WISART_BASE_URL/WISART_API_KEY`(智画创 gpt-image-2);脚本用 `source .secrets/api.env` 读取,**密钥不入 git、不写进文档**。
- 远程服务状态:grok2api 在线情况、账号池余量属于外部状态,调用前实测,不在文档中假设。
