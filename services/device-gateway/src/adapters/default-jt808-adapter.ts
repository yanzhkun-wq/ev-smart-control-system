import type { VendorAdapter } from "./types.js";

/**
 * 默认适配：只打日志。新厂家可拷贝此类并挂到 registry。
 */
export function createDefaultJt808Adapter(): VendorAdapter {
  const id = "jt808-default";
  return {
    id,
    onFrame(ctx) {
      const { messageId, phone, serial } = ctx.frame.header;
      console.info(
        `[808][${id}] remote=${ctx.remote} msg=0x${messageId.toString(16)} phone=${phone} seq=${serial} body=${ctx.frame.body.length}B`,
      );
    },
  };
}
