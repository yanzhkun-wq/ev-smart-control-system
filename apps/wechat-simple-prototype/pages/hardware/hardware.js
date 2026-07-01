/**
 * 兼容硬件参考 —— 帮助用户了解与平台兼容的硬件设备
 * 本软件免费开源，硬件需用户自行购买，我们不销售任何硬件
 */

const store = require("../../utils/mall-store.js");

function thumbClassForProduct(productId) {
  if (productId === "p_gw") return "tw-gw";
  if (productId === "p_ctrl") return "tw-ctrl";
  if (productId === "p_kit") return "tw-kit";
  return "tw-def";
}

Page({
  data: {
    hardwareList: [],
    hasMore: false,
    loading: true,
  },

  onShow() {
    this.load();
  },

  load() {
    const all = store.listHardware();
    this.setData({
      hardwareList: all,
      hasMore: false,
      loading: false,
    });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/hardware-detail/hardware-detail?id=${id}` });
  },
});
