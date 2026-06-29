import { parse0200BasicBody, type Parsed0200Basic } from "./frame-build.js";

/** 部标 0x0200 状态 DWORD 常用位（表 17，低位 bit0）
 *
 * Bit0  ：ACC 0=关 1=开
 * Bit1  ：0=未定位 1=定位
 * Bit6  ：0=撤防 1=设防
 * Bit10 ：0=油路正常 1=油路断开
 * Bit11 ：0=主电正常 1=主电断开
 * Bit18 ：0=GPS未定位 1=GPS定位
 * Bit19 ：0=北斗未定位 1=北斗定位
 */
export function decodeStatus808(status: number): {
  accOn: boolean;
  positioned: boolean;
  armed: boolean;
  oilCut: boolean;
  mainPowerDisconnected: boolean;
  gpsPositioned: boolean;
  beidouPositioned: boolean;
} {
  return {
    accOn: (status & 1) !== 0,
    positioned: (status & 2) !== 0,
    armed: (status & 0x40) !== 0,
    oilCut: (status & 0x400) !== 0,
    mainPowerDisconnected: (status & 0x800) !== 0,
    gpsPositioned: (status & 0x40000) !== 0,
    beidouPositioned: (status & 0x80000) !== 0,
  };
}

/** 是否置位：报警 DWORD 的 bit 索引（0=最低位） */
export function alarmBit(alarm: number, bit: number): boolean {
  return ((alarm >>> bit) & 1) !== 0;
}

export type Parsed0200Tlv = {
  mileageKm?: number;
  mainVoltageV?: number;
  csq?: number;
  gpsSatellites?: number;
  batteryPct?: number;
  iccid?: string;
  /** 0xF3 附加：厂家常见 0=设防 1=撤防（以终端为准） */
  armAttach?: number;
  extendedAlarm?: number;
  /** 0xF5 Gsensor 三轴数据 (x,y,z 各 2 字节有符号 BE) */
  gsensorX?: number;
  gsensorY?: number;
  gsensorZ?: number;
  /** 0xF6 设备工作模式 (1B) + 充电状态 (1B) */
  workMode?: number;
  chargeStatus?: number;
  /** 0xF9 ACC 累计时间 (4B BE, 秒) */
  accCumulativeSec?: number;
  /** 0xFA RFID 信息 */
  rfid?: string;
};

/** 从 0x0200 体第 28 字节起解析附加信息 TLV（ID 1B + Len 1B + Data） */
export function parse0200TlvSlice(tlvStart: Buffer): Parsed0200Tlv {
  const out: Parsed0200Tlv = {};
  let i = 0;
  while (i + 2 <= tlvStart.length) {
    const id = tlvStart[i]!;
    const len = tlvStart[i + 1]!;
    i += 2;
    if (len === 0) continue;
    if (i + len > tlvStart.length) break;
    const val = tlvStart.subarray(i, i + len);
    i += len;
    switch (id) {
      case 0x01:
        if (len >= 4) out.mileageKm = val.readUInt32BE(0) / 10;
        break;
      case 0x30:
        if (len >= 1) out.csq = val[0];
        break;
      case 0x31:
        if (len >= 1) out.gpsSatellites = val[0];
        break;
      case 0x56:
        if (len >= 2) out.batteryPct = val[1];
        break;
      case 0x61:
        if (len >= 2) out.mainVoltageV = val.readUInt16BE(0) / 100;
        break;
      case 0xf1:
        if (len >= 1) {
          const s = val.toString("ascii").replace(/\0/g, "").trim();
          if (s) out.iccid = s;
        }
        break;
      case 0xf3:
        if (len >= 1) out.armAttach = val[0];
        break;
      case 0xf4:
        if (len >= 2) out.extendedAlarm = val.readUInt16BE(0);
        break;
      case 0xf5:
        if (len >= 6) {
          out.gsensorX = val.readInt16BE(0);
          out.gsensorY = val.readInt16BE(2);
          out.gsensorZ = val.readInt16BE(4);
        }
        break;
      case 0xf6:
        if (len >= 1) out.workMode = val[0];
        if (len >= 2) out.chargeStatus = val[1];
        break;
      case 0xf9:
        if (len >= 4) out.accCumulativeSec = val.readUInt32BE(0);
        break;
      case 0xfa:
        if (len >= 1) {
          const s = val.toString("ascii").replace(/\0/g, "").trim();
          if (s) out.rfid = s;
        }
        break;
      default:
        break;
    }
  }
  return out;
}

export type Parsed0200Full = Parsed0200Basic & { tlv: Parsed0200Tlv };

export function parse0200FullBody(body: Buffer): Parsed0200Full | null {
  const basic = parse0200BasicBody(body);
  if (!basic) return null;
  const tlv = body.length > 28 ? parse0200TlvSlice(body.subarray(28)) : {};
  return { ...basic, tlv };
}

/**
 * 0x0704 批量上传：类型(1) + 条数(2 BE) + 若干 [长度(2 BE) + 与 0x0200 相同格式的体]
 */
export function parse0704LocationItems(body: Buffer): Buffer[] {
  const items: Buffer[] = [];
  if (body.length < 3) return items;
  const count = body.readUInt16BE(1);
  let o = 3;
  for (let n = 0; n < count && o + 2 <= body.length; n++) {
    const itemLen = body.readUInt16BE(o);
    o += 2;
    if (itemLen <= 0 || o + itemLen > body.length) break;
    items.push(body.subarray(o, o + itemLen));
    o += itemLen;
  }
  return items;
}

export function readAuthCodeFrom0102Body(body: Buffer): string {
  const z = body.indexOf(0);
  const slice = z >= 0 ? body.subarray(0, z) : body;
  const utf = slice.toString("utf8").trim();
  if (utf.length) return utf;
  return slice.toString("latin1").trim();
}
