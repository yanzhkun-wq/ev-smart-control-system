const auth = require("../../utils/auth-store.js");
const vehicleStore = require("../../utils/vehicle-store.js");

Page({
  data: {
    list: [],
    currentId: "",
    showDeleteConfirm: false,
    deleteTarget: null,
  },

  onShow() {
    this._refresh();
  },

  _refresh() {
    const session = auth.getSession();
    const list = vehicleStore.listForSession(session).map((v) => ({
      ...v,
      battery: Math.floor(Math.random() * 40 + 60), // demo 电量
      online: Math.random() > 0.3,
    }));
    const currentId = wx.getStorageSync(vehicleStore.STORAGE_CURRENT) || "";
    this.setData({ list, currentId });
  },

  /* ---------- 切换当前车辆 ---------- */
  onPick(e) {
    const id = e.currentTarget.dataset.id;
    wx.setStorageSync(vehicleStore.STORAGE_CURRENT, id);
    this.setData({ currentId: id });
    wx.showToast({ title: "已切换当前车辆", icon: "none" });
    setTimeout(() => wx.navigateBack(), 400);
  },

  /* ---------- 跳转新增 ---------- */
  onAdd() {
    wx.navigateTo({ url: "/pages/add-bind/add-bind" });
  },

  /* ---------- 编辑 ---------- */
  onEdit(e) {
    const id = e.currentTarget.dataset.id;
    const vehicle = this.data.list.find((v) => v.id === id);
    if (!vehicle) return;
    wx.showModal({
      title: "编辑车辆",
      placeholderText: "输入新备注",
      content: vehicle.note || "",
      success: (res) => {
        if (res.confirm && res.content) {
          vehicleStore.updateNote(id, res.content);
          this._refresh();
          wx.showToast({ title: "已更新", icon: "success" });
        }
      },
    });
  },

  /* ---------- 删除 ---------- */
  onDeleteTap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ showDeleteConfirm: true, deleteTarget: id });
  },

  onDeleteConfirm() {
    const id = this.data.deleteTarget;
    if (!id) return;
    vehicleStore.remove(id);
    this.setData({ showDeleteConfirm: false, deleteTarget: null });
    this._refresh();
    wx.showToast({ title: "已删除", icon: "success" });
  },

  onDeleteCancel() {
    this.setData({ showDeleteConfirm: false, deleteTarget: null });
  },

  /* ---------- 刷新 ---------- */
  onRefresh() {
    wx.showLoading({ title: "刷新中..." });
    setTimeout(() => {
      this._refresh();
      wx.hideLoading();
      wx.showToast({ title: "已刷新", icon: "success" });
    }, 500);
  },
});
