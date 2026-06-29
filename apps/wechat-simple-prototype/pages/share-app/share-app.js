const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const userVipStore = require("../../utils/user-vip-store.js");

Page({
  data: {
    invitePath: "",
    qrSrc: "",
    masked: "",
    needLogin: false,
    vipFull: null,
  },

  onLoad() {
    wx.showShareMenu({ withShareTicket: true, menus: ["shareAppMessage"] });
  },

  onShow() {
    const s = auth.getSession();
    if (!s || !s.phone) {
      this.setData({ needLogin: true, invitePath: "", qrSrc: "", masked: "", vipFull: null });
      return;
    }
    const p = org.normalizePhone(s.phone);
    const path = org.buildSystemInvitePath(p);
    const qrSrc = path
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(path)}`
      : "";
    const masked = p.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
    const vipFull = userVipStore.getUserVipSummary(p);
    this.setData({ needLogin: false, invitePath: path, qrSrc, masked, vipFull });
  },

  onCopy() {
    const p = this.data.invitePath;
    if (!p) return;
    wx.setClipboardData({ data: p, success: () => wx.showToast({ title: "已复制", icon: "none" }) });
  },

  onShareAppMessage() {
    const s = auth.getSession();
    let path = "/pages/home/home";
    if (s && s.phone) {
      const ip = org.buildSystemInvitePath(org.normalizePhone(s.phone));
      if (ip) path = ip;
    }
    return {
      title: "邀请您加入智控系统 · 打开后按提示完成绑定",
      path,
      imageUrl: "/images/invite-hero.png",
    };
  },

  goHome() {
    wx.reLaunch({ url: "/pages/home/home" });
  },
});
