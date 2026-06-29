import { App, Button, Card, Drawer, Form, Input, Select, Space, Table, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { useAdminGateway } from "../context/AdminGatewayContext";
import type { AdminAlertRow, StoreShape } from "../types/gatewayStore";
import { doubleConfirmDelete } from "../utils/doubleConfirmDelete";

export type AlertsPageProps = { embedded?: boolean };

export function AlertsPage({ embedded = false }: AlertsPageProps = {}) {
  const { message } = App.useApp();
  const { store, saveStore } = useAdminGateway();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAlertRow | null>(null);
  const [form] = Form.useForm();

  const alerts = store?.admin?.alerts ?? [];

  useEffect(() => {
    if (!editing) return;
    form.setFieldsValue(editing);
  }, [editing, form]);

  const persistAlerts = async (nextList: AdminAlertRow[]) => {
    if (!store) return;
    const s: StoreShape = JSON.parse(JSON.stringify(store));
    s.admin = s.admin ?? {};
    s.admin.alerts = nextList;
    await saveStore(s);
  };

  const onFinish = async (v: Record<string, unknown>) => {
    const row: AdminAlertRow = {
      key: String(v.key || editing?.key || `a-${Date.now()}`),
      time: String(v.time ?? ""),
      terminalId: String(v.terminalId ?? ""),
      plate: String(v.plate ?? ""),
      type: String(v.type ?? ""),
      level: v.level as AdminAlertRow["level"],
      status: v.status as AdminAlertRow["status"],
      source: String(v.source ?? ""),
    };
    const list = [...alerts];
    const idx = list.findIndex((x) => x.key === row.key);
    if (idx >= 0) list[idx] = row;
    else list.unshift(row);
    try {
      await persistAlerts(list);
      message.success("已保存");
      setOpen(false);
      setEditing(null);
    } catch (e) {
      message.error(String(e));
    }
  };

  const remove = async (k: string) => {
    await persistAlerts(alerts.filter((x) => x.key !== k));
    message.success("已删除");
  };

  return (
    <div>
      {!embedded ? (
        <>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            告警中心
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
            列表数据存于网关 <Typography.Text code>admin.alerts</Typography.Text>，可在此增删改；真实设备告警接入后可用同结构由服务写入。
          </Typography.Paragraph>
        </>
      ) : null}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({
                key: `a-${Date.now()}`,
                level: "中",
                status: "未处理",
                time: new Date().toISOString().replace("T", " ").slice(0, 19),
              });
              setOpen(true);
            }}
          >
            新建告警记录
          </Button>
          <Typography.Text type="secondary">筛选查询为占位，数据量小时可直接表格浏览</Typography.Text>
        </Space>
      </Card>

      <Table
        rowKey="key"
        dataSource={alerts}
        columns={[
          { title: "时间", dataIndex: "time", width: 170 },
          { title: "车牌", dataIndex: "plate", width: 120 },
          { title: "终端号", dataIndex: "terminalId", width: 130 },
          { title: "类型", dataIndex: "type" },
          {
            title: "级别",
            dataIndex: "level",
            width: 72,
            render: (l: string) =>
              l === "高" ? <Tag color="red">{l}</Tag> : l === "中" ? <Tag color="orange">{l}</Tag> : <Tag>{l}</Tag>,
          },
          {
            title: "状态",
            dataIndex: "status",
            width: 100,
            render: (s: string) => {
              const color = s === "未处理" ? "red" : s === "已推送" ? "blue" : "default";
              return <Tag color={color}>{s}</Tag>;
            },
          },
          { title: "来源", dataIndex: "source", ellipsis: true },
          {
            title: "操作",
            key: "op",
            width: 200,
            render: (_, r) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                >
                  编辑
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger
                  onClick={() =>
                    void doubleConfirmDelete({
                      firstTitle: `删除告警记录？`,
                      firstContent: `车牌 ${r.plate} · ${r.type} · ${r.time}`,
                      onDelete: () => remove(r.key),
                    })
                  }
                >
                  删除
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Drawer
        title={editing ? "编辑告警" : "新建告警"}
        width={480}
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        extra={
          <Button type="primary" onClick={() => form.submit()}>
            保存到网关
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="key" label="key（唯一）" rules={[{ required: true }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item name="time" label="时间" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="terminalId" label="终端号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="plate" label="车牌" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="level" label="级别" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "高", label: "高" },
                { value: "中", label: "中" },
                { value: "低", label: "低" },
              ]}
            />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "未处理", label: "未处理" },
                { value: "已确认", label: "已确认" },
                { value: "已推送", label: "已推送" },
              ]}
            />
          </Form.Item>
          <Form.Item name="source" label="来源">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
