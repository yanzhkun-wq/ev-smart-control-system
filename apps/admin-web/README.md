# 电动车智控系统 — 管理端前端原型

基于《全量功能规格》的管理端界面原型：**演示数据 + 可交互地图**，用于确认功能范围与信息架构。后续将同一套页面接入真实 REST / WebSocket。

## 本地运行

需要 Node.js **18+**。

```bash
cd apps/admin-web
npm install
npm run dev
```

浏览器打开 `http://localhost:5173` 。

## 生产构建

```bash
npm run build
```

静态资源在 `dist/`，可用任意静态服务器或下方 Docker 部署。

## Docker 部署示例

在 `apps/admin-web` 目录：

```bash
docker build -t ev-zhikong-admin .
docker run -p 8080:80 ev-zhikong-admin
```

访问 `http://localhost:8080` 。

## 模块与规格对应

| 路由        | 规格要点        |
|-------------|-----------------|
| `/`         | 工作台、概览    |
| `/monitor`  | T-15 实时地图   |
| `/devices`  | 设备档案、状态  |
| `/tracks`   | T-11~T-14 轨迹  |
| `/alerts`   | A-01~A-10 告警  |
| `/geofences`| F-01~F-04 围栏  |
| `/fleet`    | O-01~O-04 车队  |
| `/remote`   | C/S 远程控制    |
| `/settings` | 系统与兼容配置  |

地图当前为 **OpenStreetMap**，国内生产环境可替换为高德/百度并配置 Key（见系统设置页占位项）。
