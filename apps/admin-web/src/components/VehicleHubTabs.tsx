import {
  BellOutlined,
  CarOutlined,
  ControlOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  TeamOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { Tabs } from "antd";
import { lazy, Suspense, useMemo } from "react";
import { AlertsPage } from "../pages/AlertsPage";
import { DevicesPage } from "../pages/DevicesPage";
import { FleetPage } from "../pages/FleetPage";
import { RemotePage } from "../pages/RemotePage";

const MonitorPanel = lazy(async () => {
  const m = await import("../pages/MonitorPage");
  function Panel() {
    return <m.MonitorPage embedded />;
  }
  return { default: Panel };
});

const TracksPanel = lazy(async () => {
  const m = await import("../pages/TracksPage");
  function Panel() {
    return <m.TracksPage embedded />;
  }
  return { default: Panel };
});

const GeofencesPanel = lazy(async () => {
  const m = await import("../pages/GeofencesPage");
  function Panel() {
    return <m.GeofencesPage embedded />;
  }
  return { default: Panel };
});

export const VEHICLE_HUB_KEYS = ["monitor", "devices", "tracks", "alerts", "geofences", "fleet", "remote"] as const;
export type VehicleHubKey = (typeof VEHICLE_HUB_KEYS)[number];

export function isVehicleHubKey(s: string): s is VehicleHubKey {
  return (VEHICLE_HUB_KEYS as readonly string[]).includes(s);
}

const mapFallback = <div style={{ padding: 24, color: "#595959" }}>加载中（地图资源）…</div>;

export type VehicleHubTabsProps = {
  activeKey: VehicleHubKey;
  onActiveKeyChange: (k: VehicleHubKey) => void;
};

export function VehicleHubTabs({ activeKey, onActiveKeyChange }: VehicleHubTabsProps) {
  const items = useMemo(
    () => [
      {
        key: "monitor",
        label: (
          <span>
            <GlobalOutlined /> 实时监控
          </span>
        ),
        children: (
          <Suspense fallback={mapFallback}>
            <MonitorPanel />
          </Suspense>
        ),
      },
      {
        key: "devices",
        label: (
          <span>
            <CarOutlined /> 设备与车辆
          </span>
        ),
        children: <DevicesPage embedded />,
      },
      {
        key: "tracks",
        label: (
          <span>
            <VideoCameraOutlined /> 轨迹回放
          </span>
        ),
        children: (
          <Suspense fallback={mapFallback}>
            <TracksPanel />
          </Suspense>
        ),
      },
      {
        key: "alerts",
        label: (
          <span>
            <BellOutlined /> 告警中心
          </span>
        ),
        children: <AlertsPage embedded />,
      },
      {
        key: "geofences",
        label: (
          <span>
            <EnvironmentOutlined /> 电子围栏
          </span>
        ),
        children: (
          <Suspense fallback={mapFallback}>
            <GeofencesPanel />
          </Suspense>
        ),
      },
      {
        key: "fleet",
        label: (
          <span>
            <TeamOutlined /> 车队与账号
          </span>
        ),
        children: <FleetPage embedded />,
      },
      {
        key: "remote",
        label: (
          <span>
            <ControlOutlined /> 远程控制
          </span>
        ),
        children: <RemotePage embedded />,
      },
    ],
    [],
  );

  return (
    <Tabs
      activeKey={activeKey}
      onChange={(k) => {
        if (isVehicleHubKey(k)) onActiveKeyChange(k);
      }}
      items={items}
      destroyInactiveTabPane={false}
    />
  );
}
