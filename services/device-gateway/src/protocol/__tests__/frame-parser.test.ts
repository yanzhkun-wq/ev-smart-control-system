import { describe, it, expect } from "vitest";
import { parseFrame } from "../frame-parser.js";

/**
 * Build a minimal valid frame for testing.
 * Message header (12 bytes) + body (optional) + checksum (1 byte).
 * Checksum = XOR of all bytes before the checksum byte.
 */
function buildFrame(opts: {
  messageId?: number;
  bodyLength?: number;
  phoneBcd?: Buffer;
  serial?: number;
  body?: Buffer;
  /** If true, adds 4 extra bytes for sub-package header (total header=16) */
  hasSub?: boolean;
  /** Override checksum (for testing mismatch) */
  overrideChecksum?: number;
}): Buffer {
  const msgId = opts.messageId ?? 0x0200;
  const body = opts.body ?? Buffer.alloc(0);
  const bodyLen = opts.bodyLength ?? body.length;
  const hasSub = opts.hasSub ?? false;
  const headerLen = hasSub ? 16 : 12;
  const props = (bodyLen & 0x3ff) | (hasSub ? 0x2000 : 0);
  const phoneBcd = opts.phoneBcd ?? Buffer.from([0x01, 0x23, 0x45, 0x67, 0x89, 0x01]);
  const serial = opts.serial ?? 1;

  const header = Buffer.alloc(headerLen);
  header.writeUInt16BE(msgId, 0);
  header.writeUInt16BE(props, 2);
  phoneBcd.copy(header, 4);
  header.writeUInt16BE(serial, 10);
  if (hasSub) {
    // sub-package properties (total 4 bytes): not filled for this test
    header.writeUInt16BE(0, 12); // total package count
    header.writeUInt16BE(0, 14); // current package index
  }

  const core = Buffer.concat([header, body]);
  const checksum = opts.overrideChecksum ?? xorRange(core, 0, core.length);
  return Buffer.concat([core, Buffer.from([checksum])]);
}

function xorRange(data: Buffer, start: number, end: number): number {
  let x = 0;
  for (let i = start; i < end; i++) x ^= data[i]!;
  return x & 0xff;
}

describe("parseFrame", () => {
  it("should parse a minimal valid frame (location message)", () => {
    const body = Buffer.alloc(28); // standard 0200 body length
    const data = buildFrame({ messageId: 0x0200, body });
    const frame = parseFrame(data);

    expect(frame.header.messageId).toBe(0x0200);
    expect(frame.header.bodyLength).toBe(28);
    expect(frame.header.phone).toBe("12345678901");
    expect(frame.header.serial).toBe(1);
    expect(frame.header.headerLength).toBe(12);
    expect(frame.body.length).toBe(28);
    expect(typeof frame.checksum).toBe("number");
  });

  it("should parse a registration message (0x0100)", () => {
    const body = Buffer.from([
      0x00, 0x00, 0x00, 0x01, // province ID
      0x00, 0x02,             // city ID
      0x41, 0x42, 0x43, 0x44, 0x35, 0x36, 0x37, 0x38, // manufacturer (8 ASCII)
      0x54, 0x53, 0x30, 0x30, 0x31, // terminal model
      0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, // terminal ID (7 BCD)
      0x01, // license plate color
      // plate number (variable)
      0x42, 0x4c, 0x30, 0x30, 0x30, 0x31,
    ]);
    const data = buildFrame({ messageId: 0x0100, body });
    const frame = parseFrame(data);

    expect(frame.header.messageId).toBe(0x0100);
    expect(frame.header.phone).toBe("12345678901");
  });

  it("should parse a heartbeat message (0x0002, empty body)", () => {
    const data = buildFrame({ messageId: 0x0002, body: Buffer.alloc(0) });
    const frame = parseFrame(data);

    expect(frame.header.messageId).toBe(0x0002);
    expect(frame.header.bodyLength).toBe(0);
    expect(frame.body.length).toBe(0);
  });

  it("should parse frame with sub-package header (16-byte header)", () => {
    const body = Buffer.alloc(10);
    const data = buildFrame({ messageId: 0x0704, body, hasSub: true });
    const frame = parseFrame(data);

    expect(frame.header.messageId).toBe(0x0704);
    expect(frame.header.headerLength).toBe(16);
    expect(frame.header.bodyLength).toBe(10);
    expect(frame.header.phone).toBe("12345678901");
  });

  it("should parse frame with 11-digit phone (no leading 0)", () => {
    const phoneBcd = Buffer.from([0x01, 0x23, 0x45, 0x67, 0x89, 0x01]); // 12345678901
    const data = buildFrame({ phoneBcd });
    const frame = parseFrame(data);
    expect(frame.header.phone).toBe("12345678901");
  });

  it("should parse frame with phone that has leading zeros", () => {
    const phoneBcd = Buffer.from([0x00, 0x00, 0x12, 0x34, 0x56, 0x78]); // 0012345678 → "12345678"
    const data = buildFrame({ phoneBcd });
    const frame = parseFrame(data);
    expect(frame.header.phone).toBe("12345678");
  });

  it("should parse frame with 12-digit padded phone", () => {
    // 12-digit BCD: 0x86 0x01 0x23 0x45 0x67 0x89 → "860123456789"
    const phoneBcd = Buffer.from([0x86, 0x01, 0x23, 0x45, 0x67, 0x89]);
    const data = buildFrame({ phoneBcd });
    const frame = parseFrame(data);
    // bcdToString strips leading zeros from the whole result, then "860123456789" stays as-is
    expect(frame.header.phone).toBe("860123456789");
  });

  it("should throw on frame that is too short (< 13 bytes)", () => {
    const data = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
    expect(() => parseFrame(data)).toThrow("frame too short");
  });

  it("should throw on incomplete frame (body shorter than declared)", () => {
    // Declare body length 10 but only provide 5 bytes of body
    const body = Buffer.alloc(5);
    const data = buildFrame({ body, bodyLength: 10 });
    expect(() => parseFrame(data)).toThrow(/frame incomplete/);
  });

  it("should throw on checksum mismatch", () => {
    const body = Buffer.alloc(28);
    const data = buildFrame({ body, overrideChecksum: 0x00 });
    // The real checksum won't be 0x00, so it should throw
    expect(() => parseFrame(data)).toThrow("checksum mismatch");
  });

  it("should correctly validate checksum", () => {
    const body = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    const data = buildFrame({ messageId: 0x0200, body });
    // First parse should succeed (valid checksum)
    expect(() => parseFrame(data)).not.toThrow();
    // Corrupt the data
    data[data.length - 1] = (data[data.length - 1]! + 1) & 0xff;
    expect(() => parseFrame(data)).toThrow("checksum mismatch");
  });

  it("should correctly extract body buffer", () => {
    const body = Buffer.from([0x10, 0x20, 0x30, 0x40, 0x50]);
    const data = buildFrame({ messageId: 0x0200, body });
    const frame = parseFrame(data);
    expect(frame.body).toEqual(body);
  });

  it("should handle maximum body length (1023 = 0x3ff)", () => {
    const body = Buffer.alloc(1023);
    const data = buildFrame({ body });
    const frame = parseFrame(data);
    expect(frame.header.bodyLength).toBe(1023);
    expect(frame.body.length).toBe(1023);
  });
});
