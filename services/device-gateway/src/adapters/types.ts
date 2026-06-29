import type { Parsed808Frame } from "../protocol/frame-parser.js";

export type FrameContext = {
  remote: string;
  /** 0x7e 内原始转义段（未还原） */
  rawEscaped: Buffer;
  frame: Parsed808Frame;
};

export type VendorAdapter = {
  readonly id: string;
  onFrame(ctx: FrameContext): void;
};
