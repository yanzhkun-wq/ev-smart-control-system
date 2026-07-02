/**
 * 基础工具函数（纯辅助，无商业逻辑）
 */

const auth = require("./auth-store.js");

function normalizePhone(p) {
  return auth.normalizePhone(p);
}

/** 演示超管手机号（仅此号可进行车辆绑定管理等操作） */
const SUPER_ADMIN_PHONES = ["19900000000"];

function isSuperAdmin(phone) {
  const p = normalizePhone(phone);
  return p && SUPER_ADMIN_PHONES.indexOf(p) >= 0;
}

module.exports = {
  SUPER_ADMIN_PHONES,
  normalizePhone,
  isSuperAdmin,
};
