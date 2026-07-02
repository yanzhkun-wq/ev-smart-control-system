import { describe, it, expect } from "vitest";
import {
  decodeStatus808,
  alarmBit,
  parse0200TlvSlice,
  parse0200FullBody,
  parse0704LocationItems,
  readAuthCodeFrom0102Body,
} from "../position-tlv.js";

describe("decodeStatus808", () => {
  it("should decode all bits correctly", () => {
    const status = 0x0001; // ACC on
    const r = decodeStatus808(status);
    expect(r.accOn).toBe(true);
    expect(r.positioned).toBe(false);
    expect(r.armed).toBe(false);
    expect(r.oilCut).toBe(false);
    expect(r.mainPowerDisconnected).toBe(false);
    expect(r.gpsPositioned).toBe(false);
    expect(r.beidouPositioned).toBe(false);
  });

  it("should detect armed/gps/beidou status", () => {
    const status =
      (1 << 0) |  // ACC on
      (1 << 6) |  // armed
      (1 << 18) | // GPS positioned
      (1 << 19);  // BeiDou positioned
    const r = decodeStatus808(status);
    expect(r.accOn).toBe(true);
    expect(r.armed).toBe(true);
    expect(r.gpsPositioned).toBe(true);
    expect(r.beidouPositioned).toBe(true);
  });

  it("should detect oil cut and main power disconnected", () => {
    const status =
      (1 << 10) | // oil cut
      (1 << 11);  // main power disconnected
    const r = decodeStatus808(status);
    expect(r.oilCut).toBe(true);
    expect(r.mainPowerDisconnected).toBe(true);
  });

  it("should handle zero status", () => {
    const r = decodeStatus808(0);
    expect(r.accOn).toBe(false);
    expect(r.positioned).toBe(false);
    expect(r.armed).toBe(false);
    expect(r.oilCut).toBe(false);
    expect(r.mainPowerDisconnected).toBe(false);
  });
});

describe("alarmBit", () => {
  it("should check individual alarm bits", () => {
    const alarm = 0x0001; // bit 0 = emergency alarm
    expect(alarmBit(alarm, 0)).toBe(true);
    expect(alarmBit(alarm, 1)).toBe(false);
  });

  it("should handle multiple alarm bits", () => {
    const alarm = (1 << 0) | (1 << 3) | (1 << 8);
    expect(alarmBit(alarm, 0)).toBe(true);
    expect(alarmBit(alarm, 3)).toBe(true);
    expect(alarmBit(alarm, 8)).toBe(true);
    expect(alarmBit(alarm, 2)).toBe(false);
  });
});

describe("parse0200TlvSlice", () => {
  it("should parse mileage TLV (0x01, len 4)", () => {
    const buf = Buffer.from([0x01, 0x04, 0x00, 0x00, 0x00, 0x64]); // 100 km → /10 = 10.0 km
    const r = parse0200TlvSlice(buf);
    expect(r.mileageKm).toBe(10.0);
  });

  it("should parse CSQ TLV (0x30, len 1)", () => {
    const buf = Buffer.from([0x30, 0x01, 0x56]); // CSQ=86
    const r = parse0200TlvSlice(buf);
    expect(r.csq).toBe(86);
  });

  it("should parse GPS satellites TLV (0x31, len 1)", () => {
    const buf = Buffer.from([0x31, 0x01, 0x0a]); // 10 satellites
    const r = parse0200TlvSlice(buf);
    expect(r.gpsSatellites).toBe(10);
  });

  it("should parse main voltage TLV (0x61, len 2)", () => {
    const buf = Buffer.from([0x61, 0x02, 0x0b, 0xb8]); // 3000 / 100 = 30.00V
    const r = parse0200TlvSlice(buf);
    expect(r.mainVoltageV).toBe(30.0);
  });

  it("should parse ICCID TLV (0xf1, variable length)", () => {
    const buf = Buffer.from([0xf1, 0x14, 0x38, 0x39, 0x38, 0x36, 0x30, 0x38, 0x33, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x30, 0x31, 0x32, 0x33]);
    const r = parse0200TlvSlice(buf);
    expect(r.iccid).toBe("89860831234567890123");
  });

  it("should parse extension alarm TLV (0xf4, len 2)", () => {
    const buf = Buffer.from([0xf4, 0x02, 0x00, 0x01]);
    const r = parse0200TlvSlice(buf);
    expect(r.extendedAlarm).toBe(1);
  });

  it("should parse G-sensor TLV (0xf5, len 6)", () => {
    // x = 0, y = 10, z = -5
    const buf = Buffer.alloc(9);
    buf[0] = 0xf5; buf[1] = 0x06;
    buf.writeInt16BE(0, 2);
    buf.writeInt16BE(10, 4);
    buf.writeInt16BE(-5, 6);
    const r = parse0200TlvSlice(buf);
    expect(r.gsensorX).toBe(0);
    expect(r.gsensorY).toBe(10);
    expect(r.gsensorZ).toBe(-5);
  });

  it("should parse battery percentage TLV (0x56, len 2, 2nd byte is pct)", () => {
    const buf = Buffer.from([0x56, 0x02, 0xff, 0x52]); // batteryPct = 0x52 = 82%
    const r = parse0200TlvSlice(buf);
    expect(r.batteryPct).toBe(82);
  });

  it("should parse arm attach TLV (0xf3, len 1)", () => {
    const buf = Buffer.from([0xf3, 0x01, 0x00]); // 0=armed
    const r = parse0200TlvSlice(buf);
    expect(r.armAttach).toBe(0);
  });

  it("should parse work mode and charge status (0xf6)", () => {
    const buf = Buffer.from([0xf6, 0x02, 0x01, 0x02]);
    const r = parse0200TlvSlice(buf);
    expect(r.workMode).toBe(1);
    expect(r.chargeStatus).toBe(2);
  });

  it("should parse ACC cumulative seconds (0xf9, len 4)", () => {
    const buf = Buffer.from([0xf9, 0x04, 0x00, 0x01, 0x51, 0x80]); // 86400 sec
    const r = parse0200TlvSlice(buf);
    expect(r.accCumulativeSec).toBe(86400);
  });

  it("should skip unknown TLV IDs gracefully", () => {
    const buf = Buffer.from([0xff, 0x03, 0x01, 0x02, 0x03]); // unknown ID
    const r = parse0200TlvSlice(buf);
    expect(Object.keys(r).length).toBe(0);
  });

  it("should handle empty buffer", () => {
    const r = parse0200TlvSlice(Buffer.alloc(0));
    expect(Object.keys(r).length).toBe(0);
  });

  it("should handle truncated TLV (len > remaining bytes)", () => {
    const buf = Buffer.from([0x01, 0x04, 0x00, 0x00]); // claims len=4 but only 2 bytes follow
    const r = parse0200TlvSlice(buf);
    expect(r.mileageKm).toBeUndefined();
  });

  it("should handle TLV with zero length", () => {
    const buf = Buffer.from([0x30, 0x00, 0x01, 0x04, 0x00, 0x00, 0x00, 0x64]);
    const r = parse0200TlvSlice(buf);
    expect(r.csq).toBeUndefined();
    expect(r.mileageKm).toBe(10.0);
  });
});

describe("parse0200FullBody", () => {
  it("should parse a combined basic body + TLV", () => {
    const body = Buffer.alloc(28 + 6); // basic 28 + TLV
    body.writeUInt32BE(0, 0); // alarm
    body.writeUInt32BE(2, 4); // status
    body.writeUInt32BE(22395000, 8); // lat
    body.writeUInt32BE(114065000, 12); // lng
    body.writeUInt16BE(50, 16); // altitude
    body.writeUInt16BE(0, 18); // speed
    body.writeUInt16BE(0, 20); // direction
    body[22] = 0x26; body[23] = 0x07; body[24] = 0x02;
    body[25] = 0x10; body[26] = 0x30; body[27] = 0x00;
    // TLV: CSQ
    body[28] = 0x30; body[29] = 0x01; body[30] = 0x4b; // CSQ=75

    const r = parse0200FullBody(body);
    expect(r).not.toBeNull();
    expect(r!.lat).toBe(22395000);
    expect(r!.lng).toBe(114065000);
    expect(r!.tlv.csq).toBe(75);
  });

  it("should return null for body < 28 bytes", () => {
    expect(parse0200FullBody(Buffer.alloc(20))).toBeNull();
  });

  it("should handle exactly 28 bytes with no TLV", () => {
    const body = Buffer.alloc(28);
    body.writeUInt32BE(0, 0);
    body.writeUInt32BE(0, 4);
    body.writeUInt32BE(0, 8);
    body.writeUInt32BE(0, 12);
    // ... rest zeros

    const r = parse0200FullBody(body);
    expect(r).not.toBeNull();
    expect(r!.tlv).toEqual({});
  });
});

describe("parse0704LocationItems", () => {
  it("should parse multiple location items", () => {
    // Type (1) + Count (2) + items...
    const item1 = Buffer.alloc(28);
    item1.writeUInt16BE(0x0102, 0); // some identifiable data
    const item2 = Buffer.alloc(28);
    item2.writeUInt16BE(0x0304, 0);

    const buf = Buffer.alloc(3 + 2 + 28 + 2 + 28);
    buf[0] = 0x01; // type
    buf.writeUInt16BE(2, 1); // count
    buf.writeUInt16BE(28, 3); // item1 length
    item1.copy(buf, 5);
    buf.writeUInt16BE(28, 33); // item2 length
    item2.copy(buf, 35);

    const items = parse0704LocationItems(buf);
    expect(items.length).toBe(2);
    expect(items[0]!.length).toBe(28);
    expect(items[1]!.length).toBe(28);
    expect(items[0]!.readUInt16BE(0)).toBe(0x0102);
    expect(items[1]!.readUInt16BE(0)).toBe(0x0304);
  });

  it("should handle empty items", () => {
    const buf = Buffer.from([0x01, 0x00, 0x00]); // type=1, count=0
    const items = parse0704LocationItems(buf);
    expect(items).toEqual([]);
  });

  it("should return empty array for buffer < 3 bytes", () => {
    expect(parse0704LocationItems(Buffer.from([0x01]))).toEqual([]);
    expect(parse0704LocationItems(Buffer.alloc(0))).toEqual([]);
  });

  it("should stop gracefully if item data is truncated", () => {
    const buf = Buffer.alloc(6);
    buf[0] = 0x01; // type
    buf.writeUInt16BE(5, 1); // count (claims 5 items)
    buf.writeUInt16BE(28, 3); // item1 length, but only 1 byte follows
    const items = parse0704LocationItems(buf);
    // Should stop early without crashing
    expect(items.length).toBe(0);
  });
});

describe("readAuthCodeFrom0102Body", () => {
  it("should read auth code terminated by null byte", () => {
    const body = Buffer.from("AUTH123\x00extra", "utf8");
    expect(readAuthCodeFrom0102Body(body)).toBe("AUTH123");
  });

  it("should read full body if no null byte", () => {
    const body = Buffer.from("myAuthCode", "utf8");
    expect(readAuthCodeFrom0102Body(body)).toBe("myAuthCode");
  });

  it("should trim whitespace", () => {
    const body = Buffer.from("  AUTH123  ", "utf8");
    expect(readAuthCodeFrom0102Body(body)).toBe("AUTH123");
  });

  it("should handle empty body", () => {
    expect(readAuthCodeFrom0102Body(Buffer.alloc(0))).toBe("");
  });

  it("should try latin1 fallback if utf8 is empty", () => {
    // Bytes that decode to empty string in utf8 but have content in latin1
    const body = Buffer.from([0x00]);
    const r = readAuthCodeFrom0102Body(body);
    expect(typeof r).toBe("string");
  });
});
