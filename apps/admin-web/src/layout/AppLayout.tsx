import {
  CloudOutlined,
  DashboardOutlined,
  MobileOutlined,
  SecurityScanOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Badge, Button, Layout, Menu, Space, Typography, theme } from "antd";
import type { MenuProps } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAdminGateway } from "../context/AdminGatewayContext";
import { FALLBACK_SIDEBAR_MENU, mergeSidebarMenuWithTemplate } from "../constants/sidebarDefaults";

const { Header, Sider, Content } = Layout;

const MENU_ICONS: Record<string, React.ReactNode> = {
  "/": <DashboardOutlined />,
  "/vehicle-risk": <SecurityScanOutlined />,
  "/miniapp-pages": <MobileOutlined />,
  "/settings": <SettingOutlined />,
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const { connected, error, apiBase, store, refresh, loading } = useAdminGateway();

  const [draftRev, setDraftRev] = useState(0);
  useEffect(() => {
    const fn = () => setDraftRev((x) => x + 1);
    window.addEventListener("ev-admin-ops-saved", fn);
    return () => window.removeEventListener("ev-admin-ops-saved", fn);
  }, []);

  const selected = useMemo(() => {
    const path = location.pathname || "/";
    const first = path.split("/").filter(Boolean)[0];
    const key = first ? `/${first}` : "/";
    return [key];
  }, [location.pathname]);

  const brandingFromDraft = !store ? readOperationsDraft()?.branding : undefined;
  const branding = store?.admin?.branding ?? brandingFromDraft;
  const productTitle = branding?.title?.trim() || "电动车智控";
  const productSubtitle = branding?.subtitle?.trim() || "WZ808 · 管理端";

  const menuItems = useMemo((): MenuProps["items"] => {
    const rawPartial = store?.admin?.sidebarMenu?.length ? store.admin.sidebarMenu : undefined;
    const raw = mergeSidebarMenuWithTemplate(FALLBACK_SIDEBAR_MENU, rawPartial);
    return raw
      .filter((x) => !x.hidden)
      .map((x) => ({
        key: x.path,
        icon: MENU_ICONS[x.path] ?? <SettingOutlined />,
        label: x.label,
      }));
  }, [store, store?.admin?.sidebarMenu, draftRev]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="lg" collapsedWidth={64} theme="dark" width={232}>
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 18px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <CloudOutlined style={{ fontSize: 22, color: token.colorPrimary }} />
          <div>
            <Typography.Text strong style={{ color: "#fff", display: "block", lineHeight: 1.2 }}>
              {productTitle}
            </Typography.Text>
            <Typography.Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
              {productSubtitle}
            </Typography.Text>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selected}
          items={menuItems}
          onClick={({ key }) => navigate(String(key))}
          style={{ borderInlineEnd: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 24px",
            background: token.colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Typography.Title level={4} style={{ margin: 0, fontWeight: 600 }}>
            管理平台
          </Typography.Title>
          <Space size="middle" align="center" wrap>
            <Badge
              status={connected ? "success" : error ? "error" : "processing"}
              text={
                <Typography.Text type="secondary" style={{ maxWidth: 420 }} ellipsis>
                  {connected
                    ? `已连接 ${apiBase}`
                    : error
                      ? `未连接：${String(error).slice(0, 120)}`
                      : "正在检测网关…"}
                </Typography.Text>
              }
            />
            <Button type="link" size="small" onClick={() => navigate("/settings")}>
              系统设置
            </Button>
            <Button type="link" size="small" loading={loading} onClick={() => void refresh()}>
              刷新
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: 16 }}>
          <div
            style={{
              background: token.colorBgContainer,
              borderRadius: token.borderRadiusLG,
              padding: 20,
              minHeight: "calc(100vh - 64px - 32px)",
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
