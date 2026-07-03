# EV Smart Control System — HTTP API 参考

设备网关默认监听 `HTTP_PORT=7612`，提供 RESTful HTTP 接口供管理后台与第三方集成。

**Base URL:** `http://<gateway-ip>:7612`

## 通用说明

- 请求/响应均为 `application/json; charset=utf-8`
- 所有接口均开启 CORS（`Access-Control-Allow-Origin: *`）
- 鉴权：当前版本通过环境变量 `REGISTER_AUTH_CODE` 校验终端注册；管理端 API 暂未内置 JWT（建议在生产环境通过反向代理添加）

---

## 服务健康

### `GET /health`

检测网关是否存活。

**Response 200:**
```json
{
  "ok": true,
  "service": "ev-device-gateway",
  "ts": "2026-07-03T12:00:00.000Z"
}
```

---

## 小程序 UI 配置

### `GET /api/miniapp-ui`

获取微信小程序前端需要的运行时配置：页面列表、功能开关、首页布局、订阅模板等。

**Response 200:**
```json
{
  "ok": true,
  "pages": [
    { "route": "pages/home/home", "navigationBarTitle": "电动车安全守护", "enabled": true },
    { "route": "pages/hardware/hardware", "navigationBarTitle": "兼容硬件", "enabled": true }
  ],
  "features": {
    "home_show_hero": true,
    "home_show_remote": true,
    "profile_svc_tracks": true
  },
  "homeLayout": { "blocks": [] },
  "alarmSubscribeTmplIds": ["template_id_xxx"],
  "miniappWxAppId": "wx1234567890abcdef",
  "ts": "2026-07-03T12:00:00.000Z"
}
```

### `POST /api/miniapp/alarm-subscribe`

登记微信小程序用户的报警订阅消息授权。

**Request body:**
```json
{
  "code": "wx.login_code_string",
  "acceptTmplIds": ["template_id_1", "template_id_2"]
}
```

**Response 200:**
```json
{ "ok": true }
```

**Error responses:**
- `400` — 缺少 `code` 参数
- `503` — 网关未配置 `WECHAT_MP_APPID` / `WECHAT_MP_SECRET`

---

## 存储管理

### `GET /api/store`

获取完整存储状态（包含 binds、lastPositions、settings、admin 配置）。

**Response 200:**
```json
{
  "binds": [
    { "terminalPhone": "13800138000", "plate": "粤A·D12345", "note": "测试车" }
  ],
  "lastPositions": {
    "13800138000": {
      "terminalPhone": "13800138000",
      "latDeg": 23.125,
      "lngDeg": 113.255,
      "speedKmh": 35,
      "alarm": 0,
      "status": 256,
      "receivedAt": "2026-07-03T00:00:00Z",
      "accOn": true,
      "positioned": true
    }
  },
  "settings": { "registerAuthCode": "my_auth_code" },
  "admin": { "mapProvider": "高德", "geofences": [], "alerts": [] }
}
```

### `PUT /api/store`

更新存储状态。支持部分更新，未提供的字段保持原值。

**Request body（可按需只传要改的字段）:**
```json
{
  "binds": [
    { "terminalPhone": "13800138000", "plate": "粤A·D12345", "note": "测试车" }
  ],
  "admin": {
    "mapProvider": "百度",
    "geofences": [
      { "key": "g1", "name": "总部停车场", "type": "圆形", "bindPlates": "粤A·D12345", "alarm": "出区域", "enabled": true }
    ]
  }
}
```

**Response 200:**
```json
{ "ok": true }
```

---

## 终端管理

### `GET /api/terminals`

获取所有已绑定终端及其在线状态、最后位置。

**Response 200:**
```json
{
  "binds": [
    {
      "terminalPhone": "13800138000",
      "plate": "粤A·D12345",
      "note": "测试车",
      "online": true,
      "last": {
        "latDeg": 23.125,
        "lngDeg": 113.255,
        "speedKmh": 35,
        "alarm": 0,
        "status": 256,
        "receivedAt": "2026-07-03T00:00:00Z"
      }
    }
  ],
  "onlineSockets": [
    { "phoneKey": "13800138000", "remote": "192.168.1.100:45231" }
  ]
}
```

### `POST /api/bind`

绑定新终端（车辆）。

**Request body:**
```json
{
  "terminalPhone": "13800138999",
  "plate": "粤B·NEW001",
  "note": "可选备注"
}
```

**Response 200:**
```json
{ "ok": true, "terminalPhone": "13800138999" }
```

**Error:** `400` — 缺少 `terminalPhone` 或 `plate`

### `DELETE /api/bind/:terminalPhone`

解绑终端。

**Response 200:**
```json
{ "ok": true }
```

---

## 终端状态与轨迹

### `GET /api/terminal/:phone/status`

获取指定终端的在线状态与最后位置。

**Response 200:**
```json
{
  "terminalPhone": "13800138000",
  "online": true,
  "last": {
    "latDeg": 23.125,
    "lngDeg": 113.255,
    "speedKmh": 35,
    "alarm": 0,
    "status": 256,
    "receivedAt": "2026-07-03T00:00:00Z"
  }
}
```

### `GET /api/terminal/:phone/track-days`

获取指定终端有轨迹数据的天数列表。

**Response 200:**
```json
{
  "terminalPhone": "13800138000",
  "days": ["2026-07-01", "2026-07-02", "2026-07-03"]
}
```

**Error:** `503` — 轨迹服务未初始化

### `GET /api/terminal/:phone/tracks?date=YYYY-MM-DD`

获取指定终端某天的轨迹点列表。

**Query parameters:**
| 参数 | 必填 | 说明 |
|------|------|------|
| `date` | 是 | 日期，格式 `YYYY-MM-DD` |

**Response 200:**
```json
{
  "terminalPhone": "13800138000",
  "date": "2026-07-03",
  "points": [
    {
      "src": "0200",
      "receivedAt": "2026-07-03T00:00:00Z",
      "deviceTime": "2026-07-03T00:00:00Z",
      "lat": 23.125,
      "lng": 113.255,
      "speedKmh": 35,
      "direction": 90,
      "alarm": 0,
      "status": 256
    }
  ]
}
```

**Error:** `400` — 缺少或格式错误的 `date` 参数

---

## 远程控制

### `POST /api/terminal/:phone/command`

向终端下发远程控制指令（符合 JT/T 808 0x8105 协议）。

**Request body:**
```json
{
  "action": "lock"
}
```

**支持的 action 值：**

| action | 含义 | 协议命令 |
|--------|------|----------|
| `lock` / `arm` | 设防/锁车 | 0x66 |
| `unlock` / `disarm` | 撤防/解锁 | 0x67 |
| `cut` / `cut_fuel` | 断油/断电 | 0x64 |
| `restore` / `restore_fuel` | 恢复油电 | 0x65 |

**Response 200:**
```json
{ "ok": true, "action": "lock", "cmd": "0x66" }
```

**Error responses:**
- `400` — action 不在支持列表中
- `503` — 终端未连接（离线）

---

## 错误响应格式

```
Status: 4xx / 5xx
{
  "ok": false,
  "reason": "错误描述"
}
```

## 附录：JT/T 808 消息类型

| 消息 ID | 方向 | 说明 |
|---------|------|------|
| 0x0001 | 平台→终端 | 通用应答 |
| 0x0002 | 终端→平台 | 心跳 |
| 0x0100 | 终端→平台 | 终端注册 |
| 0x0102 | 终端→平台 | 终端鉴权 |
| 0x0200 | 终端→平台 | 位置信息汇报 |
| 0x0704 | 终端→平台 | 批量位置信息汇报 |
| 0x8100 | 平台→终端 | 注册应答（下发鉴权码）|
| 0x8105 | 平台→终端 | 终端控制 |
