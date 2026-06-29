/** 演示：授权数据存本机；正式环境由服务端同步车主与用车人关系 */

const SESSION_KEY = "ev_session";
const LEDGERS_KEY = "ev_auth_ledgers";

function digitsOnly(s) {
  return String(s || "").replace(/\D/g, "");
}

/** 中国大陆手机 11 位简化校验 */
function normalizePhone(raw) {
  const d = digitsOnly(raw);
  if (d.length === 11 && /^1[3-9]\d{9}$/.test(d)) return d;
  return "";
}

function getSession() {
  return wx.getStorageSync(SESSION_KEY) || null;
}

function setSession(session) {
  wx.setStorageSync(SESSION_KEY, session);
}

/** 清除登录态（演示） */
function clearSession() {
  try {
    wx.removeStorageSync(SESSION_KEY);
  } catch (e) {
    /* ignore */
  }
}

function setSessionMain(phone, extra) {
  const p = normalizePhone(phone);
  if (!p) return null;
  const s = { role: "main", phone: p, name: (extra && extra.name) || "" };
  setSession(s);
  return s;
}

function setSessionRider(phone, mainPhone, extra) {
  const p = normalizePhone(phone);
  const m = normalizePhone(mainPhone);
  if (!p || !m) return null;
  const s = {
    role: "rider",
    phone: p,
    mainPhone: m,
    name: (extra && extra.name) || "",
  };
  setSession(s);
  return s;
}

function updateSessionName(name) {
  const s = getSession();
  if (!s) return;
  setSession({ ...s, name: name || s.name });
}

/** @returns {Record<string, { riders: Array<{phone:string,createdAt:string,source:string}> }>} */
function readLedgers() {
  return wx.getStorageSync(LEDGERS_KEY) || {};
}

function writeLedgers(obj) {
  wx.setStorageSync(LEDGERS_KEY, obj);
}

function getRiderEntries(mainPhone) {
  const m = normalizePhone(mainPhone);
  if (!m) return [];
  const all = readLedgers();
  const row = all[m];
  return row && Array.isArray(row.riders) ? row.riders : [];
}

function setRiderEntries(mainPhone, riders) {
  const m = normalizePhone(mainPhone);
  if (!m) return;
  const all = readLedgers();
  all[m] = { riders: riders.slice() };
  writeLedgers(all);
}

function padTime() {
  const d = new Date();
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 主账号授权一名用车人（手动或邀请）
 * @param {string} riderName 用车人称呼，便于车主辨认
 */
function addAuthorizedRider(mainPhone, riderPhone, source, riderName) {
  const m = normalizePhone(mainPhone);
  const r = normalizePhone(riderPhone);
  if (!m || !r) return { ok: false, reason: "手机号无效" };
  if (m === r) return { ok: false, reason: "不能授权车主本人手机号" };
  const nm = (riderName && String(riderName).trim()) || "";
  const list = getRiderEntries(m);
  const idx = list.findIndex((x) => x.phone === r);
  if (idx >= 0) {
    const prev = list[idx];
    list[idx] = {
      ...prev,
      riderName: nm || prev.riderName || "",
      source: source || prev.source || "manual",
    };
    setRiderEntries(m, list);
    return { ok: true, entry: list[idx] };
  }
  const entry = {
    phone: r,
    riderName: nm,
    createdAt: padTime(),
    source: source || "manual",
  };
  list.push(entry);
  setRiderEntries(m, list);
  return { ok: true, entry };
}

function removeAuthorizedRider(mainPhone, riderPhone) {
  const m = normalizePhone(mainPhone);
  const r = normalizePhone(riderPhone);
  if (!m || !r) return { ok: false };
  const list = getRiderEntries(m).filter((x) => x.phone !== r);
  setRiderEntries(m, list);
  return { ok: true };
}

function isPhoneAuthorized(mainPhone, riderPhone) {
  const m = normalizePhone(mainPhone);
  const r = normalizePhone(riderPhone);
  if (!m || !r) return false;
  return getRiderEntries(m).some((x) => x.phone === r);
}

/**
 * 当前身份是否允许使用远程用车能力（与是否已绑定车辆无关，由页面组合判断）
 */
function isRideAllowed(session) {
  if (!session || !session.phone) return false;
  if (session.role === "main") return true;
  if (session.role === "rider" && session.mainPhone) {
    return isPhoneAuthorized(session.mainPhone, session.phone);
  }
  return false;
}

/**
 * 演示：首次进入写主账号；已是用车人不覆盖
 */
function ensureMainSession(profile) {
  const cur = getSession();
  if (cur && cur.role === "rider") return cur;
  if (cur && cur.role === "main" && cur.phone) {
    if (profile && profile.name) {
      setSession({ ...cur, name: profile.name });
      return getSession();
    }
    return cur;
  }
  return setSessionMain("13800001001", { name: (profile && profile.name) || "张三" });
}

function buildInvitePath(mainPhone) {
  const m = normalizePhone(mainPhone);
  if (!m) return "";
  return `/pages/invite-bind/invite-bind?mp=${encodeURIComponent(m)}`;
}

/** 主账号修改绑定手机号时迁移授权名单（演示） */
function setMainPhone(newPhone) {
  const s = getSession();
  if (!s || s.role !== "main") return { ok: false, reason: "仅主账号可修改" };
  const n = normalizePhone(newPhone);
  if (!n) return { ok: false, reason: "请输入正确手机号" };
  const o = s.phone;
  if (o === n) return { ok: true };
  const all = readLedgers();
  if (all[o]) {
    all[n] = all[o];
    delete all[o];
  } else {
    all[n] = { riders: [] };
  }
  writeLedgers(all);
  setSession({ ...s, phone: n });
  return { ok: true };
}

module.exports = {
  SESSION_KEY,
  normalizePhone,
  getSession,
  setSession,
  clearSession,
  setSessionMain,
  setSessionRider,
  updateSessionName,
  getRiderEntries,
  addAuthorizedRider,
  removeAuthorizedRider,
  isPhoneAuthorized,
  isRideAllowed,
  ensureMainSession,
  buildInvitePath,
  setMainPhone,
};
