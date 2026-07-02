import { describe, it, expect } from "vitest";
import { unescape808, escape808ForWire } from "../escape.js";

describe("escape808ForWire", () => {
  it("should pass through normal bytes unchanged", () => {
    const input = Buffer.from([0x30, 0x31, 0x32, 0x33]);
    const result = escape808ForWire(input);
    expect(result).toEqual(input);
  });

  it("should escape 0x7d as 0x7d 0x01", () => {
    const input = Buffer.from([0x7d]);
    const result = escape808ForWire(input);
    expect(result).toEqual(Buffer.from([0x7d, 0x01]));
  });

  it("should escape 0x7e as 0x7d 0x02", () => {
    const input = Buffer.from([0x7e]);
    const result = escape808ForWire(input);
    expect(result).toEqual(Buffer.from([0x7d, 0x02]));
  });

  it("should escape mixed 0x7d and 0x7e correctly", () => {
    const input = Buffer.from([0x7d, 0x7e, 0x01, 0x02]);
    const result = escape808ForWire(input);
    expect(result).toEqual(
      Buffer.from([0x7d, 0x01, 0x7d, 0x02, 0x01, 0x02]),
    );
  });

  it("should handle empty buffer", () => {
    const input = Buffer.alloc(0);
    const result = escape808ForWire(input);
    expect(result).toEqual(Buffer.alloc(0));
  });

  it("should escape multiple 0x7d occurrences", () => {
    const input = Buffer.from([0x7d, 0x00, 0x7d]);
    const result = escape808ForWire(input);
    expect(result).toEqual(Buffer.from([0x7d, 0x01, 0x00, 0x7d, 0x01]));
  });
});

describe("unescape808", () => {
  it("should pass through normal bytes unchanged", () => {
    const input = Buffer.from([0x30, 0x31, 0x32, 0x33]);
    const result = unescape808(input);
    expect(result).toEqual(input);
  });

  it("should unescape 0x7d 0x01 to 0x7d", () => {
    const input = Buffer.from([0x7d, 0x01]);
    const result = unescape808(input);
    expect(result).toEqual(Buffer.from([0x7d]));
  });

  it("should unescape 0x7d 0x02 to 0x7e", () => {
    const input = Buffer.from([0x7d, 0x02]);
    const result = unescape808(input);
    expect(result).toEqual(Buffer.from([0x7e]));
  });

  it("should unescape mixed escape sequences correctly", () => {
    const input = Buffer.from([0x7d, 0x01, 0x7d, 0x02, 0x01, 0x02]);
    const result = unescape808(input);
    expect(result).toEqual(Buffer.from([0x7d, 0x7e, 0x01, 0x02]));
  });

  it("should handle empty buffer", () => {
    const input = Buffer.alloc(0);
    const result = unescape808(input);
    expect(result).toEqual(Buffer.alloc(0));
  });

  it("should pass through 0x7d followed by non-special byte unchanged", () => {
    const input = Buffer.from([0x7d, 0x03, 0x7d, 0xff]);
    const result = unescape808(input);
    // 0x7d 0x03 → not a valid escape, so 0x7d is kept as-is
    expect(result).toEqual(Buffer.from([0x7d, 0x03, 0x7d, 0xff]));
  });

  it("should handle solitary 0x7d at end of buffer", () => {
    const input = Buffer.from([0x01, 0x7d]);
    const result = unescape808(input);
    expect(result).toEqual(Buffer.from([0x01, 0x7d]));
  });

  it("should round-trip escape and unescape", () => {
    const original = Buffer.from([0x00, 0x7d, 0x7e, 0x01, 0x02, 0x7d, 0x30]);
    const escaped = escape808ForWire(original);
    const unescaped = unescape808(escaped);
    expect(unescaped).toEqual(original);
  });
});
