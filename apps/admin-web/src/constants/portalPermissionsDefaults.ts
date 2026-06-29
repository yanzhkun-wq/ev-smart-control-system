import type { AdminPortalPermissions } from "../types/gatewayStore";

/** 与网关 defaultPortalPermissionsSeed 键一致 */
export const DEFAULT_PORTAL_PERMISSIONS: AdminPortalPermissions = {
  partnerPrincipal: {
    mgmt_portal: true,
    mall_product_manage: true,
    merchant_apply_review: true,
    partner_wallet: true,
    staff_management: true,
    invite_user_merchant: true,
  },
  partnerStaff: {
    mgmt_portal: true,
    mall_product_manage: false,
    merchant_apply_review: true,
    partner_wallet: true,
    staff_management: false,
    invite_user_merchant: true,
  },
  merchant: {
    mgmt_portal: true,
    mall_product_manage: false,
    merchant_apply_review: false,
    merchant_wallet: true,
    merchant_shop_edit: true,
    merchant_orders: true,
  },
};

export const PORTAL_CAPABILITY_META: { id: string; label: string }[] = [
    { id: "mgmt_portal", label: "管理门户与后台入口" },
    { id: "mall_product_manage", label: "商城商品编辑（小程序；有后台发布后以 PC 为准）" },
    { id: "merchant_apply_review", label: "商家入驻审核 / 相关入口" },
    { id: "partner_wallet", label: "合作商钱包与提现相关" },
    { id: "staff_management", label: "员工管理（主管侧）" },
    { id: "invite_user_merchant", label: "邀请用户/商家与推广入口" },
    { id: "merchant_wallet", label: "商家钱包与提现相关" },
    { id: "merchant_shop_edit", label: "门店/店铺资料维护" },
    { id: "merchant_orders", label: "商家侧订单与经营入口" },
];

export function mergePortalPermissionsWithDefaults(p?: AdminPortalPermissions | null): AdminPortalPermissions {
  const s = DEFAULT_PORTAL_PERMISSIONS;
  if (!p) {
    return {
      partnerPrincipal: { ...s.partnerPrincipal },
      partnerStaff: { ...s.partnerStaff },
      merchant: { ...s.merchant },
    };
  }
  return {
    partnerPrincipal: { ...s.partnerPrincipal, ...p.partnerPrincipal },
    partnerStaff: { ...s.partnerStaff, ...p.partnerStaff },
    merchant: { ...s.merchant, ...p.merchant },
  };
}

export const PORTAL_KEYS_BY_ROLE: Record<keyof AdminPortalPermissions, string[]> = {
  partnerPrincipal: Object.keys(DEFAULT_PORTAL_PERMISSIONS.partnerPrincipal),
  partnerStaff: Object.keys(DEFAULT_PORTAL_PERMISSIONS.partnerStaff),
  merchant: Object.keys(DEFAULT_PORTAL_PERMISSIONS.merchant),
};

export function portalCapabilityLabel(id: string): string {
  return PORTAL_CAPABILITY_META.find((m) => m.id === id)?.label ?? id;
}
