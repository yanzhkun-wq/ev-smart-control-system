const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const mallStore = require("../../utils/mall-store.js");
const remoteUi = require("../../utils/remote-ui-config.js");
const portalCap = require("../../utils/portal-capabilities.js");

Page({
  data: {
    loaded: false,
    productId: "",
    mainImage: "",
    name: "",
    subtitle: "",
    price: "",
    unit: "",
    tagsStr: "",
    desc: "",
    detail: "",
  },

  onLoad(options) {
    const s = auth.getSession();
    const ph = s && s.phone ? org.normalizePhone(s.phone) : "";
    const hasGw = remoteUi.getMallCatalog().length > 0;
    if (hasGw) {
      wx.showToast({ title: "请在 PC 管理端修改商品", icon: "none" });
      setTimeout(() => wx.navigateBack(), 500);
      return;
    }
    if (!org.isSuperAdmin(ph) && !portalCap.can(ph, "mall_product_manage")) {
      wx.showToast({ title: "无商城管理权限", icon: "none" });
      setTimeout(() => wx.navigateBack(), 500);
      return;
    }
    const id = options.id || "";
    if (!id) {
      wx.showToast({ title: "参数错误", icon: "none" });
      setTimeout(() => wx.navigateBack(), 400);
      return;
    }
    const p = mallStore.getProduct(id);
    if (!p) {
      wx.showToast({ title: "商品不存在", icon: "none" });
      setTimeout(() => wx.navigateBack(), 400);
      return;
    }
    this.setData({
      loaded: true,
      productId: id,
      mainImage: p.mainImage || "",
      name: p.name || "",
      subtitle: p.subtitle || "",
      price: p.price != null ? String(p.price) : "",
      unit: p.unit || "",
      tagsStr: Array.isArray(p.tags) ? p.tags.join(",") : "",
      desc: p.desc || "",
      detail: p.detail || "",
    });
  },

  pickMain() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sizeType: ["compressed"],
      success: (res) => {
        const temp = res.tempFiles[0].tempFilePath;
        wx.saveFile({
          tempFilePath: temp,
          success: (r) => this.setData({ mainImage: r.savedFilePath }),
          fail: () => this.setData({ mainImage: temp }),
        });
      },
    });
  },

  onName(e) {
    this.setData({ name: e.detail.value });
  },
  onSubtitle(e) {
    this.setData({ subtitle: e.detail.value });
  },
  onPrice(e) {
    this.setData({ price: e.detail.value });
  },
  onUnit(e) {
    this.setData({ unit: e.detail.value });
  },
  onTags(e) {
    this.setData({ tagsStr: e.detail.value });
  },
  onDesc(e) {
    this.setData({ desc: e.detail.value });
  },
  onDetail(e) {
    this.setData({ detail: e.detail.value });
  },

  save() {
    const id = this.data.productId;
    const priceNum = Number(this.data.price);
    if (!this.data.name.trim()) {
      wx.showToast({ title: "请填写名称", icon: "none" });
      return;
    }
    if (!priceNum || priceNum <= 0) {
      wx.showToast({ title: "请填写有效价格", icon: "none" });
      return;
    }
    const tags = String(this.data.tagsStr || "")
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const p = mallStore.getProduct(id);
    const r = mallStore.saveProduct({
      ...p,
      id,
      mainImage: this.data.mainImage || "",
      name: this.data.name.trim(),
      subtitle: this.data.subtitle.trim(),
      price: Math.round(priceNum * 100) / 100,
      unit: (this.data.unit || "件").trim(),
      tags,
      desc: this.data.desc.trim(),
      detail: this.data.detail.trim(),
    });
    if (!r.ok) {
      wx.showToast({ title: r.reason || "保存失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已保存", icon: "success" });
    setTimeout(() => wx.navigateBack(), 500);
  },
});
