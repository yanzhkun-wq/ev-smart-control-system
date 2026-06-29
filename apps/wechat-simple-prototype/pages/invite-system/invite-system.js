const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const userVipStore = require("../../utils/user-vip-store.js");

Page({
  data: {
    inviterPhone: "",
    inviterMasked: "",
    myPhone: "",
    plate: "",
    err: "",
    hint: "",
  },

  onLoad(query) {
    let inv = query.inv || "";
    try {
      inv = decodeURIComponent(inv);
    } catch (e) {}
    const pi = org.normalizePhone(inv);
    if (!pi) {
      this.setData({ err: "邀请链接无效" });
      return;
    }
    const masked = pi.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
    const s = auth.getSession();
    const my = s && s.phone ? s.phone : "";
    const existing = org.getUpline(my || "");
    let hint = "";
    if (my && existing && existing.locked) {
      hint = "您已绑定上级，不可重复绑定。";
    }
    this.setData({
      inviterPhone: pi,
      inviterMasked: masked,
      myPhone: my,
      plate: "",
      hint,
    });
  },

  onPhone(e) {
    this.setData({ myPhone: e.detail.value, err: "" });
  },

  onPlate(e) {
    this.setData({ plate: e.detail.value, err: "" });
  },

  onSubmit() {
    const { inviterPhone, myPhone, plate } = this.data;
    if (!inviterPhone) {
      this.setData({ err: "链接无效" });
      return;
    }
    const p = org.normalizePhone(myPhone);
    if (!p) {
      this.setData({ err: "请输入您的 11 位手机号" });
      return;
    }
    const plt = String(plate || "").trim();
    if (!plt) {
      this.setData({ err: "请填写车牌号（绑定后不可自行修改）" });
      return;
    }
    const r = org.bindReferral(p, inviterPhone, plt);
    if (!r.ok) {
      this.setData({ err: r.reason || "绑定失败" });
      return;
    }
    try {
      userVipStore.syncInviterAfterInviteeJoined(inviterPhone);
    } catch (e) {}
    const s = auth.getSession();
    if (!s || org.normalizePhone(s.phone) !== p) {
      auth.setSessionMain(p, { name: s ? s.name : "" });
    }
    wx.showToast({ title: "绑定成功", icon: "success" });
    setTimeout(() => wx.reLaunch({ url: "/pages/home/home" }), 400);
  },
});
