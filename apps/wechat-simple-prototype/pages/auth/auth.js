const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");

Page({

  data: {
    isMain: false,
    mainPhone: "",
    mainMasked: "",
    list: [],
    addName: "",
    addPhone: "",
    riderMainMasked: "",
    riderPhone: "",
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
      });
      return;
    }
    const list = auth.getRiderEntries(s.phone);
    const masked = (s.phone || "").replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
    this.setData({
      isMain: true,
      mainPhone: s.phone,
      mainMasked: masked,
      list,
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
        auth.removeAuthorizedRider(s.phone, phone);
        wx.showToast({ title: "已删除", icon: "none" });
        this.refresh();
      },
    });
  },

  goAccount() {
    wx.navigateTo({ url: "/pages/account/account" });
  },
});
