/**
 * 兼容硬件参考 —— 帮助用户了解与平台兼容的硬件设备
 * 本软件免费开源，硬件需用户自行购买，我们不销售任何硬件
 */

const HARDWARE_LIST = [
  {
    id: "p_gw",
    name: "4G 车载智能终端",
    subtitle: "部标 808 · 远程锁车 · 官方推荐",
    desc: "北斗/GPS 双模，远程锁车，含首年流量（仅供参考，以终端厂家为准）。",
    tags: ["推荐"],
  },
  {
    id: "p_ctrl",
    name: "智能中控一体机",
    subtitle: "仪表联动 · 支持 OTA",
    desc: "状态采集与远程控制扩展，具体车型请咨询厂家。",
    tags: ["扩展"],
  },
  {
    id: "p_kit",
    name: "智控改装套件",
    subtitle: "线束 · 支架 · 防水组件",
    desc: "标准化辅材包，建议与终端一并使用。",
    tags: ["配件"],
  },
];

Page({
  data: {
    hardwareList: [],
    hasMore: false,
    loading: true,
  },

  onShow() {
    this.setData({
      hardwareList: HARDWARE_LIST,
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
