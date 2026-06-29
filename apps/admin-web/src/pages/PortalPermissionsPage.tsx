import { App, Button, Card, Space, Switch, Table, Tabs, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import { useAdminGateway } from "../context/AdminGatewayContext";
import type { AdminPortalPermissions, StoreShape } from "../types/gatewayStore";
import {
  mergePortalPermissionsWithDefaults,
  PORTAL_KEYS_BY_ROLE,
  portalCapabilityLabel,
} from "../constants/portalPermissionsDefaults";

type RoleKey = keyof AdminPortalPermissions;

export default function PortalPermissionsPage() {
  const { message } = App.useApp();
  const { store, saveStore, connected, error } = useAdminGateway();
  const [perm, setPerm] = useState<AdminPortalPermissions>(() => mergePortalPermissionsWithDefaults(null));

  useEffect(() => {
    setPerm(mergePortalPermissionsWithDefaults(store?.admin?.portalPermissions));
  }, [store?.admin?.portalPermissions]);

  function setRoleFlag(role: RoleKey, key: string, val: boolean) {
    setPerm((prev) => ({
      ...prev,
      [role]: { ...prev[role], [key]: val },
    }));
  }

  function buildColumns(role: RoleKey): ColumnsType<{ key: string; label: string; enabled: boolean }> {
    return [
      { title: "能力", dataIndex: "label", ellipsis: true },
      {
        title: "允许",
        dataIndex: "enabled",
        width: 96,
        render: (_: unknown, rec) => (
          <Switch size="small" checked={rec.enabled} onChange={(c) => setRoleFlag(role, rec.key, c)} />
        ),
      },
    ];
  }

  function dataForRole(role: RoleKey) {
    const keys = PORTAL_KEYS_BY_ROLE[role];
    return keys.map((key) => ({
      key,
      label: portalCapabilityLabel(key),
      enabled: perm[role][key] !== false,
    }));
  }

  async function persist() {
    if (!store) {
      message.error("无本地门店数据，请先连接网关");
      return;
    }
    try {
      const next: StoreShape = JSON.parse(JSON.stringify(store));
      if (!next.admin) next.admin = {};
      next.admin.portalPermissions = {
        partnerPrincipal: { ...perm.partnerPrincipal },
        partnerStaff: { ...perm.partnerStaff },
        merchant: { ...perm.merchant },
      };
      await saveStore(next);
      message.success("门户权限已写入网关；小程序重新拉取 /api/miniapp-ui 后生效。");
    } catch (e) {
      message.error(String(e));
    }
  }

  const tabItems = [
    {
      key: "partnerPrincipal",
      label: "合作商主管",
      children: (
        <Table
          size="small"
          rowKey="key"
          columns={buildColumns("partnerPrincipal")}
          dataSource={dataForRole("partnerPrincipal")}
          pagination={false}
        />
      ),
    },
    {
      key: "partnerStaff",
      label: "合作商员工",
      children: (
        <Table
          size="small"
          rowKey="key"
          columns={buildColumns("partnerStaff")}
          dataSource={dataForRole("partnerStaff")}
          pagination={false}
        />
      ),
    },
    {
      key: "merchant",
      label: "商家",
      children: (
        <Table
          size="small"
          rowKey="key"
          columns={buildColumns("merchant")}
          dataSource={dataForRole("merchant")}
          pagination={false}
        />
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
        小程序门户权限
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 12 }}>
        按角色控制小程序内<strong>后台/工作台相关能力</strong>（演示端读取{" "}
        <Typography.Text code>portalPermissions</Typography.Text>
        ；正式环境须服务端鉴权）。关闭后，对应入口将提示无权限（需配合小程序逻辑）。
      </Typography.Paragraph>
      {!connected && (
        <Typography.Paragraph type="warning">当前未连接设备网关：{error || "请检查地址与网关进程"}</Typography.Paragraph>
      )}
      <Card size="small">
        <Space style={{ marginBottom: 12 }}>
          <Button type="primary" onClick={() => void persist()} disabled={!connected}>
            保存到网关
          </Button>
        </Space>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
