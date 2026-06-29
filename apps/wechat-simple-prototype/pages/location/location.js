const auth = require("../../utils/auth-store.js");
const vehicleStore = require("../../utils/vehicle-store.js");

function getCurrentVehicle() {
  return vehicleStore.getCurrentVehicleForSession(auth.getSession());
}

function saveVehicle(v) {
  const list = vehicleStore.readAll();
  const i = list.findIndex((x) => x.id === v.id);
  if (i < 0) return;
  list[i] = v;
  vehicleStore.writeAll(list);
}

Page({
  data: {
    time: "",
    address: "",
    lat: 39.90923,
    lng: 116.397428,
    latText: "39.909230",
    lngText: "116.397428",
    speed: "0",
    dir: "0",
    plate: "",
    markers: [],
  },

  onShow() {
    this._load();
  },

  _load() {
    const v = getCurrentVehicle();
    if (!v) {
      wx.showToast({ title: "请先绑定车辆", icon: "none" });
      return;
    }
    const d = new Date();
    const p = (n) => (n < 10 ? "0" + n : "" + n);
    const time = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    this.setData({
      time,
      address: v.address || "",
      lat: v.lat,
      lng: v.lng,
      latText: Number(v.lat).toFixed(6),
      lngText: Number(v.lng).toFixed(6),
      plate: v.plate,
      markers: [{ id: 1, latitude: v.lat, longitude: v.lng, title: v.plate || "车辆" }],
    });
  },

  refresh() {
    const v = getCurrentVehicle();
    if (!v) return;
    wx.showLoading({ title: "刷新中" });
    setTimeout(() => {
      wx.hideLoading();
      v.address =
        "北京市海淀区中关村大街1号 · 海淀街道 · 近地铁4号线海淀黄庄站A2口（演示：逆地理需配置腾讯/高德 key）";
      saveVehicle(v);
      this._load();
      wx.showToast({ title: "已更新", icon: "none" });
    }, 500);
  },

  goNav() {
    const { lat, lng, address } = this.data;
    wx.openLocation({
      latitude: lat,
      longitude: lng,
      name: "车辆实时位置",
      address,
      scale: 16,
    });
  },

  onShareAppMessage() {
    return {
      title: `【${this.data.plate}】实时位置：${this.data.address}`,
      path: "/pages/home/home",
    };
  },
});
