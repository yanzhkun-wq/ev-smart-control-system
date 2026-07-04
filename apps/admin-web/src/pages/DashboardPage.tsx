import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Row,
  Space,
  Statistic,
  Typography,
} from "antd";
import {
  CarOutlined,
  MobileOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAdminGateway } from "../context/AdminGatewayContext";

const kpiCardStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #e8e8e8",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

export default function DashboardPage() {
  const navigate = useNavigate();

  const { store, deviceRows, connected, apiBase, error, loading, refresh } = useAdminGateway();
  const alerts = store?.admin?.alerts ?? [];

  const online = deviceRows.filter((d) => d.online).length;
  const openAlerts = alerts.filter((a) => a.status === "未处理").length;
  const bindCount = store?.binds?.length ?? 0;

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} wrap gutter={[16, 16]}>
        <Col>
          <Typography.Title level={3} style={{ margin: 0 }}>
            数据总览
          </Typography.Title>
          <Typography.Text type="secondary">
            电动车智能定位与安全报警平台
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
          message="未连接网关"
          description="在「系统设置」填写 device-gateway 的 HTTP 地址后刷新。"
        />
      ) : null}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card size="small" style={{ ...kpiCardStyle, borderTop: "3px solid #16a34a" }}>
            <Statistic
              title="在线终端"
              value={online}
              suffix={`/ ${deviceRows.length}（绑定 ${bindCount}）`}
              prefix={<CarOutlined />}
              valueStyle={{ color: "#15803d", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card size="small" style={{ ...kpiCardStyle, borderTop: "3px solid #0891b2" }}>
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
            title: "车辆安全中心",
            desc: "设备监控、轨迹、围栏、告警",
            icon: <CarOutlined style={{ fontSize: 28, color: "#0d9488" }} />,
            path: "/vehicle-risk",
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

      <Card size="small" title="网关与连接详情">
        <Space direction="vertical">
          {!connected && error ? (
            <Typography.Paragraph type="danger" copyable style={{ marginBottom: 0 }}>
              {String(error)}
            </Typography.Paragraph>
          ) : null}
          <Typography.Text type="secondary">
            设备监控、轨迹、围栏、告警等请在左侧菜单「车联与风控」中操作。
          </Typography.Text>
        </Space>
      </Card>
    </div>
  );
}
