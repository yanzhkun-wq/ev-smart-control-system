const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const mallStore = require("../../utils/mall-store.js");
const userVipStore = require("../../utils/user-vip-store.js");
const remoteUi = require("../../utils/remote-ui-config.js");
const portalCap = require("../../utils/portal-capabilities.js");

function fmtTime(ms) {
  const d = new Date(ms);
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function thumbClassForProduct(productId) {
  if (productId === "p_gw") return "tw-gw";
  if (productId === "p_ctrl") return "tw-ctrl";
  if (productId === "p_kit") return "tw-kit";
  return "tw-def";
}

function buildTimeline(o) {
  const s = o.status || "";
  const timeOrder = o.createdAt ? fmtTime(o.createdAt) : "—";
  const timeShip = o.shippedAt ? fmtTime(o.shippedAt) : "";
  const timeDel = o.deliveredAt ? fmtTime(o.deliveredAt) : "";

  const steps = [
    {
      key: "pay",
      label: "下单成功",
      sub: "订单已支付，系统已受理",
      time: timeOrder,
      state: "done",
    },
    {
      key: "prep",
      label: "仓库处理",
      sub: s === "pending_ship" ? o.lastTrace || "仓库备货中，请耐心等待" : "包裹已出库交接承运商",
      time: s === "pending_ship" ? "" : timeShip,
      state: s === "pending_ship" ? "current" : "done",
    },
    {
      key: "transit",
      label: "快递运输",
      sub:
        s === "shipping"
          ? o.lastTrace || "快件正发往目的地，请保持手机畅通"
          : s === "delivered"
            ? "快件已送达指定地址"
            : "发货后将展示运单与轨迹",
      time: s === "shipping" && timeShip ? timeShip : "",
      state: s === "shipping" ? "current" : s === "delivered" ? "done" : "todo",
    },
    {
      key: "recv",
      label: "已签收",
      sub:
        s === "delivered"
          ? o.lastTrace || "请携带设备前往「智控升级网点」完成安装"
          : "签收后可预约到店升级",
      time: timeDel,
      state: s === "delivered" ? "done" : s === "shipping" ? "todo" : "todo",
    },
  ];

  if (s === "delivered") {
    steps[2].state = "done";
    if (timeShip) steps[2].time = timeShip;
  }
  return steps;
}

function decorateOrder(o) {
  const prod = mallStore.listProducts().find((x) => x.id === o.productId);
  const orderImage = o.productMainImage || (prod && prod.mainImage) || "";
  const expressName =
    o.status === "pending_ship"
      ? o.carrier || "暂未分配 · 仓库备货中"
      : o.carrier || "—";
  const expressNo =
    o.trackingNo || (o.status === "pending_ship" ? "付款后由仓库分配运单号" : "—");
  const orig =
    o.originalAmount != null && !Number.isNaN(Number(o.originalAmount))
      ? Number(o.originalAmount)
      : Number(o.amount) || 0;
  const payNum = o.amount != null && !Number.isNaN(Number(o.amount)) ? Math.round(Number(o.amount) * 100) / 100 : 0;
  const payLine = o.usedFreeDeviceSlot ? `实付 ¥0 · 主机免单（¥${orig}）` : `实付 ¥${payNum}`;
  return {
    ...o,
    statusLabel: mallStore.statusLabel(o.status),
    timeStr: o.createdAt ? fmtTime(o.createdAt) : "—",
    payLine,
    thumbClass: thumbClassForProduct(o.productId),
    productSubtitle: (prod && prod.subtitle) || "智控硬件",
    specLine: `单价 ¥${o.unitPrice != null ? o.unitPrice : "—"} · 数量 ${o.qty != null ? o.qty : 1}`,
    timeline: buildTimeline(o),
    orderImage,
    expressName,
    expressNo,
  };
}

Page({
  data: {
    tab: 0,
    products: [],
    orders: [],
    showMallManage: false,
  },

  onLoad(options) {
    if (options.tab === "1") {
      this.setData({ tab: 1 });
    }
    this.hydrateProducts();
  },

  hydrateProducts() {
    const raw = mallStore.listShelfProducts();
    const products = raw.map((p) => ({
      ...p,
      thumbClass: thumbClassForProduct(p.id),
      tags: Array.isArray(p.tags) ? p.tags : [],
    }));
    this.setData({ products });
  },

  onShow() {
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    const hasGw = remoteUi.getMallCatalog().length > 0;
    const showMallManage =
      !hasGw && (!!p && (org.isSuperAdmin(p) || portalCap.can(p, "mall_product_manage")));
    this.setData({ showMallManage });
    this.hydrateProducts();
    this.refreshOrders();
    remoteUi.refreshFromGateway(() => {
      const hasGw2 = remoteUi.getMallCatalog().length > 0;
      const sm =
        !hasGw2 && (!!p && (org.isSuperAdmin(p) || portalCap.can(p, "mall_product_manage")));
      this.setData({ showMallManage: sm });
      this.hydrateProducts();
    });
  },

  onPullDownRefresh() {
    this.refreshOrders();
    wx.stopPullDownRefresh();
  },

  refreshOrders() {
    const s = auth.getSession();
    const p = s && s.phone ? auth.normalizePhone(s.phone) : "";
    const orders = p ? mallStore.listOrdersForUser(p).map(decorateOrder) : [];
    this.setData({ orders });
  },

  setTab(e) {
    const i = Number(e.currentTarget.dataset.i) || 0;
    this.setData({ tab: i });
    if (i === 1) this.refreshOrders();
  },

  buy(e) {
    const s = auth.getSession();
    if (!s || !s.phone) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }
    const id = e.currentTarget.dataset.id;
    const prod = mallStore.listShelfProducts().find((x) => x.id === id);
    if (!prod) return;
    this.promptCheckout(s, prod, 1);
  },

  promptCheckout(s, prod, qty) {
    const p = org.normalizePhone(s.phone);
    const ck = userVipStore.computeCheckoutAmounts(p, prod.id, prod.price, qty, false);
    const avail = userVipStore.getAvailableFreeDeviceSlots(p);
    const isDev = userVipStore.isDeviceProduct(prod.id);

    const place = (useFree) => {
      const r = mallStore.createOrder(s.phone, prod.id, qty, { useFreeDeviceSlot: !!useFree });
      if (!r.ok) {
        wx.showToast({ title: r.reason || "下单失败", icon: "none" });
        return;
      }
      wx.showModal({
        title: "下单成功",
        content: `订单号 ${r.order.id}。请在「我的订单」查看快递公司、运单号。收货后请到智控升级网点安装。`,
        confirmText: "查看订单",
        cancelText: "继续逛逛",
        success: (r2) => {
          this.refreshOrders();
          if (r2.confirm) this.setData({ tab: 1 });
        },
      });
    };

    if (isDev && avail > 0) {
      wx.showModal({
        title: "确认下单",
        content: `「${prod.name}」×${qty}，标价 ¥${ck.originalAmount}。您有 ${avail} 次设备免单资格，可选用免单实付 ¥0（演示），或原价支付以保留资格。`,
        confirmText: "使用免单",
        cancelText: "原价支付",
        success: (res) => place(res.confirm),
      });
      return;
    }

    wx.showModal({
      title: "确认购买",
      content: `「${prod.name}」¥${ck.originalAmount}/${prod.unit}（演示立即支付）。收货后请到「智控升级网点」改装。`,
      confirmText: "下单",
      success: (res) => {
        if (!res.confirm) return;
        place(false);
      },
    });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/mall-detail/mall-detail?id=${id}` });
  },

  goProductManage() {
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    if (!org.isSuperAdmin(p)) {
      wx.showToast({ title: "无权限", icon: "none" });
      return;
    }
    wx.navigateTo({ url: "/pages/mall-product-edit/mall-product-edit" });
  },

  goShops() {
    wx.navigateTo({ url: "/pages/shops/shops" });
  },

  copyOrderNo(e) {
    const no = e.currentTarget.dataset.no;
    if (!no) return;
    wx.setClipboardData({
      data: String(no),
      success: () => wx.showToast({ title: "订单号已复制", icon: "none" }),
    });
  },

  copyTracking(e) {
    const t = e.currentTarget.dataset.tracking;
    if (!t) return;
    wx.setClipboardData({
      data: String(t),
      success: () => wx.showToast({ title: "运单号已复制", icon: "none" }),
    });
  },

  contactService() {
    wx.showToast({ title: "演示版：正式环境将接入在线客服", icon: "none" });
  },

  demoShip(e) {
    const s = auth.getSession();
    if (!s || !s.phone) return;
    const id = e.currentTarget.dataset.id;
    const r = mallStore.demoMarkShipped(id, s.phone);
    if (!r.ok) {
      wx.showToast({ title: r.reason || "失败", icon: "none" });
      return;
    }
    this.refreshOrders();
    wx.showToast({ title: "已更新为运输中", icon: "none" });
  },

  demoReceive(e) {
    const s = auth.getSession();
    if (!s || !s.phone) return;
    const id = e.currentTarget.dataset.id;
    const r = mallStore.demoMarkDelivered(id, s.phone);
    if (!r.ok) {
      wx.showToast({ title: r.reason || "失败", icon: "none" });
      return;
    }
    this.refreshOrders();
    wx.showModal({
      title: "已签收（演示）",
      content: "请携带设备前往「智控升级网点」找合作商家帮忙改装与绑定。",
      showCancel: false,
    });
  },
});
