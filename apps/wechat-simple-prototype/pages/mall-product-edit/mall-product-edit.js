const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const mallStore = require("../../utils/mall-store.js");
const remoteUi = require("../../utils/remote-ui-config.js");
const portalCap = require("../../utils/portal-capabilities.js");

function thumbClassForProduct(productId) {
  if (productId === "p_gw") return "tw-gw";
  if (productId === "p_ctrl") return "tw-ctrl";
  if (productId === "p_kit") return "tw-kit";
  return "tw-def";
}

Page({
  data: {
    products: [],
  },

  onShow() {
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    const hasGw = remoteUi.getMallCatalog().length > 0;
    if (hasGw) {
      wx.showToast({ title: "商品已在 PC 管理端发布", icon: "none" });
      setTimeout(() => {
        const stack = getCurrentPages();
        if (stack.length > 1) wx.navigateBack();
        else wx.reLaunch({ url: "/pages/mall/mall" });
      }, 600);
      return;
    }
    if (!org.isSuperAdmin(p) && !portalCap.can(p, "mall_product_manage")) {
      wx.showToast({ title: "无商城管理权限", icon: "none" });
      setTimeout(() => {
        const stack = getCurrentPages();
        if (stack.length > 1) wx.navigateBack();
        else wx.reLaunch({ url: "/pages/profile/profile" });
      }, 600);
      return;
    }
    const raw = mallStore.listProducts();
    this.setData({
      products: raw.map((x) => ({
        ...x,
        thumbClass: thumbClassForProduct(x.id),
        tags: Array.isArray(x.tags) ? x.tags : [],
      })),
    });
  },

  openForm(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/mall-product-form/mall-product-form?id=${id}` });
  },
});
