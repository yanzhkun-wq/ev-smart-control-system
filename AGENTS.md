# 电动车智控系统 — 协作说明

面向：后续在本仓库里用 Cursor / 其他工具协作的人与 AI。

## 目标

- 设备侧：厂家 **808**（JT/T 808 或私有扩展），通过 **适配层** 接入，便于换厂家。
- 用户侧：未来 **App / Web** 只调 **统一 HTTP API**，不直连车载协议。

## 目录（当前约定）

| 路径 | 说明 |
|------|------|
| `.cursor/rules/` | Cursor 长期项目规则（会话外记忆） |
| `docs/protocol/` | 厂家协议 PDF、报文样例、字段对照表；已含 **WZ标准版808协议V28.pdf** 与 **WZ-808-V28-summary.md** |
| `docs/hardware-capabilities.md` | 硬件功能与客户需求（图片索引 + 原始清单） |
| `docs/全量功能规格.md` | **系统全量功能规格**（三张图 + WZ808 V2.8 合并；开发与验收主文档） |
| `apps/admin-web/` | 管理端 Web 原型（React + Ant Design；后续接 API） |
| `apps/wechat-simple-prototype/` | **小白演示小程序**（原生，无 Node；导入本目录即可预览） |
| `apps/ev-mobile/` | **微信小程序 + App**（uni-app Vue3；需 `npm run dev:mp-weixin` 生成 `dist`） |
| `services/device-gateway/` | 808 长连接网关（TCP），协议解析与厂家差异收口在此 |

## 给 AI 的硬约束

- 未点名的文件不要顺手重构；改动范围以用户当前任务为准。
- 新厂家：优先 **新 adapter + 配置**，不复制整套业务。

## Git

若本机已安装 Git，在仓库根目录执行：`git init`，并关联远程仓库做备份。
