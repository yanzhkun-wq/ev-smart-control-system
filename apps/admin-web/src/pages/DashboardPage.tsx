import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  Form,
  InputNumber,
  Row,
  Space,
  Statistic,
  Table,
  Typography,
} from "antd";
import {
  CarOutlined,
  DollarOutlined,
  LineChartOutlined,
  MobileOutlined,
  ShopOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UserAddOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminGateway } from "../context/AdminGatewayContext";
import type { AdminPlatformKpi, StoreShape } from "../types/gatewayStore";
import {
  countRewardLinesInRange,
  sumRewardYuanInRange,
  topRewardLinesToday,
} from "../utils/platformDashboardMetrics";

const kpiCardStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #e8e8e8",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

export default function DashboardPage() {
  const navigate = useNavigate();

  const { store, saveStore, deviceRows, connected, apiBase, error, loading, refresh } = useAdminGateway();
  const alerts = store?.admin?.alerts ?? [];
  const lines = store?.admin?.partnerChannel?.rewardLines ?? [];
  const principals = store?.admin?.partnerChannel?.principals ?? [];
  const kpi = store?.admin?.platformKpi;

  const refDay = dayjs();

  const todayStart = refDay.startOf("day");
  const todayEnd = refDay.endOf("day");
  const monthStart = refDay.startOf("month");
  const monthEnd = refDay.endOf("month");

  const todayRevenue = useMemo(
    () => sumRewardYuanInRange(lines, todayStart, todayEnd),
    [lines, todayStart, todayEnd],
  );
  const monthRevenue = useMemo(
    () => sumRewardYuanInRange(lines, monthStart, monthEnd),
    [lines, monthStart, monthEnd],
  );
  const todayLineCount = useMemo(
    () => countRewardLinesInRange(lines, todayStart, todayEnd),
    [lines, todayStart, todayEnd],
  );
  const topToday = useMemo(() => topRewardLinesToday(lines, refDay, 8), [lines, refDay]);

  const online = deviceRows.filter((d) => d.online).length;
  const openAlerts = alerts.filter((a) => a.status === "未处理").length;
  const bindCount = store?.binds?.length ?? 0;

  const [kpiForm] = Form.useForm<AdminPlatformKpi>();
  useEffect(() => {
    kpiForm.setFieldsValue({
      todayOrderCount: kpi?.todayOrderCount ?? 0,
      monthOrderCount: kpi?.monthOrderCount ?? 0,
      todayNewUsers: kpi?.todayNewUsers ?? 0,
      monthNewUsers: kpi?.monthNewUsers ?? 0,
    });
  }, [kpi, kpiForm]);

  const saveKpi = async () => {
    if (!store) return;
    const v = await kpiForm.validateFields();
    const next: StoreShape = JSON.parse(JSON.stringify(store));
    next.admin = next.admin ?? {};
    next.admin.platformKpi = {
      todayOrderCount: Number(v.todayOrderCount) || 0,
      monthOrderCount: Number(v.monthOrderCount) || 0,
      todayNewUsers: Number(v.todayNewUsers) || 0,
      monthNewUsers: Number(v.monthNewUsers) || 0,
    };
    await saveStore(next);
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} wrap gutter={[16, 16]}>
        <Col>
          <Typography.Title level={3} style={{ margin: 0 }}>
            数据总览
          </Typography.Title>
          <Typography.Text type="secondary">
            经营数据来自 <Typography.Text code>渠道业绩流水</Typography.Text>
            按自然日/自然月汇总；订单与新增用户可在下方「经营指标」手填或对接业务库回写。
          </Typography.Text>
        </Col>
        <Col>
          <Space wrap>
            <Badge
              status={connected ? "success" : error ? "error" : "processing"}
              text={connected ? apiBase : error ? "网关异常" : "检测中"}
            />
            <Button size="small" loading={loading} onClick={() => void refresh()}>
              刷新全量
            </Button>
            <Button type="primary" size="small" onClick={() => navigate("/settings")}>
              系统设置
            </Button>
          </Space>
        </Col>
      </Row>

      {!connected ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="未连接网关：经营流水以上为本地/缓存；保存指标与设备数据请先配置网关。"
          description="在「系统设置」填写 device-gateway 的 HTTP 地址后刷新。"
        />
      ) : null}

      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        统计时点：{refDay.format("YYYY-MM-DD HH:mm")}（当日/当月按本机日期）
      </Typography.Text>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card size="small" style={{ ...kpiCardStyle, borderTop: "3px solid #16a34a" }}>
            <Statistic
              title="当日总业绩（流水）"
              value={todayRevenue}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="元"
              valueStyle={{ color: "#15803d", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card size="small" style={{ ...kpiCardStyle, borderTop: "3px solid #2563eb" }}>
            <Statistic
              title="当月总业绩（流水）"
              value={monthRevenue}
              precision={2}
              prefix={<LineChartOutlined />}
              suffix="元"
              valueStyle={{ color: "#1d4ed8", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card size="small" style={{ ...kpiCardStyle, borderTop: "3px solid #ca8a04" }}>
            <Statistic
              title="当日流水笔数"
              value={todayLineCount}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: "#a16207", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card size="small" style={{ ...kpiCardStyle, borderTop: "3px solid #db2777" }}>
            <Statistic
              title="当日订单（业务口径）"
              value={kpi?.todayOrderCount ?? 0}
              prefix={<ShopOutlined />}
              valueStyle={{ color: "#be185d", fontWeight: 700 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              下方「经营指标」可改
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card size="small" style={{ ...kpiCardStyle, borderTop: "3px solid #7c3aed" }}>
            <Statistic
              title="当日新增用户"
              value={kpi?.todayNewUsers ?? 0}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: "#6d28d9", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card size="small" style={{ ...kpiCardStyle, borderTop: "3px solid #0891b2" }}>
            <Statistic
              title="当月新增用户"
              value={kpi?.monthNewUsers ?? 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#0e7490", fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={kpiCardStyle}>
            <Statistic
              title="本月订单（业务口径）"
              value={kpi?.monthOrderCount ?? 0}
              prefix={<ShoppingOutlined />}
              valueStyle={{ fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={kpiCardStyle}>
            <Statistic
              title="在线终端 / 绑定"
              value={online}
              suffix={`/ ${deviceRows.length}（绑定 ${bindCount}）`}
              prefix={<CarOutlined />}
              valueStyle={{ color: "#0f766e", fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={kpiCardStyle}>
            <Statistic
              title="合作商体系"
              value={principals.length}
              suffix="家主管"
              valueStyle={{ fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={kpiCardStyle}>
            <Statistic
              title="待处理告警"
              value={openAlerts}
              prefix={<WarningOutlined />}
              valueStyle={{ color: openAlerts ? "#b91c1c" : undefined, fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      <Typography.Title level={5} style={{ marginBottom: 12 }}>
        快捷管控
      </Typography.Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          {
            title: "渠道与业绩",
            desc: "查询 / 分合作商 / 台账",
            icon: <LineChartOutlined style={{ fontSize: 28, color: "#0d9488" }} />,
            path: "/partner-channel",
          },
          {
            title: "运营与分销",
            desc: "VIP · 分销参数 · 菜单品牌",
            icon: <ShopOutlined style={{ fontSize: 28, color: "#2563eb" }} />,
            path: "/operations",
          },
          {
            title: "小程序界面",
            desc: "页面文案与开关",
            icon: <MobileOutlined style={{ fontSize: 28, color: "#7c3aed" }} />,
            path: "/miniapp-pages",
          },
        ].map((x) => (
          <Col xs={24} sm={12} md={8} key={x.path}>
            <Card
              size="small"
              hoverable
              style={{ borderRadius: 12, cursor: "pointer" }}
              onClick={() => navigate(x.path)}
            >
              <Space align="start" size={14}>
                {x.icon}
                <div>
                  <Typography.Text strong style={{ fontSize: 15 }}>
                    {x.title}
                  </Typography.Text>
                  <Typography.Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
                    {x.desc}
                  </Typography.Paragraph>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card size="small" title="今日大额流水 TOP" extra={<a onClick={() => navigate("/partner-channel")}>去渠道业绩</a>}>
            <Table
              size="small"
              pagination={false}
              rowKey="key"
              dataSource={topToday}
              locale={{ emptyText: "今日暂无流水（检查本机日期或渠道台账日期）" }}
              columns={[
                { title: "时间", dataIndex: "time", width: 165 },
                { title: "类型", dataIndex: "kind", width: 130, ellipsis: true },
                {
                  title: "金额",
                  dataIndex: "amountYuan",
                  width: 88,
                  render: (v: number) => (typeof v === "number" ? v.toFixed(2) : "—"),
                },
                { title: "体系", dataIndex: "rootPartnerPhone", width: 118 },
                { title: "员工", dataIndex: "inviterStaffName", width: 90 },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            size="small"
            title="经营指标（可写入网关）"
            extra={
              <Button type="primary" size="small" disabled={!connected || !store} onClick={() => void saveKpi()}>
                保存指标
              </Button>
            }
          >
            <Typography.Paragraph type="secondary" style={{ marginTop: 0, fontSize: 12 }}>
              订单数、新增用户等与商城/注册系统口径一致时可由此手填；亦可由后续任务写入{" "}
              <Typography.Text code>admin.platformKpi</Typography.Text>。
            </Typography.Paragraph>
            <Form form={kpiForm} layout="vertical" size="small">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="todayOrderCount" label="当日订单" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="monthOrderCount" label="当月订单" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="todayNewUsers" label="当日新增用户" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="monthNewUsers" label="当月新增用户" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>

      <Collapse
        style={{ marginTop: 16 }}
        items={[
          {
            key: "gw",
            label: "网关与连接详情",
            children: (
              <Space direction="vertical">
                {!connected && error ? (
                  <Typography.Paragraph type="danger" copyable style={{ marginBottom: 0 }}>
                    {String(error)}
                  </Typography.Paragraph>
                ) : null}
                <Typography.Text type="secondary">
                  设备监控、轨迹、告警等请在左侧菜单「车联与风控」中操作。业绩汇总依赖已拉取的{" "}
                  <Typography.Text code>partnerChannel.rewardLines</Typography.Text>
                  ；数据不准时请先在「渠道与业绩」维护流水并保存，再点「刷新全量」。
                </Typography.Text>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
