const auth = require("../../utils/auth-store.js");
const vehicleStore = require("../../utils/vehicle-store.js");

Page({
  data: {
    list: [],
    currentId: "",
  },

  onShow() {
    const session = auth.getSession();
    const list = vehicleStore.listForSession(session);
    const currentId = wx.getStorageSync(vehicleStore.STORAGE_CURRENT) || "";
    this.setData({ list, currentId });
  },

  onAdd() {
    wx.navigateTo({ url: "/pages/add-bind/add-bind" });
  },

  onPick(e) {
    const id = e.currentTarget.dataset.id;
    wx.setStorageSync(vehicleStore.STORAGE_CURRENT, id);
    this.setData({ currentId: id });
    wx.showToast({ title: "已切换当前车辆", icon: "none" });
    setTimeout(() => wx.navigateBack(), 400);
  },
});
