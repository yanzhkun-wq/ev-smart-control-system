Page({
  data: {
    radius: 500,
    enabled: true,
  },
  onRadius(e) {
    this.setData({ radius: e.detail.value });
  },
  onSwitch(e) {
    this.setData({ enabled: !!e.detail.value });
  },
  save() {
    wx.showToast({ title: "已保存（演示）", icon: "success" });
  },
});
