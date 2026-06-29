const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const partnerStore = require("../../utils/partner-store.js");

function mask(p) {
  const s = String(p || "");
  if (s.length !== 11) return s || "—";
  return s.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

Page({
  data: {
    ok: false,
    label: "",
    stats: null,
    rewardRows: [],
    partnerRateLabel: "15%",
  },

  onLoad(options) {
    const l1 = options && options.l1 != null ? String(options.l1) : "";
    this._l1 = l1;
  },

  onShow() {
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    const root = partnerStore.getPartnerRoot(p);
    if (!root) {
      wx.showToast({ title: "无权限", icon: "none" });
      setTimeout(() => wx.navigateBack(), 400);
      return;
    }
    const detail = partnerStore.getL1Detail(root, this._l1);
    const rewardRows = (detail.rewards || []).map((r) => ({
      ...r,
      merchantMask: mask(r.merchantPhone),
      inviterMask: mask(r.inviterStaffPhone),
      orderAmountYuan: r.orderAmountYuan != null ? String(r.orderAmountYuan) : "—",
      rewardYuan: r.rewardYuan != null ? String(r.rewardYuan) : "—",
    }));
    this.setData({
      ok: true,
      label: detail.label,
      stats: detail.stats,
      rewardRows,
      partnerRateLabel: partnerStore.getPartnerRewardRateLabel(root),
    });
  },
});
