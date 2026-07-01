const auth = require("../../utils/auth-store.js");
const store = require("../../utils/mall-store.js");

function thumbClassForProduct(productId) {
  if (productId === "p_gw") return "tw-gw";
  if (productId === "p_ctrl") return "tw-ctrl";
  if (productId === "p_kit") return "tw-kit";
  return "tw-def";
}

Page({
  data: {
    product: null,
    heroSlides: [],
    thumbClass: "tw-def",
    productId: "",
  },

  onLoad(options) {
    const id = options.id || "";
    this.setData({ productId: id });
    this.load(id);
  },

  onShow() {
    if (this.data.productId) this.load(this.data.productId);
  },

  load(id) {
    const p = store.getHardware(id);
    if (!p) {
      wx.showToast({ title: "硬件信息不存在", icon: "none" });
      setTimeout(() => wx.navigateBack(), 500);
      return;
    }
    const imgs = [];
    if (p.mainImage) imgs.push(p.mainImage);
    (p.gallery || []).forEach((u) => {
      if (u && imgs.indexOf(u) < 0) imgs.push(u);
    });
    const heroSlides = imgs.length > 0 ? imgs : [""];
    this.setData({
      product: p,
      heroSlides,
      thumbClass: thumbClassForProduct(p.id),
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
