import { Alert, App, Button, Card, Col, Form, Input, Row, Select, Space, Typography } from "antd";
import { useAdminGateway } from "../context/AdminGatewayContext";
import { gatewayFetch } from "../api/client";
import { useEffect, useState } from "react";

export type RemotePageProps = { embedded?: boolean };

export function RemotePage({ embedded = false }: RemotePageProps = {}) {
  const { modal, message } = App.useApp();
  const { deviceRows } = useAdminGateway();
  const [terminal, setTerminal] = useState<string | undefined>(deviceRows[0]?.terminalPhone);

  useEffect(() => {
    if (deviceRows.length && !deviceRows.some((d) => d.terminalPhone === terminal)) {
      setTerminal(deviceRows[0]!.terminalPhone);
    }
  }, [deviceRows, terminal]);
  const [note, setNote] = useState("");

  const confirm = (title: string, content: string, fn: () => Promise<void>) => {
    modal.confirm({
      title,
      content,
      okText: "确认执行",
      okType: "danger",
      cancelText: "取消",
      onOk: () => fn(),
    });
  };

  const send = async (action: string) => {
    const phone = terminal;
    if (!phone) {
      message.warning("请选择终端");
      return;
    }
    try {
      await gatewayFetch(`/api/terminal/${encodeURIComponent(phone)}/command`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      message.success(`已下发 ${action}${note ? ` · 备注：${note}` : ""}`);
    } catch (e) {
      message.error(String(e));
    }
  };

  return (
    <div>
      {!embedded ? (
        <>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            远程控制
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
            经网关下发 0x8105；终端须在线。备注仅记录在管理端会话，后续可接入审计表。
          </Typography.Paragraph>
        </>
      ) : null}

      <Alert
        type="info"
        showIcon
        message="终端离线时会返回 503；命令字以网关当前适配为准。"
        style={{ marginBottom: 16 }}
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Form layout="inline">
          <Form.Item label="目标终端">
            <Select
              style={{ minWidth: 260 }}
              placeholder="选择终端"
              value={terminal}
              onChange={setTerminal}
              options={deviceRows.map((d) => ({ label: `${d.plate} (${d.terminalPhone})`, value: d.terminalPhone }))}
            />
          </Form.Item>
          <Form.Item label="操作备注">
            <Input placeholder="本地备注" style={{ width: 240 }} value={note} onChange={(e) => setNote(e.target.value)} />
          </Form.Item>
        </Form>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} lg={8}>
          <Card title="安全 · 设防" size="small">
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                type="primary"
                block
                onClick={() =>
                  confirm("外部设防", "将下发 0x8105 命令字 0x66，确认？", () => send("lock"))
                }
              >
                外部设防（0x66）
              </Button>
              <Button
                block
                onClick={() =>
                  confirm("外部撤防", "将下发 0x8105 命令字 0x67，确认？", () => send("unlock"))
                }
              >
                外部撤防（0x67）
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Card title="终端维护（未接网关）" size="small">
            <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
              复位/出厂等命令字因机型差异大，未在演示网关中硬编码；可在协议确定后扩展 HTTP 参数。
            </Typography.Paragraph>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button disabled block>
                终端复位（预留）
              </Button>
              <Button disabled block>
                恢复出厂（预留）
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Card title="车辆油路（高危）" size="small">
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                danger
                block
                onClick={() =>
                  confirm("断油电", "将下发 0x8105 命令字 0x64，请确认安全与授权。", () => send("cut"))
                }
              >
                断油电（0x64）
              </Button>
              <Button
                block
                type="primary"
                ghost
                onClick={() =>
                  confirm("恢复油电", "将下发 0x8105 命令字 0x65，确认？", () => send("restore"))
                }
              >
                恢复油电（0x65）
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
