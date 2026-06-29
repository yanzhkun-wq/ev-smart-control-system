/**
 * 用户权益（公益版）—— 本项目完全免费，无VIP/会员/收费制度
 * 保留此文件仅为兼容旧代码引用，所有商业逻辑已移除
 */

const org = require("./org-store.js");

function normalize(p) {
  return org.normalizePhone(p);
}

/** 所有用户均为免费用户，无VIP限制 */
function isUserVipActive(phone) {
  return true; // 公益项目，所有功能免费开放
}

/** 所有功能免费开放 */
function canUseVipGatedFeatures(phone) {
  return true;
}

/** 无邀请/返利机制，返回空 */
function getUserVipSummary(phone) {
  return {
    joinedCount: 0,
    orderingInviteeCount: 0,
    rebatePoolYuan: 0,
    rebatePoolStr: "0",
    vipActive: true,
    vipExpiresAtMs: 0,
    vipUntilStr: "永久免费",
    vipBadge: "",
    vipHeadline: "公益免费",
    freeSlotsEarned: 0,
    freeSlotsUsed: 0,
    freeSlotsAvail: 0,
    vipOrderProgressPct: 100,
    vipOrderHint: "本项目为公益开源项目，所有功能免费开放。",
    joinFreeHint: "",
    rebateHint: "",
  };
}

module.exports = {
  INVITE_ORDER_REBATE_RATE: 0,
  VIP_PAY_YEAR_YUAN: 0,
  VIP_JOIN_THRESH_1Y: 999999,
  VIP_JOIN_THRESH_3Y: 999999,
  JOIN_COUNT_PER_FREE_DEVICE: 999999,
  isDeviceProduct: () => false,
  listDirectInvitees: () => [],
  countJoined: () => 0,
  countOrderingInvitees: () => 0,
  getAvailableFreeDeviceSlots: () => 0,
  computeCheckoutAmounts: (buyerPhone, productId, unitPriceYuan, qty, useFreeDeviceSlot) => ({
    originalAmount: 0, payAmount: 0, willUseFreeSlot: false
  }),
  confirmFreeSlotConsumed: () => {},
  onMallOrderCreated: () => {},
  getUserVipSummary,
  isUserVipActive,
  canUseVipGatedFeatures,
  syncInviterAfterInviteeJoined: () => {},
  addOneYearVipAfterPaidDemo: () => ({ ok: false, reason: "公益版不提供付费功能" }),
};
