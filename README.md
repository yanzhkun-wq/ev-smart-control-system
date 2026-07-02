<p align="center">
  <h1 align="center">🛵 EV Smart Control System</h1>
  <p align="center">
    <strong>开源的电动车智能定位与安全报警平台</strong><br/>
    为每一辆电动车提供可靠的安全守护 —— 完全开源 · 社区驱动 · 公益优先
  </p>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <a href="#"><img src="https://img.shields.io/badge/protocol-JT%2FT808-green.svg" alt="JT/T808"></a>
  <a href="#"><img src="https://img.shields.io/badge/status-active-success.svg" alt="Status: Active"></a>
  <a href="https://github.com/yanzhkun-wq/ev-smart-control-system/issues"><img src="https://img.shields.io/badge/issues-welcome-orange" alt="Issues Welcome"></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/CHANGELOG-active-brightgreen" alt="CHANGELOG"></a>
  <a href="https://github.com/yanzhkun-wq/ev-smart-control-system/stargazers"><img src="https://img.shields.io/github/stars/yanzhkun-wq/ev-smart-control-system?style=flat" alt="GitHub Stars"></a>
  <img src="https://img.shields.io/github/languages/code-size/yanzhkun-wq/ev-smart-control-system" alt="Code Size">
  <a href="https://github.com/yanzhkun-wq/ev-smart-control-system/actions"><img src="https://img.shields.io/github/actions/workflow/status/yanzhkun-wq/ev-smart-control-system/ci.yml?branch=master&label=CI" alt="CI"></a>
  <img src="https://img.shields.io/badge/tests-79%20passing-brightgreen" alt="Tests: 79 passing"></a>
</p>

---

## 🌍 项目使命

在中国，每年有数十万辆电动车被盗，电池被盗更是高频事件。而市面上的定位防盗方案几乎全是商业闭源产品——价格高昂、数据不透明、用户被锁定在特定品牌。

**EV Smart Control System** 旨在改变这一现状。我们提供一个**完全开源、自由使用**的电动车智能安全平台，让任何开发者、社区、甚至个人都能为自己的电动车搭建安全防护系统。

> 💡 **核心理念**：安全不应该只属于买得起昂贵设备的人。开源让安全普惠成为可能。

## 🎯 项目目标

| 目标 | 说明 |
|------|------|
| **安全普惠** | 零成本搭建电动车安全监控系统 |
| **开放协议** | 基于国标 JT/T808，兼容主流硬件设备 |
| **隐私自主** | 数据归用户所有，不经过第三方服务器 |
| **社区共建** | 欢迎贡献者参与，打造最完善的开源车联网安全方案 |

## ✨ 核心功能

- 🔐 **设备绑定与管理** — 设备编号绑定、用户-设备关联、在线/离线监控
- 🎮 **远程控制** — 断电、通电、锁车、解锁（符合协议规范）
- 📍 **实时定位** — GPS + 北斗 + Wi-Fi + LBS 多重定位，实时刷新
- 🗺️ **轨迹回放** — 365 天历史轨迹存储与地图回放
- 🚧 **电子围栏** — 自定义绘制区域，进出边界自动检测与报警
- ⚠️ **异常告警** — 超速、震动、主电断开、非法拆除等实时通知
- 👥 **车队管理** — 支持多设备、多用户灵活绑定

## 🛠️ 技术栈

| 层 | 技术 |
|------|--------|
| **协议网关** | Node.js + TypeScript，JT/T808 TCP 长连接 |
| **管理后台** | React + Ant Design + Leaflet |
| **移动端** | 微信小程序（可扩展 uni-app）|
| **部署** | Docker Compose |

## 📁 项目结构

```
├── apps/
│   ├── admin-web/                  # PC 管理后台 (React + Ant Design)
│   ├── ev-mobile/                  # 微信小程序 & App (uni-app, Vue3)
│   └── wechat-simple-prototype/    # 微信小程序快速原型
├── services/
│   └── device-gateway/             # JT/T808 TCP 设备网关 (Node.js + TypeScript)
├── docs/
│   ├── 全量功能规格.md              # 完整功能清单
│   ├── hardware-capabilities.md    # 硬件能力说明
│   └── protocol/                   # 厂家协议文档与样例报文
├── docker-compose.yml              # 一键部署配置
├── CHANGELOG.md                    # 更新日志
├── ROADMAP.md                      # 项目路线图
├── CONTRIBUTING.md                 # 贡献指南
└── LICENSE                         # MIT 开源许可证
```

## 🚀 快速开始

### 前置条件
- Node.js 18+
- Docker（可选，用于容器化部署）

### 本地开发

```bash
# 启动设备网关
cd services/device-gateway
npm install
npm run dev
# 默认监听 TCP 7611，HTTP API 7612

# 启动管理后台
cd apps/admin-web
npm install
npm run dev
# 浏览器访问 http://localhost:5173
```

### Docker 部署

```bash
docker-compose up -d
# 网关 :7611 | 管理端 :80
```

## 📚 了解更多

| 文档 | 说明 |
|------|------|
| [CHANGELOG.md](CHANGELOG.md) | 版本更新记录 |
| [ROADMAP.md](ROADMAP.md) | 项目开发路线图 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 参与贡献指南 |
| [docs/全量功能规格.md](docs/全量功能规格.md) | 完整功能清单与协议对照 |
| [docs/hardware-capabilities.md](docs/hardware-capabilities.md) | 兼容硬件能力说明 |
| [Issues](https://github.com/yanzhkun-wq/ev-smart-control-system/issues) | 问题追踪与讨论 |

## 🤝 参与贡献

我们非常欢迎社区贡献！无论你是：
- 🛠 硬件开发者 — 帮助适配更多设备型号
- 🎨 前端工程师 — 优化管理后台和移动端体验
- 📡 协议专家 — 完善 JT/T808 等协议实现
- 📝 文档贡献者 — 改进文档、翻译、教程

请看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解如何开始。

## 📜 许可证

本项目采用 [MIT License](LICENSE) —— 你可以自由使用、修改、分发，只需保留版权声明。

## ⭐ 支持我们

如果你觉得这个项目有价值，请给我们一个 **Star** ⭐！这有助于更多需要的人发现这个项目。

---

<p align="center">
  <sub>Built with ❤️ by the open-source community for public good.</sub>
</p>
