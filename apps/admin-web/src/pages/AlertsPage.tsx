import { App, Button, Card, Col, Drawer, Form, Input, Row, Select, Space, Statistic, Table, Tag, Typography } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useAdminGateway } from "../context/AdminGatewayContext";
import type { AdminAlertRow, StoreShape } from "../types/gatewayStore";
import { doubleConfirmDelete } from "../utils/doubleConfirmDelete";

export type AlertsPageProps = { embedded?: boolean };

const levelColor: Record<string, string> = { "高": "red", "中": "orange", "低": "default" };
const statusColor: Record<string, string> = { "未处理": "red", "已确认": "blue", "已推送": "green" };

export function AlertsPage({ embedded = false }: AlertsPageProps = {}) {
  const { message } = App.useApp();
  const { store, saveStore } = useAdminGateway();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAlertRow | null>(null);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [form] = Form.useForm();

  const alerts = store?.admin?.alerts ?? [];

  const filtered = useMemo(() => {
    let list = alerts;
    if (filterLevel) list = list.filter((a) => a.level === filterLevel);
    if (filterStatus) list = list.filter((a) => a.status === filterStatus);
    return list;
  }, [alerts, filterLevel, filterStatus]);

  const stats = useMemo(() => ({
    total: alerts.length,
    pending: alerts.filter((a) => a.status === "未处理").length,
    high: alerts.filter((a) => a.level === "高").length,
    confirmed: alerts.filter((a) => a.status === "已确认").length,
  }), [alerts]);

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

  const markAsResolved = async (k: string) => {
    const list = alerts.map((a) => a.key === k ? { ...a, status: "已确认" as const } : a);
    await persistAlerts(list);
    message.success("已标记已确认");
  };

  const markAllPending = async () => {
    const list = alerts.map((a) => a.status === "未处理" ? { ...a, status: "已确认" as const } : a);
    await persistAlerts(list);
    message.success(`已标记 ${alerts.filter((a) => a.status === "未处理").length} 条为已确认`);
  };

  return (
    <div>
      {!embedded ? (
        <>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            告警中心
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
            列表数据存于网关 <Typography.Text code>admin.alerts</Typography.Text>，可在此增删改。
          </Typography.Paragraph>
        </>
      ) : null}

      {/* 统计栏 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="总告警" value={stats.total} valueStyle={{ fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="待处理" value={stats.pending} valueStyle={{ color: stats.pending ? "#ef4444" : undefined, fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="高危" value={stats.high} valueStyle={{ color: stats.high ? "#ef4444" : undefined, fontSize: 20 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="已确认" value={stats.confirmed} valueStyle={{ color: "#10b981", fontSize: 20 }} />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
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
            新建告警
          </Button>
          {stats.pending > 0 ? (
            <Button icon={<CheckCircleOutlined />} onClick={() => void markAllPending()}>
              全部标记已确认 ({stats.pending})
            </Button>
          ) : null}

          {/* 筛选 */}
          <Select
            style={{ width: 100 }}
            placeholder="级别"
            allowClear
            value={filterLevel}
            onChange={setFilterLevel}
            options={[
              { value: "高", label: "高危" },
              { value: "中", label: "中危" },
              { value: "低", label: "低危" },
            ]}
          />
          <Select
            style={{ width: 120 }}
            placeholder="状态"
            allowClear
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: "未处理", label: "未处理" },
              { value: "已确认", label: "已确认" },
              { value: "已推送", label: "已推送" },
            ]}
          />
        </Space>
      </Card>

      <Table
        rowKey="key"
        dataSource={filtered}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        columns={[
          { title: "时间", dataIndex: "time", width: 170, sorter: (a, b) => a.time.localeCompare(b.time) },
          { title: "车牌", dataIndex: "plate", width: 120 },
          { title: "终端号", dataIndex: "terminalId", width: 130, ellipsis: true },
          { title: "类型", dataIndex: "type", ellipsis: true },
          {
            title: "级别",
            dataIndex: "level",
            width: 72,
            filters: [
              { text: "高", value: "高" },
              { text: "中", value: "中" },
              { text: "低", value: "低" },
            ],
            onFilter: (v, r) => r.level === v,
            render: (l: string) => <Tag color={levelColor[l]}>{l}</Tag>,
          },
          {
            title: "状态",
            dataIndex: "status",
            width: 100,
            filters: [
              { text: "未处理", value: "未处理" },
              { text: "已确认", value: "已确认" },
              { text: "已推送", value: "已推送" },
            ],
            onFilter: (v, r) => r.status === v,
            render: (s: string) => <Tag color={statusColor[s]}>{s}</Tag>,
          },
          { title: "来源", dataIndex: "source", ellipsis: true },
          {
            title: "操作",
            key: "op",
            width: 260,
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
                {r.status === "未处理" ? (
                  <Button type="link" size="small" onClick={() => void markAsResolved(r.key)}>
                    标记已确认
                  </Button>
                ) : null}
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
            <Select options={[{ value: "高", label: "高" }, { value: "中", label: "中" }, { value: "低", label: "低" }]} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select options={[{ value: "未处理", label: "未处理" }, { value: "已确认", label: "已确认" }, { value: "已推送", label: "已推送" }]} />
          </Form.Item>
          <Form.Item name="source" label="来源">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
