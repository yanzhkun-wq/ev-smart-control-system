const HARDWARE_MAP = {
  p_gw: {
    id: "p_gw",
    name: "4G 车载智能终端",
    subtitle: "部标 808 · 远程锁车 · 官方推荐",
    desc: "北斗/GPS 双模定位，支持远程锁车/解锁，含首年流量。",
    detail: "【产品概述】\n面向电动两轮/三轮车的 4G 车载智能终端，支持部标 808 协议接入智控平台，实现定位、轨迹、围栏与远程控车能力。\n\n【包装清单】\n主机 ×1、线束套件 ×1、说明书 ×1。\n\n【注意事项】\n具体安装请咨询设备厂家或专业网点。",
    mainImage: "",
    gallery: [],
    tags: ["推荐"],
  },
  p_ctrl: {
    id: "p_ctrl",
    name: "智能中控一体机",
    subtitle: "仪表联动 · 支持 OTA",
    desc: "状态采集与远程控制扩展，具体车型请咨询厂家。",
    detail: "【产品概述】\n智能中控扩展单元，可与仪表/车身总线对接（视车型协议而定），用于丰富人机交互与远程控制场景。",
    mainImage: "",
    gallery: [],
    tags: ["扩展"],
  },
  p_kit: {
    id: "p_kit",
    name: "智控改装套件",
    subtitle: "线束 · 支架 · 防水组件",
    desc: "标准化辅材包，建议与终端一并使用。",
    detail: "【产品概述】\n改装施工常用辅材组合，含延长线、扎带、固定支架与防水套件。\n\n【适用】\n与 4G 终端、中控等主设备配套使用。",
    mainImage: "",
    gallery: [],
    tags: ["配件"],
  },
};

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
    const p = HARDWARE_MAP[id];
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
