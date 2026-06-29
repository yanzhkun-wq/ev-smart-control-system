# device-gateway — 808 TCP + HTTP API（可部署）

最小可跑闭环：**终端 TCP 连本服务** → 处理注册/鉴权/心跳/0x0200 → **JSON 落盘**；小程序或 Postman 通过 **HTTP** 查状态、下发 **0x8105** 控制（设防/撤防/断油电等，与 WZ 协议摘录一致，真机不接受时需按厂家抓包改命令字）。

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `GATEWAY_PORT` | `7611` | 终端连接 TCP 端口（808 长连接） |
| `HTTP_PORT` | `7612` | HTTP API |
| `DATA_DIR` | `./data` | 数据目录（含 `evo-gateway-store.json`） |
| `REGISTER_AUTH_CODE` | `ZHIKONG1` | 0x8100 鉴权码；终端 0x0102 须上报**相同内容**（与厂家配置对齐时可改） |

## 本地运行

```bash
cd services/device-gateway
npm install
npm run build
npm start
```

开发热重载：`npm run dev`

## HTTP API（JSON）

- `GET /health`
- `GET /api/store` — 完整持久化 JSON（`binds`、`lastPositions`、`settings`、`admin`），供管理端编辑
- `PUT /api/store` — 整体更新；可与当前磁盘数据按字段合并（缺省字段保留），`admin` 浅合并
- `POST /api/bind` body: `{ "terminalPhone": "13800138000", "plate": "京A12345" }`
- `GET /api/terminals` — 绑定列表 + 是否在线 + 最后位置
- `GET /api/terminal/{phone}/status`
- `POST /api/terminal/{phone}/command` body: `{ "action": "lock"|"unlock"|"arm"|"disarm"|"cut"|"restore" }`
  - `lock`/`arm` → 0x66 外部设防；`unlock`/`disarm` → 0x67；`cut` → 0x64；`restore` → 0x65  
- `GET /api/terminal/{phone}/track-days` — 已有轨迹日期列表（`data/tracks/{phone}/*.jsonl`）
- `GET /api/terminal/{phone}/tracks?date=YYYY-MM-DD` — 当日轨迹点（JSON 数组）
- `DELETE /api/bind/{phone}`

**0x0102 鉴权**：报文体须与 `settings.registerAuthCode`（或环境变量首次种子）**完全一致**（UTF-8/Latin1 文本，遇 `0x00` 截断）；失败时平台通用应答 **结果码 1**。

**0x0200 / 0x0704**：解析 28 字节基本位置 + 常见 TLV（里程 0x01、CSQ 0x30、卫星 0x31、电量 0x56、主电电压 0x61、ICCID 0xF1、设防附 0xF3、扩展报警 0xF4）；状态位拆解 ACC/设防/主电等写入 `last`；每条位置追加写入轨迹 JSONL。

CORS：`Access-Control-Allow-Origin: *`（生产请改为你的小程序域名）。

## Docker

```bash
docker build -t ev-device-gateway .
docker run -p 7611:7611 -p 7612:7612 -e REGISTER_AUTH_CODE=你的鉴权码 ev-device-gateway
```

生产环境应在 **HTTPS 反向代理**（如 Nginx）后暴露 `HTTP_PORT`，**不要**把 7612 直接裸奔公网；TCP 7611 需对公网或专线开放给设备。

## 与小程序演示版对接

1. 小程序「账号设置」中填写 **808 平台 API** 根地址（与 `HTTP_PORT` 一致，经 HTTPS）。
2. 绑定车辆时填写 **终端号**（与 808 消息头 BCD 手机号一致的 11 位），与设备里配置一致。
3. 微信公众平台将该 HTTPS 域名加入 **request 合法域名**。

**说明**：围栏/告警业务、用户体系、支付等仍须按需扩展；当前网关为**联调与上线第一步**骨架。
