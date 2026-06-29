import { Typography } from "antd";
import { useSearchParams } from "react-router-dom";
import { VehicleHubTabs, isVehicleHubKey, type VehicleHubKey } from "../components/VehicleHubTabs";

export function VehicleRiskPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const hubRaw = searchParams.get("hub") ?? "monitor";
  const hub: VehicleHubKey = isVehicleHubKey(hubRaw) ? hubRaw : "monitor";

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        车联与风控
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        实时监控、设备绑定、轨迹回放、告警处置、电子围栏、车队账号与远程指令；数据与配置经 808 网关落盘。
      </Typography.Paragraph>
      <VehicleHubTabs
        activeKey={hub}
        onActiveKeyChange={(k) => setSearchParams({ hub: k })}
      />
    </div>
  );
}
