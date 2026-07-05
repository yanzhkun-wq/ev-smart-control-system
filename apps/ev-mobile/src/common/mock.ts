export type Vehicle = {
  id: string;
  plate: string;
  terminalId: string;
  online: boolean;
  armed: boolean;
  speedKmh: number;
  lat: number;
  lng: number;
  lastSeen: string;
  battery: number;
  batteryPct: number;
  locateMode: string;
  alarm: number;
  mileage?: number;
  csq?: number;
  gpsSatellites?: number;
  mainVoltageV?: number;
  iccid?: string;
  chargeStatus?: number;
  accCumulativeSec?: number;
  gsensorX?: number;
  gsensorY?: number;
  gsensorZ?: number;
};

export const mockVehicles: Vehicle[] = [
  {
    id: "1",
    plate: "粤A·D12345",
    terminalId: "0138081234567",
    online: true,
    armed: true,
    speedKmh: 36,
    lat: 23.1291,
    lng: 113.2644,
    lastSeen: "14:32",
    battery: 88,
    batteryPct: 88,
    locateMode: "GPS+北斗",
    alarm: 2,
    mileage: 1234.5,
    csq: 28,
    gpsSatellites: 12,
    mainVoltageV: 48.2,
    iccid: "89860831234567890123",
    chargeStatus: 1,
    accCumulativeSec: 28800,
    gsensorX: 0,
    gsensorY: 5,
    gsensorZ: -2,
  },
  {
    id: "2",
    plate: "粤B·F99887",
    terminalId: "0138081234999",
    online: true,
    armed: false,
    speedKmh: 0,
    lat: 22.5431,
    lng: 114.0579,
    lastSeen: "14:31",
    battery: 72,
    batteryPct: 72,
    locateMode: "Wi‑Fi+LBS",
    alarm: 0,
    mileage: 2345.6,
    csq: 22,
    gpsSatellites: 8,
    mainVoltageV: 47.5,
    iccid: "89860831234567890124",
    chargeStatus: 0,
    accCumulativeSec: 14400,
    gsensorX: 1,
    gsensorY: -3,
    gsensorZ: -1,
  },
];

export type AlertItem = {
  id: string;
  time: string;
  plate: string;
  type: string;
  level: "高" | "中" | "低";
};

export const mockAlerts: AlertItem[] = [
  { id: "a1", time: "今天 13:58", plate: "粤A·D12345", type: "超速报警", level: "中" },
  { id: "a2", time: "今天 12:20", plate: "粤A·D12345", type: "震动报警（设防）", level: "高" },
  { id: "a3", time: "昨天 09:02", plate: "未上牌", type: "主电源断开", level: "高" },
];
