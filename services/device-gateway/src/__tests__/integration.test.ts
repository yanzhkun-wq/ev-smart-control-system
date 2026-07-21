/**
 * 协议集成测试 — 验证完整的数据流：构建帧 → 组帧 → 转义 → 拆帧 → 解析
 *
 * 模拟 JT/T808 TCP 网关中数据的完整生命周期，
 * 确保编码器和解码器之间的一致性。
 */

import { describe, it, expect } from "vitest";
import { phoneDigitsToBcd, buildWireFrame, buildPlatformAck, buildRegisterResponse } from "../protocol/frame-build.js";
import { unescape808, escape808ForWire } from "../protocol/escape.js";
import { parseFrame } from "../protocol/frame-parser.js";

/** XOR 校验计算 */
function xorRange(data: Buffer, start: number, end: number): number {
  let x = 0;
  for (let i = start; i < end; i++) x ^= data[i]!;
  return x & 0xff;
}

/**
 * 模拟 TCP 网关收帧流程：
 * 1. 收到原始字节 → 按 0x7e 找帧边界
 * 2. 去掉定界符 → 转义还原
 * 3. 调用 parseFrame 解析
 */
function simulateTcpReceive(wireFrame: Buffer): ReturnType<typeof parseFrame> {
  // TCP 数据中可能包含多个帧，这里只取第一帧
  const start = wireFrame.indexOf(0x7e);
  if (start === -1) throw new Error("no frame delimiter");
  const end = wireFrame.indexOf(0x7e, start + 1);
  if (end === -1) throw new Error("incomplete frame");
  const rawEscaped = wireFrame.subarray(start + 1, end);
  const unescaped = unescape808(rawEscaped);
  return parseFrame(unescaped);
}

describe("Full round-trip: build → wire → TCP → parse", () => {
  it("should round-trip a 0x0200 location message", () => {
    const phone = "13800138000";
    const phoneBcd = phoneDigitsToBcd(phone);
    const body = Buffer.alloc(28);
    body.writeUInt32BE(0, 0);           // alarm
    body.writeUInt32BE(1, 4);            // status: ACC on
    body.writeUInt32BE(22395000, 8);     // lat
    body.writeUInt32BE(114065000, 12);    // lng
    body.writeUInt16BE(50, 16);          // altitude
    body.writeUInt16BE(325, 18);         // speed 32.5 km/h
    body.writeUInt16BE(180, 20);         // direction
    body[22] = 0x26; body[23] = 0x07; body[24] = 0x10;
    body[25] = 0x15; body[26] = 0x30; body[27] = 0x00; // time

    const wireFrame = buildWireFrame(0x0200, phoneBcd, 1, body);
    const frame = simulateTcpReceive(wireFrame);

    expect(frame.header.messageId).toBe(0x0200);
    expect(frame.header.phone).toBe(phone);
    expect(frame.header.serial).toBe(1);
    expect(frame.header.bodyLength).toBe(28);
    expect(frame.body).toEqual(body);
  });

  it("should round-trip a heartbeat (0x0002) with empty body", () => {
    const phoneBcd = phoneDigitsToBcd("12345678901");
    const wireFrame = buildWireFrame(0x0002, phoneBcd, 1, Buffer.alloc(0));
    const frame = simulateTcpReceive(wireFrame);

    expect(frame.header.messageId).toBe(0x0002);
    expect(frame.header.bodyLength).toBe(0);
    expect(frame.body.length).toBe(0);
  });

  it("should round-trip a 0x8105 terminal control message", () => {
    const phoneBcd = phoneDigitsToBcd("13800138000");
    const cmdBody = Buffer.from([0x66]); // ARM command
    const wireFrame = buildWireFrame(0x8105, phoneBcd, 5, cmdBody);
    const frame = simulateTcpReceive(wireFrame);

    expect(frame.header.messageId).toBe(0x8105);
    expect(frame.header.serial).toBe(5);
    expect(frame.body).toEqual(cmdBody);
  });

  it("should round-trip a 0x8001 platform ack message", () => {
    const phoneBcd = phoneDigitsToBcd("13800138000");
    const wireFrame = buildPlatformAck(phoneBcd, 10, 0x0200, 3, 0);
    const frame = simulateTcpReceive(wireFrame);

    expect(frame.header.messageId).toBe(0x8001);
    expect(frame.header.serial).toBe(10);
    // body: ackSerial(2) + ackMsgId(2) + result(1) = 5 bytes
    expect(frame.header.bodyLength).toBe(5);
    expect(frame.body.length).toBe(5);
    expect(frame.body.readUInt16BE(0)).toBe(3);    // ack to serial
    expect(frame.body.readUInt16BE(2)).toBe(0x0200); // ack to msg id
    expect(frame.body[4]).toBe(0);                  // result
  });

  it("should round-trip a 0x8100 register response", () => {
    const phoneBcd = phoneDigitsToBcd("13800138000");
    const wireFrame = buildRegisterResponse(phoneBcd, 20, 5, 0, "AUTH12345");
    const frame = simulateTcpReceive(wireFrame);

    expect(frame.header.messageId).toBe(0x8100);
    expect(frame.header.serial).toBe(20);
    // body: replySerial(2) + result(1) + authCode(9) = 12 bytes
    expect(frame.body.readUInt16BE(0)).toBe(5);    // reply to serial
    expect(frame.body[2]).toBe(0);                  // success
    expect(frame.body.subarray(3).toString()).toBe("AUTH12345");
  });

  it("should handle body containing 0x7e and 0x7d escape bytes", () => {
    const phoneBcd = phoneDigitsToBcd("13800138000");
    // Body with bytes that need escaping
    const body = Buffer.from([0x01, 0x7e, 0x02, 0x7d, 0x03]);
    const wireFrame = buildWireFrame(0x0200, phoneBcd, 1, body);
    const frame = simulateTcpReceive(wireFrame);

    expect(frame.header.messageId).toBe(0x0200);
    expect(frame.body).toEqual(body);
  });

  it("should verify checksum correctness after round-trip", () => {
    const phoneBcd = phoneDigitsToBcd("13800138000");
    const body = Buffer.from([0x10, 0x20, 0x30, 0x40]);
    const wireFrame = buildWireFrame(0x0200, phoneBcd, 1, body);

    // Manually verify checksum
    const inner = unescape808(wireFrame.subarray(1, wireFrame.length - 1));
    const header = inner.subarray(0, 12);
    const payload = inner.subarray(12, inner.length - 1);
    const checksum = inner[inner.length - 1]!;
    const expectedChecksum = xorRange(Buffer.concat([header, payload]), 0, 12 + payload.length);
    expect(checksum).toBe(expectedChecksum);
  });
});

describe("Frame escaping consistency", () => {
  it("should escape and unescape consistently for various body sizes", () => {
    const sizes = [0, 1, 10, 100, 500, 1023];
    for (const size of sizes) {
      const body = Buffer.alloc(size);
      for (let i = 0; i < size; i++) {
        body[i] = (i * 17 + 31) & 0xff; // deterministic pseudo-random data
      }
      const phoneBcd = phoneDigitsToBcd("13800138000");
      const wireFrame = buildWireFrame(0x0200, phoneBcd, 1, body);
      const frame = simulateTcpReceive(wireFrame);
      expect(frame.body).toEqual(body);
    }
  });

  it("should escape and unescape body with many escape bytes", () => {
    // Body full of 0x7e and 0x7d (worst-case for escaping)
    const body = Buffer.alloc(100);
    for (let i = 0; i < 50; i++) {
      body[i * 2] = 0x7e;
      body[i * 2 + 1] = 0x7d;
    }
    const phoneBcd = phoneDigitsToBcd("13800138000");
    const wireFrame = buildWireFrame(0x0200, phoneBcd, 1, body);
    const frame = simulateTcpReceive(wireFrame);
    expect(frame.body).toEqual(body);
  });
});
