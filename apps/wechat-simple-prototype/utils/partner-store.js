/**
 * 合作商：一级/二级员工、划拨、入驻审核、奖励归因、业绩统计（演示本机）
 */

const auth = require("./auth-store.js");
const org = require("./org-store.js");
const merchantStore = require("./merchant-store.js");
const vehicleStore = require("./vehicle-store.js");

const STAFF_KEY = "ev_partner_staff_v2";
const STAFF_V1_KEY = "ev_partner_staff_v1";
const MERCHANT_APP_KEY = "ev_merchant_partner_apps_v1";
const REWARDS_KEY = "ev_partner_rewards_v1";
const WITHDRAW_KEY = "ev_partner_withdrawals_v1";
const PAYOUT_PROFILE_KEY = "ev_partner_payout_profile_v1";
/** 合作商邀请合作商：奖励台账（演示本机） */
const PARTNER_INVITE_PARTNER_REWARDS_KEY = "ev_partner_invite_partner_rewards_v1";
/** 被邀请合作商主管 → 邀请方主管手机号 */
const PARTNER_PRINCIPAL_INVITER_MAP_KEY = "ev_partner_principal_inviter_v1";

/** 演示：被邀请合作商开通时模拟缴纳公司的代理费（元），正式环境由服务端订单为准 */
const DEMO_PARTNER_AGENCY_FEE_YUAN = 100;
/** 邀请方获得被邀请方代理费的固定比例（平台补贴） */
const PARTNER_INVITE_REFERRAL_RATE = 0.1;

/** 单笔提现下限（元） */
const MIN_WITHDRAW_YUAN = 1;

/**
 * 提现打款通道（预留，供服务端对接）
 * - manual：银行卡等线下/批量代付
 * - wechat_mch_transfer：微信「商家转账到零钱」
 * - alipay_transfer：支付宝转账类接口（字段预留）
 */
const PAY_PIPELINE = {
  MANUAL: "manual",
  WECHAT_MCH_TRANSFER: "wechat_mch_transfer",
  ALIPAY_TRANSFER: "alipay_transfer",
};

/**
 * 微信转账单状态（预留，可与商户平台文档对齐后细化）
 * SUCCESS / FAIL 等建议以服务端回调为准，勿仅信小程序本地
 */
const WX_TRANSFER_STATE = {
  EMPTY: "",
  INIT: "INIT",
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
  FAIL: "FAIL",
};

/** 兼容旧常量：默认一档；实际计提用 getPartnerTierPercent / countTierUsersForPartner */
const PARTNER_REWARD_RATE = 0.15;
/** 用户现场付给商家的金额：旧版改装单曾填写；合作商按该收款计提（存量兼容）。新上单已无此项 */
const PARTNER_MERCHANT_REVENUE_RATE = 0.1;

/** 档位：名下用户数量（不含主管、员工、商家店主账号）→ 订单额计提比例 */
function getPartnerTierPercent(userCount) {
  const n = Math.max(0, Number(userCount) || 0);
  if (n <= 500) return 15;
  if (n <= 1000) return 20;
  if (n <= 3000) return 25;
  if (n <= 6000) return 30;
  return 35;
}

function tierLabelFromCount(n) {
  const u = Math.max(0, Number(n) || 0);
  if (u <= 500) return "V1";
  if (u <= 1000) return "V2";
  if (u <= 3000) return "V3";
  if (u <= 6000) return "V4";
  return "V5";
}

/**
 * 合作商生态闭包：主管 + 本体系员工 + 归属商家店主 + 递归邀请链上的全部用户（用于台账与区间拉新）
 */
function collectPartnerInviterClosure(rootPhone) {
  const rt = normalize(rootPhone);
  const seeds = new Set();
  if (!rt) return seeds;
  seeds.add(rt);
  const all = readStaff();
  for (const ph of Object.keys(all)) {
    if (normalize(all[ph].rootPartnerPhone) === rt) seeds.add(normalize(ph));
  }
  for (const shop of merchantStore.readShopsRaw()) {
    if (normalize(shop.partnerPhone) === rt && shop.ownerPhone) seeds.add(normalize(shop.ownerPhone));
  }
  const uplines = org.readUplines();
  let changed = true;
  while (changed) {
    changed = false;
    for (const invitee of Object.keys(uplines)) {
      const inv = normalize(uplines[invitee].inviterPhone);
      if (!inv || seeds.has(normalize(invitee))) continue;
      if (seeds.has(inv)) {
        seeds.add(normalize(invitee));
        changed = true;
      }
    }
  }
  return seeds;
}

/** 计入选合作商档位「名下用户」：邀请人须在闭包内，排除主管、员工、商家店主 */
function countTierUsersForPartner(rootPhone) {
  const rt = normalize(rootPhone);
  if (!rt) return 0;
  const closure = collectPartnerInviterClosure(rt);
  const uplines = org.readUplines();
  const exclude = new Set([rt]);
  const staffAll = readStaff();
  for (const ph of Object.keys(staffAll)) {
    if (normalize(staffAll[ph].rootPartnerPhone) === rt) exclude.add(normalize(ph));
  }
  let n = 0;
  for (const invitee of Object.keys(uplines)) {
    const inv = normalize(uplines[invitee].inviterPhone);
    if (!inv || !closure.has(inv)) continue;
    const ip = normalize(invitee);
    if (exclude.has(ip)) continue;
    if (org.getRoles(ip).merchant) continue;
    n++;
  }
  return n;
}

function getPartnerTierSummary(rootPhone) {
  const attributedUserCount = countTierUsersForPartner(rootPhone);
  const tierRatePct = getPartnerTierPercent(attributedUserCount);
  const tierLabel = tierLabelFromCount(attributedUserCount);

  let segmentStart = 0;
  let nextThreshold = null;
  let nextTierLabel = "";
  let nextTierRatePct = 0;
  let progressPct = 100;
  let usersToNext = 0;
  let isMaxTier = false;

  if (attributedUserCount <= 500) {
    segmentStart = 0;
    nextThreshold = 501;
    nextTierLabel = "V2";
    nextTierRatePct = 20;
  } else if (attributedUserCount <= 1000) {
    segmentStart = 501;
    nextThreshold = 1001;
    nextTierLabel = "V3";
    nextTierRatePct = 25;
  } else if (attributedUserCount <= 3000) {
    segmentStart = 1001;
    nextThreshold = 3001;
    nextTierLabel = "V4";
    nextTierRatePct = 30;
  } else if (attributedUserCount <= 6000) {
    segmentStart = 3001;
    nextThreshold = 6001;
    nextTierLabel = "V5";
    nextTierRatePct = 35;
  } else {
    isMaxTier = true;
    segmentStart = 6001;
    nextThreshold = null;
    nextTierLabel = "";
    nextTierRatePct = 35;
  }

  if (!isMaxTier && nextThreshold != null) {
    usersToNext = Math.max(0, nextThreshold - attributedUserCount);
    const span = nextThreshold - segmentStart;
    progressPct =
      span > 0
        ? Math.min(100, Math.max(0, Math.round(((attributedUserCount - segmentStart) / span) * 100)))
        : 100;
  }

  const nextHint = isMaxTier
    ? "已至高等级"
    : `还差 ${usersToNext} 户 → ${nextTierLabel}（${nextTierRatePct}%）`;

  return {
    attributedUserCount,
    tierLabel,
    tierRatePct,
    nextHint,
    merchantRevenueSharePct: Math.round(PARTNER_MERCHANT_REVENUE_RATE * 100),
    nextTierLabel: isMaxTier ? "" : nextTierLabel,
    nextTierRatePct: isMaxTier ? tierRatePct : nextTierRatePct,
    usersToNext,
    progressPct,
    nextThreshold,
    segmentStart,
    isMaxTier,
  };
}

/** rootPhone 为空时用于申请表单：展示区间文案 */
function getPartnerRewardRateLabel(rootPhoneOptional) {
  const rt = rootPhoneOptional ? normalize(rootPhoneOptional) : "";
  if (!rt) return "15%–35%（按名下用户档位）";
  const pct = getPartnerTierPercent(countTierUsersForPartner(rt));
  return pct + "%";
}
/** 二级挂在主管线下（未划拨到具体一级时） */
const PARENT_ROOT = "ROOT";

function normalize(p) {
  return auth.normalizePhone(p);
}

function fmtNow() {
  const d = new Date();
  const z = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
}

/** 成员分佣比例 0–100（占体系佣金总额的百分比；主管拿 100% − 员工合计） */
function normalizeCommissionPct(raw) {
  const n = Math.round(Number(raw));
  if (Number.isNaN(n) || n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

/** 考核目标用户数（演示字段） */
function normalizeTargetUserCount(raw) {
  const n = parseInt(String(raw == null ? "" : raw).trim(), 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function commissionPctFromRow(row) {
  if (!row) return 0;
  if (row.commissionPct != null && row.commissionPct !== "") return normalizeCommissionPct(row.commissionPct);
  return 0;
}

function targetUserCountFromRow(row) {
  if (!row || row.targetUserCount == null || row.targetUserCount === "") return 0;
  return normalizeTargetUserCount(row.targetUserCount);
}

function sumStaffCommissionPctForRoot(rootPhone, excludePhone) {
  const rt = normalize(rootPhone);
  const ex = excludePhone != null ? normalize(excludePhone) : "";
  const all = readStaff();
  let s = 0;
  for (const ph of Object.keys(all)) {
    const row = all[ph];
    if (normalize(row.rootPartnerPhone) !== rt) continue;
    if (ex && normalize(ph) === ex) continue;
    s += commissionPctFromRow(row);
  }
  return Math.round(Number(s) * 100) / 100;
}

function migrateStaffBlob(raw) {
  const next = {};
  let dirty = false;
  for (const ph of Object.keys(raw || {})) {
    const row = raw[ph];
    if (!row) continue;
    const root = normalize(row.rootPartnerPhone);
    let tier = row.tier;
    let parentL1Phone = row.parentL1Phone != null ? String(row.parentL1Phone).trim() : "";
    if (tier === "staff" || tier === "二级员工") {
      tier = "L2";
      parentL1Phone = parentL1Phone || PARENT_ROOT;
    }
    if (tier !== "L1" && tier !== "L2") tier = "L2";
    if (tier === "L1") parentL1Phone = "";
    if (tier === "L2" && !parentL1Phone) parentL1Phone = PARENT_ROOT;
    const pct =
      row.commissionPct != null && row.commissionPct !== ""
        ? normalizeCommissionPct(row.commissionPct)
        : 0;
    const tgt =
      row.targetUserCount != null && row.targetUserCount !== ""
        ? normalizeTargetUserCount(row.targetUserCount)
        : 0;
    const m = {
      rootPartnerPhone: root,
      tier,
      parentL1Phone: tier === "L2" ? parentL1Phone : "",
      displayName: row.displayName || "员工",
      createdAt: row.createdAt || fmtNow(),
      commissionPct: pct,
      targetUserCount: tgt,
    };
    next[ph] = m;
    if (JSON.stringify(row) !== JSON.stringify(m)) dirty = true;
  }
  return { next, dirty };
}

function readStaff() {
  let raw = wx.getStorageSync(STAFF_KEY);
  const v2empty = !raw || typeof raw !== "object" || Object.keys(raw).length === 0;
  if (v2empty) {
    const leg = wx.getStorageSync(STAFF_V1_KEY);
    if (leg && typeof leg === "object" && Object.keys(leg).length) {
      raw = leg;
      wx.removeStorageSync(STAFF_V1_KEY);
    } else {
      raw = {};
    }
  }
  const { next, dirty } = migrateStaffBlob(raw);
  if (dirty || Object.keys(next).length !== Object.keys(raw || {}).length) {
    wx.setStorageSync(STAFF_KEY, next);
  }
  return next;
}

function writeStaff(obj) {
  wx.setStorageSync(STAFF_KEY, obj);
}

function readApps() {
  const raw = wx.getStorageSync(MERCHANT_APP_KEY);
  const list = raw && Array.isArray(raw.list) ? raw.list : [];
  let dirty = false;
  const next = list.map((x) => {
    if (x.status === "pending") {
      dirty = true;
      return { ...x, status: "pending_partner" };
    }
    return x;
  });
  if (dirty) writeApps(next);
  return next;
}

function writeApps(list) {
  wx.setStorageSync(MERCHANT_APP_KEY, { list });
}

function readRewards() {
  const raw = wx.getStorageSync(REWARDS_KEY);
  return raw && Array.isArray(raw.list) ? raw.list : [];
}

function writeRewards(list) {
  wx.setStorageSync(REWARDS_KEY, { list });
}

function isPartnerStaff(phone) {
  const p = normalize(phone);
  return !!(p && readStaff()[p]);
}

function isPrincipalPartner(phone) {
  const p = normalize(phone);
  if (!p) return false;
  const r = org.getRoles(p);
  if (!r.partner) return false;
  return !readStaff()[p];
}

function getPartnerRoot(phone) {
  const p = normalize(phone);
  if (!p) return "";
  if (isPrincipalPartner(p)) return p;
  const st = readStaff()[p];
  if (st && st.rootPartnerPhone) return normalize(st.rootPartnerPhone);
  return "";
}

function canAccessPartnerPortal(phone) {
  return !!getPartnerRoot(phone);
}

function getStaffRow(phone) {
  const p = normalize(phone);
  return p ? readStaff()[p] : null;
}

function getStaffTierLabel(phone) {
  if (isPrincipalPartner(phone)) return "合作商主管";
  const st = getStaffRow(phone);
  if (!st) return "";
  if (st.tier === "L1") return "一级员工";
  if (st.tier === "L2") return "二级员工";
  return "员工";
}

/** 一级员工列表（不含主管） */
function listL1StaffForRoot(rootPartnerPhone) {
  const root = normalize(rootPartnerPhone);
  if (!root) return [];
  const all = readStaff();
  return Object.keys(all)
    .filter((ph) => normalize(all[ph].rootPartnerPhone) === root && all[ph].tier === "L1")
    .map((ph) => ({
      phone: ph,
      displayName: all[ph].displayName || "一级",
      tier: "L1",
      createdAt: all[ph].createdAt || "",
      commissionPct: commissionPctFromRow(all[ph]),
      targetUserCount: targetUserCountFromRow(all[ph]),
    }));
}

/** 二级员工，可选按挂靠一级筛选 parent 传 ROOT 或一级手机号 */
function listL2StaffForRoot(rootPartnerPhone, parentL1Phone) {
  const root = normalize(rootPartnerPhone);
  const all = readStaff();
  const wantParent = parentL1Phone != null ? String(parentL1Phone) : null;
  return Object.keys(all)
    .filter((ph) => {
      const r = all[ph];
      if (normalize(r.rootPartnerPhone) !== root || r.tier !== "L2") return false;
      if (wantParent == null) return true;
      return String(r.parentL1Phone || PARENT_ROOT) === String(wantParent);
    })
    .map((ph) => ({
      phone: ph,
      displayName: all[ph].displayName || "二级",
      parentL1Phone: all[ph].parentL1Phone || PARENT_ROOT,
      tier: "L2",
      createdAt: all[ph].createdAt || "",
      commissionPct: commissionPctFromRow(all[ph]),
      targetUserCount: targetUserCountFromRow(all[ph]),
    }));
}

function listStaffForRoot(rootPartnerPhone) {
  return [...listL1StaffForRoot(rootPartnerPhone), ...listL2StaffForRoot(rootPartnerPhone)];
}

/**
 * tier: L1 | L2 ；L2 时 parentL1Phone 为 ROOT 或一级手机号
 * commissionPctRaw：分佣比例 0–100（占体系佣金%），员工合计不可超过 100%
 * targetUserCountRaw：可选，考核目标用户数（演示）
 */
function addPartnerStaff(operatorPhone, staffPhone, displayName, tier, parentL1Phone, commissionPctRaw, targetUserCountRaw) {
  const op = normalize(operatorPhone);
  const sp = normalize(staffPhone);
  if (!isPrincipalPartner(op)) return { ok: false, reason: "仅合作商主管可添加员工" };
  if (!sp || sp.length < 11) return { ok: false, reason: "请填写有效手机号" };
  if (sp === op) return { ok: false, reason: "不能与主管手机号相同" };
  const t = tier === "L1" ? "L1" : "L2";
  let parent = "";
  if (t === "L2") {
    parent = String(parentL1Phone || "").trim() || PARENT_ROOT;
    if (parent !== PARENT_ROOT) {
      const pnorm = normalize(parent);
      const row = readStaff()[pnorm];
      if (!row || row.tier !== "L1" || normalize(row.rootPartnerPhone) !== op) {
        return { ok: false, reason: "请选择本体系下的一级员工作为上级" };
      }
      parent = pnorm;
    } else parent = PARENT_ROOT;
  }
  const all = readStaff();
  if (all[sp]) return { ok: false, reason: "该手机号已在组织中" };
  const cp =
    commissionPctRaw === undefined || commissionPctRaw === null || String(commissionPctRaw).trim() === ""
      ? 0
      : normalizeCommissionPct(commissionPctRaw);
  const curSum = sumStaffCommissionPctForRoot(op, "");
  if (curSum + cp > 100) return { ok: false, reason: "员工分佣比例合计不能超过100%（余下归主管）" };
  const tgt =
    targetUserCountRaw === undefined || targetUserCountRaw === null || String(targetUserCountRaw).trim() === ""
      ? 0
      : normalizeTargetUserCount(targetUserCountRaw);
  all[sp] = {
    rootPartnerPhone: op,
    tier: t,
    parentL1Phone: t === "L2" ? parent : "",
    displayName: String(displayName || "").trim() || (t === "L1" ? "一级员工" : "二级员工"),
    createdAt: fmtNow(),
    commissionPct: cp,
    targetUserCount: tgt,
  };
  writeStaff(all);
  org.setPartnerApproved(sp, true);
  return { ok: true };
}

function setStaffCommissionPct(operatorPhone, staffPhone, pctRaw) {
  const op = normalize(operatorPhone);
  const sp = normalize(staffPhone);
  if (!isPrincipalPartner(op)) return { ok: false, reason: "仅主管可修改" };
  const all = readStaff();
  const row = all[sp];
  if (!row || normalize(row.rootPartnerPhone) !== op) return { ok: false, reason: "非本体系员工" };
  const newPct = normalizeCommissionPct(pctRaw);
  const others = sumStaffCommissionPctForRoot(op, sp);
  if (others + newPct > 100) return { ok: false, reason: "员工比例合计不能超过100%" };
  all[sp] = { ...row, commissionPct: newPct };
  writeStaff(all);
  return { ok: true };
}

function setStaffCommissionAndTarget(operatorPhone, staffPhone, pctRaw, targetUserCountRaw) {
  const op = normalize(operatorPhone);
  const sp = normalize(staffPhone);
  if (!isPrincipalPartner(op)) return { ok: false, reason: "仅主管可修改" };
  const all = readStaff();
  const row = all[sp];
  if (!row || normalize(row.rootPartnerPhone) !== op) return { ok: false, reason: "非本体系员工" };
  const newPct =
    pctRaw === undefined || pctRaw === null ? commissionPctFromRow(row) : normalizeCommissionPct(pctRaw);
  const others = sumStaffCommissionPctForRoot(op, sp);
  if (others + newPct > 100) return { ok: false, reason: "员工比例合计不能超过100%" };
  const tgt =
    targetUserCountRaw === undefined || targetUserCountRaw === null || String(targetUserCountRaw).trim() === ""
      ? targetUserCountFromRow(row)
      : normalizeTargetUserCount(targetUserCountRaw);
  all[sp] = { ...row, commissionPct: newPct, targetUserCount: tgt };
  writeStaff(all);
  return { ok: true };
}

/** 主管将二级划拨到指定一级（或划回主管线 ROOT） */
function reassignL2Parent(operatorPhone, l2Phone, newParentL1) {
  const op = normalize(operatorPhone);
  const l2 = normalize(l2Phone);
  if (!isPrincipalPartner(op)) return { ok: false, reason: "仅主管可划拨" };
  const all = readStaff();
  const row = all[l2];
  if (!row || row.tier !== "L2" || normalize(row.rootPartnerPhone) !== op) {
    return { ok: false, reason: "不是本体系二级员工" };
  }
  let np = String(newParentL1 || "").trim() || PARENT_ROOT;
  if (np !== PARENT_ROOT) {
    np = normalize(np);
    const p1 = all[np];
    if (!p1 || p1.tier !== "L1" || normalize(p1.rootPartnerPhone) !== op) {
      return { ok: false, reason: "目标一级无效" };
    }
  } else np = PARENT_ROOT;
  all[l2] = { ...row, parentL1Phone: np };
  writeStaff(all);
  return { ok: true };
}

function validateInvite(partnerRoot, staffInviter) {
  const root = normalize(partnerRoot);
  const staff = normalize(staffInviter);
  if (!root || !staff) return { ok: false, reason: "邀请参数无效" };
  if (staff === root) return { ok: true };
  const row = readStaff()[staff];
  if (row && normalize(row.rootPartnerPhone) === root) return { ok: true };
  return { ok: false, reason: "邀请人与合作商不匹配" };
}

function buildMerchantInvitePath(partnerRootPhone, staffPhone) {
  const a = normalize(partnerRootPhone);
  const b = normalize(staffPhone);
  if (!a || !b) return "";
  return `/pages/merchant-apply/merchant-apply?partner=${encodeURIComponent(a)}&staff=${encodeURIComponent(b)}`;
}

/** 邀请终端用户（绑定上级+车牌），与 profile 邀请好友同源；邀请人为主管或员工手机号 */
function buildUserInvitePath(inviterPhone) {
  return org.buildSystemInvitePath(normalize(inviterPhone));
}

function createMerchantApplication(payload) {
  const merchantPhone = normalize(payload.merchantPhone);
  const partnerRoot = normalize(payload.partnerRootPhone);
  const inviterStaff = normalize(payload.inviterStaffPhone);
  const v = validateInvite(partnerRoot, inviterStaff);
  if (!v.ok) return v;
  if (!merchantPhone) return { ok: false, reason: "请先登录" };
  const r = org.getRoles(merchantPhone);
  if (r.merchant) return { ok: false, reason: "已是商家，无需重复申请" };

  const apps = readApps();
  const active = apps.find(
    (x) =>
      x.merchantPhone === merchantPhone &&
      (x.status === "pending_partner" || x.status === "pending_platform" || x.status === "pending"),
  );
  if (active) return { ok: false, reason: "您已有待审核申请" };

  const row = {
    id: "mapp_" + Date.now(),
    merchantPhone,
    partnerRootPhone: partnerRoot,
    inviterStaffPhone: inviterStaff,
    shopDraft: payload.shopDraft || {},
    status: "pending_partner",
    createdAt: fmtNow(),
    reviewedAt: "",
    reviewerPhone: "",
  };
  apps.unshift(row);
  writeApps(apps);
  try {
    const sync = require("./gateway-merchant-apply-sync.js");
    sync.pushMerchantApply(row);
  } catch (e) {
    /* 演示环境网关未启动时仅本地 */
  }
  return { ok: true, application: row };
}

function listPendingApplicationsForRoot(rootPartnerPhone) {
  const root = normalize(rootPartnerPhone);
  return readApps().filter(
    (x) =>
      (x.status === "pending_partner" || x.status === "pending") &&
      normalize(x.partnerRootPhone) === root,
  );
}

function getPendingApplicationForMerchant(merchantPhone) {
  const p = normalize(merchantPhone);
  if (!p) return null;
  return (
    readApps().find(
      (x) =>
        x.merchantPhone === p &&
        (x.status === "pending_partner" ||
          x.status === "pending_platform" ||
          x.status === "pending"),
    ) || null
  );
}

/** 同一店主最新一条入驻记录（含已驳回） */
function getLatestMerchantApplicationForMerchant(merchantPhone) {
  const p = normalize(merchantPhone);
  if (!p) return null;
  const apps = readApps().filter((x) => x.merchantPhone === p);
  if (!apps.length) return null;
  return apps.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
}

function listAllApplicationsForRoot(rootPartnerPhone) {
  const root = normalize(rootPartnerPhone);
  return readApps().filter((x) => normalize(x.partnerRootPhone) === root);
}

function canReviewApplication(reviewerPhone, application) {
  const root = getPartnerRoot(reviewerPhone);
  if (!root || !application) return false;
  return normalize(application.partnerRootPhone) === root;
}

function approveMerchantApplication(reviewerPhone, appId) {
  const rev = normalize(reviewerPhone);
  const apps = readApps();
  const idx = apps.findIndex((x) => x.id === appId);
  if (idx < 0) return { ok: false, reason: "未找到申请" };
  const app = apps[idx];
  if (app.status !== "pending_partner" && app.status !== "pending") return { ok: false, reason: "该申请已处理" };
  if (!canReviewApplication(rev, app)) return { ok: false, reason: "无权限审核" };

  const now = fmtNow();
  apps[idx] = {
    ...app,
    status: "pending_platform",
    reviewedAt: now,
    reviewerPhone: rev,
  };
  writeApps(apps);
  try {
    const sync = require("./gateway-merchant-apply-sync.js");
    sync.pushPartnerReview(app.id, { reviewerPhone: rev, approve: true });
  } catch (e) {
    /* ignore */
  }
  return { ok: true };
}

function rejectMerchantApplication(reviewerPhone, appId, rejectReason) {
  const rev = normalize(reviewerPhone);
  const apps = readApps();
  const idx = apps.findIndex((x) => x.id === appId);
  if (idx < 0) return { ok: false, reason: "未找到申请" };
  const app = apps[idx];
  if (app.status !== "pending_partner" && app.status !== "pending") return { ok: false, reason: "该申请已处理" };
  if (!canReviewApplication(rev, app)) return { ok: false, reason: "无权限审核" };
  apps[idx] = {
    ...app,
    status: "partner_rejected",
    reviewedAt: fmtNow(),
    reviewerPhone: rev,
    partnerRejectReason: rejectReason || "",
  };
  writeApps(apps);
  try {
    const sync = require("./gateway-merchant-apply-sync.js");
    sync.pushPartnerReview(app.id, {
      reviewerPhone: rev,
      approve: false,
      rejectReason: rejectReason || "",
    });
  } catch (e) {
    /* ignore */
  }
  return { ok: true };
}

/** 业绩桶：ROOT=主管线；否则为一级手机号。邀请人为终端用户或商家店主时，沿邀请链上溯至主管/员工 */
function resolveL1Bucket(inviterPhone, root) {
  let cur = normalize(inviterPhone);
  const r = normalize(root);
  if (!cur || !r) return "";
  const seen = Object.create(null);
  let guard = 0;
  while (cur && guard++ < 48) {
    if (seen[cur]) return "";
    seen[cur] = true;
    if (cur === r) return PARENT_ROOT;
    const st = readStaff()[cur];
    if (st && normalize(st.rootPartnerPhone) === r) {
      if (st.tier === "L1") return cur;
      if (st.tier === "L2") {
        const p = st.parentL1Phone || PARENT_ROOT;
        return p === PARENT_ROOT ? PARENT_ROOT : normalize(p);
      }
      return PARENT_ROOT;
    }
    const shop = merchantStore.getShopByOwner(cur);
    if (shop && normalize(shop.partnerPhone) === r && shop.inviterStaffPhone) {
      cur = normalize(shop.inviterStaffPhone);
      continue;
    }
    const up = org.getUpline(cur);
    if (up && up.inviterPhone) {
      cur = normalize(up.inviterPhone);
      continue;
    }
    return "";
  }
  return "";
}

function isDirectInviteInBucket(inviterPhone, root, l1Key) {
  const inv = normalize(inviterPhone);
  const r = normalize(root);
  if (l1Key === PARENT_ROOT) return inv === r;
  return inv === normalize(l1Key);
}

function listBoundMerchantsForRoot(root) {
  const rt = normalize(root);
  return merchantStore.readShopsRaw().filter((s) => normalize(s.partnerPhone) === rt && s.bindLocked);
}

function countUsersWhereInviterIn(inviterSet) {
  const set = inviterSet instanceof Set ? inviterSet : new Set(inviterSet);
  const all = org.readUplines();
  let n = 0;
  for (const k of Object.keys(all)) {
    if (set.has(normalize(all[k].inviterPhone))) n++;
  }
  return n;
}

function l2PhonesUnderBucket(root, l1Key) {
  const rt = normalize(root);
  const all = readStaff();
  const out = new Set();
  for (const ph of Object.keys(all)) {
    const row = all[ph];
    if (normalize(row.rootPartnerPhone) !== rt || row.tier !== "L2") continue;
    const parent = row.parentL1Phone || PARENT_ROOT;
    if (l1Key === PARENT_ROOT) {
      if (parent === PARENT_ROOT || !row.parentL1Phone) out.add(ph);
    } else if (normalize(parent) === normalize(l1Key)) {
      out.add(ph);
    }
  }
  return out;
}

function buildBucketStats(root, l1Key) {
  const rt = normalize(root);
  const shops = listBoundMerchantsForRoot(rt);
  const rewards = listRewardsForRoot(rt);
  const l2Set = l2PhonesUnderBucket(rt, l1Key);

  let merchantDirect = 0;
  let merchantL2 = 0;
  for (const s of shops) {
    const inv = normalize(s.inviterStaffPhone);
    if (!inv) continue;
    const bucket = resolveL1Bucket(inv, rt);
    const match = l1Key === PARENT_ROOT ? bucket === PARENT_ROOT : normalize(bucket) === normalize(l1Key);
    if (!match) continue;
    if (isDirectInviteInBucket(inv, rt, l1Key)) merchantDirect++;
    else if (l2Set.has(inv)) merchantL2++;
  }

  let userDirect = 0;
  let userL2 = 0;
  const allU = org.readUplines();
  for (const k of Object.keys(allU)) {
    const invP = normalize(allU[k].inviterPhone);
    const bucket = resolveL1Bucket(invP, rt);
    const match = l1Key === PARENT_ROOT ? bucket === PARENT_ROOT : normalize(bucket) === normalize(l1Key);
    if (!match) continue;
    if (isDirectInviteInBucket(invP, rt, l1Key)) userDirect++;
    else if (l2Set.has(invP)) userL2++;
  }

  let rewardDirect = 0;
  let rewardL2 = 0;
  for (const rw of rewards) {
    const shop = merchantStore.getShopByOwner(normalize(rw.merchantPhone));
    if (!shop) continue;
    const inv = normalize(shop.inviterStaffPhone);
    const bucket = resolveL1Bucket(inv, rt);
    const match = l1Key === PARENT_ROOT ? bucket === PARENT_ROOT : normalize(bucket) === normalize(l1Key);
    if (!match) continue;
    const amt = Number(rw.rewardYuan) || 0;
    if (isDirectInviteInBucket(inv, rt, l1Key)) rewardDirect += amt;
    else if (l2Set.has(inv)) rewardL2 += amt;
  }

  const round2 = (x) => Math.round(x * 100) / 100;

  return {
    l1Key: l1Key === PARENT_ROOT ? PARENT_ROOT : normalize(l1Key),
    merchantDirect,
    merchantL2,
    merchantTotal: merchantDirect + merchantL2,
    userDirect,
    userL2,
    userTotal: userDirect + userL2,
    rewardDirect: round2(rewardDirect),
    rewardL2: round2(rewardL2),
    rewardTotal: round2(rewardDirect + rewardL2),
    l2Members: Array.from(l2Set).map((ph) => {
      const row = readStaff()[ph];
      return { phone: ph, displayName: (row && row.displayName) || "二级" };
    }),
  };
}

function getPartnerDashboard(rootPartnerPhone) {
  const rt = normalize(rootPartnerPhone);
  const l1List = listL1StaffForRoot(rt);
  const rows = [
    {
      l1Key: PARENT_ROOT,
      displayName: "主管直营线",
      isRootLine: true,
      ...buildBucketStats(rt, PARENT_ROOT),
    },
    ...l1List.map((x) => ({
      l1Key: x.phone,
      displayName: x.displayName || "一级",
      isRootLine: false,
      phone: x.phone,
      ...buildBucketStats(rt, x.phone),
    })),
  ];
  const rewardTotal = round2Sum(rows.map((r) => r.rewardTotal));
  const merchantTotal = rows.reduce((s, r) => s + r.merchantTotal, 0);
  const userTotal = rows.reduce((s, r) => s + r.userTotal, 0);
  return { rows, rewardTotal, merchantTotal, userTotal };
}

function round2Sum(arr) {
  return Math.round(arr.reduce((s, x) => s + x, 0) * 100) / 100;
}

function recordPartnerRewardFromJob(job) {
  if (!job || !job.merchantPhone) return;
  const mp = normalize(job.merchantPhone);
  const shop = merchantStore.getShopByOwner(mp);
  if (!shop || !shop.partnerPhone) return;
  const partnerRoot = normalize(shop.partnerPhone);
  const tierUsers = countTierUsersForPartner(partnerRoot);
  const tierPct = getPartnerTierPercent(tierUsers) / 100;
  const tierLab = tierLabelFromCount(tierUsers);

  const src = job.installSource;
  const subsidy = Number(job.subsidyYuan) || 0;
  const consumerPay = Number(job.consumerPayYuan);
  const orderAmt = Number(job.orderAmountYuan) || 0;

  if (src === "merchant_referral") return;

  let rewardYuan = 0;
  let rateText = "";
  let basisYuan = 0;
  let merchantRevOut = undefined;

  if (src === "walk_in") {
    if (subsidy <= 0) return;
    basisYuan = subsidy;
    rewardYuan = Math.round(subsidy * tierPct * 100) / 100;
    rateText = `${Math.round(tierPct * 100)}%×平台补贴（上门单·${tierLab}·${tierUsers}户）`;
  } else {
    if (consumerPay > 0 && !Number.isNaN(consumerPay)) {
      basisYuan = consumerPay;
      merchantRevOut = consumerPay;
      rewardYuan = Math.round(consumerPay * PARTNER_MERCHANT_REVENUE_RATE * 100) / 100;
      rateText = `${Math.round(PARTNER_MERCHANT_REVENUE_RATE * 100)}%×现场收款（历史单）`;
    } else if (orderAmt > 0) {
      basisYuan = orderAmt;
      rewardYuan = Math.round(orderAmt * tierPct * 100) / 100;
      rateText = `${Math.round(tierPct * 100)}%×订单额（历史单·${tierLab}）`;
    } else if (subsidy > 0) {
      basisYuan = subsidy;
      rewardYuan = Math.round(subsidy * tierPct * 100) / 100;
      rateText = `${Math.round(tierPct * 100)}%×补贴额（历史单）`;
    } else {
      return;
    }
  }

  if (rewardYuan <= 0) return;
  const inv = normalize(shop.inviterStaffPhone);
  const bucket = resolveL1Bucket(inv, partnerRoot);
  const list = readRewards();
  const dup = list.some((x) => x.jobId === job.id && x.merchantPhone === mp);
  if (dup) return;
  const direct = isDirectInviteInBucket(inv, partnerRoot, bucket);
  const l2set = l2PhonesUnderBucket(partnerRoot, bucket);
  const sourceType = direct ? "直营" : l2set.has(inv) ? "二级" : "其他";
  list.unshift({
    id: "prw_" + Date.now(),
    jobId: job.id,
    merchantPhone: mp,
    partnerRootPhone: partnerRoot,
    orderAmountYuan: basisYuan,
    merchantRevenueYuan: merchantRevOut,
    rewardYuan,
    rateText,
    settledAt: job.settledAt || fmtNow(),
    inviterStaffPhone: inv,
    attributedL1Key: bucket,
    sourceType,
  });
  writeRewards(list);
}

function enrichRewardRow(r, root) {
  const rt = normalize(root);
  const shop = merchantStore.getShopByOwner(normalize(r.merchantPhone));
  const inv = normalize(r.inviterStaffPhone || (shop && shop.inviterStaffPhone) || "");
  const bucket = r.attributedL1Key != null ? r.attributedL1Key : inv ? resolveL1Bucket(inv, rt) : "";
  let sourceType = r.sourceType || "—";
  if (!r.sourceType && inv && bucket !== "") {
    sourceType = isDirectInviteInBucket(inv, rt, bucket) ? "直营" : l2PhonesUnderBucket(rt, bucket).has(inv) ? "二级" : "其他";
  }
  const bucketLabel = bucket === PARENT_ROOT ? "主管线" : bucket;
  return { ...r, inviterStaffPhone: inv, attributedL1Key: bucket, sourceType, bucketLabel };
}

function listRewardsForRoot(rootPartnerPhone) {
  const root = normalize(rootPartnerPhone);
  return readRewards().filter((x) => normalize(x.partnerRootPhone) === root);
}

function listEnrichedRewardsForRoot(rootPartnerPhone, limit) {
  const root = normalize(rootPartnerPhone);
  const rows = listRewardsForRoot(root).map((r) => enrichRewardRow(r, root));
  if (limit > 0) return rows.slice(0, limit);
  return rows;
}

function sumRewardsForRoot(rootPartnerPhone) {
  const rows = listRewardsForRoot(rootPartnerPhone);
  const total = rows.reduce((s, x) => s + (Number(x.rewardYuan) || 0), 0);
  return Math.round(total * 100) / 100;
}

function getL1Detail(root, l1KeyRaw) {
  const rt = normalize(root);
  let key = String(l1KeyRaw || "").trim();
  if (key === PARENT_ROOT || key === "%ROOT%" || key === encodeURIComponent(PARENT_ROOT)) key = PARENT_ROOT;
  else key = normalize(decodeURIComponent(key));
  const label = key === PARENT_ROOT ? "主管直营线" : (readStaff()[key] && readStaff()[key].displayName) || key;
  const stats = buildBucketStats(rt, key);
  const rewards = listEnrichedRewardsForRoot(rt, 0).filter((rw) => {
    const shop = merchantStore.getShopByOwner(normalize(rw.merchantPhone));
    const inv = normalize(rw.inviterStaffPhone || (shop && shop.inviterStaffPhone) || "");
    const b = rw.attributedL1Key || (inv ? resolveL1Bucket(inv, rt) : "");
    return key === PARENT_ROOT ? b === PARENT_ROOT : normalize(b) === normalize(key);
  });
  return { root: rt, l1Key: key, label, stats, rewards: rewards.slice(0, 80) };
}

function partnerCanDisableMerchant(partnerPhone, merchantOwnerPhone) {
  const shop = merchantStore.getShopByOwner(normalize(merchantOwnerPhone));
  if (!shop) return false;
  if (shop.bindLocked && normalize(shop.partnerPhone) === normalize(partnerPhone)) return false;
  return true;
}

function maskLedger(p) {
  const s = String(p || "");
  if (s.length !== 11) return s || "—";
  return s.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

function maskAlipayAccount(raw) {
  const t = String(raw || "").trim();
  if (!t) return "";
  if (t.indexOf("@") >= 0) {
    const [a, b] = t.split("@");
    const aa = a || "";
    if (aa.length <= 2) return "***@" + (b || "");
    return aa.slice(0, 2) + "***@" + (b || "");
  }
  if (/^\d{11}$/.test(t)) return t.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
  if (t.length <= 4) return "****";
  return t.slice(0, 3) + "****" + t.slice(-2);
}

/** 展示用脱敏；完整卡号仅存档案、打款以完整号为准 */
function maskBankCard(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length <= 8) return "****" + d.slice(-4);
  return d.slice(0, 4) + " **** **** " + d.slice(-4);
}

/** 本体系邀约闭包（主管+员工+店主+裂变用户），替代旧「仅员工」集合 */
function orgTreeInviterSet(root) {
  return collectPartnerInviterClosure(root);
}

function inviterDisplayLabel(invPhone, root) {
  const p = normalize(invPhone);
  const r = normalize(root);
  if (p === r) return "合作商主管";
  const row = readStaff()[p];
  if (!row) return maskLedger(p);
  const tierLabel = row.tier === "L1" ? "一级" : "二级";
  const nm = row.displayName || p;
  if (row.tier === "L2") {
    const parent = row.parentL1Phone || PARENT_ROOT;
    const ptxt = parent === PARENT_ROOT ? "主管直线" : `一级${maskLedger(parent)}`;
    return `${nm}（二级·${ptxt}）`;
  }
  return `${nm}（一级）`;
}

function parseTimeMs(str) {
  if (!str || str === "—") return NaN;
  const s = String(str).trim().replace(/-/g, "/");
  const d = new Date(s);
  const t = d.getTime();
  return Number.isNaN(t) ? NaN : t;
}

/** 邀请台账：商家 + 体系内邀请的用户，含邀请人展示名 */
function listInviteLedgerForRoot(rootPartnerPhone) {
  const rt = normalize(rootPartnerPhone);
  const tree = orgTreeInviterSet(rt);
  const rows = [];

  for (const shop of listBoundMerchantsForRoot(rt)) {
    const inv = normalize(shop.inviterStaffPhone);
    rows.push({
      kind: "商家",
      inviteeMask: maskLedger(shop.ownerPhone),
      inviteePhone: shop.ownerPhone,
      extra: shop.shopName || "—",
      inviterLabel: inviterDisplayLabel(inv, rt),
      inviterPhone: inv,
      at: shop.merchantApprovedAt || "—",
      atMs: parseTimeMs(shop.merchantApprovedAt),
    });
  }

  const allU = org.readUplines();
  for (const invitee of Object.keys(allU)) {
    const inv = normalize(allU[invitee].inviterPhone);
    if (!tree.has(inv)) continue;
    rows.push({
      kind: "用户",
      inviteeMask: maskLedger(invitee),
      inviteePhone: invitee,
      extra: `车牌 ${allU[invitee].plate || "—"}`,
      inviterLabel: inviterDisplayLabel(inv, rt),
      inviterPhone: inv,
      at: allU[invitee].at || "—",
      atMs: parseTimeMs(allU[invitee].at),
    });
  }

  rows.sort((a, b) => (Number(b.atMs) || 0) - (Number(a.atMs) || 0));
  return rows;
}

/** 员工业绩概览（演示本机） */
function getStaffWorkspaceSummary(rootPartnerPhone, staffPhone) {
  const rt = normalize(rootPartnerPhone);
  const sp = normalize(staffPhone);
  const st = getStaffRow(sp);
  if (!st || normalize(st.rootPartnerPhone) !== rt) return null;
  if (st.tier === "L1") {
    const stats = buildBucketStats(rt, sp);
    return {
      tier: "L1",
      tierLabel: "一级员工",
      displayName: st.displayName || "员工",
      commissionPct: commissionPctFromRow(st),
      stats,
      rewardLineTotal: stats.rewardTotal,
    };
  }
  let merchants = 0;
  for (const shop of listBoundMerchantsForRoot(rt)) {
    if (normalize(shop.inviterStaffPhone) === sp) merchants++;
  }
  const allU = org.readUplines();
  let users = 0;
  for (const k of Object.keys(allU)) {
    if (normalize(allU[k].inviterPhone) === sp) users++;
  }
  const myRewards = listEnrichedRewardsForRoot(rt, 0).filter((rw) => normalize(rw.inviterStaffPhone) === sp);
  const rewardInviterTotal = Math.round(myRewards.reduce((s, x) => s + (Number(x.rewardYuan) || 0), 0) * 100) / 100;
  const parent = st.parentL1Phone || PARENT_ROOT;
  const parentHint = parent === PARENT_ROOT ? "主管直线" : `挂靠一级 ${maskLedger(parent)}`;
  return {
    tier: "L2",
    tierLabel: "二级员工",
    displayName: st.displayName || "员工",
    commissionPct: commissionPctFromRow(st),
    merchants,
    users,
    rewardInviterTotal,
    parentHint,
  };
}

/** 与本人相关的结算流水：一级看归属线，二级看本人邀请门店 */
function listRewardsForStaff(rootPartnerPhone, staffPhone) {
  const rt = normalize(rootPartnerPhone);
  const sp = normalize(staffPhone);
  const st = getStaffRow(sp);
  if (!st || normalize(st.rootPartnerPhone) !== rt) return [];
  const all = listEnrichedRewardsForRoot(rt, 0);
  if (st.tier === "L1") {
    return all.filter((rw) => normalize(rw.attributedL1Key) === sp);
  }
  return all.filter((rw) => normalize(rw.inviterStaffPhone) === sp);
}

/** 本人邀请的商家 / 用户台账 */
function listStaffInviteLedger(rootPartnerPhone, staffPhone) {
  const sp = normalize(staffPhone);
  return listInviteLedgerForRoot(normalize(rootPartnerPhone)).filter((row) => normalize(row.inviterPhone) === sp);
}

function maskBossNameHint(name) {
  const s = String(name || "").trim();
  if (!s) return "—";
  if (s.length <= 1) return "*";
  return s.charAt(0) + "**";
}

/** 改装单 → 查询结果行（拓客岗位一级/二级，非合作商个人档位） */
function enrichPartnerUserLookupRow(root, job) {
  const rt = normalize(root);
  const mp = normalize(job.merchantPhone);
  const shop = merchantStore.getShopByOwner(mp);
  const vehList = vehicleStore.readAll();
  const v = job.vehicleId ? vehList.find((x) => x.id === job.vehicleId) : null;
  const installAt = (v && v.merchantBoundAt) || job.createdAt || "—";
  const invPh = normalize(shop && shop.inviterStaffPhone);
  const staffLabel = invPh ? inviterDisplayLabel(invPh, rt) : "—";
  const staffTierHint = "一级/二级为拓客岗位，业绩计入合作商体系（不设个人档位）";
  return {
    kind: "install_job",
    rowKey: job.id,
    jobId: job.id,
    userPhone: normalize(job.userPhone),
    userPhoneMask: maskLedger(normalize(job.userPhone)),
    plate: job.plate || "—",
    installAt,
    settledAt: job.settledAt || "—",
    shopName: (shop && shop.shopName) || "—",
    bossNameHint: shop && shop.bossName ? maskBossNameHint(shop.bossName) : "—",
    merchantPhoneMask: maskLedger(mp),
    staffLabel,
    staffTierHint,
    installSourceLabel:
      job.installSource === "walk_in"
        ? "上门"
        : job.installSource === "merchant_referral"
          ? "本店邀约"
          : "—",
  };
}

/** 仅有邀请关系、尚无装机单 */
function enrichPartnerInviteOnlyRow(root, ledgerRow, upl) {
  const rt = normalize(root);
  const invPh = normalize(ledgerRow.inviterPhone);
  const staffLabel = invPh ? inviterDisplayLabel(invPh, rt) : ledgerRow.inviterLabel || "—";
  const plate = upl && upl.plate ? String(upl.plate).trim().toUpperCase() : "—";
  const inviteRegisteredAt = (upl && upl.at) || ledgerRow.at || "—";
  const staffTierHint = "一级/二级为拓客岗位，业绩计入合作商体系（不设个人档位）";
  return {
    kind: "invite_only",
    rowKey: "inv_" + normalize(ledgerRow.inviteePhone),
    jobId: "",
    userPhone: normalize(ledgerRow.inviteePhone),
    userPhoneMask: ledgerRow.inviteeMask || maskLedger(ledgerRow.inviteePhone),
    plate,
    installAt: "—",
    settledAt: "—",
    inviteRegisteredAt,
    shopName: "—",
    bossNameHint: "—",
    merchantPhoneMask: "—",
    staffLabel,
    staffTierHint,
    installSourceLabel: "邀请登记（暂无装机记录）",
  };
}

/**
 * 主管或体系员工：按手机号精确或关键词（车牌 / 网点名 / 店主）模糊，查本体系网点下的装机信息。
 */
function searchPartnerUserLookup(viewerPhone, rawQuery) {
  const vp = normalize(viewerPhone);
  const root = getPartnerRoot(viewerPhone);
  if (!root) return { ok: false, reason: "仅合作商主管或体系员工可查" };
  if (!ensureInPartnerTree(root, vp)) return { ok: false, reason: "无权查询" };
  const q = String(rawQuery || "").trim();
  if (!q) return { ok: true, rows: [] };

  const jobs = merchantStore.listJobsUnderPartnerRoot(root);
  const ledgerUsers = listInviteLedgerForRoot(root).filter((x) => x.kind === "用户");
  const uplines = org.readUplines();

  const digits = q.replace(/\s/g, "");
  const isMobileQuery = /^1\d{10}$/.test(digits);
  const qPhone = isMobileQuery ? normalize(digits) : "";

  function keywordHit(jobLike, shop, userPhoneNorm) {
    if (isMobileQuery) return userPhoneNorm === qPhone;
    const qu = q.trim();
    const qup = qu.toUpperCase();
    const plate = String((jobLike && jobLike.plate) || "")
      .trim()
      .toUpperCase();
    if (plate && plate.indexOf(qup) >= 0) return true;
    const upl = uplines[userPhoneNorm];
    const uplPlate = upl && upl.plate ? String(upl.plate).trim().toUpperCase() : "";
    if (uplPlate.indexOf(qup) >= 0) return true;
    if (shop) {
      const sn = String(shop.shopName || "");
      const bn = String(shop.bossName || "");
      if (sn.indexOf(qu) >= 0) return true;
      if (bn.indexOf(qu) >= 0) return true;
    }
    return false;
  }

  const rows = [];
  const seenInviteOnly = Object.create(null);

  for (const job of jobs) {
    const userPh = normalize(job.userPhone);
    const shop = merchantStore.getShopByOwner(normalize(job.merchantPhone));
    if (!keywordHit(job, shop, userPh)) continue;
    rows.push(enrichPartnerUserLookupRow(root, job));
  }

  for (const lu of ledgerUsers) {
    const up = normalize(lu.inviteePhone);
    const upl = uplines[up];
    const fakeJob = { plate: upl && upl.plate };
    if (!keywordHit(fakeJob, null, up)) continue;
    const hasJob = jobs.some((j) => normalize(j.userPhone) === up);
    if (hasJob) continue;
    if (seenInviteOnly[up]) continue;
    seenInviteOnly[up] = true;
    rows.push(enrichPartnerInviteOnlyRow(root, lu, upl));
  }

  rows.sort((a, b) => {
    const ta =
      a.kind === "install_job"
        ? parseTimeMs(a.installAt)
        : parseTimeMs(a.inviteRegisteredAt || a.installAt);
    const tb =
      b.kind === "install_job"
        ? parseTimeMs(b.installAt)
        : parseTimeMs(b.inviteRegisteredAt || b.installAt);
    return (Number(tb) || 0) - (Number(ta) || 0);
  });

  return { ok: true, rows };
}

function getPartnerStatsInRange(rootPartnerPhone, startMs, endMs) {
  const rt = normalize(rootPartnerPhone);
  const t0 = Number(startMs);
  const t1 = Number(endMs);
  if (Number.isNaN(t0) || Number.isNaN(t1)) {
    return {
      rewardTotal: 0,
      orderAmountTotal: 0,
      newUsers: 0,
      newMerchants: 0,
      settleCount: 0,
    };
  }
  const rewards = listRewardsForRoot(rt).filter((r) => {
    const ms = parseTimeMs(r.settledAt);
    return !Number.isNaN(ms) && ms >= t0 && ms <= t1;
  });
  const rewardTotal = Math.round(rewards.reduce((s, x) => s + (Number(x.rewardYuan) || 0), 0) * 100) / 100;
  const orderAmountTotal =
    Math.round(rewards.reduce((s, x) => s + (Number(x.orderAmountYuan) || 0), 0) * 100) / 100;

  const tree = orgTreeInviterSet(rt);
  const allU = org.readUplines();
  let newUsers = 0;
  for (const k of Object.keys(allU)) {
    if (!tree.has(normalize(allU[k].inviterPhone))) continue;
    const ms = parseTimeMs(allU[k].at);
    if (!Number.isNaN(ms) && ms >= t0 && ms <= t1) newUsers++;
  }

  let newMerchants = 0;
  for (const s of listBoundMerchantsForRoot(rt)) {
    const ms = parseTimeMs(s.merchantApprovedAt);
    if (!Number.isNaN(ms) && ms >= t0 && ms <= t1) newMerchants++;
  }

  return {
    rewardTotal,
    orderAmountTotal,
    newUsers,
    newMerchants,
    settleCount: rewards.length,
  };
}

function listRewardsInTimeRange(rootPartnerPhone, startMs, endMs) {
  const rt = normalize(rootPartnerPhone);
  const t0 = Number(startMs);
  const t1 = Number(endMs);
  if (Number.isNaN(t0) || Number.isNaN(t1)) return [];
  return listRewardsForRoot(rt).filter((r) => {
    const ms = parseTimeMs(r.settledAt);
    return !Number.isNaN(ms) && ms >= t0 && ms <= t1;
  });
}

/** 区间内结算佣金拆分为直营（主管线）与团队（员工线），含 enrichRewardRow */
function listIntervalRewardsDirectVsTeam(rootPartnerPhone, startMs, endMs) {
  const rt = normalize(rootPartnerPhone);
  const t0 = Number(startMs);
  const t1 = Number(endMs);
  if (Number.isNaN(t0) || Number.isNaN(t1)) {
    return { directRewards: [], teamRewards: [] };
  }
  const rows = listRewardsInTimeRange(rt, startMs, endMs);
  const directRewards = [];
  const teamRewards = [];
  for (const r of rows) {
    const shop = merchantStore.getShopByOwner(normalize(r.merchantPhone));
    const inv = normalize(r.inviterStaffPhone || (shop && shop.inviterStaffPhone) || "");
    const bucket =
      r.attributedL1Key != null && r.attributedL1Key !== ""
        ? r.attributedL1Key
        : inv
          ? resolveL1Bucket(inv, rt)
          : "";
    const enriched = enrichRewardRow(r, rt);
    if (bucket === PARENT_ROOT) directRewards.push(enriched);
    else teamRewards.push(enriched);
  }
  const byTime = (a, b) => (parseTimeMs(b.settledAt) || 0) - (parseTimeMs(a.settledAt) || 0);
  directRewards.sort(byTime);
  teamRewards.sort(byTime);
  return { directRewards, teamRewards };
}

function round2n(x) {
  return Math.round(Number(x) * 100) / 100;
}

/**
 * 区间内佣金与直营/团队归因展示。
 * rewardTotal：区间结算佣金合计；rootLineReward：归因主管直营线；teamLineReward：归因员工线（非直营）。
 * memberShares / principalRetain 等仍用于提现与团队配置计算，主管工作台区间卡片不再展示员工分成明细。
 */
function getPartnerIncomeSplitInRange(rootPartnerPhone, startMs, endMs, viewerPhone) {
  const base = getPartnerStatsInRange(rootPartnerPhone, startMs, endMs);
  const rt = normalize(rootPartnerPhone);
  const gross = base.rewardTotal;

  const rewards = listRewardsInTimeRange(rt, startMs, endMs);
  let rootLineReward = 0;
  for (const r of rewards) {
    const amt = Number(r.rewardYuan) || 0;
    const shop = merchantStore.getShopByOwner(normalize(r.merchantPhone));
    const inv = normalize(r.inviterStaffPhone || (shop && shop.inviterStaffPhone) || "");
    const bucket =
      r.attributedL1Key != null && r.attributedL1Key !== ""
        ? r.attributedL1Key
        : inv
          ? resolveL1Bucket(inv, rt)
          : "";
    if (bucket === PARENT_ROOT) rootLineReward += amt;
  }
  rootLineReward = round2n(rootLineReward);
  const teamLineReward = round2n(Math.max(0, gross - rootLineReward));

  const all = readStaff();
  const staffSumPct = sumStaffCommissionPctForRoot(rt, "");
  const principalPct = Math.max(0, Math.min(100, round2n(100 - staffSumPct)));

  const staffPhones = listStaffForRoot(rt)
    .map((x) => x.phone)
    .sort((a, b) => String(a).localeCompare(String(b)));

  const memberShares = [];
  let staffAllocated = 0;
  for (const ph of staffPhones) {
    const pct = commissionPctFromRow(all[ph]);
    const amount = round2n(gross * (pct / 100));
    staffAllocated += amount;
    const st = all[ph];
    memberShares.push({
      phone: ph,
      displayName: (st && st.displayName) || "员工",
      tier: (st && st.tier) || "",
      tierLabel: st && st.tier === "L1" ? "一级" : st && st.tier === "L2" ? "二级" : "",
      mask: maskLedger(ph),
      commissionPct: pct,
      amount,
    });
  }
  let principalRetain = round2n(gross - staffAllocated);
  if (principalRetain < 0) principalRetain = 0;

  const vp = normalize(viewerPhone);
  let myShare = { role: "", amount: 0, hint: "" };
  if (vp) {
    if (vp === rt) {
      myShare = {
        role: "合作商主管",
        amount: principalRetain,
        hint: "体系佣金中未分配给员工的占比归主管；员工比例在「团队」维护",
      };
    } else {
      const st = all[vp];
      if (st && normalize(st.rootPartnerPhone) === rt) {
        const row = memberShares.find((x) => x.phone === vp);
        const roleLabel = st.tier === "L1" ? "一级员工" : st.tier === "L2" ? "二级员工" : "员工";
        myShare = {
          role: roleLabel,
          amount: row ? row.amount : 0,
          hint: "按您在团队中配置的分佣比例（占体系佣金%）计算",
        };
      }
    }
  }

  return {
    ...base,
    staffCommissionPctSum: staffSumPct,
    principalPct,
    principalRetain,
    rootLineReward,
    /** 区间内归因于员工线（非主管直营线）的结算佣金合计 */
    teamLineReward,
    memberShares,
    myShare,
  };
}

function formatDateYMD(d) {
  const z = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/** 预设：today | week | month | year | custom（custom 需传 customStart/customEnd 为 yyyy-MM-dd） */
function computeTimeRange(preset, customStart, customEnd) {
  const now = new Date();
  let label = "";
  let startMs = 0;
  let endMs = 0;

  if (preset === "today") {
    const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    startMs = d0.getTime();
    endMs = d1.getTime();
    label = "今日";
  } else if (preset === "week") {
    const wd = now.getDay();
    const toMon = wd === 0 ? -6 : 1 - wd;
    const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + toMon);
    d0.setHours(0, 0, 0, 0);
    const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    startMs = d0.getTime();
    endMs = d1.getTime();
    label = "本周（周一至今日）";
  } else if (preset === "month") {
    const d0 = new Date(now.getFullYear(), now.getMonth(), 1);
    const d1 = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    startMs = d0.getTime();
    endMs = d1.getTime();
    label = "本月";
  } else if (preset === "year") {
    const d0 = new Date(now.getFullYear(), 0, 1);
    const d1 = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    startMs = d0.getTime();
    endMs = d1.getTime();
    label = "本年";
  } else {
    const a = String(customStart || "").trim();
    const b = String(customEnd || "").trim();
    const d0 = new Date((a || formatDateYMD(now)) + "T00:00:00");
    const d1 = new Date((b || a || formatDateYMD(now)) + "T23:59:59");
    startMs = d0.getTime();
    endMs = d1.getTime();
    label = `${a || "—"} 至 ${b || "—"}`;
  }

  return { startMs, endMs, label };
}

function readWithdrawList() {
  const raw = wx.getStorageSync(WITHDRAW_KEY);
  return Array.isArray(raw) ? raw : [];
}

function writeWithdrawList(rows) {
  wx.setStorageSync(WITHDRAW_KEY, rows);
}

function readPayoutBlob() {
  const raw = wx.getStorageSync(PAYOUT_PROFILE_KEY);
  return raw && typeof raw === "object" ? raw : {};
}

function writePayoutBlob(obj) {
  wx.setStorageSync(PAYOUT_PROFILE_KEY, obj);
}

/** 合作商/员工提现收款信息（本机档案；上线迁移服务端） */
function getPayoutProfile(viewerPhone) {
  const p = normalize(viewerPhone);
  if (!p) return null;
  const row = readPayoutBlob()[p];
  return row && row.channel ? row : null;
}

/** 提现单上「商家转账到零钱」扩展块默认值（服务端回写 outBillNo、transferBillNo、state 等） */
function emptyWxTransferBlock() {
  return {
    outBillNo: "",
    transferBillNo: "",
    state: WX_TRANSFER_STATE.EMPTY,
    failReason: "",
    packageInfo: "",
    lastNotifyAt: "",
  };
}

function formatPayoutSummaryFromProfile(prof) {
  if (!prof || !prof.channel) return "";
  if (prof.channel === "wechat_wallet") {
    return `微信零钱 · ${prof.realName || ""}`.trim();
  }
  if (prof.channel === "alipay") {
    return `支付宝 · ${prof.realName || ""} · ${maskAlipayAccount(prof.alipayAccount)}`.trim();
  }
  if (prof.channel === "bank_card") {
    const cardMask = prof.bankCardNo ? maskBankCard(prof.bankCardNo) : prof.accountLast4 ? `尾号${prof.accountLast4}` : "";
    return `银行卡 · ${prof.bankName || ""} · ${cardMask} · ${prof.holderName || ""}`.trim();
  }
  return "";
}

/**
 * @param {string} viewerPhone
 * @param {{ channel: 'wechat_wallet'|'alipay'|'bank_card', realName?: string, alipayAccount?: string, holderName?: string, bankName?: string, bankCardNo?: string, accountLast4?: string }} payload
 */
function savePayoutProfile(viewerPhone, payload) {
  const p = normalize(viewerPhone);
  if (!p) return { ok: false, reason: "未登录" };
  const root = getPartnerRoot(p);
  if (!root) {
    if (!org.getRoles(p).merchant) return { ok: false, reason: "非合作商体系成员或商家" };
  } else if (!ensureInPartnerTree(root, p)) {
    return { ok: false, reason: "无权操作" };
  }
  const channel = payload && payload.channel;
  const blob = readPayoutBlob();
  const prevAny = blob[p] || {};
  const wxOpenIdReserved = prevAny.payeeWxOpenId || "";
  const wxAppIdReserved = prevAny.payeeWxAppId || "";

  if (channel === "wechat_wallet") {
    const realName = String((payload && payload.realName) || "").trim();
    if (realName.length < 2) return { ok: false, reason: "请填写与微信实名一致的姓名" };
    blob[p] = {
      channel: "wechat_wallet",
      realName,
      bindPhone: p,
      updatedAt: fmtNow(),
      /** 预留：用户在商户 appId 下的 openid，须服务端落库，勿依赖小程序本地写入敏感信息 */
      payeeWxOpenId: wxOpenIdReserved,
      /** 预留：收款用户微信号所属 appid（多 app 场景） */
      payeeWxAppId: wxAppIdReserved,
      alipayUserIdReserved: prevAny.alipayUserIdReserved || "",
    };
    writePayoutBlob(blob);
    return { ok: true };
  }
  if (channel === "alipay") {
    const realName = String((payload && payload.realName) || "").trim();
    const alipayAccount = String((payload && payload.alipayAccount) || "").trim();
    if (realName.length < 2) return { ok: false, reason: "请填写真实姓名" };
    if (alipayAccount.length < 5) return { ok: false, reason: "请填写支付宝账号（手机号或邮箱）" };
    blob[p] = {
      channel: "alipay",
      realName,
      alipayAccount,
      bindPhone: p,
      updatedAt: fmtNow(),
      payeeWxOpenId: wxOpenIdReserved,
      payeeWxAppId: wxAppIdReserved,
      alipayUserIdReserved: prevAny.alipayUserIdReserved || "",
    };
    writePayoutBlob(blob);
    return { ok: true };
  }
  if (channel === "bank_card") {
    const holderName = String((payload && payload.holderName) || "").trim();
    const bankName = String((payload && payload.bankName) || "").trim();
    const cardRaw = String((payload && payload.bankCardNo) || (payload && payload.accountLast4) || "").replace(/\D/g, "");
    if (holderName.length < 2) return { ok: false, reason: "请填写开户名" };
    if (bankName.length < 2) return { ok: false, reason: "请填写开户银行" };
    if (cardRaw.length < 16 || cardRaw.length > 19) return { ok: false, reason: "请填写完整银行卡号（16–19 位）" };
    blob[p] = {
      channel: "bank_card",
      holderName,
      bankName,
      bankCardNo: cardRaw,
      accountLast4: cardRaw.slice(-4),
      bindPhone: p,
      updatedAt: fmtNow(),
      payeeWxOpenId: wxOpenIdReserved,
      payeeWxAppId: wxAppIdReserved,
      alipayUserIdReserved: prevAny.alipayUserIdReserved || "",
    };
    writePayoutBlob(blob);
    return { ok: true };
  }
  return { ok: false, reason: "请选择收款方式" };
}

function getPayoutBindSummary(viewerPhone) {
  const prof = getPayoutProfile(viewerPhone);
  const p = normalize(viewerPhone);
  if (!prof) {
    return {
      bound: false,
      title: "",
      subtitle: "",
      channel: "",
      tip: "",
    };
  }
  if (prof.channel === "wechat_wallet") {
    return {
      bound: true,
      channel: "wechat_wallet",
      title: "微信零钱",
      subtitle: `${prof.realName} · 手机 ${maskLedger(prof.bindPhone || p)}`,
      tip: "",
    };
  }
  if (prof.channel === "alipay") {
    return {
      bound: true,
      channel: "alipay",
      title: "支付宝",
      subtitle: `${prof.realName} · ${maskAlipayAccount(prof.alipayAccount)}`,
      tip: "",
    };
  }
  const cardLine = prof.bankCardNo ? maskBankCard(prof.bankCardNo) : prof.accountLast4 ? `尾号 ${prof.accountLast4}` : "—";
  return {
    bound: true,
    channel: "bank_card",
    title: "银行卡",
    subtitle: `${prof.bankName} · ${cardLine} · ${prof.holderName}`,
    tip: "",
  };
}

function ensureInPartnerTree(root, phone) {
  const r = normalize(root);
  const p = normalize(phone);
  if (!r || !p) return false;
  if (p === r) return true;
  const st = getStaffRow(p);
  return !!(st && normalize(st.rootPartnerPhone) === r);
}

/** 按当前团队分成规则，累计应得（与区间预估口径一致，自 2000-01-01 起汇总结算佣金） */
function getLifetimeAccruedYuan(partnerRootPhone, viewerPhone) {
  const root = normalize(partnerRootPhone);
  const p = normalize(viewerPhone);
  if (!root || !p) return 0;
  const startMs = new Date(2000, 0, 1).getTime();
  const endMs = Date.now() + 86400000 * 365;
  const split = getPartnerIncomeSplitInRange(root, startMs, endMs, p);
  return round2n(split.myShare && split.myShare.amount != null ? split.myShare.amount : 0);
}

function sumWithdrawForApplicant(root, applicantPhone, statuses) {
  const r = normalize(root);
  const p = normalize(applicantPhone);
  const set = new Set(statuses);
  const sum = readWithdrawList()
    .filter(
      (x) =>
        normalize(x.partnerRootPhone) === r &&
        normalize(x.applicantPhone) === p &&
        set.has(x.status)
    )
    .reduce((s, x) => s + (Number(x.amountYuan) || 0), 0);
  return round2n(sum);
}

/**
 * 可提现余额 = 累计应得 − 已打款 − 处理中的申请（驳回不计入已扣）
 */
function getPartnerWalletSummary(partnerRootPhone, viewerPhone) {
  const root = normalize(partnerRootPhone);
  const p = normalize(viewerPhone);
  if (!root || !p) {
    return {
      accruedLifetimeYuan: 0,
      withdrawnPaidYuan: 0,
      pendingOutYuan: 0,
      availableYuan: 0,
    };
  }
  let accrued = getLifetimeAccruedYuan(root, p);
  if (isPrincipalPartner(p) && p === root) {
    accrued = round2n(accrued + sumPartnerInvitePartnerRewardsForInviter(p));
  }
  const withdrawnPaidYuan = sumWithdrawForApplicant(root, p, ["paid"]);
  const pendingOutYuan = sumWithdrawForApplicant(root, p, ["pending"]);
  const availableYuan = round2n(Math.max(0, accrued - withdrawnPaidYuan - pendingOutYuan));
  return {
    accruedLifetimeYuan: accrued,
    withdrawnPaidYuan,
    pendingOutYuan,
    availableYuan,
  };
}

function decorateWithdrawRow(w, root) {
  const rt = normalize(root);
  const ph = normalize(w.applicantPhone);
  const label = ph === rt ? "合作商主管" : inviterDisplayLabel(ph, rt);
  const wx = w.wxTransfer && typeof w.wxTransfer === "object" ? w.wxTransfer : emptyWxTransferBlock();
  const pipeline = w.payPipeline || PAY_PIPELINE.MANUAL;
  const parts = [];
  if (pipeline === PAY_PIPELINE.WECHAT_MCH_TRANSFER) parts.push("通道：微信商家转账");
  if (pipeline === PAY_PIPELINE.ALIPAY_TRANSFER) parts.push("通道：支付宝");
  if (wx.state) parts.push("状态 " + wx.state);
  if (wx.outBillNo) parts.push("商户单号 " + wx.outBillNo);
  const snap = w.walletAuditSnapshot && typeof w.walletAuditSnapshot === "object" ? w.walletAuditSnapshot : null;
  const walletAuditLine = snap
    ? `快照 可提现¥${snap.availableYuanAtApply != null ? snap.availableYuanAtApply : "—"} · 累计应得¥${
        snap.accruedLifetimeYuan != null ? snap.accruedLifetimeYuan : "—"
      }`
    : "无申请快照（务必在 PC 后台核对渠道台账再打款）";
  return {
    ...w,
    applicantMask: maskLedger(w.applicantPhone),
    applicantLabel: label,
    amountYuanStr: String(w.amountYuan != null ? w.amountYuan : "0"),
    payoutSummary: w.payoutSummary || "",
    payPipeline: pipeline,
    wxTransferState: wx.state || "",
    wxOutBillNo: wx.outBillNo || "",
    wxMetaLine: parts.join(" · "),
    walletAuditLine,
  };
}

function listMyWithdrawals(root, applicantPhone) {
  const r = normalize(root);
  const p = normalize(applicantPhone);
  return readWithdrawList()
    .filter((x) => normalize(x.partnerRootPhone) === r && normalize(x.applicantPhone) === p)
    .map((w) => decorateWithdrawRow(w, r));
}

function listPendingWithdrawalsForPrincipal(root) {
  const r = normalize(root);
  return readWithdrawList()
    .filter((x) => normalize(x.partnerRootPhone) === r && x.status === "pending")
    .map((w) => decorateWithdrawRow(w, r));
}

/** 全平台待审核提现（供平台运营页使用，非合作商权限） */
function listAllPendingWithdrawalsForPlatform() {
  return readWithdrawList()
    .filter((x) => x.status === "pending")
    .map((w) => {
      const root = normalize(w.partnerRootPhone);
      const d = decorateWithdrawRow(w, root);
      return { ...d, rootSystemMask: maskLedger(root) };
    });
}

/**
 * 是否可进入「平台提现审核」：开发/体验版开放给具备后台入口的账号；正式版仅 ev_platform_withdraw_ops_v1[phone]===true（本地演示白名单，上线改服务端鉴权）
 */
function canAccessPlatformWithdrawReview(phone) {
  const p = normalize(phone);
  if (!p) return false;
  if (!canAccessMgmtPortal(p)) return false;
  let env = "develop";
  try {
    env = wx.getAccountInfoSync().miniProgram.envVersion;
  } catch (e) {}
  if (env !== "release") return true;
  const allow = wx.getStorageSync("ev_platform_withdraw_ops_v1");
  return !!(allow && typeof allow === "object" && allow[p] === true);
}

function requestPartnerWithdrawal(applicantPhone, amountRaw) {
  const p = normalize(applicantPhone);
  if (!p) return { ok: false, reason: "未登录" };
  const root = getPartnerRoot(p);
  if (!root) return { ok: false, reason: "非合作商体系成员" };
  if (!ensureInPartnerTree(root, p)) return { ok: false, reason: "无权操作" };
  const amount = round2n(Number(amountRaw));
  if (!(amount > 0) || Number.isNaN(amount)) return { ok: false, reason: "请输入有效金额" };
  if (amount < MIN_WITHDRAW_YUAN) return { ok: false, reason: `单笔至少 ¥${MIN_WITHDRAW_YUAN}` };
  const w = getPartnerWalletSummary(root, p);
  if (amount > w.availableYuan) return { ok: false, reason: "可提现余额不足" };
  const prof = getPayoutProfile(p);
  if (!prof) return { ok: false, reason: "请先绑定收款账户" };
  const payoutSummary = formatPayoutSummaryFromProfile(prof);
  let payPipeline = PAY_PIPELINE.MANUAL;
  if (prof.channel === "wechat_wallet") payPipeline = PAY_PIPELINE.WECHAT_MCH_TRANSFER;
  else if (prof.channel === "alipay") payPipeline = PAY_PIPELINE.ALIPAY_TRANSFER;
  const row = {
    id: "pwd_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    partnerRootPhone: root,
    applicantPhone: p,
    amountYuan: amount,
    status: "pending",
    createdAt: fmtNow(),
    resolvedAt: "",
    note: "",
    payoutChannel: prof.channel,
    payoutSummary: payoutSummary || "—",
    /** manual：主管确认；wechat_mch_transfer：预留由服务端调商家转账 API，回调更新 wxTransfer */
    payPipeline,
    /** 预留：与微信侧字段对齐，由服务端创建/查询转账后写入 */
    wxTransfer: emptyWxTransferBlock(),
    /** 申请瞬间钱包快照：后台打款前应与结算/渠道台账交叉核对；防纯后台伪造单 */
    walletAuditSnapshot: {
      accruedLifetimeYuan: w.accruedLifetimeYuan,
      availableYuanAtApply: w.availableYuan,
      withdrawnPaidYuan: w.withdrawnPaidYuan,
      pendingOutYuanAtApply: w.pendingOutYuan,
    },
  };
  const list = readWithdrawList();
  list.unshift(row);
  writeWithdrawList(list);
  return { ok: true, row: decorateWithdrawRow(row, root) };
}

function markWithdrawalPaid(operatorPhone, withdrawalId) {
  const op = normalize(operatorPhone);
  if (!canAccessPlatformWithdrawReview(op)) return { ok: false, reason: "仅平台可确认打款" };
  const list = readWithdrawList();
  const ix = list.findIndex((x) => x.id === withdrawalId);
  if (ix < 0) return { ok: false, reason: "记录不存在" };
  const row = list[ix];
  if (row.status !== "pending") return { ok: false, reason: "当前状态不可确认" };
  row.status = "paid";
  row.resolvedAt = fmtNow();
  list[ix] = row;
  writeWithdrawList(list);
  return { ok: true };
}

function markWithdrawalRejected(operatorPhone, withdrawalId, reasonText) {
  const op = normalize(operatorPhone);
  if (!canAccessPlatformWithdrawReview(op)) return { ok: false, reason: "仅平台可驳回" };
  const list = readWithdrawList();
  const ix = list.findIndex((x) => x.id === withdrawalId);
  if (ix < 0) return { ok: false, reason: "记录不存在" };
  const row = list[ix];
  if (row.status !== "pending") return { ok: false, reason: "当前状态不可驳回" };
  row.status = "rejected";
  row.resolvedAt = fmtNow();
  row.note = String(reasonText || "").trim().slice(0, 200);
  list[ix] = row;
  writeWithdrawList(list);
  return { ok: true };
}

/**
 * 预留：微信「商家转账」回调或主动查单后，由服务端逻辑合并进提现单（此处为演示本地存储）。
 * patch 可含 outBillNo、transferBillNo、state、failReason、packageInfo、lastNotifyAt 等。
 * 生产环境应在服务端数据库更新，勿长期依赖小程序 Storage。
 */
function mergeWithdrawalWxTransferLocal(withdrawalId, patch) {
  const list = readWithdrawList();
  const ix = list.findIndex((x) => x.id === withdrawalId);
  if (ix < 0) return { ok: false, reason: "记录不存在" };
  const row = list[ix];
  const base = emptyWxTransferBlock();
  const cur = row.wxTransfer && typeof row.wxTransfer === "object" ? row.wxTransfer : {};
  const p = patch && typeof patch === "object" ? patch : {};
  row.wxTransfer = { ...base, ...cur, ...p };
  list[ix] = row;
  writeWithdrawList(list);
  return { ok: true, row: list[ix] };
}

function readPartnerInvitePartnerRewards() {
  const raw = wx.getStorageSync(PARTNER_INVITE_PARTNER_REWARDS_KEY);
  return Array.isArray(raw) ? raw : [];
}

function writePartnerInvitePartnerRewards(list) {
  wx.setStorageSync(PARTNER_INVITE_PARTNER_REWARDS_KEY, list);
}

function readPartnerPrincipalInviterBlob() {
  const raw = wx.getStorageSync(PARTNER_PRINCIPAL_INVITER_MAP_KEY);
  return raw && typeof raw === "object" ? raw : {};
}

function writePartnerPrincipalInviterBlob(obj) {
  wx.setStorageSync(PARTNER_PRINCIPAL_INVITER_MAP_KEY, obj);
}

/** 被邀请合作商（主管）对应的邀请方主管 */
function getPartnerInviterPrincipal(inviteePrincipalPhone) {
  const iv = normalize(inviteePrincipalPhone);
  if (!iv) return "";
  const blob = readPartnerPrincipalInviterBlob();
  return normalize(blob[iv]) || "";
}

/** 主管账号当前档位计提比例（与同体系上门补贴档位一致：V1 15% …） */
function getPartnerPrincipalTierPercent(principalPhone) {
  const p = normalize(principalPhone);
  if (!p || !isPrincipalPartner(p)) return 0;
  return getPartnerTierPercent(countTierUsersForPartner(p));
}

function sumPartnerInvitePartnerRewardsForInviter(inviterPrincipalPhone) {
  const inv = normalize(inviterPrincipalPhone);
  return round2n(
    readPartnerInvitePartnerRewards()
      .filter((x) => normalize(x.inviterPrincipalPhone) === inv)
      .reduce((s, x) => s + (Number(x.totalYuan) || 0), 0)
  );
}

function listPartnerInvitePartnerRewardsForInviter(inviterPrincipalPhone, limit) {
  const inv = normalize(inviterPrincipalPhone);
  let rows = readPartnerInvitePartnerRewards().filter((x) => normalize(x.inviterPrincipalPhone) === inv);
  rows.sort((a, b) => (parseTimeMs(b.settledAt) || 0) - (parseTimeMs(a.settledAt) || 0));
  if (limit > 0) rows = rows.slice(0, limit);
  return rows;
}

/**
 * 邀请方分享路径：被邀请人打开申请页并携带邀请主管手机号。
 */
function buildPartnerInvitePartnerPath(inviterPrincipalPhone) {
  const p = normalize(inviterPrincipalPhone);
  if (!p) return "";
  return `/pages/partner-apply/partner-apply?inv=${encodeURIComponent(p)}`;
}

/**
 * 被邀请合作商开通成功（演示）后结算：①代理费的 10%；②（邀请方档位% − 被邀请方档位%）× 代理费。
 */
function recordPartnerInvitePartnerReward(inviterPrincipalPhone, inviteePrincipalPhone, agencyFeeYuanRaw) {
  const inv = normalize(inviterPrincipalPhone);
  const iv = normalize(inviteePrincipalPhone);
  if (!inv || !iv || inv === iv) return { ok: false, reason: "邀请关系无效" };
  if (!isPrincipalPartner(inv)) return { ok: false, reason: "邀请方须为合作商主管" };
  if (!isPrincipalPartner(iv)) return { ok: false, reason: "被邀请方须为合作商主管账号" };

  const prevInv = getPartnerInviterPrincipal(iv);
  if (prevInv && prevInv !== inv) return { ok: false, reason: "该账号已绑定其他邀请合作商" };

  const list = readPartnerInvitePartnerRewards();
  if (list.some((x) => normalize(x.inviteePrincipalPhone) === iv)) {
    return { ok: false, reason: "邀请奖励已发放过" };
  }

  const agencyFeeYuan = round2n(Number(agencyFeeYuanRaw));
  if (!(agencyFeeYuan > 0) || Number.isNaN(agencyFeeYuan)) return { ok: false, reason: "代理费无效" };

  const pctInv = getPartnerPrincipalTierPercent(inv);
  const pctIv = getPartnerPrincipalTierPercent(iv);
  const referralYuan = round2n(agencyFeeYuan * PARTNER_INVITE_REFERRAL_RATE);
  const tierDiffPct = Math.max(0, round2n(pctInv - pctIv));
  const tierDiffYuan = round2n((agencyFeeYuan * tierDiffPct) / 100);
  const totalYuan = round2n(referralYuan + tierDiffYuan);

  const invTierLab = tierLabelFromCount(countTierUsersForPartner(inv));
  const ivTierLab = tierLabelFromCount(countTierUsersForPartner(iv));

  const row = {
    id: "pip_" + Date.now(),
    inviterPrincipalPhone: inv,
    inviteePrincipalPhone: iv,
    agencyFeeYuan,
    referralYuan,
    tierDiffYuan,
    tierDiffPct,
    totalYuan,
    inviterTierPct: pctInv,
    inviteeTierPct: pctIv,
    inviterTierLabel: invTierLab,
    inviteeTierLabel: ivTierLab,
    settledAt: fmtNow(),
    rateNote: `补贴¥${agencyFeeYuan}×10%=¥${referralYuan}；级差 ${invTierLab}${pctInv}% − ${ivTierLab}${pctIv}% → ${tierDiffPct}%×¥${agencyFeeYuan}=¥${tierDiffYuan}`,
  };
  list.unshift(row);
  writePartnerInvitePartnerRewards(list);

  const map = readPartnerPrincipalInviterBlob();
  map[iv] = inv;
  writePartnerPrincipalInviterBlob(map);

  return { ok: true, row };
}

/** 平台终审通过后由网关状态同步：开通商家身份与门店档案 */
function applyMerchantApprovedFromGatewayRow(gwRow) {
  const mp = normalize(gwRow.merchantPhone);
  if (!mp) return;
  const draft = gwRow.shopDraft || {};
  org.setMerchantApproved(mp, true);
  const approvedAt = gwRow.platformReviewedAt || fmtNow();
  merchantStore.upsertShopProfile(mp, {
    shopName: draft.shopName || "",
    bossName: draft.bossName || "",
    contactPhone: normalize(draft.contactPhone) || mp,
    storefrontImage: draft.storefrontImage || "",
    city: draft.city || "",
    district: draft.district || "",
    addressDetail: draft.addressDetail || "",
    lat: draft.lat != null ? Number(draft.lat) : null,
    lng: draft.lng != null ? Number(draft.lng) : null,
    addressFull: draft.addressFull || "",
    partnerPhone: normalize(gwRow.partnerRootPhone),
    inviterStaffPhone: normalize(gwRow.inviterStaffPhone),
    bindLocked: true,
    merchantApprovedAt: approvedAt,
  });
  const apps = readApps();
  const ix = apps.findIndex((x) => x.id === gwRow.id);
  if (ix >= 0) {
    apps[ix] = {
      ...apps[ix],
      status: "approved",
      reviewedAt: approvedAt,
      reviewerPhone: gwRow.platformReviewer || "platform",
    };
  } else {
    apps.unshift({
      id: gwRow.id,
      merchantPhone: mp,
      partnerRootPhone: normalize(gwRow.partnerRootPhone),
      inviterStaffPhone: normalize(gwRow.inviterStaffPhone),
      shopDraft: gwRow.shopDraft || {},
      status: "approved",
      createdAt: gwRow.createdAt || fmtNow(),
      reviewedAt: approvedAt,
      reviewerPhone: gwRow.platformReviewer || "platform",
    });
  }
  writeApps(apps);
}

/** 与设备网关台账对齐：终审开通、或回写驳回/待平台状态 */
function reconcileMerchantApplyFromGateway(merchantPhone, done) {
  const p = normalize(merchantPhone);
  if (!p) {
    if (typeof done === "function") done();
    return;
  }
  try {
    const sync = require("./gateway-merchant-apply-sync.js");
    sync.fetchMerchantApplyStatus(p, function (_err, row) {
      if (!row) {
        if (typeof done === "function") done();
        return;
      }
      if (row.status === "approved") {
        if (!org.getRoles(p).merchant) {
          applyMerchantApprovedFromGatewayRow(row);
        }
        if (typeof done === "function") done();
        return;
      }
      const apps = readApps();
      const ix = apps.findIndex((x) => x.id === row.id);
      if (ix >= 0) {
        const local = apps[ix];
        const nextStatus = row.status;
        if (local.status !== nextStatus) {
          apps[ix] = {
            ...local,
            status: nextStatus,
            partnerRejectReason: row.partnerRejectReason,
            platformRejectReason: row.platformRejectReason,
            reviewedAt: row.partnerReviewedAt || row.platformReviewedAt || local.reviewedAt,
            reviewerPhone:
              row.partnerReviewerPhone || row.platformReviewer || local.reviewerPhone,
          };
          writeApps(apps);
        }
      }
      if (typeof done === "function") done();
    });
  } catch (e) {
    if (typeof done === "function") done();
  }
}

/** 普通用户不可进：无任何管理身份 */
function canAccessMgmtPortal(phone) {
  const p = normalize(phone);
  if (!p) return false;
  const r = org.getRoles(p);
  if (r.merchant) return true;
  return canAccessPartnerPortal(p);
}

module.exports = {
  PARTNER_REWARD_RATE,
  PARTNER_MERCHANT_REVENUE_RATE,
  getPartnerTierPercent,
  tierLabelFromCount,
  countTierUsersForPartner,
  getPartnerTierSummary,
  getPartnerRewardRateLabel,
  PARENT_ROOT,
  STAFF_KEY,
  STAFF_V1_KEY,
  MERCHANT_APP_KEY,
  REWARDS_KEY,
  WITHDRAW_KEY,
  PAYOUT_PROFILE_KEY,
  MIN_WITHDRAW_YUAN,
  PAY_PIPELINE,
  WX_TRANSFER_STATE,
  emptyWxTransferBlock,
  isPartnerStaff,
  isPrincipalPartner,
  getPartnerRoot,
  canAccessPartnerPortal,
  getStaffTierLabel,
  getStaffRow,
  addPartnerStaff,
  setStaffCommissionPct,
  setStaffCommissionAndTarget,
  reassignL2Parent,
  listStaffForRoot,
  listL1StaffForRoot,
  listL2StaffForRoot,
  validateInvite,
  buildMerchantInvitePath,
  buildUserInvitePath,
  createMerchantApplication,
  listPendingApplicationsForRoot,
  getPendingApplicationForMerchant,
  getLatestMerchantApplicationForMerchant,
  listAllApplicationsForRoot,
  approveMerchantApplication,
  rejectMerchantApplication,
  reconcileMerchantApplyFromGateway,
  recordPartnerRewardFromJob,
  listRewardsForRoot,
  listEnrichedRewardsForRoot,
  sumRewardsForRoot,
  getPartnerDashboard,
  getL1Detail,
  resolveL1Bucket,
  partnerCanDisableMerchant,
  listInviteLedgerForRoot,
  getStaffWorkspaceSummary,
  listRewardsForStaff,
  listStaffInviteLedger,
  searchPartnerUserLookup,
  listIntervalRewardsDirectVsTeam,
  getPartnerStatsInRange,
  getPartnerIncomeSplitInRange,
  computeTimeRange,
  canAccessMgmtPortal,
  formatDateYMD,
  parseTimeMs,
  getPartnerWalletSummary,
  getLifetimeAccruedYuan,
  requestPartnerWithdrawal,
  listMyWithdrawals,
  listPendingWithdrawalsForPrincipal,
  listAllPendingWithdrawalsForPlatform,
  canAccessPlatformWithdrawReview,
  markWithdrawalPaid,
  markWithdrawalRejected,
  mergeWithdrawalWxTransferLocal,
  ensureInPartnerTree,
  getPayoutProfile,
  savePayoutProfile,
  getPayoutBindSummary,
  formatPayoutSummaryFromProfile,
  DEMO_PARTNER_AGENCY_FEE_YUAN,
  recordPartnerInvitePartnerReward,
  buildPartnerInvitePartnerPath,
  listPartnerInvitePartnerRewardsForInviter,
};
