/**
 * 兼容硬件信息 —— 帮助用户了解与平台兼容的硬件设备
 * 注意：本软件完全免费开源，硬件需用户自行购买，我们不销售任何硬件
 */

const auth = require("./auth-store.js");

const PRODUCTS_KEY = "ev_hardware_info";

const COMPATIBLE_HARDWARE = [
  {
    id: "p_gw",
    name: "4G 车载智能终端（兼容设备示例）",
    subtitle: "JT/T808 协议 · GPS/北斗双模",
    desc: "支持 JT/T808 协议的 4G 车载定位终端，可接入本平台实现定位、轨迹、围栏与远程控制。",
    detail:
      "【兼容说明】\n本平台基于国标 JT/T808 协议开发，理论上兼容所有支持该协议的 4G 车载终端。\n\n"
      + "【选购建议】\n请在电商平台搜索「JT/T808 车载终端」「电动车 GPS 定位器」等关键词，\n"
      + "购买前确认设备支持 TCP 协议接入，并支持自定义服务器 IP/端口。\n\n"
      + "【免责声明】\n本平台不销售任何硬件，仅提供软件服务。硬件兼容性以实际测试为准。",
    mainImage: "",
    gallery: [],
    tags: ["JT/T808", "推荐协议"],
  },
  {
    id: "p_ctrl",
    name: "智能中控模块（兼容设备示例）",
    subtitle: "远程控车 · OTA 升级",
    desc: "支持远程锁车/解锁的中控扩展模块，需确认车型兼容性。",
    detail:
      "【兼容说明】\n远程控制功能需要硬件支持，不同车型/终端能力不同。\n"
      + "购买前请联系硬件厂商确认是否支持远程锁车/解锁指令。\n\n"
      + "【免责声明】\n本平台不销售任何硬件。",
    mainImage: "",
    gallery: [],
    tags: ["远程控制"],
  },
];

function listHardware() {
  return COMPATIBLE_HARDWARE;
}

function getHardware(id) {
  return COMPATIBLE_HARDWARE.find((x) => x.id === id) || null;
}

module.exports = {
  listHardware,
  getHardware,
  listProducts: listHardware,    // 兼容旧调用
  listShelfProducts: listHardware,
  getProduct: getHardware,
};
