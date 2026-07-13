# 安全策略

## 支持的版本

| 版本 | 安全更新 |
|------|---------|
| 最新版 (master) | ✅ 支持 |

## 报告安全漏洞

如果发现安全漏洞，**请不要在 GitHub Issues 中公开报告**。

请通过以下方式私密报告：

1. 在 GitHub 上创建一个 [Security Advisory](https://github.com/yanzhkun-wq/ev-smart-control-system/security/advisories/new)
2. 或发送邮件给项目维护者

我们会在 48 小时内确认收到报告，并尽快修复。

## 安全注意事项

- 设备网关的 TCP 端口（7611）和 HTTP 端口（7612）**不应直接暴露在公网**
- 生产环境建议在网关前配置反向代理和 HTTPS
- `REGISTER_AUTH_CODE` 应设置为高强度随机字符串
- 微信小程序的 AppSecret 等敏感信息使用环境变量注入，不要硬编码在代码中
