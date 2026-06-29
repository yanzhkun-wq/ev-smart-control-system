const auth = require("../../utils/auth-store.js");
const platformApi = require("../../utils/ev-platform-api.js");

Page({
  data: {
    isMain: false,
    phoneInput: "",
    platformApiInput: "",
  },

  onShow() {
    const s = auth.getSession();
    const base = platformApi.getApiBase() || "";
    if (s && s.role === "main") {
      this.setData({ isMain: true, phoneInput: s.phone || "", platformApiInput: base });
    } else {
      this.setData({ isMain: false, phoneInput: "", platformApiInput: base });
    }
  },

  onPhoneInput(e) {
    this.setData({ phoneInput: e.detail.value });
  },

  onSavePhone() {
    const r = auth.setMainPhone(this.data.phoneInput);
    if (!r.ok) {
      wx.showToast({ title: r.reason || "保存失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已更新", icon: "success" });
  },

  onPlatformApiInput(e) {
    this.setData({ platformApiInput: e.detail.value });
  },

  onSavePlatformApi() {
    const u = (this.data.platformApiInput || "").trim();
    if (u && !/^https?:\/\//i.test(u)) {
      wx.showToast({ title: "请以 http(s):// 开头", icon: "none" });
      return;
    }
    platformApi.setApiBase(u);
    wx.showToast({ title: u ? "已保存平台地址" : "已清除（仅本机演示）", icon: "none" });
  },
});
