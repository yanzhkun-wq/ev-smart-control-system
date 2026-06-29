/**
 * JT/T 808 转义还原：0x7d 0x01 -> 0x7d，0x7d 0x02 -> 0x7e
 */
export function unescape808(data: Buffer): Buffer {
  const out: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const b = data[i]!;
    if (b === 0x7d && i + 1 < data.length) {
      const n = data[i + 1]!;
      if (n === 0x01) {
        out.push(0x7d);
        i++;
        continue;
      }
      if (n === 0x02) {
        out.push(0x7e);
        i++;
        continue;
      }
    }
    out.push(b);
  }
  return Buffer.from(out);
}

/**
 * 发送前转义：0x7d -> 0x7d 0x01，0x7e -> 0x7d 0x02
 */
export function escape808ForWire(data: Buffer): Buffer {
  const out: number[] = [];
  for (const b of data) {
    if (b === 0x7d) {
      out.push(0x7d, 0x01);
    } else if (b === 0x7e) {
      out.push(0x7d, 0x02);
    } else {
      out.push(b);
    }
  }
  return Buffer.from(out);
}
