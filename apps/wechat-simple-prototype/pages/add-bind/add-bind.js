const fmtTime = () => {
  const d = new Date();
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const vehicleStore = require("../../utils/vehicle-store.js");

Page({
  data: {
    bindCode: "",
    bindPlate: "",
  },

  onLoad() {
    this._applyScanPrefill();
  },

  onShow() {
    this._applyScanPrefill();
  },

  _applyScanPrefill() {
    const code = wx.getStorageSync("ev_scan_prefill_code");
    if (code) {
      wx.removeStorageSync("ev_scan_prefill_code");
      this.setData({ bindCode: String(code) });
    }
  },

  onBindCode(e) {
    this.setData({ bindCode: e.detail.value });
  },
  onBindPlate(e) {
    this.setData({ bindPlate: e.detail.value });
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

  onConfirm() {
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
    const v = {
      id,
      code,
      plate,
      ownerPhone: ownerPhone || undefined,
      lat: 39.90923,
      lng: 116.397428,
      address: "北京市海淀区中关村大街1号（海淀黄庄附近）· 鼎好大厦南侧道路",
      locked: true,
      lastOpTime: t0,
      fenceShape: "circle",
      fenceLat: 39.90923,
      fenceLng: 116.397428,
      fenceRadiusCm: 2000,
      alarmMarginCm: 200,
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
    wx.showToast({ title: "绑定成功", icon: "success" });
    setTimeout(() => wx.navigateBack(), 500);
  },
});
