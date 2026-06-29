import {
  App,
  Button,
  Card,
  Divider,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
  Tabs,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { useAdminGateway } from "../context/AdminGatewayContext";
import type { StoreShape } from "../types/gatewayStore";

export function SettingsPage() {
  const { message } = App.useApp();
  const { apiBase, setApiBase, store, terminals, connected, loading, saveStore, refresh } = useAdminGateway();
  const [gwInput, setGwInput] = useState(apiBase);

  useEffect(() => {
    setGwInput(apiBase);
  }, [apiBase]);

  const [apiForm] = Form.useForm();
  const [gwForm] = Form.useForm();
  const [mapForm] = Form.useForm();
  const [notifyForm] = Form.useForm();
  const [compatForm] = Form.useForm();
  const [rawJson, setRawJson] = useState("");

  useEffect(() => {
    if (!store) return;
    const a = store.admin ?? {};
    apiForm.setFieldsValue({
      restApiBase: a.restApiBase ?? "",
      wsUrl: a.wsUrl ?? "",
      jwtRefreshMin: a.jwtRefreshMin ?? 30,
    });
    gwForm.setFieldsValue({
      registerAuthCode: store.settings?.registerAuthCode ?? "",
    });
    mapForm.setFieldsValue({
      mapProvider: a.mapProvider ?? "",
      mapWebKey: a.mapWebKey ?? "",
      mapStreetView: a.mapStreetView ?? true,
    });
    notifyForm.setFieldsValue({
      notifyFcm: a.notifyFcm ?? "",
      notifySms: a.notifySms ?? "",
      notifyWebhook: a.notifyWebhook ?? "",
      miniappWxAppId: a.miniappWxAppId ?? "",
      miniappAlarmSubscribeTmplIds: (a.miniappAlarmSubscribeTmplIds ?? []).join("\n"),
    });
    compatForm.setFieldsValue({
      compatProtocolYear: a.compatProtocolYear ?? "",
      compatNoteTemplate: a.compatNoteTemplate ?? "",
      compatFlagsJson: JSON.stringify(a.compatFlags ?? {}, null, 2),
    });
    setRawJson(JSON.stringify(store, null, 2));
  }, [store, apiForm, gwForm, mapForm, notifyForm, compatForm]);

  const onlineN = terminals?.onlineSockets?.length ?? 0;

  const saveMerged = async (updater: (prev: StoreShape) => StoreShape) => {
    if (!store) {
      message.warning("请先连接网关并加载数据");
      return;
    }
    try {
      await saveStore(updater(JSON.parse(JSON.stringify(store)) as StoreShape));
      message.success("已保存");
    } catch (e) {
      message.error(String(e));
    }
  };

  const applyRaw = async () => {
    try {
      const parsed = JSON.parse(rawJson) as StoreShape;
      await saveStore(parsed);
      message.success("整库已写入");
    } catch (e) {
      message.error(`JSON 无效：${String(e)}`);
    }
  };

  const tabKeys = useMemo(
    () => ["api", "gateway", "map", "notify", "808compat", "raw"],
    [],
  );

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        系统设置
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        网关地址保存在浏览器本地；其余业务配置写入网关数据文件 <Typography.Text code>evo-gateway-store.json</Typography.Text>{" "}
       （通过 HTTP 同步）。
      </Typography.Paragraph>

      <Card size="small" style={{ marginBottom: 16 }} title="device-gateway HTTP">
        <Space wrap align="start">
          <div style={{ minWidth: 320, flex: 1 }}>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
              管理端连接的网关根地址（含端口，如 http://127.0.0.1:7612）
            </Typography.Text>
            <Space.Compact style={{ width: "100%", maxWidth: 520 }}>
              <Input value={gwInput} onChange={(e) => setGwInput(e.target.value)} placeholder="http://127.0.0.1:7612" />
              <Button
                type="primary"
                loading={loading}
                onClick={() => {
                  setApiBase(gwInput.trim());
                  void refresh();
                }}
              >
                应用并刷新
              </Button>
            </Space.Compact>
          </div>
          <div>
            <Typography.Text type={connected ? "success" : "secondary"}>
              {connected ? "已连接 health" : "未连接"}
            </Typography.Text>
          </div>
        </Space>
      </Card>

      <Tabs
        items={tabKeys.map((key) => {
          if (key === "api") {
            return {
              key,
              label: "接入与 API",
              children: (
                <Card size="small" title="后端 / WebSocket（写入 admin）">
                  <Form
                    form={apiForm}
                    layout="vertical"
                    style={{ maxWidth: 520 }}
                    onFinish={async (v) => {
                      await saveMerged((prev) => ({
                        ...prev,
                        admin: {
                          ...prev.admin,
                          restApiBase: String(v.restApiBase ?? ""),
                          wsUrl: String(v.wsUrl ?? ""),
                          jwtRefreshMin: Number(v.jwtRefreshMin) || 30,
                        },
                      }));
                    }}
                  >
                    <Form.Item label="REST API 基地址（业务后端，占位）" name="restApiBase">
                      <Input placeholder="https://api.example.com" />
                    </Form.Item>
                    <Form.Item label="实时通道 WebSocket" name="wsUrl">
                      <Input placeholder="wss://api.example.com/ws" />
                    </Form.Item>
                    <Form.Item label="JWT 刷新提前量（分钟）" name="jwtRefreshMin">
                      <InputNumber min={1} max={240} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit">
                        保存本页
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              ),
            };
          }
          if (key === "gateway") {
            return {
              key,
              label: "网关运维",
              children: (
                <Card size="small" title="808 注册鉴权（写入 settings）">
                  <Typography.Paragraph type="secondary">
                    TCP 监听端口、数据目录等仍由服务端环境变量控制；此处仅同步 0x8100 鉴权码等业务可改项。
                  </Typography.Paragraph>
                  <Typography.Paragraph>
                    当前 TCP 在线会话数：<strong>{onlineN}</strong>
                  </Typography.Paragraph>
                  <Form
                    form={gwForm}
                    layout="vertical"
                    style={{ maxWidth: 520 }}
                    onFinish={async (v) => {
                      await saveMerged((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          registerAuthCode: String(v.registerAuthCode ?? "").trim() || prev.settings.registerAuthCode,
                        },
                      }));
                    }}
                  >
                    <Form.Item
                      label="REGISTER_AUTH_CODE（0x8100）"
                      name="registerAuthCode"
                      rules={[{ required: true, message: "必填" }]}
                    >
                      <Input placeholder="与终端配置一致" />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit">
                        保存本页
                      </Button>
                    </Form.Item>
                  </Form>
                  <Divider />
                  <Typography.Text type="secondary">
                    生产环境请在反向代理后暴露 HTTPS；多实例时需会话粘性或终端路由。
                  </Typography.Text>
                </Card>
              ),
            };
          }
          if (key === "map") {
            return {
              key,
              label: "地图与街景",
              children: (
                <Card size="small" title="第三方 SDK（写入 admin）">
                  <Form
                    form={mapForm}
                    layout="vertical"
                    style={{ maxWidth: 520 }}
                    onFinish={async (v) => {
                      await saveMerged((prev) => ({
                        ...prev,
                        admin: {
                          ...prev.admin,
                          mapProvider: String(v.mapProvider ?? ""),
                          mapWebKey: String(v.mapWebKey ?? ""),
                          mapStreetView: !!v.mapStreetView,
                        },
                      }));
                    }}
                  >
                    <Form.Item label="地图服务商" name="mapProvider">
                      <Input placeholder="高德 / 百度 / OSM" />
                    </Form.Item>
                    <Form.Item label="Web Key" name="mapWebKey">
                      <Input.Password placeholder="前端 Key" />
                    </Form.Item>
                    <Form.Item label="启用街景跳转" name="mapStreetView" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit">
                        保存本页
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              ),
            };
          }
          if (key === "notify") {
            return {
              key,
              label: "告警推送",
              children: (
                <Card size="small" title="通道配置（写入 admin）">
                  <Form
                    form={notifyForm}
                    layout="vertical"
                    style={{ maxWidth: 520 }}
                    onFinish={async (v) => {
                      const rawTmpl = String(v.miniappAlarmSubscribeTmplIds ?? "");
                      const miniappAlarmSubscribeTmplIds = rawTmpl
                        .split(/[\s,，;；\n\r]+/)
                        .map((s) => s.trim())
                        .filter(Boolean);
                      await saveMerged((prev) => ({
                        ...prev,
                        admin: {
                          ...prev.admin,
                          notifyFcm: String(v.notifyFcm ?? ""),
                          notifySms: String(v.notifySms ?? ""),
                          notifyWebhook: String(v.notifyWebhook ?? ""),
                          miniappWxAppId: String(v.miniappWxAppId ?? "").trim(),
                          miniappAlarmSubscribeTmplIds,
                        },
                      }));
                    }}
                  >
                    <Form.Item label="App 推送" name="notifyFcm">
                      <Input />
                    </Form.Item>
                    <Form.Item label="短信网关" name="notifySms">
                      <Input />
                    </Form.Item>
                    <Form.Item label="企业微信 / 钉钉 Webhook" name="notifyWebhook">
                      <Input.TextArea rows={3} />
                    </Form.Item>
                    <Divider />
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                      微信小程序订阅消息：车主在小程序防盗报警页授权后，808 终端上报告警位时网关会向已登记用户下发订阅消息（须配置公众平台模板与网关
                      WECHAT_MP_SECRET）。
                    </Typography.Paragraph>
                    <Form.Item
                      label="小程序 AppID"
                      name="miniappWxAppId"
                      extra="可在此填写或仅用网关环境变量 WECHAT_MP_APPID；AppSecret 必须通过 WECHAT_MP_SECRET 提供给网关进程，切勿写入本页。"
                    >
                      <Input placeholder="wx…………" />
                    </Form.Item>
                    <Form.Item
                      label="报警订阅模板 ID"
                      name="miniappAlarmSubscribeTmplIds"
                      extra="每行一个或逗号分隔。默认下发字段为 thing1 / time2 / thing3，请与微信公众平台该模板的关键词一致。"
                    >
                      <Input.TextArea rows={4} placeholder="模板 ID，可多行" />
                    </Form.Item>
                    <Typography.Paragraph type="secondary">
                      当前已登记订阅用户（openid）：{" "}
                      <strong>{store?.admin?.miniappAlarmNotifySubscribers?.length ?? 0}</strong> 人
                    </Typography.Paragraph>
                    <Form.Item>
                      <Button type="primary" htmlType="submit">
                        保存本页
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              ),
            };
          }
          if (key === "808compat") {
            return {
              key,
              label: "客户 808 兼容",
              children: (
                <Card size="small" title="按终端/客户存储">
                  <Form
                    form={compatForm}
                    layout="vertical"
                    style={{ maxWidth: 640 }}
                    onFinish={async (v) => {
                      let flags: Record<string, string> = {};
                      try {
                        flags = JSON.parse(String(v.compatFlagsJson || "{}")) as Record<string, string>;
                        if (typeof flags !== "object" || flags === null) throw new Error("须为对象");
                      } catch (e) {
                        message.error(`compatFlags 须为 JSON 对象：${String(e)}`);
                        return;
                      }
                      await saveMerged((prev) => ({
                        ...prev,
                        admin: {
                          ...prev.admin,
                          compatProtocolYear: String(v.compatProtocolYear ?? ""),
                          compatNoteTemplate: String(v.compatNoteTemplate ?? ""),
                          compatFlags: flags,
                        },
                      }));
                    }}
                  >
                    <Form.Item label="默认协议版本" name="compatProtocolYear">
                      <Input placeholder="2013 / 2011" />
                    </Form.Item>
                    <Form.Item label="备注模板" name="compatNoteTemplate">
                      <Input.TextArea rows={4} />
                    </Form.Item>
                    <Form.Item
                      label="compatFlags（JSON 对象）"
                      name="compatFlagsJson"
                      extra='例：{"808_SFFLAG":"1"}'
                    >
                      <Input.TextArea rows={8} />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit">
                        保存本页
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              ),
            };
          }
          return {
            key: "raw",
            label: "原始 JSON",
            children: (
              <Card size="small" title="整库读写（高级）">
                <Typography.Paragraph type="secondary">
                  直接编辑网关持久化结构。错误 JSON 会导致保存失败；请谨慎修改 binds / lastPositions。
                </Typography.Paragraph>
                <Input.TextArea rows={22} value={rawJson} onChange={(e) => setRawJson(e.target.value)} />
                <Button type="primary" style={{ marginTop: 12 }} onClick={() => void applyRaw()}>
                  校验并保存
                </Button>
                <Button style={{ marginTop: 12, marginLeft: 8 }} onClick={() => store && setRawJson(JSON.stringify(store, null, 2))}>
                  从当前内存重置
                </Button>
              </Card>
            ),
          };
        })}
      />
    </div>
  );
}
