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
  batteryPct: number;
  locateMode: string;
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
    batteryPct: 88,
    locateMode: "GPS+北斗",
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
    batteryPct: 72,
    locateMode: "Wi‑Fi+LBS",
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
