import type { VendorAdapter } from "./types.js";
import { createDefaultJt808Adapter } from "./default-jt808-adapter.js";

let active: VendorAdapter = createDefaultJt808Adapter();

export function getDefaultAdapter(): VendorAdapter {
  return active;
}

/** 运行时切换厂家适配（后续可从配置或环境变量加载） */
export function setVendorAdapter(adapter: VendorAdapter): void {
  active = adapter;
}
