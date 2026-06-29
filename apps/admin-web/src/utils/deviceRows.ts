import type { StoreShape } from "../types/gatewayStore";

export type UiDeviceRow = {
  key: string;
  terminalId: string;
  terminalPhone: string;
  plate: string;
  online: boolean;
  armed: boolean;
  acc: boolean;
  mainPowerOk: boolean;
  lastSeen: string;
  lat: number;
  lng: number;
  speedKmh: number;
  csq: number;
  sat: number;
  batteryPct: number;
  locateMode: string;
};

type BindRow = {
  terminalPhone: string;
  plate: string;
  note?: string;
  online: boolean;
  last: {
    latDeg?: number;
    lngDeg?: number;
    speedKmh?: number;
    status?: number;
    deviceTime?: string;
    receivedAt?: string;
    accOn?: boolean;
    armed?: boolean;
    mainPowerDisconnected?: boolean;
    csq?: number;
    gpsSatellites?: number;
    batteryPct?: number;
  } | null;
};

function fmtTime(last: BindRow["last"]): string {
  if (!last) return "—";
  if (last.deviceTime && /\d{4}-\d{2}-\d{2}/.test(last.deviceTime)) {
    return last.deviceTime.replace("T", " ").slice(0, 19);
  }
  if (last.receivedAt) return last.receivedAt.replace("T", " ").slice(0, 19);
  return "—";
}

export function buildUiDeviceRows(store: StoreShape, binds: BindRow[]): UiDeviceRow[] {
  const presAll = store.admin?.devicePresentations ?? {};
  return binds.map((b) => {
    const phone = b.terminalPhone;
    const last = b.last;
    const pres = presAll[phone] ?? {};
    const lat = last?.latDeg ?? 0;
    const lng = last?.lngDeg ?? 0;
    const speedKmh = last?.speedKmh ?? 0;
    const status = last?.status ?? 0;
    const accFrom808 = last?.accOn !== undefined ? last.accOn : (status & 1) !== 0;
    const armedFrom808 = last?.armed !== undefined ? last.armed : pres.armed ?? false;
    const mainOkFrom808 =
      last?.mainPowerDisconnected !== undefined ? !last.mainPowerDisconnected : undefined;
    return {
      key: phone,
      terminalId: phone,
      terminalPhone: phone,
      plate: b.plate,
      online: b.online,
      armed: armedFrom808,
      acc: pres.acc !== undefined ? !!pres.acc : accFrom808,
      mainPowerOk:
        pres.mainPowerOk !== undefined
          ? !!pres.mainPowerOk
          : mainOkFrom808 !== undefined
            ? mainOkFrom808
            : true,
      lastSeen: fmtTime(last),
      lat,
      lng,
      speedKmh,
      csq: pres.csq ?? last?.csq ?? 0,
      sat: pres.sat ?? last?.gpsSatellites ?? 0,
      batteryPct: pres.batteryPct ?? last?.batteryPct ?? 0,
      locateMode: pres.locateMode ?? (last ? "GPS" : "—"),
    };
  });
}
