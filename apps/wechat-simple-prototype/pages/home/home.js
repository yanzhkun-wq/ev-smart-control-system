const fmtTime = () => {
  const d = new Date();
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const vehicleStore = require("../../utils/vehicle-store.js");
const platformApi = require("../../utils/ev-platform-api.js");
const remoteUi = require("../../utils/remote-ui-config.js");
const homeLayoutBlocks = require("../../utils/home-layout-blocks.js");

function openDecorLink(link) {
  const L = String(link || "").trim();
  if (!L) return;
  if (/^https?:\/\//i.test(L)) {
    wx.setClipboardData({
      data: L,
      success: () => wx.showToast({ title: "链接已复制，请在浏览器打开", icon: "none" }),
    });
    return;
  }
  let path = L.replace(/^\//, "");
  if (!path.startsWith("pages/")) path = `pages/${path}`;
  const url = path.startsWith("/") ? path : `/${path}`;
  if (path === "pages/home/home" || path === "pages/profile/profile") {
    wx.switchTab({ url });
    return;
  }
  wx.navigateTo({ url });
}

const STORAGE_LOCK_LOGS = "ev_lock_logs";

function appendLockLog(entry) {
  const list = wx.getStorageSync(STORAGE_LOCK_LOGS) || [];
  list.unshift({
    id: "l_" + Date.now(),
    ...entry,
  });
  wx.setStorageSync(STORAGE_LOCK_LOGS, list.slice(0, 200));
}

/** 近似计算两点距离（米） */
function distM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** 与围栏页一致：停车点尺度，半径 ≤50 m、超距 ≤10 m；旧数据自动钳位 */
const MIN_FENCE_RADIUS_CM = 50;
const MAX_FENCE_RADIUS_CM = 5000;
const MAX_ALARM_MARGIN_CM = 1000;
const DEFAULT_FENCE_RADIUS_CM = 2000;
const DEFAULT_ALARM_MARGIN_CM = 200;

function readFenceRadiusCm(v) {
  let x = DEFAULT_FENCE_RADIUS_CM;
  if (v.fenceRadiusCm != null) x = Math.round(Number(v.fenceRadiusCm));
  else if (v.fenceRadius != null) x = Math.round(Number(v.fenceRadius) * 100);
  return Math.min(MAX_FENCE_RADIUS_CM, Math.max(MIN_FENCE_RADIUS_CM, x));
}

function readAlarmMarginCm(v) {
  let x = DEFAULT_ALARM_MARGIN_CM;
  if (v.alarmMarginCm != null) x = Math.round(Number(v.alarmMarginCm));
  else if (v.alarmMarginMeters != null) x = Math.round(Number(v.alarmMarginMeters) * 100);
  return Math.min(MAX_ALARM_MARGIN_CM, Math.max(0, x));
}

function mStr(cm) {
  const n = Number(cm) / 100;
  return n.toFixed(n % 1 === 0 ? 0 : 1);
}

/** 首页：定位区以车辆为中心；围栏区以围栏几何中心为图心并略放大，便于看清范围 */
function previewMapFromVehicle(cur) {
  let vlat = Number(cur.lat);
  let vlng = Number(cur.lng);
  if (!Number.isFinite(vlat) || !Number.isFinite(vlng)) {
    vlat = 39.90923;
    vlng = 116.397428;
  }
  let circles = [];
  let polygons = [];
  let previewScale = 16;
  let fenceMapScale = 16;
  let fenceMapLat = vlat;
  let fenceMapLng = vlng;
  if (cur.fenceShape === "rect" && cur.rectLat1 != null && cur.rectLat2 != null) {
    const latMin = Math.min(cur.rectLat1, cur.rectLat2);
    const latMax = Math.max(cur.rectLat1, cur.rectLat2);
    const lngMin = Math.min(cur.rectLng1, cur.rectLng2);
    const lngMax = Math.max(cur.rectLng1, cur.rectLng2);
    polygons = [
      {
        points: [
          { latitude: latMin, longitude: lngMin },
          { latitude: latMin, longitude: lngMax },
          { latitude: latMax, longitude: lngMax },
          { latitude: latMax, longitude: lngMin },
        ],
        strokeWidth: 2,
        strokeColor: "#6366f1AA",
        fillColor: "#6366f118",
      },
    ];
    const diag = distM(latMin, lngMin, latMax, lngMax);
    previewScale = diag < 25 ? 18 : diag < 60 ? 17 : diag < 120 ? 16 : 15;
    fenceMapLat = (latMin + latMax) / 2;
    fenceMapLng = (lngMin + lngMax) / 2;
    fenceMapScale = diag < 18 ? 19 : diag < 45 ? 18 : diag < 90 ? 17 : 16;
  } else {
    const flat = cur.fenceLat != null ? Number(cur.fenceLat) : vlat;
    const flng = cur.fenceLng != null ? Number(cur.fenceLng) : vlng;
    const rCm = readFenceRadiusCm(cur);
    const radiusM = Math.max(rCm / 100, 0.01);
    circles = [
      {
        latitude: flat,
        longitude: flng,
        radius: radiusM,
        strokeWidth: 2,
        color: "#6366f1AA",
        fillColor: "#6366f118",
      },
    ];
    previewScale = radiusM < 8 ? 18 : radiusM < 25 ? 17 : radiusM < 60 ? 16 : 15;
    fenceMapLat = flat;
    fenceMapLng = flng;
    fenceMapScale = radiusM < 6 ? 19 : radiusM < 15 ? 18 : radiusM < 35 ? 17 : 16;
  }
  const markers = [{ id: 1, latitude: vlat, longitude: vlng, title: "车辆" }];
  return {
    previewLat: vlat,
    previewLng: vlng,
    previewScale,
    previewMarkers: markers,
    previewCircles: circles,
    previewPolygons: polygons,
    fenceMapLat,
    fenceMapLng,
    fenceMapScale,
    fenceMapMarkers: markers,
    fenceMapCircles: circles,
    fenceMapPolygons: polygons,
  };
}

function fenceSummary(cur) {
  const margin = readAlarmMarginCm(cur);
  if (cur.fenceShape === "rect" && cur.rectLat1 != null && cur.rectLat2 != null) {
    const latMin = Math.min(cur.rectLat1, cur.rectLat2);
    const latMax = Math.max(cur.rectLat1, cur.rectLat2);
    const lngMin = Math.min(cur.rectLng1, cur.rectLng2);
    const lngMax = Math.max(cur.rectLng1, cur.rectLng2);
    const diag = distM(latMin, lngMin, latMax, lngMax);
    return {
      fenceLine1: `方形 · 对角线约 ${mStr(Math.round(diag * 100))} m`,
      fenceLine2: `出圈超 ${mStr(margin)} m 告警`,
      fenceBadge: "已启用",
      fenceShapeIcon: "▢",
    };
  }
  const r = readFenceRadiusCm(cur);
  return {
    fenceLine1: `约 ${mStr(r)} m 半径`,
    fenceLine2: `圆形 · 出圈超 ${mStr(margin)} m 告警`,
    fenceBadge: "已启用",
    fenceShapeIcon: "◉",
  };
}

Page({
  data: {
    loggedIn: false,
    user: { nick: "", avatar: "" },
    bound: false,
    bindCode: "",
    bindPlate: "",
    bindTerminalPhone: "",
    boundCode: "",
    locked: true,
    vehicleLat: 39.90923,
    vehicleLng: 116.397428,
    coordText: "",
    address: "",
    lastUpdate: "",
    fenceLine1: "",
    fenceLine2: "",
    fenceBadge: "已启用",
    fenceShapeIcon: "◉",
    previewLat: 39.90923,
    previewLng: 116.397428,
    previewScale: 16,
    previewMarkers: [],
    previewCircles: [],
    previewPolygons: [],
    fenceMapLat: 39.90923,
    fenceMapLng: 116.397428,
    fenceMapScale: 16,
    fenceMapMarkers: [],
    fenceMapCircles: [],
    fenceMapPolygons: [],
    /** 定位终端是否在线（对接 808 网关后由平台写入） */
    deviceOnline: true,
    rideAllowed: true,
    rideRoleLabel: "主账号",
    /** 网关首页板块顺序（与后台拖拽一致） */
    dashboardBlocks: [],
    welcomeTipText: "",
    homeShowRemote: true,
  },

  onLoad() {
    remoteUi.init();
    this._applyHomeLayout();
  },

  _applyHomeLayout() {
    const layout = remoteUi.getHomeLayout();
    const features = remoteUi.getFeatures();
    const dashboardBlocks = homeLayoutBlocks.getDashboardBlocksForHome(layout, features);
    const welcomeTipText = remoteUi.getString("pages/home/home", "welcomeTip", "");
    const homeShowRemote = features.home_show_remote !== false;
    this.setData({
      dashboardBlocks,
      welcomeTipText,
      homeShowRemote,
    });
  },

  onDecorTap(e) {
    const link = e.currentTarget.dataset.link;
    openDecorLink(link);
  },
  _syncAuthState() {
    const session = auth.getSession();
    if (!session) {
      this.setData({
        loggedIn: false,
        rideAllowed: true,
        rideRoleLabel: "主账号",
      });
      return;
    }
    const rideAllowed = auth.isRideAllowed(session);
    const rideRoleLabel = session.role === "main" ? "主账号" : "授权用户";
    this.setData({ loggedIn: true, rideAllowed, rideRoleLabel });
  },

  onShow() {
    this._syncAuthState();
    remoteUi.refreshFromGateway(() => {
      this._applyHomeLayout();
    });
    wx.nextTick(() => {
      if (this.data.loggedIn) {
        this._hydrateFromStorage();
      }
    });
  },

  _hydrateFromStorage() {
    if (!this.data.loggedIn) return;
    const session = auth.getSession();
    const list = vehicleStore.listForSession(session);
    const curId = wx.getStorageSync(vehicleStore.STORAGE_CURRENT);
    let cur = list.find((x) => x.id === curId);
    if (!cur && list.length) {
      cur = list[0];
      wx.setStorageSync(vehicleStore.STORAGE_CURRENT, cur.id);
    }
    if (!cur) {
      this.setData({ bound: false });
      this._applyHomeLayout();
      return;
    }
    const fs = fenceSummary(cur);
    const pv = previewMapFromVehicle(cur);
    this.setData({
      bound: true,
      boundCode: cur.code,
      bindPlate: cur.plate,
      bindTerminalPhone: cur.terminalPhone || "",
      vehicleLat: cur.lat,
      vehicleLng: cur.lng,
      coordText: `${Number(cur.lng).toFixed(6)}, ${Number(cur.lat).toFixed(6)}`,
      address: cur.address || "",
      locked: cur.locked !== false,
      lastUpdate: cur.lastOpTime || "",
      deviceOnline: cur.deviceOnline !== false,
      ...fs,
      ...pv,
    });
    this._applyHomeLayout();
  },

  _getCurrentId() {
    return wx.getStorageSync(vehicleStore.STORAGE_CURRENT);
  },

  _getCurrentVehicleTerminalPhone() {
    const list = vehicleStore.readAll();
    const id = this._getCurrentId();
    const cur = list.find((x) => x.id === id);
    const t = cur && cur.terminalPhone != null ? String(cur.terminalPhone).replace(/\D/g, "") : "";
    return t.length >= 11 ? t.slice(-11) : "";
  },

  _persistPartial(patch) {
    const list = vehicleStore.readAll();
    const id = this._getCurrentId();
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return;
    list[i] = { ...list[i], ...patch };
    vehicleStore.writeAll(list);
  },

  onWxLogin() {
    wx.getUserProfile({
      desc: "用于登录小程序",
      success: (res) => {
        const u = res.userInfo || {};
        auth.ensureMainSession({ name: u.nickName || "" });
        auth.updateSessionName(u.nickName || "");
        this.setData({
          loggedIn: true,
          user: { nick: u.nickName || "微信用户", avatar: u.avatarUrl || "" },
        });
        this._syncAuthState();
        this._hydrateFromStorage();
        wx.login({
          success: () => wx.showToast({ title: "登录成功", icon: "success" }),
        });
      },
      fail: () => wx.showToast({ title: "需要授权才可继续", icon: "none" }),
    });
  },

  onSkipLoginDemo() {
    auth.ensureMainSession({ name: "" });
    this.setData({ loggedIn: true, user: { nick: "", avatar: "" } });
    this._syncAuthState();
    this._hydrateFromStorage();
    wx.showToast({ title: "已演示登录", icon: "none" });
  },

  onBindCode(e) {
    this.setData({ bindCode: e.detail.value });
  },
  onBindPlate(e) {
    this.setData({ bindPlate: e.detail.value });
  },

  onBindTerminalPhone(e) {
    this.setData({ bindTerminalPhone: e.detail.value });
  },

  onScan() {
    wx.scanCode({
      onlyFromCamera: false,
      success: (r) => {
        this.setData({ bindCode: r.result || "" });
        wx.showToast({ title: "已填入编码", icon: "none" });
      },
      fail: () => wx.showToast({ title: "扫码取消", icon: "none" }),
    });
  },

  onBindConfirm() {
    const code = (this.data.bindCode || "").trim();
    const plate = (this.data.bindPlate || "").trim();
    if (!code || !plate) {
      wx.showToast({ title: "请填写设备编码和车牌", icon: "none" });
      return;
    }
    const id = "v_" + Date.now();
    const t0 = fmtTime();
    const session = auth.getSession();
    const ownerPhone = session && session.phone ? org.normalizePhone(session.phone) : "";
    const termRaw = (this.data.bindTerminalPhone || "").trim().replace(/\D/g, "");
    const terminalPhone = termRaw.length >= 11 ? termRaw.slice(-11) : "";
    const v = {
      id,
      code,
      plate,
      ownerPhone: ownerPhone || undefined,
      terminalPhone: terminalPhone || undefined,
      lat: 39.90923,
      lng: 116.397428,
      address: "北京市海淀区中关村大街1号（海淀黄庄附近）· 鼎好大厦南侧道路",
      locked: true,
      lastOpTime: t0,
      fenceShape: "circle",
      fenceLat: 39.90923,
      fenceLng: 116.397428,
      fenceRadiusCm: DEFAULT_FENCE_RADIUS_CM,
      alarmMarginCm: DEFAULT_ALARM_MARGIN_CM,
      rectLat1: null,
      rectLng1: null,
      rectLat2: null,
      rectLng2: null,
      deviceOnline: true,
    };
    const list = vehicleStore.readAll();
    list.push(v);
    vehicleStore.writeAll(list);
    wx.setStorageSync(vehicleStore.STORAGE_CURRENT, id);
    const fs = fenceSummary(v);
    const pv = previewMapFromVehicle(v);
    this.setData({
      bound: true,
      boundCode: code,
      bindPlate: plate,
      bindTerminalPhone: terminalPhone,
      vehicleLat: v.lat,
      vehicleLng: v.lng,
      coordText: `${Number(v.lng).toFixed(6)}, ${Number(v.lat).toFixed(6)}`,
      address: v.address,
      locked: true,
      lastUpdate: t0,
      deviceOnline: true,
      ...fs,
      ...pv,
    });
    wx.showToast({ title: "绑定成功", icon: "success" });
    if (platformApi.getApiBase() && terminalPhone) {
      platformApi.bindOnServer(terminalPhone, plate).catch(() => {
        wx.showToast({ title: "平台同步失败", icon: "none" });
      });
    }
  },

  goVehicleManage() {
    wx.navigateTo({ url: "/pages/vehicle-manage/vehicle-manage" });
  },

  goLocation() {
    wx.navigateTo({ url: "/pages/location/location" });
  },

  goFenceEdit() {
    wx.navigateTo({ url: "/pages/fence-edit/fence-edit" });
  },

  onUnlock() {
    if (this.data.bound && !this.data.rideAllowed) {
      wx.showToast({ title: "暂无用车权限", icon: "none" });
      return;
    }
    const t = fmtTime();
    this.setData({ locked: false, lastUpdate: t });
    this._persistPartial({ locked: false, lastOpTime: t });
    const tp = this._getCurrentVehicleTerminalPhone();
    if (platformApi.getApiBase() && tp) {
      platformApi.sendTerminalCommand(tp, "unlock").catch((e) => {
        wx.showToast({
          title: (e && e.message) || "平台解锁失败（已改本机状态）",
          icon: "none",
        });
      });
    }
    appendLockLog({
      action: "unlock",
      actionLabel: "远程解锁",
      operator: this.data.user.nick || "演示用户",
      role: this.data.rideRoleLabel || "当前登录用户",
      plate: this.data.bindPlate || "—",
      vehicleId: this._getCurrentId(),
      time: t,
      address: this.data.address || "位置待设备上报",
      source: "小程序 · 车辆首页",
      result: "成功",
      detail: "演示：正式环境将附带终端应答码与上报经纬度",
    });
    wx.showToast({ title: "已开锁", icon: "none" });
  },

  onLock() {
    if (this.data.bound && !this.data.rideAllowed) {
      wx.showToast({ title: "暂无用车权限", icon: "none" });
      return;
    }
    const t = fmtTime();
    this.setData({ locked: true, lastUpdate: t });
    this._persistPartial({ locked: true, lastOpTime: t });
    const tp = this._getCurrentVehicleTerminalPhone();
    if (platformApi.getApiBase() && tp) {
      platformApi.sendTerminalCommand(tp, "lock").catch((e) => {
        wx.showToast({
          title: (e && e.message) || "平台上锁失败（已改本机状态）",
          icon: "none",
        });
      });
    }
    appendLockLog({
      action: "lock",
      actionLabel: "远程关锁",
      operator: this.data.user.nick || "演示用户",
      role: this.data.rideRoleLabel || "当前登录用户",
      plate: this.data.bindPlate || "—",
      vehicleId: this._getCurrentId(),
      time: t,
      address: this.data.address || "位置待设备上报",
      source: "小程序 · 车辆首页",
      result: "成功",
      detail: "演示：正式环境将附带终端应答码与上报经纬度",
    });
    wx.showToast({ title: "已关锁", icon: "none" });
  },
});
