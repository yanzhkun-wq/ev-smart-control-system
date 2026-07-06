# 电动车智控 · 移动端（uni-app）

**一套代码**可编译为：

	- **Android / iOS App**（无微信依赖，独立运行）
	- **H5**（浏览器直接访问）
	- **微信小程序**（可选）

技术栈：**Vue 3 + TypeScript + Vite + uni-app**，与《全量功能规格》中的车主/车队端能力对齐（地图、告警、轨迹、围栏、远程控制入口等）。数据当前为 **mock**，后续接你方业务 API。

## 环境要求

- **Node.js 18+**、npm
- **HBuilderX**（编译 App 时需要，可选）
- 微信开发者工具（编译微信小程序时需要，可选）

## 安装与运行

```bash
cd apps/ev-mobile
npm install

# 浏览器预览（不需要任何额外工具）
npm run dev:h5

# 编译 Android/iOS App（需 HBuilderX）
npm run build:app

# 编译微信小程序
npm run build:mp-weixin
```

### 浏览器预览（推荐，最快上手）

```bash
npm run dev:h5
```

然后在浏览器打开控制台输出的地址（通常是 `http://localhost:5173`），即可直接预览完整移动端界面。App 端的地图、定位等功能与 H5 基本一致。

## 发行 App（简要）

1. 安装 **HBuilderX**，用其打开本目录（或按 [uni-app 离线打包](https://uniapp.dcloud.net.cn/tutorial/app-mp.html) 文档操作）。
2. 菜单 **发行 → 原生 App-云打包**，按向导配置证书与包名。
3. 或使用 CLI：`npm run build:app` 后按 DCloud 文档集成 Android Studio / Xcode。

详细以 [uni-app 官方文档](https://uniapp.dcloud.net.cn/) 为准。

## 与「后续变 App」的关系

| 方式 | 说明 |
|------|------|
| **uni-app（本工程）** | 业务页面写一次，**微信小程序 + App** 共用；地图/推送等需各端做少量条件编译。 |
| **纯原生 / Flutter** | 与小程序 **不能** 自动同源；需另起项目或只做 H5 内嵌。 |

当前选型 **uni-app** 是为了满足你「先小程序、再 App」且尽量 **少重复开发**。

## 脚本说明

| 命令 | 作用 |
|------|------|
| `npm run dev:mp-weixin` | 微信小程序开发模式 |
| `npm run build:mp-weixin` | 微信小程序生产构建 |
| `npm run dev:h5` | 浏览器调试（部分能力可能与小程序有差异） |
| `npm run dev:app` | App 开发（需 HBuilderX 或本地 SDK 配合） |

## 管理端 Web

PC 管理后台原型仍在 `apps/admin-web`；小程序侧重 **车主/车队长** 移动端场景，二者共用同一后端 API（待开发）。
