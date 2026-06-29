const merchantStore = require("../../utils/merchant-store.js");

const DISTANCE_MAX_METERS = [null, 3000, 5000, 10000];

Page({
  data: {
    shops: [],
    allSorted: [],
    locLabel: "定位中…",
    locDenied: false,
    userLat: null,
    userLng: null,
    districtLabels: ["全部"],
    districtIndex: 0,
    distanceLabels: ["不限", "3 km 内", "5 km 内", "10 km 内"],
    distanceIndex: 0,
  },

  onShow() {
    this.loadShops();
  },

  refreshLocation() {
    this.loadShops();
  },

  buildDistrictLabels(shops) {
    const set = new Set();
    (shops || []).forEach((s) => {
      if (s.district) set.add(s.district);
    });
    return ["全部", ...Array.from(set).sort()];
  },

  loadShops() {
    wx.getLocation({
      type: "gcj02",
      success: (res) => {
        const lat = res.latitude;
        const lng = res.longitude;
        const allSorted = merchantStore.listShopsForUser(lat, lng, "");
        const districtLabels = this.buildDistrictLabels(allSorted);
        let districtIndex = this.data.districtIndex;
        if (districtIndex >= districtLabels.length) districtIndex = 0;
        this.setData(
          {
            userLat: lat,
            userLng: lng,
            locDenied: false,
            locLabel: `已定位 · ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            allSorted,
            districtLabels,
            districtIndex,
          },
          () => this.applyFilters()
        );
      },
      fail: () => {
        const allSorted = merchantStore.listShopsForUser(null, null, "");
        const districtLabels = this.buildDistrictLabels(allSorted);
        let districtIndex = this.data.districtIndex;
        if (districtIndex >= districtLabels.length) districtIndex = 0;
        this.setData(
          {
            userLat: null,
            userLng: null,
            locDenied: true,
            locLabel: "未获取位置 · 距离筛选需先定位",
            allSorted,
            districtLabels,
            districtIndex,
            distanceIndex: 0,
          },
          () => this.applyFilters()
        );
      },
    });
  },

  onDistrictChange(e) {
    const idx = Number(e.detail.value);
    this.setData({ districtIndex: idx }, () => this.applyFilters());
  },

  onDistanceChange(e) {
    if (this.data.locDenied) {
      wx.showToast({ title: "请先更新定位以使用距离筛选", icon: "none" });
      this.setData({ distanceIndex: 0 });
      return;
    }
    const idx = Number(e.detail.value);
    this.setData({ distanceIndex: idx }, () => this.applyFilters());
  },

  applyFilters() {
    const allSorted = this.data.allSorted || [];
    let list = allSorted.slice();
    const dlab = this.data.districtLabels[this.data.districtIndex];
    if (dlab && dlab !== "全部") {
      list = list.filter((s) => s.district === dlab);
    }
    const dIdx = this.data.distanceIndex || 0;
    const maxM = DISTANCE_MAX_METERS[dIdx];
    if (maxM != null && this.data.userLat != null && this.data.userLng != null) {
      list = list.filter((s) => s.distanceM != null && s.distanceM <= maxM);
    }
    this.setData({ shops: list });
  },

  callShop(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) return;
    wx.makePhoneCall({ phoneNumber: String(phone) });
  },

  openMap(e) {
    const id = e.currentTarget.dataset.id;
    const item = (this.data.shops || []).find((s) => s.id === id);
    if (!item || item.lat == null || item.lng == null) {
      wx.showToast({ title: "暂无坐标", icon: "none" });
      return;
    }
    wx.openLocation({
      latitude: Number(item.lat),
      longitude: Number(item.lng),
      name: item.shopName || "智控升级网点",
      address: item.addressFull || "",
    });
  },
});
