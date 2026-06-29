const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const partnerStore = require("../../utils/partner-store.js");



function maskPhone(p) {
  const s = String(p || "");
  if (s.length !== 11) return s || "—";
  return s.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

Page({

  data: {
    realName: "",
    formPhone: "",
    reason: "",
    done: false,
    partnerRateLabel: "15%",
    hasPartnerInvite: false,
    inviterMask: "",
  },

  onLoad(options) {
    const raw = options && options.inv != null ? String(options.inv) : "";
    let inv = "";
    try {
      inv = org.normalizePhone(decodeURIComponent(raw.trim()));
    } catch (e) {
      inv = org.normalizePhone(raw.trim());
    }
    const okInv = inv && inv.length === 11;
    this._inviterPartner = okInv ? inv : "";
    this.setData({
      hasPartnerInvite: okInv,
      inviterMask: okInv ? maskPhone(inv) : "",
    });
  },

  onShow() {

    const s = auth.getSession();

    const p = s && s.phone ? org.normalizePhone(s.phone) : "";

    const r = p ? org.getRoles(p) : {};

    this.setData({
      formPhone: p || "",
      done: !!r.partner,
      realName: "",
      reason: "",
      partnerRateLabel: partnerStore.getPartnerRewardRateLabel(),
    });

  },



  onName(e) {

    this.setData({ realName: e.detail.value });

  },

  onPhone(e) {

    this.setData({ formPhone: e.detail.value });

  },

  onReason(e) {

    this.setData({ reason: e.detail.value });

  },



  onSubmit() {

    const s = auth.getSession();

    if (!s || !s.phone) {

      wx.showToast({ title: "请先登录", icon: "none" });

      return;

    }

    if (!this.data.realName.trim()) {

      wx.showToast({ title: "请填写姓名", icon: "none" });

      return;

    }

    const fp = org.normalizePhone(this.data.formPhone);

    if (!fp) {

      wx.showToast({ title: "请填写有效手机号", icon: "none" });

      return;

    }

    const sessionPhone = org.normalizePhone(s.phone);
    if (fp !== sessionPhone) {
      wx.showToast({ title: "手机号须与登录账号一致", icon: "none" });
      return;
    }

    if (!this.data.reason.trim()) {

      wx.showToast({ title: "请填写申请理由", icon: "none" });

      return;

    }

    org.setPartnerApproved(s.phone, true);

    const inv = this._inviterPartner || "";
    if (inv && inv !== sessionPhone) {
      const rewardRes = partnerStore.recordPartnerInvitePartnerReward(
        inv,
        sessionPhone,
        partnerStore.DEMO_PARTNER_AGENCY_FEE_YUAN
      );
      if (!rewardRes.ok && rewardRes.reason) {
        wx.showToast({ title: rewardRes.reason, icon: "none", duration: 2500 });
      }
    }

    this.setData({ done: true });

    wx.showModal({

      title: "已开通（演示）",

      content: "正式环境需资质审核。演示版已标记您为合作商，可从「我的」进入合作商后台。",

      showCancel: false,

    });

  },



  goAdmin() {

    org.setPortalMode("partner");

    wx.reLaunch({ url: "/pages/partner-admin/partner-admin" });

  },

});

