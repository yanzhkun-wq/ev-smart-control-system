Page({
  data: {
    model: "雅迪 G5",
    plate: "京A12345",
    online: true,
    battery: "85%",
    locked: true,
  },
  unlock() {
    this.setData({ locked: false });
    wx.showToast({ title: "已解锁", icon: "none" });
  },
  lock() {
    this.setData({ locked: true });
    wx.showToast({ title: "已上锁", icon: "none" });
  },
});
