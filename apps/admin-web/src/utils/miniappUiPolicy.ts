import type { MiniappUiPolicy } from "../types/gatewayStore";

/** 仅当策略显式为 false 时禁止首页装修（兼容误存字符串等情况） */
export function isMiniappHomeLayoutEditAllowed(policy: MiniappUiPolicy | undefined): boolean {
  if (!policy) return true;
  const v = policy.allowHomeLayoutEdit as unknown;
  if (v === false) return false;
  if (v === "false" || v === 0) return false;
  return true;
}
