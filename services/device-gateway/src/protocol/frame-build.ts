import { escape808ForWire } from "./escape.js";

/** 将 11～12 位数字的手机号转为协议头 6 字节 BCD（左补 0 到 12 位） */
export function phoneDigitsToBcd(phoneDigits: string): Buffer {
  const d = phoneDigits.replace(/\D/g, "");
  const pad = d.length >= 12 ? d.slice(-12) : d.padStart(12, "0");
  const buf = Buffer.alloc(6);
  for (let i = 0; i < 6; i++) {
    const hi = parseInt(pad[i * 2]!, 10);
    const lo = parseInt(pad[i * 2 + 1]!, 10);
    if (Number.isNaN(hi) || Number.isNaN(lo)) throw new Error(`invalid phone bcd: ${phoneDigits}`);
    buf[i]! = ((hi & 0x0f) << 4) | (lo & 0x0f);
  }
  return buf;
}

function xorRange(data: Buffer, start: number, end: number): number {
  let x = 0;
  for (let i = start; i < end; i++) x ^= data[i]!;
  return x & 0xff;
}

/**
 * 组帧：消息头(12) + 体 + 校验码(1)，再转义，外包 0x7e。
 */
export function buildWireFrame(
  messageId: number,
  phoneBcd: Buffer,
  serial: number,
  body: Buffer,
): Buffer {
  if (phoneBcd.length !== 6) throw new Error("phoneBcd must be 6 bytes");
  const props = body.length & 0x3ff;
  const header = Buffer.alloc(12);
  header.writeUInt16BE(messageId, 0);
  header.writeUInt16BE(props, 2);
  phoneBcd.copy(header, 4);
  header.writeUInt16BE(serial & 0xffff, 10);
  const core = Buffer.concat([header, body]);
  const chk = xorRange(core, 0, core.length);
  const withChk = Buffer.concat([core, Buffer.from([chk])]);
  const escaped = escape808ForWire(withChk);
  return Buffer.concat([Buffer.from([0x7e]), escaped, Buffer.from([0x7e])]);
}

/** 平台通用应答 0x8001 */
export function buildPlatformAck(
  phoneBcd: Buffer,
  downSerial: number,
  ackToMsgId: number,
  ackToSerial: number,
  result = 0,
): Buffer {
  const body = Buffer.alloc(5);
  body.writeUInt16BE(ackToSerial & 0xffff, 0);
  body.writeUInt16BE(ackToMsgId & 0xffff, 2);
  body.writeUInt8(result & 0xff, 4);
  return buildWireFrame(0x8001, phoneBcd, downSerial, body);
}

/** 终端注册应答 0x8100 */
export function buildRegisterResponse(
  phoneBcd: Buffer,
  downSerial: number,
  replyToSerial: number,
  result: number,
  authAscii: string,
): Buffer {
  const auth = Buffer.from(authAscii, "ascii");
  const body = Buffer.alloc(3 + auth.length);
  body.writeUInt16BE(replyToSerial & 0xffff, 0);
  body.writeUInt8(result & 0xff, 2);
  auth.copy(body, 3);
  return buildWireFrame(0x8100, phoneBcd, downSerial, body);
}

/** 终端控制 0x8105：单字节命令字（WZ 摘录：0x64 断油电 0x65 恢复 0x66 设防 0x67 撤防） */
export function buildTerminalControl(phoneBcd: Buffer, downSerial: number, commandByte: number): Buffer {
  const body = Buffer.from([commandByte & 0xff]);
  return buildWireFrame(0x8105, phoneBcd, downSerial, body);
}

export type Parsed0200Basic = {
  alarm: number;
  status: number;
  lat: number;
  lng: number;
  altitudeM: number;
  speedTenthKmh: number;
  direction: number;
  timeBcd6: Buffer;
};

/** 解析 0x0200 前 28 字节基本定位（无附加信息） */
export function parse0200BasicBody(body: Buffer): Parsed0200Basic | null {
  if (body.length < 28) return null;
  return {
    alarm: body.readUInt32BE(0),
    status: body.readUInt32BE(4),
    lat: body.readUInt32BE(8),
    lng: body.readUInt32BE(12),
    altitudeM: body.readUInt16BE(16),
    speedTenthKmh: body.readUInt16BE(18),
    direction: body.readUInt16BE(20),
    timeBcd6: body.subarray(22, 28),
  };
}

export function bcd6TimeToIsoGuess(bcd: Buffer): string {
  if (bcd.length < 6) return "";
  const d = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const yy = ((bcd[0]! >> 4) * 10 + (bcd[0]! & 0x0f) + 2000).toString();
  const mo = (bcd[1]! >> 4) * 10 + (bcd[1]! & 0x0f);
  const da = (bcd[2]! >> 4) * 10 + (bcd[2]! & 0x0f);
  const hh = (bcd[3]! >> 4) * 10 + (bcd[3]! & 0x0f);
  const mm = (bcd[4]! >> 4) * 10 + (bcd[4]! & 0x0f);
  const ss = (bcd[5]! >> 4) * 10 + (bcd[5]! & 0x0f);
  return `${yy}-${d(mo)}-${d(da)}T${d(hh)}:${d(mm)}:${d(ss)}+08:00`;
}
