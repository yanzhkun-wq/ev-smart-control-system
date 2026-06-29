/**
 * 用户邀请权益（演示）：回馈金不可提现、邀请进度、VIP 有效期、设备免单次数
 * 数据依赖 org.readUplines 邀请树与商城订单存储（与 mall-store 同 key）
 */

const org = require("./org-store.js");

const USER_VIP_STATE_KEY = "ev_user_vip_state_v1";
const MALL_ORDERS_KEY = "ev_mall_orders";

/** 付费开通：1 年价格（元，演示版模拟支付后写入本机有效期） */
const VIP_PAY_YEAR_YUAN = 36.5;

/** 好友下单分给邀请方的比例（入账回馈金，非现金） */
const INVITE_ORDER_REBATE_RATE = 0.2;
/** 累计邀请绑定好友 ≥8 → 至少 1 年 VIP；≥10 → 至少 3 年 VIP */
const VIP_JOIN_THRESH_1Y = 8;
const VIP_JOIN_THRESH_3Y = 10;
/** 每满 N 位好友完成绑定 → 1 次主机免单 */
const JOIN_COUNT_PER_FREE_DEVICE = 5;
/** 计入「设备免单」的主机商品（不含改装套件等） */
const DEVICE_PRODUCT_IDS = { p_gw: true, p_ctrl: true };

const MS_DAY = 86400000;
const MS_YEAR = 365 * MS_DAY;
const MS_3YEAR = 3 * MS_YEAR;

function normalize(p) {
  return org.normalizePhone(p);
}

function readState() {
  const raw = wx.getStorageSync(USER_VIP_STATE_KEY);
  return raw && typeof raw === "object" ? raw : {};
}

function writeState(obj) {
  wx.setStorageSync(USER_VIP_STATE_KEY, obj);
}

function readAllOrders() {
  const raw = wx.getStorageSync(MALL_ORDERS_KEY);
  return Array.isArray(raw) ? raw : [];
}

function listDirectInvitees(inviterPhone) {
  const inv = normalize(inviterPhone);
  if (!inv) return [];
  const upl = org.readUplines();
  const out = [];
  for (const ph of Object.keys(upl || {})) {
    const row = upl[ph];
    if (!row || !row.inviterPhone) continue;
    if (normalize(row.inviterPhone) !== inv) continue;
    out.push(normalize(ph));
  }
  return out;
}

function inviteeHasPlacedOrder(inviteePhone) {
  const p = normalize(inviteePhone);
  if (!p) return false;
  return readAllOrders().some(
    (o) => o && normalize(o.userPhone) === p && (Number(o.originalAmount) > 0 || Number(o.amount) > 0)
  );
}

function countJoined(inviterPhone) {
  return listDirectInvitees(inviterPhone).length;
}

function countOrderingInvitees(inviterPhone) {
  return listDirectInvitees(inviterPhone).filter((ph) => inviteeHasPlacedOrder(ph)).length;
}

function getRow(phone) {
  const p = normalize(phone);
  if (!p) return { rebatePoolYuan: 0, freeSlotsUsed: 0, vipExpiresAtMs: 0 };
  const all = readState();
  const cur = all[p];
  if (!cur || typeof cur !== "object") {
    return { rebatePoolYuan: 0, freeSlotsUsed: 0, vipExpiresAtMs: 0 };
  }
  return {
    rebatePoolYuan: Number(cur.rebatePoolYuan) || 0,
    freeSlotsUsed: Math.max(0, Math.round(Number(cur.freeSlotsUsed) || 0)),
    vipExpiresAtMs: Math.max(0, Number(cur.vipExpiresAtMs) || 0),
  };
}

function putRow(phone, patch) {
  const p = normalize(phone);
  if (!p) return;
  const all = readState();
  const prev = getRow(p);
  all[p] = { ...prev, ...patch };
  writeState(all);
}

function earnedFreeDeviceSlots(joinedCount) {
  return Math.floor(Math.max(0, joinedCount) / JOIN_COUNT_PER_FREE_DEVICE);
}

function getAvailableFreeDeviceSlots(inviterPhone) {
  const p = normalize(inviterPhone);
  if (!p) return 0;
  const joined = countJoined(p);
  const earned = earnedFreeDeviceSlots(joined);
  const used = getRow(p).freeSlotsUsed;
  return Math.max(0, earned - used);
}

function isDeviceProduct(productId) {
  return !!(productId && DEVICE_PRODUCT_IDS[productId]);
}

/**
 * 计算应付金额；若 useFreeDeviceSlot 且为主机且有名额，则实付 0 并标记用掉资格（由下单成功后 confirm）
 */
function computeCheckoutAmounts(buyerPhone, productId, unitPriceYuan, qty, useFreeDeviceSlot) {
  const p = normalize(buyerPhone);
  const q = Math.max(1, Math.min(99, Math.round(Number(qty) || 1)));
  const unit = Math.round(Number(unitPriceYuan) * 100) / 100;
  const originalAmount = Math.round(unit * q * 100) / 100;
  let payAmount = originalAmount;
  let willUseFreeSlot = false;
  if (p && useFreeDeviceSlot && isDeviceProduct(productId) && getAvailableFreeDeviceSlots(p) > 0) {
    payAmount = 0;
    willUseFreeSlot = true;
  }
  return { originalAmount, payAmount, willUseFreeSlot };
}

function confirmFreeSlotConsumed(buyerPhone) {
  const p = normalize(buyerPhone);
  if (!p) return;
  const row = getRow(p);
  putRow(p, { freeSlotsUsed: row.freeSlotsUsed + 1 });
}

function extendVipForInviter(inviterPhone) {
  const p = normalize(inviterPhone);
  if (!p) return;
  const nJoin = countJoined(p);
  const row = getRow(p);
  let exp = row.vipExpiresAtMs || 0;
  const now = Date.now();
  if (nJoin >= VIP_JOIN_THRESH_3Y) {
    exp = Math.max(exp, now + MS_3YEAR);
  } else if (nJoin >= VIP_JOIN_THRESH_1Y) {
    exp = Math.max(exp, now + MS_YEAR);
  }
  if (exp !== row.vipExpiresAtMs) {
    putRow(p, { vipExpiresAtMs: exp });
  }
}

/**
 * 演示：模拟「支付 ¥VIP_PAY_YEAR_YUAN 续费 1 年」成功后累加有效期（从当前或原到期日顺延）。
 * 正式环境应改为支付回调成功后再写入。
 */
function addOneYearVipAfterPaidDemo(phone) {
  const p = normalize(phone);
  if (!p) return { ok: false, reason: "no_phone" };
  const now = Date.now();
  const row = getRow(p);
  const base = Math.max(now, Number(row.vipExpiresAtMs) || 0);
  putRow(p, { vipExpiresAtMs: base + MS_YEAR });
  extendVipForInviter(p);
  return { ok: true };
}

function creditInviterRebateFromInviteeOrder(inviteePhone, rebateBaseYuan) {
  const up = org.getUpline(inviteePhone);
  if (!up || !up.inviterPhone) return;
  const inv = normalize(up.inviterPhone);
  const base = Math.round(Number(rebateBaseYuan) * 100) / 100;
  if (!(base > 0) || !inv) return;
  const add = Math.round(base * INVITE_ORDER_REBATE_RATE * 100) / 100;
  const row = getRow(inv);
  putRow(inv, { rebatePoolYuan: Math.round((row.rebatePoolYuan + add) * 100) / 100 });
  extendVipForInviter(inv);
}

function onMallOrderCreated(order) {
  if (!order || !order.userPhone) return;
  const buyer = normalize(order.userPhone);
  const base = order.originalAmount != null ? Number(order.originalAmount) : Number(order.amount) || 0;
  creditInviterRebateFromInviteeOrder(buyer, base);
}

function formatYMD(ms) {
  if (!ms || ms <= 0) return "—";
  const d = new Date(ms);
  const z = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function getUserVipSummary(phone) {
  const p = normalize(phone);
  if (!p) {
    return {
      joinedCount: 0,
      orderingInviteeCount: 0,
      rebatePoolYuan: 0,
      rebatePoolStr: "0",
      vipActive: false,
      vipExpiresAtMs: 0,
      vipUntilStr: "—",
      vipBadge: "",
      vipHeadline: "",
      freeSlotsEarned: 0,
      freeSlotsUsed: 0,
      freeSlotsAvail: 0,
      vipOrderProgressPct: 0,
      vipOrderHint: "",
      joinFreeHint: "",
      rebateHint: "",
    };
  }
  extendVipForInviter(p);
  const joinedCount = countJoined(p);
  const orderingInviteeCount = countOrderingInvitees(p);
  const rowAfter = getRow(p);
  const now = Date.now();
  const vipActive = rowAfter.vipExpiresAtMs > now;
  let vipBadge = "";
  let vipHeadline = "";
  if (vipActive) {
    vipBadge = "VIP";
    if (joinedCount >= VIP_JOIN_THRESH_3Y) vipHeadline = "VIP · 三年";
    else if (joinedCount >= VIP_JOIN_THRESH_1Y) vipHeadline = "VIP · 一年";
    else vipHeadline = "VIP";
  } else if (joinedCount >= VIP_JOIN_THRESH_1Y) {
    vipHeadline = "VIP 已过期";
  }

  const earned = earnedFreeDeviceSlots(joinedCount);
  const avail = getAvailableFreeDeviceSlots(p);

  const vipOrderPct = Math.min(100, Math.round((joinedCount / VIP_JOIN_THRESH_3Y) * 100));
  let vipOrderHint = "";
  if (joinedCount >= VIP_JOIN_THRESH_3Y) {
    vipOrderHint = `已满 ${VIP_JOIN_THRESH_3Y} 人，享 3 年 VIP。`;
  } else if (joinedCount >= VIP_JOIN_THRESH_1Y) {
    vipOrderHint = `已满 ${VIP_JOIN_THRESH_1Y} 人；再邀 ${VIP_JOIN_THRESH_3Y - joinedCount} 人升至 3 年 VIP。`;
  } else {
    vipOrderHint = `再邀 ${VIP_JOIN_THRESH_1Y - joinedCount} 人得 1 年 VIP。`;
  }

  const joinFreeHint =
    avail > 0
      ? `当前可用设备免单 ${avail} 次（下单主机时可选用）。`
      : (() => {
          const earnedSlots = earnedFreeDeviceSlots(joinedCount);
          const nextThreshold = (earnedSlots + 1) * JOIN_COUNT_PER_FREE_DEVICE;
          const need = Math.max(0, nextThreshold - joinedCount);
          return `再邀请 ${need} 位好友绑定加入，可获得 1 次主机免单（已有 ${joinedCount} 人）。`;
        })();

  return {
    joinedCount,
    orderingInviteeCount,
    rebatePoolYuan: rowAfter.rebatePoolYuan,
    rebatePoolStr: String(Math.round(rowAfter.rebatePoolYuan * 100) / 100),
    vipActive,
    vipExpiresAtMs: rowAfter.vipExpiresAtMs,
    vipUntilStr: vipActive ? formatYMD(rowAfter.vipExpiresAtMs) : rowAfter.vipExpiresAtMs ? `${formatYMD(rowAfter.vipExpiresAtMs)}（已过期）` : "未开通",
    vipBadge,
    vipHeadline,
    freeSlotsEarned: earned,
    freeSlotsUsed: rowAfter.freeSlotsUsed,
    freeSlotsAvail: avail,
    vipOrderProgressPct: vipOrderPct,
    vipOrderHint,
    joinFreeHint,
    rebateHint: `好友每笔商城订单金额的 ${Math.round(INVITE_ORDER_REBATE_RATE * 100)}%，入账回馈金（不可提现，可用于后续权益抵扣演示）。`,
  };
}

function isUserVipActive(phone) {
  const p = normalize(phone);
  if (!p) return false;
  extendVipForInviter(p);
  const row = getRow(p);
  return (Number(row.vipExpiresAtMs) || 0) > Date.now();
}

/** 电子围栏、多账号授权等：VIP 或演示超管可用 */
function canUseVipGatedFeatures(phone) {
  const p = normalize(phone);
  if (!p) return false;
  if (org.isSuperAdmin(p)) return true;
  return isUserVipActive(p);
}

/** 被邀请人绑定成功后刷新邀请方 VIP 档位（无需等对方下单） */
function syncInviterAfterInviteeJoined(inviterPhone) {
  extendVipForInviter(inviterPhone);
}

module.exports = {
  INVITE_ORDER_REBATE_RATE,
  VIP_PAY_YEAR_YUAN,
  VIP_JOIN_THRESH_1Y,
  VIP_JOIN_THRESH_3Y,
  JOIN_COUNT_PER_FREE_DEVICE,
  isDeviceProduct,
  listDirectInvitees,
  countJoined,
  countOrderingInvitees,
  getAvailableFreeDeviceSlots,
  computeCheckoutAmounts,
  confirmFreeSlotConsumed,
  onMallOrderCreated,
  getUserVipSummary,
  isUserVipActive,
  canUseVipGatedFeatures,
  syncInviterAfterInviteeJoined,
  addOneYearVipAfterPaidDemo,
};
