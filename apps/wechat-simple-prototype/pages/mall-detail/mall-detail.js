const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const mallStore = require("../../utils/mall-store.js");
const userVipStore = require("../../utils/user-vip-store.js");

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
    qty: 1,
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
    const p = mallStore.getProduct(id);
    if (!p) {
      wx.showToast({ title: "商品不存在", icon: "none" });
      setTimeout(() => wx.navigateBack(), 500);
      return;
    }
    if (p.published === false) {
      wx.showToast({ title: "商品已下架", icon: "none" });
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

  minusQty() {
    const q = Math.max(1, (this.data.qty || 1) - 1);
    this.setData({ qty: q });
  },

  plusQty() {
    const q = Math.min(99, (this.data.qty || 1) + 1);
    this.setData({ qty: q });
  },

  buy() {
    const s = auth.getSession();
    if (!s || !s.phone) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }
    const p = this.data.product;
    if (!p) return;
    const qty = this.data.qty || 1;
    const buyer = org.normalizePhone(s.phone);
    const ck = userVipStore.computeCheckoutAmounts(buyer, p.id, p.price, qty, false);
    const avail = userVipStore.getAvailableFreeDeviceSlots(buyer);
    const isDev = userVipStore.isDeviceProduct(p.id);

    const place = (useFree) => {
      const r = mallStore.createOrder(s.phone, p.id, qty, { useFreeDeviceSlot: !!useFree });
      if (!r.ok) {
        wx.showToast({ title: r.reason || "下单失败", icon: "none" });
        return;
      }
      wx.showModal({
        title: "下单成功",
        content: `订单号 ${r.order.id}。请在我的订单查看快递公司、运单号与物流节点。收货后请到「智控升级网点」改装。`,
        showCancel: false,
        success: () => wx.reLaunch({ url: "/pages/mall/mall?tab=1" }),
      });
    };

    if (isDev && avail > 0) {
      wx.showModal({
        title: "确认下单",
        content: `「${p.name}」×${qty}，标价 ¥${ck.originalAmount}。您有 ${avail} 次设备免单资格，可选用免单实付 ¥0（演示），或原价支付以保留资格。`,
        confirmText: "使用免单",
        cancelText: "原价支付",
        success: (res) => {
          if (!res.confirm && !res.cancel) return;
          place(res.confirm);
        },
      });
      return;
    }

    wx.showModal({
      title: "确认购买",
      content: `「${p.name}」×${qty}，合计 ¥${ck.originalAmount}（演示立即支付）。收货后请到智控升级网点安装。`,
      confirmText: "提交订单",
      success: (res) => {
        if (!res.confirm) return;
        place(false);
      },
    });
  },
});
