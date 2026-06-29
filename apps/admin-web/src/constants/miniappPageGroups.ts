/** 小程序页面在后台中的分组（与 app.json 页面对齐） */
export const MINIAPP_GROUP_ORDER = ["home", "mall", "vehicle", "invite", "partner", "merchant", "system"] as const;

export type MiniappGroupId = (typeof MINIAPP_GROUP_ORDER)[number];

export const MINIAPP_GROUP_LABEL: Record<MiniappGroupId, string> = {
  home: "首页与个人",
  mall: "网点与商城",
  vehicle: "车辆与地图",
  invite: "邀请与会员",
  partner: "合作商",
  merchant: "升级网点（商家）",
  system: "账号与系统",
};

/** 每个 route → 分组 */
export const MINIAPP_ROUTE_GROUP: Record<string, MiniappGroupId> = {
  "pages/home/home": "home",
  "pages/profile/profile": "home",
  "pages/shops/shops": "mall",
  "pages/mall/mall": "mall",
  "pages/mall-detail/mall-detail": "mall",
  "pages/mall-product-edit/mall-product-edit": "mall",
  "pages/mall-product-form/mall-product-form": "mall",
  "pages/vehicle-manage/vehicle-manage": "vehicle",
  "pages/add-bind/add-bind": "vehicle",
  "pages/location/location": "vehicle",
  "pages/fence-edit/fence-edit": "vehicle",
  "pages/fence-setting/fence-setting": "vehicle",
  "pages/control/control": "vehicle",
  "pages/alarm/alarm": "vehicle",
  "pages/records-lock/records-lock": "vehicle",
  "pages/tracks/tracks": "vehicle",
  "pages/invite-bind/invite-bind": "invite",
  "pages/invite-system/invite-system": "invite",
  "pages/share-app/share-app": "invite",
  "pages/vip-center/vip-center": "invite",
  "pages/partner-apply/partner-apply": "partner",
  "pages/partner-admin/partner-admin": "partner",
  "pages/partner-wallet/partner-wallet": "partner",
  "pages/partner-payout-bind/partner-payout-bind": "partner",
  "pages/platform-withdraw-review/platform-withdraw-review": "partner",
  "pages/partner-staff-admin/partner-staff-admin": "partner",
  "pages/partner-user-lookup/partner-user-lookup": "partner",
  "pages/partner-l1-detail/partner-l1-detail": "partner",
  "pages/merchant-apply/merchant-apply": "merchant",
  "pages/merchant-admin/merchant-admin": "merchant",
  "pages/merchant-backend-demo/merchant-backend-demo": "merchant",
  "pages/merchant-wallet/merchant-wallet": "merchant",
  "pages/auth/auth": "system",
  "pages/mgmt-portal/mgmt-portal": "system",
  "pages/super-binding/super-binding": "system",
  "pages/account/account": "system",
  "pages/notify/notify": "system",
};

export function routeGroup(route: string): MiniappGroupId {
  return MINIAPP_ROUTE_GROUP[route] ?? "system";
}
