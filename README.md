# 电动车智控系统

808 设备网关 + 可扩展厂家适配；上层 API 预留，便于后续做 App。

## 结构

- `apps/admin-web` — **PC 管理端原型**（React + Ant Design）。
- `apps/ev-mobile` — **微信小程序 + App（uni-app，Vue3）** 车主端原型，见该目录 `README.md`。
- `services/device-gateway` — Node.js（TypeScript）TCP 网关，JT/T 808 帧解析骨架。
- `docs/protocol` — 放置厂家协议与样例报文。
- `docs/全量功能规格.md` — 系统功能清单（与界面对齐）。

## 网关本地运行

```bash
cd services/device-gateway
npm install
npm run dev
```

默认监听 **7611**（可在环境变量 `GATEWAY_PORT` 中修改）。

## 管理端原型（预览 UI）

```bash
cd apps/admin-web
npm install
npm run dev
```

浏览器访问 `http://localhost:5173` 。构建与 Docker 说明见 `apps/admin-web/README.md`。

## 微信小程序（小白最简单，无需 Node）

1. 安装 **微信开发者工具** 并登录。  
2. **导入** 文件夹：`apps/wechat-simple-prototype`（选测试号 AppID）。  
3. 更详细的图文说明见：`apps/wechat-simple-prototype/小白必读.txt`。

## 微信小程序 / App（uni-app，与 App 同源需编译）

```bash
cd apps/ev-mobile
npm install
npm run dev:mp-weixin
```

用 **微信开发者工具** 导入目录 `apps/ev-mobile/dist/dev/mp-weixin`。详细步骤见 `apps/ev-mobile/README.md`。

## Git

本机安装 Git 后，在仓库根目录执行 `git init` 并添加远程仓库。
