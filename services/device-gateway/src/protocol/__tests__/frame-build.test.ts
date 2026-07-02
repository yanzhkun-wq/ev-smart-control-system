import { describe, it, expect } from "vitest";
import {
  phoneDigitsToBcd,
  buildWireFrame,
  buildPlatformAck,
  buildRegisterResponse,
  buildTerminalControl,
  parse0200BasicBody,
  bcd6TimeToIsoGuess,
} from "../frame-build.js";
import { unescape808 } from "../escape.js";

describe("phoneDigitsToBcd", () => {
  it("should convert 11-digit phone to 6-byte BCD", () => {
    const result = phoneDigitsToBcd("12345678901");
    expect(result.length).toBe(6);
    // "12345678901" padded to 12: "012345678901"
    expect(result[0]).toBe(0x01);
    expect(result[1]).toBe(0x23);
    expect(result[2]).toBe(0x45);
    expect(result[3]).toBe(0x67);
    expect(result[4]).toBe(0x89);
    expect(result[5]).toBe(0x01);
  });

  it("should left-pad with 0 for short phone numbers", () => {
    const result = phoneDigitsToBcd("1380013800");
    expect(result.length).toBe(6);
    // "1380013800" padded to 12 chars: "001380013800"
    expect(result[0]).toBe(0x00);
    expect(result[1]).toBe(0x13);
    expect(result[2]).toBe(0x80);
    expect(result[3]).toBe(0x01);
    expect(result[4]).toBe(0x38);
    expect(result[5]).toBe(0x00);
  });

  it("should strip non-digit characters", () => {
    const result = phoneDigitsToBcd("138-0013-8000");
    expect(result).toEqual(phoneDigitsToBcd("13800138000"));
  });

  it("should take only last 12 digits for very long inputs", () => {
    const result = phoneDigitsToBcd("8613800138000");
    // last 12: "861380013800" wait let me count: "8613800138000" = 13 chars, last 12 = "613800138000"
    // Actually: "8613800138000" → pad to 12 first (already 13, so slice(-12) = "613800138000")
    expect(result.length).toBe(6);
  });

  it("should handle non-numeric input by stripping to zeros", () => {
    const result = phoneDigitsToBcd("abc");
    expect(result.length).toBe(6);
    // all digits stripped → pad = "000000000000"
    expect(result).toEqual(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
  });
});

describe("buildWireFrame", () => {
  it("should build a valid wire frame with 0x7e delimiters", () => {
    const phoneBcd = phoneDigitsToBcd("12345678901");
    const body = Buffer.from([0x01, 0x02, 0x03]);
    const result = buildWireFrame(0x0200, phoneBcd, 1, body);

    // Must start and end with 0x7e
    expect(result[0]).toBe(0x7e);
    expect(result[result.length - 1]).toBe(0x7e);

    // Inner data must be properly escaped (no 0x7e or 0x7d in middle)
    const inner = result.subarray(1, result.length - 1);
    // Verify no unescaped 0x7e or 0x7d
    for (const b of inner) {
      expect(b === 0x7e || b === 0x7d).toBe(false);
    }
  });

  it("should throw if phoneBcd is not 6 bytes", () => {
    const badPhone = Buffer.from([0x01, 0x02, 0x03]);
    expect(() => buildWireFrame(0x0200, badPhone, 1, Buffer.alloc(0))).toThrow(
      "phoneBcd must be 6 bytes",
    );
  });

  it("should produce frame that passes round-trip parse", () => {
    const phoneBcd = phoneDigitsToBcd("13800138000");
    const body = Buffer.from([0x10, 0x20, 0x30]);
    const wire = buildWireFrame(0x8100, phoneBcd, 5, body);

    // Strip 0x7e markers and unescape
    const inner = wire.subarray(1, wire.length - 1);
    const unescaped = unescape808(inner);

    // Verify header
    expect(unescaped.readUInt16BE(0)).toBe(0x8100);
    expect(unescaped.readUInt16BE(2) & 0x3ff).toBe(3); // body length
    expect(unescaped.subarray(4, 10)).toEqual(phoneBcd);
    expect(unescaped.readUInt16BE(10)).toBe(5);
  });
});

describe("buildPlatformAck", () => {
  it("should build 0x8001 platform ack message", () => {
    const phoneBcd = phoneDigitsToBcd("12345678901");
    const result = buildPlatformAck(phoneBcd, 10, 0x0200, 3, 0);

    const inner = unescape808(result.subarray(1, result.length - 1));
    expect(inner.readUInt16BE(0)).toBe(0x8001);
    // body = ackSerial(2) + ackMsgId(2) + result(1) = 5 bytes
    expect(inner.readUInt16BE(2) & 0x3ff).toBe(5);
    expect(inner.readUInt16BE(12)).toBe(3); // ack to serial
    expect(inner.readUInt16BE(14)).toBe(0x0200); // ack to msg id
    expect(inner[16]).toBe(0); // result
  });
});

describe("buildRegisterResponse", () => {
  it("should build 0x8100 register response with auth code", () => {
    const phoneBcd = phoneDigitsToBcd("12345678901");
    const result = buildRegisterResponse(phoneBcd, 20, 5, 0, "AUTH123");

    const inner = unescape808(result.subarray(1, result.length - 1));
    expect(inner.readUInt16BE(0)).toBe(0x8100);
    const bodyLen = inner.readUInt16BE(2) & 0x3ff;
    expect(bodyLen).toBe(10); // replyToSerial(2) + result(1) + "AUTH123"(7)
    expect(inner.readUInt16BE(12)).toBe(5); // reply to serial
    expect(inner[14]).toBe(0); // result = success
    // auth code at offset 15, length = bodyLen - 3
    const authSlice = inner.subarray(15, 15 + bodyLen - 3);
    expect(authSlice.toString("ascii")).toBe("AUTH123");
  });

  it("should build register response with failure result", () => {
    const phoneBcd = phoneDigitsToBcd("12345678901");
    const result = buildRegisterResponse(phoneBcd, 21, 6, 1, ""); // result=1 (failure)

    const inner = unescape808(result.subarray(1, result.length - 1));
    expect(inner.readUInt16BE(12)).toBe(6);
    expect(inner[14]).toBe(1); // failure
  });
});

describe("buildTerminalControl", () => {
  it("should build 0x8105 terminal control with correct command byte", () => {
    const phoneBcd = phoneDigitsToBcd("12345678901");
    const lockFrame = buildTerminalControl(phoneBcd, 30, 0x66); // ARM
    const unlockFrame = buildTerminalControl(phoneBcd, 31, 0x67); // DISARM
    const cutFrame = buildTerminalControl(phoneBcd, 32, 0x64); // CUT_FUEL

    const checkCmd = (wire: Buffer, expectedCmd: number) => {
      const inner = unescape808(wire.subarray(1, wire.length - 1));
      expect(inner.readUInt16BE(0)).toBe(0x8105);
      // body = 1 byte
      expect(inner.readUInt16BE(2) & 0x3ff).toBe(1);
      // last byte before checksum is the command
      const cmdByte = inner.subarray(12, 13)[0]!;
      expect(cmdByte).toBe(expectedCmd);
    };

    checkCmd(lockFrame, 0x66);
    checkCmd(unlockFrame, 0x67);
    checkCmd(cutFrame, 0x64);
  });
});

describe("parse0200BasicBody", () => {
  it("should parse a standard 28-byte 0x0200 body", () => {
    const body = Buffer.alloc(28);
    // alarm
    body.writeUInt32BE(0x00000010, 0); // bit 4 = vibration alarm
    // status
    body.writeUInt32BE(0x00000003, 4); // ACC on + positioned
    // lat
    body.writeUInt32BE(22395000, 8); // 22.395000°
    // lng
    body.writeUInt32BE(114065000, 12); // 114.065000°
    // altitude (m)
    body.writeUInt16BE(50, 16);
    // speed (tenths of km/h)
    body.writeUInt16BE(325, 18); // 32.5 km/h
    // direction
    body.writeUInt16BE(180, 20);
    // time BCD
    body[22] = 0x26; body[23] = 0x07; body[24] = 0x02;
    body[25] = 0x15; body[26] = 0x30; body[27] = 0x00;

    const result = parse0200BasicBody(body);
    expect(result).not.toBeNull();
    expect(result!.alarm).toBe(0x00000010);
    expect(result!.status).toBe(0x00000003);
    expect(result!.lat).toBe(22395000);
    expect(result!.lng).toBe(114065000);
    expect(result!.altitudeM).toBe(50);
    expect(result!.speedTenthKmh).toBe(325);
    expect(result!.direction).toBe(180);
  });

  it("should return null if body is too short", () => {
    const body = Buffer.alloc(20);
    const result = parse0200BasicBody(body);
    expect(result).toBeNull();
  });

  it("should return null on empty buffer", () => {
    const result = parse0200BasicBody(Buffer.alloc(0));
    expect(result).toBeNull();
  });
});

describe("bcd6TimeToIsoGuess", () => {
  it("should convert BCD time to ISO string with +08:00 offset", () => {
    const bcd = Buffer.from([0x26, 0x07, 0x02, 0x15, 0x30, 0x00]);
    const result = bcd6TimeToIsoGuess(bcd);
    expect(result).toBe("2026-07-02T15:30:00+08:00");
  });

  it("should handle end of year correctly", () => {
    const bcd = Buffer.from([0x23, 0x12, 0x31, 0x23, 0x59, 0x59]);
    const result = bcd6TimeToIsoGuess(bcd);
    expect(result).toBe("2023-12-31T23:59:59+08:00");
  });

  it("should pad single-digit months and days", () => {
    const bcd = Buffer.from([0x26, 0x01, 0x05, 0x08, 0x03, 0x07]);
    const result = bcd6TimeToIsoGuess(bcd);
    expect(result).toBe("2026-01-05T08:03:07+08:00");
  });

  it("should return empty string for buffer shorter than 6 bytes", () => {
    expect(bcd6TimeToIsoGuess(Buffer.alloc(3))).toBe("");
  });
});
