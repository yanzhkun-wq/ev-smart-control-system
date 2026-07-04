/**
 * 管理后台 Mock 数据模块
 *
 * 当后端未就绪时启用 Demo 模式：
 *   import { useMockStore } from "../utils/mockData";
 *   const store = useMockStore();
 *
 * 提供完整的 StoreShape，包含车辆、位置、围栏、告警、用户等数据。
 */

import type {
  StoreShape,
  VehicleBind,
  LastPosition,
  AdminGeofenceRow,
  AdminAlertRow,
  AdminUserRow,
} from "../types/gatewayStore";

/* ------------------------------------------------------------------ */
/*  车辆绑定                                                           */
/* ------------------------------------------------------------------ */
const mockBinds: VehicleBind[] = [
  { terminalPhone: "13800138000", plate: "粤A·D12345", note: "配送车-01" },
  { terminalPhone: "13800138001", plate: "粤A·E67890", note: "配送车-02" },
  { terminalPhone: "13800138002", plate: "粤B·F11111", note: "客户试驾车" },
  { terminalPhone: "13800138003", plate: "粤C·G22222", note: "库存储备车" },
  { terminalPhone: "13800138004", plate: "粤A·H33333", note: "员工通勤车" },
];

/* ------------------------------------------------------------------ */
/*  最后位置                                                           */
/* ------------------------------------------------------------------ */
const now = new Date().toISOString();

const mockLastPositions: Record<string, LastPosition> = {
  "13800138000": {
    terminalPhone: "13800138000",
    latDeg: 23.1291,
    lngDeg: 113.2644,
    speedKmh: 0,
    alarm: 0,
    status: 256,
    receivedAt: now,
    accOn: false,
    positioned: true,
    direction: 0,
    altitudeM: 25,
    mileageKm: 1234.5,
    mainVoltageV: 48.2,
    csq: 28,
    gpsSatellites: 12,
    batteryPct: 85,
    armed: true,
    oilCut: false,
  },
  "13800138001": {
    terminalPhone: "13800138001",
    latDeg: 23.1355,
    lngDeg: 113.3284,
    speedKmh: 35,
    alarm: 0,
    status: 256,
    receivedAt: now,
    accOn: true,
    positioned: true,
    direction: 180,
    altitudeM: 30,
    mileageKm: 2345.6,
    mainVoltageV: 47.8,
    csq: 30,
    gpsSatellites: 10,
    batteryPct: 72,
    armed: false,
    oilCut: false,
  },
  "13800138002": {
    terminalPhone: "13800138002",
    latDeg: 23.1440,
    lngDeg: 113.2988,
    speedKmh: 0,
    alarm: 1,
    status: 256,
    receivedAt: now,
    accOn: false,
    positioned: true,
    direction: 0,
    altitudeM: 28,
    mileageKm: 567.8,
    mainVoltageV: 49.0,
    csq: 25,
    gpsSatellites: 8,
    batteryPct: 91,
    armed: true,
    oilCut: false,
  },
  "13800138003": {
    terminalPhone: "13800138003",
    latDeg: 23.1180,
    lngDeg: 113.2350,
    speedKmh: 0,
    alarm: 0,
    status: 0,
    receivedAt: now,
    accOn: false,
    positioned: true,
    direction: 0,
    altitudeM: 20,
    mileageKm: 89.0,
    mainVoltageV: 48.5,
    csq: 20,
    gpsSatellites: 6,
    batteryPct: 65,
    armed: false,
    oilCut: false,
  },
  "13800138004": {
    terminalPhone: "13800138004",
    latDeg: 23.1500,
    lngDeg: 113.3100,
    speedKmh: 28,
    alarm: 0,
    status: 256,
    receivedAt: now,
    accOn: true,
    positioned: true,
    direction: 45,
    altitudeM: 22,
    mileageKm: 3456.7,
    mainVoltageV: 47.2,
    csq: 22,
    gpsSatellites: 9,
    batteryPct: 58,
    armed: false,
    oilCut: false,
  },
};

/* ------------------------------------------------------------------ */
/*  围栏                                                              */
/* ------------------------------------------------------------------ */
const mockGeofences: AdminGeofenceRow[] = [
  { key: "g1", name: "公司园区", type: "圆形", bindPlates: "粤A·D12345, 粤A·E67890", alarm: "出区域", enabled: true, centerLat: 23.1291, centerLng: 113.2644, radiusM: 500 },
  { key: "g2", name: "仓库", type: "圆形", bindPlates: "粤A·D12345", alarm: "进出", enabled: true, centerLat: 23.1440, centerLng: 113.2988, radiusM: 200 },
  { key: "g3", name: "客户A区域", type: "多边形", bindPlates: "粤B·F11111", alarm: "进区域", enabled: false },
  { key: "g4", name: "充电站", type: "圆形", bindPlates: "粤A·H33333", alarm: "进出", enabled: true, centerLat: 23.1350, centerLng: 113.2800, radiusM: 100 },
];

/* ------------------------------------------------------------------ */
/*  告警记录                                                           */
/* ------------------------------------------------------------------ */
const mockAlerts: AdminAlertRow[] = [
  { key: "a1", time: "2026-07-04 08:12:00", terminalId: "13800138000", plate: "粤A·D12345", type: "震动报警", level: "高", status: "未处理", source: "终端" },
  { key: "a2", time: "2026-07-04 06:30:00", terminalId: "13800138002", plate: "粤B·F11111", type: "围栏报警", level: "中", status: "已推送", source: "围栏g2" },
  { key: "a3", time: "2026-07-03 22:15:00", terminalId: "13800138000", plate: "粤A·D12345", type: "断电报警", level: "高", status: "已确认", source: "终端" },
  { key: "a4", time: "2026-07-03 18:00:00", terminalId: "13800138001", plate: "粤A·E67890", type: "超速报警", level: "低", status: "未处理", source: "规则引擎" },
  { key: "a5", time: "2026-07-03 15:45:00", terminalId: "13800138004", plate: "粤A·H33333", type: "位移报警", level: "中", status: "未处理", source: "终端" },
  { key: "a6", time: "2026-07-03 12:00:00", terminalId: "13800138003", plate: "粤C·G22222", type: "信号丢失", level: "低", status: "已推送", source: "平台" },
];

/* ------------------------------------------------------------------ */
/*  团队用户                                                           */
/* ------------------------------------------------------------------ */
const mockFleetUsers: AdminUserRow[] = [
  { key: "u1", name: "张三", role: "管理员", phone: "13900001111", fleet: "总部", devices: 5 },
  { key: "u2", name: "李四", role: "监控员", phone: "13900002222", fleet: "总部", devices: 3 },
  { key: "u3", name: "王五", role: "运维", phone: "13900003333", fleet: "仓库组", devices: 2 },
  { key: "u4", name: "赵六", role: "观察员", phone: "13900004444", fleet: "客户组", devices: 1 },
];

/* ------------------------------------------------------------------ */
/*  在线终端                                                           */
/* ------------------------------------------------------------------ */
const mockOnlineSockets = [
  { phoneKey: "13800138000", remote: "192.168.1.100:45231" },
  { phoneKey: "13800138001", remote: "192.168.1.101:45232" },
  { phoneKey: "13800138004", remote: "192.168.1.104:45235" },
];

/* ------------------------------------------------------------------ */
/*  输出                                                               */
/* ------------------------------------------------------------------ */
export function createMockStore(): StoreShape {
  return {
    binds: mockBinds,
    lastPositions: mockLastPositions,
    settings: { registerAuthCode: "demo_auth_123" },
    admin: {
      mapProvider: "高德",
      mapWebKey: "demo_web_key",
      geofences: mockGeofences,
      alerts: mockAlerts,
      fleetUsers: mockFleetUsers,
      dashboardTodayKm: 186,
      restApiBase: "",
      miniappWxAppId: "wx_demo_appid",
      miniappAlarmSubscribeTmplIds: ["template_id_demo_1", "template_id_demo_2"],
      compatProtocolYear: "2019",
    },
  };
}

export { mockOnlineSockets };
export type { StoreShape, VehicleBind, LastPosition };
