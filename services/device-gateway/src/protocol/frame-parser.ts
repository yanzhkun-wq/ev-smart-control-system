export type Parsed808Header = {
  messageId: number;
  bodyLength: number;
  phone: string;
  serial: number;
  headerLength: number;
};

export type Parsed808Frame = {
  header: Parsed808Header;
  body: Buffer;
  checksum: number;
};

function bcdToString(buf: Buffer): string {
  const digits: string[] = [];
  for (const byte of buf) {
    digits.push(((byte >> 4) & 0x0f).toString());
    digits.push((byte & 0x0f).toString());
  }
  return digits.join("").replace(/^0+/, "") || "0";
}

function xorRange(data: Buffer, start: number, end: number): number {
  let x = 0;
  for (let i = start; i < end; i++) x ^= data[i]!;
  return x & 0xff;
}

/**
 * 解析 0x7e 之间、已转义还原后的单条消息：消息头 + 消息体 + 校验码（1 字节）。
 * 体长度取自消息体属性字低 10 位；含分包位时头部长 16 字节。
 */
export function parseFrame(data: Buffer): Parsed808Frame {
  if (data.length < 13) {
    throw new Error(`frame too short: ${data.length}`);
  }

  const messageId = data.readUInt16BE(0);
  const props = data.readUInt16BE(2);
  const bodyLength = props & 0x3ff;
  const hasSub = (props & 0x2000) !== 0;
  const headerLength = hasSub ? 16 : 12;

  const expected = headerLength + bodyLength + 1;
  if (data.length < expected) {
    throw new Error(`frame incomplete: have ${data.length}, need ${expected}`);
  }

  const phone = bcdToString(data.subarray(4, 10));
  const serial = data.readUInt16BE(10);
  const body = data.subarray(headerLength, headerLength + bodyLength);
  const checksum = data.readUInt8(headerLength + bodyLength);

  const calc = xorRange(data, 0, headerLength + bodyLength);
  if (calc !== checksum) {
    throw new Error(
      `checksum mismatch: got 0x${checksum.toString(16)}, expect 0x${calc.toString(16)}`,
    );
  }

  return {
    header: {
      messageId,
      bodyLength,
      phone,
      serial,
      headerLength,
    },
    body,
    checksum,
  };
}
