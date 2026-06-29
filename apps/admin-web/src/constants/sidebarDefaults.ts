import type { AdminSidebarMenuItem } from "../types/gatewayStore";

/** 与网关 defaultSidebarMenuItems 顺序一致；无网络时用 */
export const FALLBACK_SIDEBAR_MENU: AdminSidebarMenuItem[] = [
  { path: "/", label: "工作台" },
  { path: "/vehicle-risk", label: "车联与风控" },
  { path: "/mall-manage", label: "智控商城" },
  { path: "/portal-permissions", label: "小程序门户权限" },
  { path: "/miniapp-ecology", label: "小程序后台数据" },
  { path: "/operations", label: "运营与分销" },
  { path: "/partner-channel", label: "平台·渠道与业绩" },
  { path: "/miniapp-pages", label: "小程序页面" },
  { path: "/settings", label: "系统设置" },
];

/**
 * 与网关 mergeSidebarMenus 一致：侧栏结构以 template 为准，只合并已存在 path 的 label / hidden。
 * 用于消除本地旧草稿或历史数据里多出来的「实时监控」等独立项。
 */
export function mergeSidebarMenuWithTemplate(
  template: AdminSidebarMenuItem[],
  partial: AdminSidebarMenuItem[] | undefined,
): AdminSidebarMenuItem[] {
  if (!partial?.length) return template.map((d) => ({ ...d }));
  const map = new Map(template.map((d) => [d.path, { ...d }]));
  for (const p of partial) {
    const path = String(p.path ?? "").trim();
    if (!path) continue;
    const cur = map.get(path);
    if (cur) {
      if (typeof p.label === "string" && p.label.trim()) cur.label = p.label.trim();
      cur.hidden = !!p.hidden;
    }
  }
  return template.map((d) => map.get(d.path)!);
}
