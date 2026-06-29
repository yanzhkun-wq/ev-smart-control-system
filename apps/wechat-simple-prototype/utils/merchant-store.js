/**
 * 改装门店（同城）+ 商家补贴单 + 设备扫码入库（演示本机）
 * 流程：先将设备扫码绑定到商家后台 → 再为用户录入改装（仅能使用已入库设备）。
 *
 * 上单口径：
 * - 上门用户（自带设备到店）：平台按「结算基数 × 补贴比例」补贴商家，用户不向店内付款；
 * - 本店邀约用户：无平台补贴，商家与用户线下收款，系统不记录金额。
 */

const auth = require("./auth-store.js");
const vehicleStore = require("./vehicle-store.js");

const SHOPS_KEY = "ev_merchant_shops_data";
const JOBS_KEY = "ev_merchant_subsidy_jobs";
const INVENTORY_KEY = "ev_merchant_device_inventory_v1";
const MERCHANT_WITHDRAW_KEY = "ev_merchant_withdrawals_v1";
/** 与管理端 commerce.distribution 对齐的本地快照 key（GET /api/store 写入后可跟随后台） */
const ADMIN_DISTRIBUTION_SNAPSHOT_KEY = "ev_admin_distribution_snapshot";

const DEFAULT_WALK_IN_MERCHANT_SUBSIDY_PCT = 15;
const DEFAULT_WALK_IN_SUBSIDY_BASE_YUAN = 800;
const MIN_MERCHANT_WITHDRAW_YUAN = 1;

/** @readonly */
const INSTALL_SOURCE_WALK_IN = "walk_in";
/** @readonly */
const INSTALL_SOURCE_MERCHANT_REFERRAL = "merchant_referral";

function fmtTime() {
  const d = new Date();
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function round2(x) {
  return Math.round(Number(x) * 100) / 100;
}

function getWalkInSubsidyParams() {
  try {
    const raw = wx.getStorageSync(ADMIN_DISTRIBUTION_SNAPSHOT_KEY);
    if (raw && typeof raw === "object") {
      const pct = Number(raw.walkInMerchantSubsidyPct);
      const baseYuan = Number(raw.walkInMerchantSubsidyBaseYuan);
      if (Number.isFinite(pct) && pct >= 0 && pct <= 100 && Number.isFinite(baseYuan) && baseYuan >= 0) {
        return { pct, baseYuan };
      }
    }
  } catch (_) {}
  return { pct: DEFAULT_WALK_IN_MERCHANT_SUBSIDY_PCT, baseYuan: DEFAULT_WALK_IN_SUBSIDY_BASE_YUAN };
}

function getWalkInPlatformSubsidyYuan() {
  const { pct, baseYuan } = getWalkInSubsidyParams();
  return round2((baseYuan * pct) / 100);
}

function distM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function seedShops() {
  return [
    {
      id: "seed_bj_1",
      ownerPhone: "",
      shopName: "海淀·极客电动车改装",
      bossName: "李师傅",
      contactPhone: "13900001001",
      storefrontImage: "",
      city: "北京市",
      district: "海淀区",
      addressDetail: "中关村大街 58 号一层",
      lat: 39.9832,
      lng: 116.3164,
      addressFull: "北京市海淀区中关村大街 58 号一层",
      published: true,
    },
    {
      id: "seed_bj_2",
      ownerPhone: "",
      shopName: "朝阳·闪电动力改装店",
      bossName: "王姐",
      contactPhone: "13900001002",
      storefrontImage: "",
      city: "北京市",
      district: "朝阳区",
      addressDetail: "三里屯太古里附近工体北路 12 号",
      lat: 39.937,
      lng: 116.454,
      addressFull: "北京市朝阳区工体北路 12 号",
      published: true,
    },
    {
      id: "seed_sh_1",
      ownerPhone: "",
      shopName: "浦东·安骑改装服务中心",
      bossName: "陈师傅",
      contactPhone: "13900001003",
      storefrontImage: "",
      city: "上海市",
      district: "浦东新区",
      addressDetail: "张杨路 500 号",
      lat: 31.23,
      lng: 121.52,
      addressFull: "上海市浦东新区张杨路 500 号",
      published: true,
    },
  ];
}

function readShopsRaw() {
  const s = wx.getStorageSync(SHOPS_KEY);
  if (!s || !s.list || !s.list.length) {
    const list = seedShops();
    wx.setStorageSync(SHOPS_KEY, { list });
    return list;
  }
  return s.list;
}

function saveShopsList(list) {
  wx.setStorageSync(SHOPS_KEY, { list });
}

function upsertShopProfile(ownerPhone, profile) {
  const p = auth.normalizePhone(ownerPhone);
  if (!p) return;
  const list = readShopsRaw();
  const i = list.findIndex((x) => x.ownerPhone === p);
  const row = {
    shopName: profile.shopName || "",
    bossName: profile.bossName || "",
    contactPhone: auth.normalizePhone(profile.contactPhone) || profile.contactPhone || "",
    storefrontImage: profile.storefrontImage || "",
    city: profile.city || "",
    district: profile.district || "",
    addressDetail: profile.addressDetail || "",
    lat: profile.lat != null ? Number(profile.lat) : null,
    lng: profile.lng != null ? Number(profile.lng) : null,
    addressFull: profile.addressFull || "",
    published: true,
    ownerPhone: p,
  };
  if (profile.partnerPhone != null && profile.partnerPhone !== "") {
    row.partnerPhone = auth.normalizePhone(profile.partnerPhone) || profile.partnerPhone;
  }
  if (profile.inviterStaffPhone != null && profile.inviterStaffPhone !== "") {
    row.inviterStaffPhone = auth.normalizePhone(profile.inviterStaffPhone) || profile.inviterStaffPhone;
  }
  if (profile.bindLocked === true) {
    row.bindLocked = true;
  }
  if (profile.merchantApprovedAt != null && profile.merchantApprovedAt !== "") {
    row.merchantApprovedAt = String(profile.merchantApprovedAt);
  }
  if (i >= 0) {
    const prev = list[i];
    const merged = { ...prev, ...row, id: prev.id };
    if (prev.bindLocked && prev.partnerPhone) {
      merged.partnerPhone = prev.partnerPhone;
      merged.inviterStaffPhone = prev.inviterStaffPhone || merged.inviterStaffPhone;
      merged.bindLocked = true;
      if (prev.merchantApprovedAt && !row.merchantApprovedAt) {
        merged.merchantApprovedAt = prev.merchantApprovedAt;
      }
    }
    list[i] = merged;
  } else {
    list.push({ id: "shop_" + Date.now(), ...row });
  }
  saveShopsList(list);
}

function getShopByOwner(ownerPhone) {
  const p = auth.normalizePhone(ownerPhone);
  if (!p) return null;
  return readShopsRaw().find((x) => x.ownerPhone === p) || null;
}

function readJobs() {
  return wx.getStorageSync(JOBS_KEY) || [];
}

function writeJobs(list) {
  wx.setStorageSync(JOBS_KEY, list);
}

function readInventory() {
  const raw = wx.getStorageSync(INVENTORY_KEY);
  return Array.isArray(raw) ? raw : [];
}

function writeInventory(list) {
  wx.setStorageSync(INVENTORY_KEY, list);
}

/** 从扫码结果解析设备编码（演示：取字母数字串） */
function parseDeviceCodeFromScan(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const m = s.match(/[A-Za-z0-9]{6,32}/);
  return m ? m[0].toUpperCase() : s.replace(/\s/g, "").slice(0, 32).toUpperCase();
}

/**
 * 扫码将设备绑定到本商家后台（入库后再给用户改装）
 */
function merchantScanBindDevice(merchantPhone, rawQr) {
  const m = auth.normalizePhone(merchantPhone);
  const code = parseDeviceCodeFromScan(rawQr);
  if (!m || !code || code.length < 6) return { ok: false, reason: "请扫描有效的设备编码二维码" };
  const inv = readInventory();
  const dupGlobal = inv.some((x) => x.deviceCode === code);
  if (dupGlobal) return { ok: false, reason: "该设备编码已在系统中入库" };
  const dupVehicle = vehicleStore.readAll().some((v) => String(v.code || "").toUpperCase() === code);
  if (dupVehicle) return { ok: false, reason: "该设备已绑定在用户车辆上，无法重复入库" };
  inv.unshift({
    id: "stk_" + Date.now(),
    merchantPhone: m,
    deviceCode: code,
    boundAt: fmtTime(),
  });
  writeInventory(inv);
  return { ok: true, deviceCode: code };
}

function listMerchantInventory(merchantPhone) {
  const m = auth.normalizePhone(merchantPhone);
  if (!m) return [];
  return readInventory().filter((x) => auth.normalizePhone(x.merchantPhone) === m);
}

function readMerchantWithdrawals() {
  const raw = wx.getStorageSync(MERCHANT_WITHDRAW_KEY);
  return Array.isArray(raw) ? raw : [];
}

function writeMerchantWithdrawals(list) {
  wx.setStorageSync(MERCHANT_WITHDRAW_KEY, list);
}

function decorateMerchantWithdrawRow(row) {
  const snap = row.walletAuditSnapshot && typeof row.walletAuditSnapshot === "object" ? row.walletAuditSnapshot : null;
  const walletAuditLine = snap
    ? `快照 可提现¥${snap.availableYuanAtApply != null ? snap.availableYuanAtApply : "—"} · 累计应得¥${
        snap.accruedLifetimeYuan != null ? snap.accruedLifetimeYuan : "—"
      }`
    : "无申请快照（务必在 PC 后台核对补贴入账再打款）";
  return {
    ...row,
    amountYuanStr: row.amountYuan != null ? String(row.amountYuan) : "—",
    walletAuditLine,
  };
}

function maskLedgerPhone(p) {
  const s = String(p || "");
  if (s.length !== 11) return s || "—";
  return s.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

function ledgerTimeMs(str) {
  const t = new Date(String(str || "").replace(/-/g, "/")).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * 已结算改装单的入账明细（用于商家钱包页展示）。
 * 仅「上门」单有正额补贴；本店邀约结算后补贴为 0 亦列出便于对账。
 */
function listMerchantIncomeLedger(merchantPhone) {
  const m = auth.normalizePhone(merchantPhone);
  if (!m) return [];
  syncJobStatuses();
  return readJobs()
    .filter((j) => auth.normalizePhone(j.merchantPhone) === m && j.status === "settled_demo")
    .map((j) => {
      const subsidy = round2(Number(j.subsidyYuan) || 0);
      const src = j.installSource;
      let kindLabel = "历史单";
      if (src === "walk_in") kindLabel = "上门·平台定额补贴";
      else if (src === "merchant_referral") kindLabel = "本店邀约";
      const creditsWallet = subsidy > 0;
      let detailLine = "";
      if (src === "walk_in") {
        detailLine = creditsWallet ? `计入可提现 +¥${subsidy}` : "—";
      } else if (src === "merchant_referral") {
        detailLine = "无平台补贴（不计入可提现）";
      } else {
        detailLine = creditsWallet ? `补贴 +¥${subsidy}` : "—";
      }
      return {
        id: j.id,
        plate: j.plate || "—",
        userPhoneMask: maskLedgerPhone(j.userPhone),
        subsidyYuanStr: String(subsidy),
        subsidyYuan: subsidy,
        creditsWallet,
        settledAt: j.settledAt || j.createdAt || "—",
        kindLabel,
        detailLine,
      };
    })
    .sort((a, b) => ledgerTimeMs(b.settledAt) - ledgerTimeMs(a.settledAt));
}

function getMerchantWalletSummary(merchantPhone) {
  const m = auth.normalizePhone(merchantPhone);
  if (!m) {
    return {
      accruedLifetimeYuan: 0,
      withdrawnPaidYuan: 0,
      pendingOutYuan: 0,
      availableYuan: 0,
    };
  }
  const jobs = readJobs().filter((j) => auth.normalizePhone(j.merchantPhone) === m && j.status === "settled_demo");
  const accruedLifetimeYuan = round2(jobs.reduce((s, j) => s + (Number(j.subsidyYuan) || 0), 0));
  const wds = readMerchantWithdrawals().filter((w) => auth.normalizePhone(w.merchantPhone) === m);
  const withdrawnPaidYuan = round2(wds.filter((w) => w.status === "paid").reduce((s, w) => s + (Number(w.amountYuan) || 0), 0));
  const pendingOutYuan = round2(wds.filter((w) => w.status === "pending").reduce((s, w) => s + (Number(w.amountYuan) || 0), 0));
  const availableYuan = round2(Math.max(0, accruedLifetimeYuan - withdrawnPaidYuan - pendingOutYuan));
  return { accruedLifetimeYuan, withdrawnPaidYuan, pendingOutYuan, availableYuan };
}

function requestMerchantWithdrawal(merchantPhone, amountRaw) {
  const p = auth.normalizePhone(merchantPhone);
  if (!p) return { ok: false, reason: "未登录" };
  const partnerStore = require("./partner-store.js");
  const amount = round2(Number(amountRaw));
  if (!(amount > 0) || Number.isNaN(amount)) return { ok: false, reason: "请输入有效金额" };
  const minY = partnerStore.MIN_WITHDRAW_YUAN != null ? partnerStore.MIN_WITHDRAW_YUAN : MIN_MERCHANT_WITHDRAW_YUAN;
  if (amount < minY) return { ok: false, reason: `单笔至少 ¥${minY}` };
  const w = getMerchantWalletSummary(p);
  if (amount > w.availableYuan) return { ok: false, reason: "可提现余额不足" };
  const prof = partnerStore.getPayoutProfile(p);
  if (!prof || !prof.channel) return { ok: false, reason: "请先绑定收款账户" };
  const payoutSummary = partnerStore.formatPayoutSummaryFromProfile(prof);
  const row = {
    id: "mwd_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    merchantPhone: p,
    amountYuan: amount,
    status: "pending",
    createdAt: fmtTime(),
    resolvedAt: "",
    note: "",
    payoutChannel: prof.channel,
    payoutSummary: payoutSummary || "—",
    walletAuditSnapshot: {
      accruedLifetimeYuan: w.accruedLifetimeYuan,
      availableYuanAtApply: w.availableYuan,
      withdrawnPaidYuan: w.withdrawnPaidYuan,
      pendingOutYuanAtApply: w.pendingOutYuan,
    },
  };
  const list = readMerchantWithdrawals();
  list.unshift(row);
  writeMerchantWithdrawals(list);
  return { ok: true, row: decorateMerchantWithdrawRow(row) };
}

function listMerchantWithdrawals(merchantPhone) {
  const m = auth.normalizePhone(merchantPhone);
  if (!m) return [];
  return readMerchantWithdrawals()
    .filter((w) => auth.normalizePhone(w.merchantPhone) === m)
    .map(decorateMerchantWithdrawRow);
}

/** 同城优先（按城市名匹配）再按直线距离 */
function listShopsForUser(userLat, userLng, userCityHint) {
  const hint = String(userCityHint || "").trim();
  const shops = readShopsRaw().filter((s) => s.published !== false);
  const enriched = shops.map((s) => {
    let distanceM = null;
    if (userLat != null && userLng != null && s.lat != null && s.lng != null) {
      distanceM = distM(userLat, userLng, Number(s.lat), Number(s.lng));
    }
    let distanceLabel = "—";
    if (distanceM != null && !Number.isNaN(distanceM)) {
      if (distanceM < 1000) distanceLabel = `${Math.round(distanceM)} m`;
      else distanceLabel = `${(distanceM / 1000).toFixed(1)} km`;
    }
    return { ...s, distanceM, distanceLabel };
  });
  enriched.sort((a, b) => {
    const ac = hint && a.city && a.city.indexOf(hint) >= 0 ? 0 : hint ? 1 : 0;
    const bc = hint && b.city && b.city.indexOf(hint) >= 0 ? 0 : hint ? 1 : 0;
    if (ac !== bc) return ac - bc;
    const da = a.distanceM != null ? a.distanceM : 1e15;
    const db = b.distanceM != null ? b.distanceM : 1e15;
    return da - db;
  });
  return enriched;
}

function defaultVehicle(id, ownerPhone, code, plate, t0) {
  const plt = String(plate || "")
    .trim()
    .toUpperCase();
  return {
    id,
    ownerPhone,
    code: String(code || "").trim(),
    plate: plt,
    lat: 39.90923,
    lng: 116.397428,
    address: "位置待设备上报（改装完成后随终端上报）",
    locked: true,
    lastOpTime: t0,
    fenceShape: "circle",
    fenceLat: 39.90923,
    fenceLng: 116.397428,
    fenceRadiusCm: 2000,
    alarmMarginCm: 200,
    rectLat1: null,
    rectLng1: null,
    rectLat2: null,
    rectLng2: null,
    deviceOnline: false,
  };
}

/**
 * 录入改装单：设备须已在本店扫码入库。
 * @param installSource walk_in：上门用户（平台定额补贴）；merchant_referral：本店邀约（无平台补贴）
 */
function submitMerchantBind({ merchantPhone, userPhone, deviceCode, plate, installSource }) {
  const merchant = auth.normalizePhone(merchantPhone);
  const user = auth.normalizePhone(userPhone);
  const code = String(deviceCode || "").trim().toUpperCase();
  const plt = String(plate || "")
    .trim()
    .toUpperCase();
  if (!merchant || !user || !code || !plt) {
    return { ok: false, reason: "请填写用户手机、设备编码与车牌" };
  }
  const src =
    installSource === INSTALL_SOURCE_MERCHANT_REFERRAL ? INSTALL_SOURCE_MERCHANT_REFERRAL : INSTALL_SOURCE_WALK_IN;

  const invList = readInventory();
  const ix = invList.findIndex((x) => auth.normalizePhone(x.merchantPhone) === merchant && x.deviceCode === code);
  if (ix < 0) {
    return { ok: false, reason: "请先在「扫码入库」将设备绑定到本店，再为用户改装" };
  }
  invList.splice(ix, 1);
  writeInventory(invList);

  const { pct, baseYuan } = getWalkInSubsidyParams();
  const subsidyYuan = src === INSTALL_SOURCE_WALK_IN ? round2((baseYuan * pct) / 100) : 0;

  const list = vehicleStore.readAll();
  let v = vehicleStore.findByOwnerCodePlate(user, code, plt);
  const t0 = fmtTime();
  if (!v) {
    const id = "v_" + Date.now();
    v = defaultVehicle(id, user, code, plt, t0);
    v.merchantBoundBy = merchant;
    v.merchantBoundAt = t0;
    v.installSource = src;
    v.installSubsidyYuan = subsidyYuan;
    v.deviceOnline = false;
    list.push(v);
  } else {
    const i = list.findIndex((x) => x.id === v.id);
    if (i >= 0) {
      v = {
        ...list[i],
        merchantBoundBy: merchant,
        merchantBoundAt: t0,
        installSource: src,
        installSubsidyYuan: subsidyYuan,
        deviceOnline: false,
      };
      list[i] = v;
    }
  }
  vehicleStore.writeAll(list);

  const jobs = readJobs();
  const job = {
    id: "job_" + Date.now(),
    merchantPhone: merchant,
    userPhone: user,
    deviceCode: code,
    plate: plt,
    installSource: src,
    subsidyYuan,
    subsidyRateText:
      src === INSTALL_SOURCE_WALK_IN ? `平台补${pct}%（基数¥${baseYuan}，本单¥${subsidyYuan}）` : "无平台补贴",
    status: "pending_online",
    createdAt: t0,
    vehicleId: v.id,
  };
  jobs.unshift(job);
  writeJobs(jobs);
  syncJobStatuses();
  return { ok: true, job };
}

/** 根据车辆在线状态刷新补贴单 */
function syncJobStatuses() {
  const list = vehicleStore.readAll();
  const jobs = readJobs();
  let changed = false;
  const next = jobs.map((job) => {
    if (job.status === "settled_demo") return job;
    const v = list.find((x) => x.id === job.vehicleId);
    if (!v) return job;
    const online = v.deviceOnline !== false;
    const bound = !!v.merchantBoundBy;
    if (bound && online && job.status === "pending_online") {
      changed = true;
      return {
        ...job,
        status: "valid",
        validatedAt: fmtTime(),
      };
    }
    return job;
  });
  if (changed) writeJobs(next);
  return next;
}

/** 合作体系内全部改装单（按网点归属合作商过滤） */
function listJobsUnderPartnerRoot(partnerRootPhone) {
  const rt = auth.normalizePhone(partnerRootPhone);
  if (!rt) return [];
  syncJobStatuses();
  const owners = readShopsRaw()
    .filter((s) => auth.normalizePhone(s.partnerPhone) === rt)
    .map((s) => auth.normalizePhone(s.ownerPhone))
    .filter(Boolean);
  const set = new Set(owners);
  return readJobs().filter((j) => set.has(auth.normalizePhone(j.merchantPhone)));
}

function listJobsForMerchant(merchantPhone) {
  const m = auth.normalizePhone(merchantPhone);
  if (!m) return [];
  syncJobStatuses();
  return readJobs().filter((j) => j.merchantPhone === m);
}

/** 演示：改装完成、终端已上报在线 */
function markJobVehicleOnline(merchantPhone, jobId) {
  const m = auth.normalizePhone(merchantPhone);
  if (!m) return { ok: false, reason: "无效账号" };
  const jobs = readJobs();
  const job = jobs.find((x) => x.id === jobId && x.merchantPhone === m);
  if (!job) return { ok: false, reason: "未找到该单" };
  const list = vehicleStore.readAll();
  const i = list.findIndex((x) => x.id === job.vehicleId);
  if (i < 0) return { ok: false, reason: "车辆数据缺失" };
  list[i] = { ...list[i], deviceOnline: true, lastOpTime: fmtTime() };
  vehicleStore.writeAll(list);
  syncJobStatuses();
  return { ok: true };
}

/** 演示：平台已打款（不改变车辆状态） */
function markJobSettledDemo(merchantPhone, jobId) {
  const m = auth.normalizePhone(merchantPhone);
  const jobs = readJobs();
  const idx = jobs.findIndex((x) => x.id === jobId && x.merchantPhone === m);
  if (idx < 0) return { ok: false, reason: "未找到该单" };
  if (jobs[idx].status !== "valid") {
    return { ok: false, reason: "当前记录状态不可结算，请先确认设备已联网" };
  }
  const settledAt = fmtTime();
  const settledJob = { ...jobs[idx], status: "settled_demo", settledAt };
  jobs[idx] = settledJob;
  writeJobs(jobs);
  try {
    require("./partner-store.js").recordPartnerRewardFromJob(settledJob);
  } catch (e) {
    /* ignore */
  }
  return { ok: true };
}

module.exports = {
  SHOPS_KEY,
  JOBS_KEY,
  INVENTORY_KEY,
  MERCHANT_WITHDRAW_KEY,
  getWalkInSubsidyParams,
  getWalkInPlatformSubsidyYuan,
  INSTALL_SOURCE_WALK_IN,
  INSTALL_SOURCE_MERCHANT_REFERRAL,
  MIN_MERCHANT_WITHDRAW_YUAN,
  readShopsRaw,
  upsertShopProfile,
  getShopByOwner,
  listShopsForUser,
  parseDeviceCodeFromScan,
  merchantScanBindDevice,
  listMerchantInventory,
  listJobsUnderPartnerRoot,
  submitMerchantBind,
  syncJobStatuses,
  listJobsForMerchant,
  markJobVehicleOnline,
  markJobSettledDemo,
  getMerchantWalletSummary,
  requestMerchantWithdrawal,
  listMerchantWithdrawals,
  listMerchantIncomeLedger,
};
