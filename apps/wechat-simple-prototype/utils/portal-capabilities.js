/**
 * 与网关 GET /api/miniapp-ui 的 portalPermissions 对齐（演示端；正式环境须服务端鉴权）
 */
const org = require("./org-store.js");
const partnerStore = require("./partner-store.js");
const remoteUi = require("./remote-ui-config.js");

/** 与 store.defaultPortalPermissionsSeed 一致，供缺省合并 */
const SEED = {
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

function roleGroup(phone) {
  const p = org.normalizePhone(phone);
  if (!p) return null;
  if (org.getRoles(p).merchant) return "merchant";
  if (partnerStore.isPrincipalPartner(p)) return "partnerPrincipal";
  if (partnerStore.isPartnerStaff(p)) return "partnerStaff";
  return null;
}

function mergedRoleMap(group) {
  const root = remoteUi.getPortalPermissions && remoteUi.getPortalPermissions();
  const partial = root && typeof root === "object" && root[group] && typeof root[group] === "object" ? root[group] : {};
  const seed = SEED[group] || {};
  return { ...seed, ...partial };
}

/** 某能力是否允许（超管始终 true） */
function can(phone, key) {
  if (org.isSuperAdmin(phone)) return true;
  const g = roleGroup(phone);
  if (!g) return false;
  const m = mergedRoleMap(g);
  return m[key] !== false;
}

module.exports = {
  can,
  roleGroup,
};
