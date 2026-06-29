/**
 * 智控商城：演示本机商品、订单与物流；正式环境对接电商与物流接口
 */

const auth = require("./auth-store.js");
const userVipStore = require("./user-vip-store.js");
const remoteUi = require("./remote-ui-config.js");

const ORDERS_KEY = "ev_mall_orders";
const PRODUCTS_KEY = "ev_mall_products";

const DEFAULT_PRODUCTS = [
  {
    id: "p_gw",
    name: "4G 车载智能终端",
    subtitle: "部标 808 · 远程锁车 · 官方标配",
    price: 399,
    unit: "套",
    desc: "北斗/GPS 双模，远程锁车，含首年流量（演示）。",
    detail:
      "【产品概述】\n面向电动两轮/三轮车的 4G 车载智能终端，支持部标 808 协议接入智控平台，实现定位、轨迹、围栏与远程控车能力（以终端与车型适配为准）。\n\n【包装清单】\n主机 ×1、线束套件 ×1、说明书 ×1（演示）。\n\n【安装说明】\n须由「智控升级网点」专业人员安装调试；私自拆改可能影响功能与质保。\n\n【售后】\n演示环境不具法律效力，以正式平台规则为准。",
    mainImage: "",
    gallery: [],
    tags: ["官方", "热销"],
  },
  {
    id: "p_ctrl",
    name: "智能中控一体机",
    subtitle: "仪表联动 · 支持 OTA",
    price: 259,
    unit: "台",
    desc: "状态采集与远程控制扩展，具体车型请咨询网点。",
    detail:
      "【产品概述】\n智能中控扩展单元，可与仪表/车身总线对接（视车型协议而定），用于丰富人机交互与远程控制场景。\n\n【注意事项】\n不同车型线束与固定支架可能不同，下单前建议在智控升级网点确认适配方案。\n\n【安装】\n仅限合作网点施工，确保绝缘与防水符合规范。",
    mainImage: "",
    gallery: [],
    tags: ["新品"],
  },
  {
    id: "p_kit",
    name: "智控改装套件",
    subtitle: "线束 · 支架 · 防水组件",
    price: 128,
    unit: "套",
    desc: "标准化辅材包，建议与终端一并购买。",
    detail:
      "【产品概述】\n改装施工常用辅材组合，含延长线、扎带、固定支架与防水套件（演示配置）。\n\n【适用】\n与 4G 终端、中控等主设备配套使用，具体数量以网点清单为准。\n\n【提示】\n不包含主机；运输易损，签收请当面验货。",
    mainImage: "",
    gallery: [],
    tags: ["配件"],
  },
];

function normalizeGatewayRow(r) {
  if (!r || typeof r !== "object" || !r.id) return null;
  const id = String(r.id).trim();
  const name = String(r.name || "").trim();
  if (!id || !name) return null;
  const price = Number(r.price);
  if (!Number.isFinite(price) || price < 0) return null;
  return {
    id,
    name,
    subtitle: typeof r.subtitle === "string" ? r.subtitle : "",
    price,
    unit: typeof r.unit === "string" && r.unit ? r.unit : "件",
    desc: typeof r.desc === "string" ? r.desc : "",
    detail: typeof r.detail === "string" ? r.detail : "",
    mainImage: typeof r.mainImage === "string" ? r.mainImage : "",
    gallery: Array.isArray(r.gallery) ? r.gallery.map(String) : [],
    tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
    published: r.published === false ? false : true,
    sortOrder: Number.isFinite(Number(r.sortOrder)) ? Number(r.sortOrder) : 0,
  };
}

function mergeGatewayCatalog(localList) {
  const gw = remoteUi.getMallCatalog();
  if (!Array.isArray(gw) || gw.length === 0) return localList;
  const map = new Map();
  for (const p of localList) {
    if (p && p.id)
      map.set(String(p.id), {
        ...p,
        gallery: (p.gallery || []).slice(),
        tags: (p.tags || []).slice(),
      });
  }
  for (const row of gw) {
    const n = normalizeGatewayRow(row);
    if (!n) continue;
    const prev = map.get(n.id) || {};
    map.set(n.id, {
      ...prev,
      ...n,
      gallery: n.gallery.slice(),
      tags: n.tags.slice(),
    });
  }
  return Array.from(map.values()).sort((a, b) => {
    const sa = Number(a.sortOrder) || 0;
    const sb = Number(b.sortOrder) || 0;
    if (sa !== sb) return sa - sb;
    return String(a.id).localeCompare(String(b.id));
  });
}

function gatewayCatalogActive() {
  const gw = remoteUi.getMallCatalog();
  return Array.isArray(gw) && gw.length > 0;
}

function normalizePhone(p) {
  return auth.normalizePhone(p);
}

function readOrders() {
  return wx.getStorageSync(ORDERS_KEY) || [];
}

function writeOrders(list) {
  wx.setStorageSync(ORDERS_KEY, list);
}

/** 订单号：ZK + 下单年月日时分秒 + 3 位随机数 */
function genOrderNo() {
  const d = new Date();
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  const y = d.getFullYear();
  const mo = p(d.getMonth() + 1);
  const day = p(d.getDate());
  const h = p(d.getHours());
  const mi = p(d.getMinutes());
  const s = p(d.getSeconds());
  const rnd = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `ZK${y}${mo}${day}${h}${mi}${s}${rnd}`;
}

function readProductsRaw() {
  let stored = wx.getStorageSync(PRODUCTS_KEY);
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    writeProducts(DEFAULT_PRODUCTS.map((x) => ({ ...x, gallery: (x.gallery || []).slice() })));
    stored = wx.getStorageSync(PRODUCTS_KEY);
  }
  const byId = {};
  stored.forEach((p) => {
    if (p && p.id) byId[p.id] = p;
  });
  DEFAULT_PRODUCTS.forEach((def) => {
    if (!byId[def.id]) {
      byId[def.id] = { ...def, gallery: (def.gallery || []).slice() };
    } else {
      byId[def.id] = {
        ...def,
        ...byId[def.id],
        id: def.id,
        gallery: Array.isArray(byId[def.id].gallery) ? byId[def.id].gallery : [],
        tags: Array.isArray(byId[def.id].tags) ? byId[def.id].tags : def.tags || [],
      };
    }
  });
  const localList = DEFAULT_PRODUCTS.map((def) => byId[def.id]).filter(Boolean);
  return mergeGatewayCatalog(localList);
}

function writeProducts(list) {
  wx.setStorageSync(PRODUCTS_KEY, list);
}

function listProducts() {
  return readProductsRaw();
}

/** C 端商城列表：仅上架 */
function listShelfProducts() {
  return readProductsRaw().filter((p) => p.published !== false);
}

function getProduct(id) {
  return readProductsRaw().find((x) => x.id === id) || null;
}

function saveProduct(product) {
  if (gatewayCatalogActive()) {
    return { ok: false, reason: "商品由 PC 管理端发布，请在后台「智控商城」修改" };
  }
  const list = readProductsRaw();
  const i = list.findIndex((x) => x.id === product.id);
  if (i < 0) return { ok: false, reason: "商品不存在" };
  list[i] = {
    ...list[i],
    ...product,
    id: list[i].id,
    gallery: Array.isArray(product.gallery) ? product.gallery : list[i].gallery || [],
    tags: Array.isArray(product.tags) ? product.tags : list[i].tags || [],
  };
  writeProducts(list);
  return { ok: true };
}

function listOrdersForUser(phone) {
  const p = normalizePhone(phone);
  if (!p) return [];
  return readOrders()
    .filter((o) => o.userPhone === p)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function statusLabel(status) {
  if (status === "pending_ship") return "待发货";
  if (status === "shipping") return "运输中";
  if (status === "delivered") return "已签收";
  return status || "—";
}

function createOrder(phone, productId, qty, options) {
  const opt = options && typeof options === "object" ? options : {};
  const useFreeSlot = !!opt.useFreeDeviceSlot;
  const p = normalizePhone(phone);
  const prod = getProduct(productId);
  if (!p || !prod) return { ok: false, reason: "商品或账号无效" };
  if (prod.published === false) return { ok: false, reason: "商品已下架" };
  const q = Math.max(1, Math.min(99, Math.round(Number(qty) || 1)));
  const ck = userVipStore.computeCheckoutAmounts(p, prod.id, prod.price, q, useFreeSlot);
  const amount = ck.payAmount;
  const originalAmount = ck.originalAmount;
  const now = Date.now();
  const order = {
    id: genOrderNo(),
    userPhone: p,
    productId: prod.id,
    productName: prod.name,
    productMainImage: prod.mainImage || "",
    unitPrice: prod.price,
    qty: q,
    amount,
    originalAmount,
    usedFreeDeviceSlot: !!ck.willUseFreeSlot,
    status: "pending_ship",
    carrier: "",
    trackingNo: "",
    lastTrace: ck.willUseFreeSlot ? "设备免单资格抵扣（演示），仓库备货中" : "订单已支付，仓库备货中（演示）",
    createdAt: now,
    paidAt: now,
    shippedAt: null,
    deliveredAt: null,
  };
  const all = readOrders();
  all.unshift(order);
  writeOrders(all);
  if (order.usedFreeDeviceSlot) {
    userVipStore.confirmFreeSlotConsumed(p);
  }
  userVipStore.onMallOrderCreated(order);
  return { ok: true, order };
}

function updateOrder(id, phone, patch) {
  const p = normalizePhone(phone);
  const all = readOrders();
  const i = all.findIndex((o) => o.id === id && o.userPhone === p);
  if (i < 0) return { ok: false, reason: "订单不存在" };
  all[i] = { ...all[i], ...patch };
  writeOrders(all);
  return { ok: true, order: all[i] };
}

function demoMarkShipped(id, phone) {
  const now = Date.now();
  return updateOrder(id, phone, {
    status: "shipping",
    carrier: "顺丰速运",
    trackingNo: "SF" + String(now).slice(-12),
    lastTrace: "快件已从仓库发出，请注意查收（演示）",
    shippedAt: now,
  });
}

function demoMarkDelivered(id, phone) {
  const now = Date.now();
  return updateOrder(id, phone, {
    status: "delivered",
    lastTrace: "快件已签收，请携带设备前往智控升级网点改装（演示）",
    deliveredAt: now,
  });
}

module.exports = {
  ORDERS_KEY,
  PRODUCTS_KEY,
  listProducts,
  listShelfProducts,
  getProduct,
  saveProduct,
  listOrdersForUser,
  createOrder,
  statusLabel,
  demoMarkShipped,
  demoMarkDelivered,
};
