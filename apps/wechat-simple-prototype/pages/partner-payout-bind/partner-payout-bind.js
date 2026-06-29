const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const partnerStore = require("../../utils/partner-store.js");

Page({
  data: {
    ok: false,
    loadError: "",
    channel: "wechat_wallet",
    realName: "",
    alipayAccount: "",
    holderName: "",
    bankName: "",
    bankCardNo: "",
  },

  onLoad() {
    try {
      const s = auth.getSession();
      const p = s && s.phone ? org.normalizePhone(s.phone) : "";
      const roles = org.getRoles(p);
      const root = partnerStore.getPartnerRoot(p);
      const partnerOk = !!(root && partnerStore.ensureInPartnerTree(root, p));
      const merchantOk = !!roles.merchant;
      if (!partnerOk && !merchantOk) {
        this.setData({ ok: false, loadError: "仅合作商体系成员或商家门店账号可绑定收款。" });
        return;
      }
      const prof = partnerStore.getPayoutProfile(p);
      const next = {
        ok: true,
        loadError: "",
        channel: "wechat_wallet",
        realName: "",
        alipayAccount: "",
        holderName: "",
        bankName: "",
        bankCardNo: "",
      };
      if (prof) {
        next.channel = prof.channel;
        if (prof.channel === "wechat_wallet") next.realName = prof.realName || "";
        else if (prof.channel === "alipay") {
          next.realName = prof.realName || "";
          next.alipayAccount = prof.alipayAccount || "";
        } else {
          next.holderName = prof.holderName || "";
          next.bankName = prof.bankName || "";
          next.bankCardNo = prof.bankCardNo || "";
        }
      }
      this.setData(next);
    } catch (e) {
      this.setData({ ok: false, loadError: (e && e.message) || "加载失败" });
    }
  },

  setChannelWx() {
    this.setData({ channel: "wechat_wallet" });
  },

  setChannelAli() {
    this.setData({ channel: "alipay" });
  },

  setChannelBank() {
    this.setData({ channel: "bank_card" });
  },

  onRealName(e) {
    this.setData({ realName: e.detail.value });
  },
  onAlipayAccount(e) {
    this.setData({ alipayAccount: e.detail.value });
  },
  onHolder(e) {
    this.setData({ holderName: e.detail.value });
  },
  onBankName(e) {
    this.setData({ bankName: e.detail.value });
  },
  onBankCard(e) {
    this.setData({ bankCardNo: e.detail.value });
  },

  save() {
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    const ch = this.data.channel;
    let payload = { channel: ch };
    if (ch === "wechat_wallet") payload.realName = this.data.realName;
    else if (ch === "alipay") {
      payload.realName = this.data.realName;
      payload.alipayAccount = this.data.alipayAccount;
    } else {
      payload.holderName = this.data.holderName;
      payload.bankName = this.data.bankName;
      payload.bankCardNo = this.data.bankCardNo;
    }
    const r = partnerStore.savePayoutProfile(p, payload);
    if (!r.ok) {
      wx.showToast({ title: r.reason || "保存失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已保存", icon: "success" });
    setTimeout(() => wx.navigateBack(), 400);
  },
});
