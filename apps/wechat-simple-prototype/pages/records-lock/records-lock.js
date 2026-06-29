/** 兼容旧入口：已合并到「行车记录」页的开关锁分栏 */
Page({
  onLoad() {
    wx.redirectTo({ url: "/pages/tracks/tracks" });
  },
});
