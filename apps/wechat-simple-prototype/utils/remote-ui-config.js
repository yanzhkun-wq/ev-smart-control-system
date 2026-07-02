/**
 * 从设备网关拉取 /api/miniapp-ui，供各页动态标题与 strings。
 */
const CACHE_KEY = "ev_remote_miniapp_ui_v5";

const mem = {
  pages: [],
  homeLayout: null,
  features: {},
  alarmSubscribeTmplIds: [],
  miniappWxAppId: "",
  fetchedAt: 0,
};

function normRoute(r) {
  return String(r || "").replace(/^\//, "");
}

function loadCache() {
  try {
    const raw = wx.getStorageSync(CACHE_KEY);
    if (raw && raw.pages && Array.isArray(raw.pages)) {
      mem.pages = raw.pages;
      mem.fetchedAt = raw.fetchedAt || 0;
      if (raw.homeLayout && typeof raw.homeLayout === "object") {
        mem.homeLayout = raw.homeLayout;
      }
      if (raw.features && typeof raw.features === "object") {
        mem.features = raw.features;
      }
      if (Array.isArray(raw.alarmSubscribeTmplIds)) {
        mem.alarmSubscribeTmplIds = raw.alarmSubscribeTmplIds;
      }
      if (typeof raw.miniappWxAppId === "string") {
        mem.miniappWxAppId = raw.miniappWxAppId;
      }
    }
  } catch (e) {
    /* ignore */
  }
}

function saveCache() {
  try {
    wx.setStorageSync(CACHE_KEY, {
      pages: mem.pages,
      homeLayout: mem.homeLayout,
      features: mem.features,
      alarmSubscribeTmplIds: mem.alarmSubscribeTmplIds,
      miniappWxAppId: mem.miniappWxAppId,
      fetchedAt: mem.fetchedAt,
    });
  } catch (e) {
    /* ignore */
  }
}

function getApiBase() {
  const a = wx.getStorageSync("ev-admin-gateway-api-base");
  if (a && typeof a === "string" && a.trim()) return a.trim().replace(/\/$/, "");
  const b = wx.getStorageSync("ev_gateway_api_base");
  if (b && typeof b === "string" && b.trim()) return b.trim().replace(/\/$/, "");
  return "http://127.0.0.1:7612";
}

function getGatewayBase() {
  return getApiBase();
}

function init() {
  loadCache();
}

function refreshFromGateway(done) {
  const base = getApiBase();
  wx.request({
    url: `${base}/api/miniapp-ui`,
    timeout: 8000,
    success(res) {
      if (res.statusCode === 200 && res.data && Array.isArray(res.data.pages)) {
        mem.pages = res.data.pages;
        mem.fetchedAt = Date.now();
        if (res.data.homeLayout && typeof res.data.homeLayout === "object") {
          mem.homeLayout = res.data.homeLayout;
        } else {
          mem.homeLayout = null;
        }
        if (res.data.features && typeof res.data.features === "object") {
          mem.features = res.data.features;
        }
        if (Array.isArray(res.data.alarmSubscribeTmplIds)) {
          mem.alarmSubscribeTmplIds = res.data.alarmSubscribeTmplIds;
        } else {
          mem.alarmSubscribeTmplIds = [];
        }
        if (typeof res.data.miniappWxAppId === "string") {
          mem.miniappWxAppId = res.data.miniappWxAppId;
        } else {
          mem.miniappWxAppId = "";
        }
        saveCache();
      }
    },
    complete() {
      if (typeof done === "function") done();
    },
  });
}

function getRow(route) {
  const r = normRoute(route);
  return mem.pages.find((p) => normRoute(p.route) === r);
}

module.exports = {
  init,
  refreshFromGateway,
  getGatewayBase,
  getRow,
  getString(route, key, fallback) {
    const row = getRow(route);
    const v = row && row.strings && row.strings[key];
    return v != null && String(v).length ? String(v) : fallback;
  },
  getHomeLayout() {
    return mem.homeLayout;
  },
  getFeatures() {
    return mem.features && typeof mem.features === "object" ? mem.features : {};
  },
  getAlarmSubscribeTmplIds() {
    return Array.isArray(mem.alarmSubscribeTmplIds) ? mem.alarmSubscribeTmplIds : [];
  },
  getMiniappWxAppId() {
    return typeof mem.miniappWxAppId === "string" ? mem.miniappWxAppId : "";
  },
  applyNavForPage(route) {
    try {
      const row = getRow(route);
      if (!row) return;
      if (row.enabled === false) {
        wx.showToast({ title: "该页面已在后台关闭，请联系管理员", icon: "none", duration: 2500 });
        return;
      }
      if (row.navigationBarTitle) {
        const t = String(row.navigationBarTitle).trim();
        if (t) wx.setNavigationBarTitle({ title: t });
      }
    } catch (e) {
      console.warn("[remoteUi] applyNavForPage", e);
    }
  },
};
