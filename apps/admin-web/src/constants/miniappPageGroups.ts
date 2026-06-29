/** 小程序页面在后台中的分组（与 app.json 页面对齐） */
export const MINIAPP_GROUP_ORDER = ["home", "hardware", "vehicle", "system"] as const;

export type MiniappGroupId = (typeof MINIAPP_GROUP_ORDER)[number];

export const MINIAPP_GROUP_LABEL: Record<MiniappGroupId, string> = {
  home: "首页与个人",
  hardware: "兼容硬件",
  vehicle: "车辆与安全",
  system: "账号与系统",
};

/** 每个 route → 分组 */
export const MINIAPP_ROUTE_GROUP: Record<string, MiniappGroupId> = {
  "pages/home/home": "home",
  "pages/profile/profile": "home",
  "pages/hardware/hardware": "hardware",
  "pages/hardware-detail/hardware-detail": "hardware",
  "pages/hardware-product-edit/hardware-product-edit": "hardware",
  "pages/hardware-product-form/hardware-product-form": "hardware",
  "pages/vehicle-manage/vehicle-manage": "vehicle",
  "pages/add-bind/add-bind": "vehicle",
  "pages/location/location": "vehicle",
  "pages/fence-edit/fence-edit": "vehicle",
  "pages/fence-setting/fence-setting": "vehicle",
  "pages/control/control": "vehicle",
  "pages/alarm/alarm": "vehicle",
  "pages/records-lock/records-lock": "vehicle",
  "pages/tracks/tracks": "vehicle",
  "pages/auth/auth": "system",
  "pages/mgmt-portal/mgmt-portal": "system",
  "pages/super-binding/super-binding": "system",
  "pages/account/account": "system",
  "pages/notify/notify": "system",
};

export function routeGroup(route: string): MiniappGroupId {
  return MINIAPP_ROUTE_GROUP[route] ?? "system";
}
