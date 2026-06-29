/**
 * 将网关 GET /api/miniapp-ui 中的 miniappEcology 写入演示小程序本地缓存
 * （与 partner-store / merchant-store / org-store 的 key 对齐）
 */

function normalizePhone11(input) {
  const d = String(input || "").replace(/\D/g, "");
  if (d.length === 11) return d;
  if (d.length > 11) return d.slice(-11);
  return "";
}

function applyMiniappEcology(ecology) {
  if (!ecology || typeof ecology !== "object") return;

  try {
    const staff = ecology.partnerStaffByPhone;
    if (staff && typeof staff === "object") {
      const next = {};
      for (const [k, v] of Object.entries(staff)) {
        const ph = normalizePhone11(k);
        if (ph.length !== 11 || !v || typeof v !== "object") continue;
        next[ph] = v;
      }
      if (Object.keys(next).length > 0) {
        wx.setStorageSync("ev_partner_staff_v2", next);
      }
    }

    if (Array.isArray(ecology.merchantShops) && ecology.merchantShops.length > 0) {
      wx.setStorageSync("ev_merchant_shops_data", { list: ecology.merchantShops });
    }

    const roles = ecology.accountRoles;
    if (roles && typeof roles === "object") {
      const next = {};
      for (const [k, v] of Object.entries(roles)) {
        const ph = normalizePhone11(k);
        if (ph.length !== 11 || !v || typeof v !== "object") continue;
        next[ph] = { partner: !!v.partner, merchant: !!v.merchant };
      }
      if (Object.keys(next).length > 0) {
        wx.setStorageSync("ev_account_roles", next);
      }
    }

    const uplines = ecology.referralUplines;
    if (uplines && typeof uplines === "object") {
      const next = {};
      for (const [k, v] of Object.entries(uplines)) {
        const invitee = normalizePhone11(k);
        if (invitee.length !== 11 || !v || typeof v !== "object") continue;
        const inv = normalizePhone11(v.inviterPhone);
        if (inv.length !== 11) continue;
        next[invitee] = {
          inviterPhone: inv,
          plate: String(v.plate || ""),
          at: typeof v.at === "string" && v.at ? v.at : new Date().toISOString(),
          locked: v.locked === true,
        };
      }
      if (Object.keys(next).length > 0) {
        wx.setStorageSync("ev_referral_upline", next);
      }
    }
  } catch (e) {
    console.warn("[gateway-ecology-sync]", e);
  }
}

module.exports = {
  applyMiniappEcology,
};
