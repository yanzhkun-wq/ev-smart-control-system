const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const userVipStore = require("../../utils/user-vip-store.js");



Page({

  data: {

    isMain: false,

    mainPhone: "",

    mainMasked: "",

    list: [],

    addName: "",

    addPhone: "",

    invitePath: "",

    qrSrc: "",

    riderMainMasked: "",

    riderPhone: "",

    vipOk: true,

  },



  onLoad() {

    wx.showShareMenu({ withShareTicket: true, menus: ["shareAppMessage"] });

  },



  onShow() {

    this.refresh();

  },



  refresh() {

    const s = auth.getSession();

    if (!s) {

      this.setData({

        isMain: false,

        list: [],

        invitePath: "",

        qrSrc: "",

        vipOk: true,

      });

      return;

    }

    if (s.role === "rider") {

      const masked = (s.mainPhone || "").replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");

      this.setData({

        isMain: false,

        riderMainMasked: masked,

        riderPhone: s.phone,

        list: [],

        invitePath: "",

        qrSrc: "",

        vipOk: true,

      });

      return;

    }

    const list = auth.getRiderEntries(s.phone);

    const path = auth.buildInvitePath(s.phone);

    const qrSrc = path

      ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(path)}`

      : "";

    const masked = (s.phone || "").replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");

    const p = org.normalizePhone(s.phone);
    const vipOk = userVipStore.canUseVipGatedFeatures(p);

    this.setData({

      isMain: true,

      mainPhone: s.phone,

      mainMasked: masked,

      list,

      invitePath: path,

      qrSrc,

      vipOk,

    });

  },



  onAddNameInput(e) {

    this.setData({ addName: e.detail.value });

  },



  onAddInput(e) {

    this.setData({ addPhone: e.detail.value });

  },



  onAddRider() {

    const s = auth.getSession();

    if (!s || s.role !== "main") return;

    if (!userVipStore.canUseVipGatedFeatures(org.normalizePhone(s.phone))) {

      wx.showToast({ title: "需要 VIP", icon: "none" });

      return;

    }

    const r = auth.addAuthorizedRider(s.phone, this.data.addPhone, "manual", this.data.addName);

    if (!r.ok) {

      wx.showToast({ title: r.reason || "添加失败", icon: "none" });

      return;

    }

    this.setData({ addPhone: "", addName: "" });

    wx.showToast({ title: "已添加", icon: "success" });

    this.refresh();

  },



  onRemove(e) {

    const phone = e.currentTarget.dataset.phone;

    const label = e.currentTarget.dataset.label || phone;

    const s = auth.getSession();

    if (!s || s.role !== "main" || !phone) return;

    wx.showModal({

      title: "撤销授权",

      content: `确定删除「${label}」？`,

      confirmText: "删除",

      confirmColor: "#b91c1c",

      success: (res) => {

        if (!res.confirm) return;

        const s2 = auth.getSession();
        if (!s2 || s2.role !== "main" || !userVipStore.canUseVipGatedFeatures(org.normalizePhone(s2.phone))) {
          wx.showToast({ title: "需要 VIP", icon: "none" });
          return;
        }

        auth.removeAuthorizedRider(s2.phone, phone);

        wx.showToast({ title: "已删除", icon: "none" });

        this.refresh();

      },

    });

  },



  onCopyPath() {

    const p = this.data.invitePath;

    if (!p) return;

    wx.setClipboardData({

      data: p,

      success: () => wx.showToast({ title: "已复制", icon: "none" }),

    });

  },



  onShareAppMessage() {

    const s = auth.getSession();

    const path = s && s.role === "main" ? auth.buildInvitePath(s.phone) : "/pages/home/home";

    return {

      title: "邀请您成为用车人 · 电动车智控",

      path: path || "/pages/home/home",

    };

  },



  goAccount() {

    wx.navigateTo({ url: "/pages/account/account" });

  },

  goVipCenter() {
    wx.navigateTo({ url: "/pages/vip-center/vip-center" });
  },

});

