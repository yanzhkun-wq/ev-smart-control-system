const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const userVipStore = require("../../utils/user-vip-store.js");
const vehicleStore = require("../../utils/vehicle-store.js");

function getCurrentVehicle() {
  return vehicleStore.getCurrentVehicleForSession(auth.getSession());
}

function persistVehicle(v) {
  const list = vehicleStore.readAll();
  const i = list.findIndex((x) => x.id === v.id);
  if (i < 0) return;
  list[i] = v;
  vehicleStore.writeAll(list);
}

/** 两点球面距离（米） */
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

function circleTip(step) {
  if (step === 0) return "第 1 步：点击地图确定圆心。";
  if (step === 1) return "第 2 步：再点击圆周上任意一点，确定圈的大小。";
  return "圆圈已画好；可拖滑块微调半径，或点「重新画圈」从零开始。";
}

/** 电动车停车点围栏：半径约 0.5～50 m；超距告警 0～10 m */
const MIN_RADIUS_CM = 50;
const MAX_RADIUS_CM = 5000;
const MAX_MARGIN_CM = 1000;
const DEFAULT_FENCE_RADIUS_CM = 2000;
const DEFAULT_ALARM_MARGIN_CM = 200;
/** 手绘方形：包络对角线最短约 8 m，避免误触 */
const MIN_RECT_DIAG_M = 8;

function stripLegacyMetersFields(obj) {
  const o = { ...obj };
  delete o.fenceRadius;
  delete o.alarmMarginMeters;
  return o;
}

/** 与首页一致；旧数据超大值会钳位到产品上限（停车点尺度，非几千米） */
function readFenceRadiusCm(v) {
  let x = DEFAULT_FENCE_RADIUS_CM;
  if (v.fenceRadiusCm != null) x = Math.round(Number(v.fenceRadiusCm));
  else if (v.fenceRadius != null) x = Math.round(Number(v.fenceRadius) * 100);
  return Math.min(MAX_RADIUS_CM, Math.max(MIN_RADIUS_CM, x));
}

function readAlarmMarginCm(v) {
  let x = DEFAULT_ALARM_MARGIN_CM;
  if (v.alarmMarginCm != null) x = Math.round(Number(v.alarmMarginCm));
  else if (v.alarmMarginMeters != null) x = Math.round(Number(v.alarmMarginMeters) * 100);
  return Math.min(MAX_MARGIN_CM, Math.max(0, x));
}

Page({
  data: {
    plate: "",
    fenceShape: "circle",
    /** circle：手绘拖圈 | twotap 两点定圆 */
    circleInputMode: "draw",
    /** rect：手绘包络矩形 | twotap 两点对角 */
    rectInputMode: "draw",
    drawCapturing: false,
    drawHint: "松开完成",
    handPolylines: [],
    vlat: 39.90923,
    vlng: 116.397428,
    flat: 39.90923,
    flng: 116.397428,
    fenceRadiusCm: DEFAULT_FENCE_RADIUS_CM,
    alarmMarginCm: DEFAULT_ALARM_MARGIN_CM,
    rectLat1: null,
    rectLng1: null,
    rectLat2: null,
    rectLng2: null,
    markers: [],
    circles: [],
    polygons: [],
    mapScale: 15,
    mapTip: "",
    vipBlocked: false,
    /** 圆形：0 待选圆心 → 1 待选圆周点 → 2 已完成 */
    circleStep: 2,
    rimLat: null,
    rimLng: null,
  },

  onReady() {
    this._mapCtx = wx.createMapContext("fenceMap", this);
  },

  _circleMapTip(shape, circleStep, circleInputMode) {
    if (shape !== "circle") return "";
    if (circleInputMode === "draw") {
      if (circleStep === 2) return circleTip(2);
      return "点「开始画圈」后在地图上拖动画圈，或切换「两点定圆」。";
    }
    return circleTip(circleStep);
  },

  _rectMapTip(rectInputMode, complete) {
    if (rectInputMode === "draw") {
      if (complete) return "方形围栏已设好，可保存或重画。";
      return "点「开始画框」沿停车区域描一圈，松手生成矩形；或切换「两点对角」。";
    }
    return "依次点击地图两个对角顶点；第三次点击将重新从角点1开始。";
  },

  onShow() {
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    if (!userVipStore.canUseVipGatedFeatures(p)) {
      this.setData({ vipBlocked: true });
      return;
    }
    this.setData({ vipBlocked: false });

    const v = getCurrentVehicle();
    if (!v) {
      wx.showToast({ title: "请先绑定车辆", icon: "none" });
      return;
    }
    const shape = v.fenceShape === "rect" ? "rect" : "circle";
    const flat = v.fenceLat != null ? v.fenceLat : v.lat;
    const flng = v.fenceLng != null ? v.fenceLng : v.lng;
    const fenceRadiusCm = readFenceRadiusCm(v);
    const alarmMarginCm = readAlarmMarginCm(v);
    const rectLat1 = v.rectLat1 != null ? v.rectLat1 : null;
    const rectLng1 = v.rectLng1 != null ? v.rectLng1 : null;
    const rectLat2 = v.rectLat2 != null ? v.rectLat2 : null;
    const rectLng2 = v.rectLng2 != null ? v.rectLng2 : null;
    this._vehicle = v;
    const initialCircleStep = shape === "circle" ? 2 : 0;
    const circleInputMode = this.data.circleInputMode || "draw";
    const rectInputMode = this.data.rectInputMode || "draw";
    const rectComplete =
      rectLat1 != null && rectLng1 != null && rectLat2 != null && rectLng2 != null;
    const mapTip =
      shape === "circle"
        ? this._circleMapTip(shape, initialCircleStep, circleInputMode)
        : this._rectMapTip(rectInputMode, rectComplete);
    this.setData({
      plate: v.plate,
      fenceShape: shape,
      vlat: v.lat,
      vlng: v.lng,
      flat,
      flng,
      fenceRadiusCm,
      alarmMarginCm,
      rectLat1,
      rectLng1,
      rectLat2,
      rectLng2,
      circleStep: initialCircleStep,
      rimLat: null,
      rimLng: null,
      drawCapturing: false,
      handPolylines: [],
      mapTip,
    });
    this._draw();
  },

  _draw() {
    const {
      fenceShape,
      vlat,
      vlng,
      flat,
      flng,
      fenceRadiusCm,
      rectLat1,
      rectLng1,
      rectLat2,
      rectLng2,
      circleStep,
      rimLat,
      rimLng,
    } = this.data;
    const markers = [{ id: 1, latitude: vlat, longitude: vlng, title: "车辆" }];
    let circles = [];
    let polygons = [];
    if (fenceShape === "circle") {
      if (circleStep >= 1) {
        markers.push({ id: 2, latitude: flat, longitude: flng, title: "圆心" });
      }
      if (circleStep === 2 && rimLat != null && rimLng != null) {
        markers.push({ id: 3, latitude: rimLat, longitude: rimLng, title: "圆周点" });
      }
      if (circleStep === 2) {
        const radiusM = Math.max(fenceRadiusCm / 100, 0.01);
        circles = [
          {
            latitude: flat,
            longitude: flng,
            radius: radiusM,
            strokeWidth: 2,
            color: "#6366f1cc",
            fillColor: "#6366f122",
          },
        ];
      }
    } else {
      if (rectLat1 != null && rectLng1 != null) {
        markers.push({ id: 2, latitude: rectLat1, longitude: rectLng1, title: "角点1" });
      }
      if (rectLat2 != null && rectLng2 != null) {
        markers.push({ id: 3, latitude: rectLat2, longitude: rectLng2, title: "角点2" });
      }
      if (rectLat1 != null && rectLng1 != null && rectLat2 != null && rectLng2 != null) {
        const latMin = Math.min(rectLat1, rectLat2);
        const latMax = Math.max(rectLat1, rectLat2);
        const lngMin = Math.min(rectLng1, rectLng2);
        const lngMax = Math.max(rectLng1, rectLng2);
        polygons = [
          {
            points: [
              { latitude: latMin, longitude: lngMin },
              { latitude: latMin, longitude: lngMax },
              { latitude: latMax, longitude: lngMax },
              { latitude: latMax, longitude: lngMin },
            ],
            strokeWidth: 2,
            strokeColor: "#6366f1DD",
            fillColor: "#6366f122",
          },
        ];
      }
    }
    this.setData({ markers, circles, polygons });
  },

  _pxToLlFromClient(clientX, clientY) {
    const rect = this._mapRect;
    const reg = this._drawRegion;
    if (!rect || !reg) return null;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return null;
    const lat = reg.ne.latitude - (y / h) * (reg.ne.latitude - reg.sw.latitude);
    const lng = reg.sw.longitude + (x / w) * (reg.ne.longitude - reg.sw.longitude);
    return { latitude: lat, longitude: lng };
  },

  _fitRectFromPoints(pts) {
    const MINPTS = 10;
    if (!pts || pts.length < MINPTS) return null;
    let latMin = pts[0].latitude;
    let latMax = pts[0].latitude;
    let lngMin = pts[0].longitude;
    let lngMax = pts[0].longitude;
    for (const p of pts) {
      latMin = Math.min(latMin, p.latitude);
      latMax = Math.max(latMax, p.latitude);
      lngMin = Math.min(lngMin, p.longitude);
      lngMax = Math.max(lngMax, p.longitude);
    }
    const diag = distM(latMin, lngMin, latMax, lngMax);
    if (diag < MIN_RECT_DIAG_M) return null;
    return {
      rectLat1: latMin,
      rectLng1: lngMin,
      rectLat2: latMax,
      rectLng2: lngMax,
    };
  },

  _fitCircleFromPoints(pts) {
    const MINPTS = 10;
    if (!pts || pts.length < MINPTS) return null;
    let slat = 0;
    let slng = 0;
    for (const p of pts) {
      slat += p.latitude;
      slng += p.longitude;
    }
    const clat = slat / pts.length;
    const clng = slng / pts.length;
    let maxD = 0;
    for (const p of pts) {
      const d = distM(clat, clng, p.latitude, p.longitude);
      if (d > maxD) maxD = d;
    }
    let rCm = Math.round(maxD * 100);
    rCm = Math.min(MAX_RADIUS_CM, Math.max(MIN_RADIUS_CM, rCm));
    return { flat: clat, flng: clng, fenceRadiusCm: rCm };
  },

  onPickCircleMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (!mode || mode === this.data.circleInputMode) return;
    let nextStep = this.data.circleStep;
    if (nextStep === 1) nextStep = 0;
    this.setData({
      circleInputMode: mode,
      drawCapturing: false,
      handPolylines: [],
      circleStep: nextStep,
      mapTip: this._circleMapTip("circle", nextStep, mode),
    });
    this._handLatLngPath = [];
    this._draw();
  },

  startHandDraw() {
    const { fenceShape, circleInputMode, rectInputMode } = this.data;
    if (fenceShape === "circle" && circleInputMode !== "draw") return;
    if (fenceShape === "rect" && rectInputMode !== "draw") return;
    this._handLatLngPath = [];
    const hint = fenceShape === "rect" ? "松手生成矩形" : "松开完成";
    this.setData({
      drawCapturing: true,
      handPolylines: [],
      drawHint: hint,
      mapTip: "按住拖动，松手完成",
    });
  },

  resetHandDraw() {
    const { fenceShape } = this.data;
    if (fenceShape === "circle") {
      this.setData({
        drawCapturing: false,
        handPolylines: [],
        circleStep: 0,
        rimLat: null,
        rimLng: null,
        mapTip: this._circleMapTip("circle", 0, "draw"),
      });
    } else {
      this.setData({
        drawCapturing: false,
        handPolylines: [],
        rectLat1: null,
        rectLng1: null,
        rectLat2: null,
        rectLng2: null,
        mapTip: this._rectMapTip(this.data.rectInputMode || "draw", false),
      });
    }
    this._handLatLngPath = [];
    this._draw();
    wx.showToast({ title: "已清空", icon: "none" });
  },

  onHandStart(e) {
    if (!this.data.drawCapturing || !this._mapCtx) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const afterRect = () => {
      this._mapCtx.getRegion({
        success: (res) => {
          this._drawRegion = { sw: res.southwest, ne: res.northeast };
          const ll = this._pxToLlFromClient(touch.clientX, touch.clientY);
          if (!ll) return;
          this._handLatLngPath = [ll];
          this.setData({
            handPolylines: [{ points: this._handLatLngPath, color: "#7c6cf7ee", width: 5 }],
          });
        },
      });
    };
    wx.createSelectorQuery()
      .in(this)
      .select("#fenceMap")
      .boundingClientRect((rect) => {
        this._mapRect = rect;
        afterRect();
      })
      .exec();
  },

  onHandMove(e) {
    if (!this.data.drawCapturing || !this._drawRegion || !this._mapRect) return;
    const touch = e.touches[0];
    if (!touch) return;
    const ll = this._pxToLlFromClient(touch.clientX, touch.clientY);
    if (!ll) return;
    if (!this._handLatLngPath) this._handLatLngPath = [];
    this._handLatLngPath.push(ll);
    const n = this._handLatLngPath.length;
    if (n > 1 && n % 4 !== 0) return;
    this.setData({
      handPolylines: [{ points: this._handLatLngPath, color: "#7c6cf7ee", width: 5 }],
    });
  },

  onHandEnd() {
    if (!this.data.drawCapturing) return;
    const path = (this._handLatLngPath || []).slice();
    const shape = this.data.fenceShape;
    this.setData({
      drawCapturing: false,
      handPolylines: [],
    });
    this._handLatLngPath = [];

    if (shape === "rect") {
      const fitR = this._fitRectFromPoints(path);
      if (!fitR) {
        wx.showToast({ title: "框太小或未画够，请重试", icon: "none" });
        const rm = this.data.rectInputMode || "draw";
        const ok =
          this.data.rectLat1 != null &&
          this.data.rectLng1 != null &&
          this.data.rectLat2 != null &&
          this.data.rectLng2 != null;
        this.setData({ mapTip: this._rectMapTip(rm, ok) });
        return;
      }
      this.setData({
        rectLat1: fitR.rectLat1,
        rectLng1: fitR.rectLng1,
        rectLat2: fitR.rectLat2,
        rectLng2: fitR.rectLng2,
        mapTip: this._rectMapTip(this.data.rectInputMode || "draw", true),
      });
      this._draw();
      wx.showToast({ title: "方形围栏已生成", icon: "none" });
      return;
    }

    const fit = this._fitCircleFromPoints(path);
    if (!fit) {
      wx.showToast({ title: "圈太短，请重试", icon: "none" });
      const step = this.data.circleStep;
      this.setData({ mapTip: this._circleMapTip("circle", step, "draw") });
      return;
    }
    this.setData({
      flat: fit.flat,
      flng: fit.flng,
      fenceRadiusCm: fit.fenceRadiusCm,
      circleStep: 2,
      rimLat: null,
      rimLng: null,
      mapTip: circleTip(2),
    });
    this._draw();
    wx.showToast({ title: "围栏已生成", icon: "none" });
  },

  onPickShape(e) {
    const shape = e.currentTarget.dataset.shape;
    if (!shape || shape === this.data.fenceShape) return;
    const v = this._vehicle;
    const flat = v && v.fenceLat != null ? v.fenceLat : this.data.vlat;
    const flng = v && v.fenceLng != null ? v.fenceLng : this.data.vlng;
    if (shape === "circle") {
      const r = this.data.fenceRadiusCm != null ? this.data.fenceRadiusCm : DEFAULT_FENCE_RADIUS_CM;
      const step = r >= MIN_RADIUS_CM && flat != null ? 2 : 0;
      const mode = this.data.circleInputMode || "draw";
      this.setData({
        fenceShape: "circle",
        flat,
        flng,
        rectLat1: null,
        rectLng1: null,
        rectLat2: null,
        rectLng2: null,
        circleStep: step,
        rimLat: null,
        rimLng: null,
        drawCapturing: false,
        handPolylines: [],
        mapTip: this._circleMapTip("circle", step, mode),
      });
    } else {
      const rm = this.data.rectInputMode || "draw";
      this.setData({
        fenceShape: "rect",
        rectLat1: null,
        rectLng1: null,
        rectLat2: null,
        rectLng2: null,
        drawCapturing: false,
        handPolylines: [],
        mapTip: this._rectMapTip(rm, false),
      });
    }
    this._draw();
  },

  onPickRectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (!mode || mode === this.data.rectInputMode) return;
    const ok =
      this.data.rectLat1 != null &&
      this.data.rectLng1 != null &&
      this.data.rectLat2 != null &&
      this.data.rectLng2 != null;
    this.setData({
      rectInputMode: mode,
      drawCapturing: false,
      handPolylines: [],
      mapTip: this._rectMapTip(mode, ok),
    });
    this._handLatLngPath = [];
    this._draw();
  },

  onMapTap(e) {
    const { latitude, longitude } = e.detail;
    if (this.data.fenceShape === "circle" && this.data.circleInputMode === "draw") return;
    if (this.data.fenceShape === "rect" && this.data.rectInputMode === "draw") return;
    if (this.data.fenceShape === "circle") {
      const step = this.data.circleStep;
      if (step === 0) {
        this.setData({
          flat: latitude,
          flng: longitude,
          circleStep: 1,
          rimLat: null,
          rimLng: null,
          mapTip: circleTip(1),
        });
        this._draw();
        wx.showToast({ title: "已选圆心，请点圆周上一点", icon: "none" });
        return;
      }
      if (step === 1) {
        const { flat, flng } = this.data;
        const m = distM(flat, flng, latitude, longitude);
        let rCm = Math.round(m * 100);
        rCm = Math.min(MAX_RADIUS_CM, Math.max(MIN_RADIUS_CM, rCm));
        this.setData({
          fenceRadiusCm: rCm,
          circleStep: 2,
          rimLat: latitude,
          rimLng: longitude,
          mapTip: circleTip(2),
        });
        this._draw();
        wx.showToast({ title: `已画圈，半径约 ${rCm} cm`, icon: "none" });
        return;
      }
      // step === 2：重新画圈，本次点击作为新圆心
      this.setData({
        flat: latitude,
        flng: longitude,
        circleStep: 1,
        rimLat: null,
        rimLng: null,
        mapTip: circleTip(1),
      });
      this._draw();
      wx.showToast({ title: "新圆心已选，请再点圆周上一点", icon: "none" });
      return;
    }
    const { rectLat1, rectLng1, rectLat2, rectLng2 } = this.data;
    if (rectLat1 == null || rectLng1 == null) {
      this.setData({ rectLat1: latitude, rectLng1: longitude });
      wx.showToast({ title: "已选角点1，请点对角", icon: "none" });
    } else if (rectLat2 == null || rectLng2 == null) {
      this.setData({ rectLat2: latitude, rectLng2: longitude });
      wx.showToast({ title: "方形区域已确定", icon: "none" });
    } else {
      this.setData({
        rectLat1: latitude,
        rectLng1: longitude,
        rectLat2: null,
        rectLng2: null,
      });
      wx.showToast({ title: "已重新选角点1", icon: "none" });
    }
    this._draw();
  },

  onRadius(e) {
    let r = Math.round(Number(e.detail.value));
    r = Math.min(MAX_RADIUS_CM, Math.max(MIN_RADIUS_CM, r));
    this.setData({ fenceRadiusCm: r, rimLat: null, rimLng: null });
    this._draw();
  },

  onMargin(e) {
    let r = Math.round(Number(e.detail.value));
    r = Math.min(MAX_MARGIN_CM, Math.max(0, r));
    this.setData({ alarmMarginCm: r });
  },

  resetRectCorners() {
    const rm = this.data.rectInputMode || "twotap";
    this.setData({
      rectLat1: null,
      rectLng1: null,
      rectLat2: null,
      rectLng2: null,
      drawCapturing: false,
      handPolylines: [],
      mapTip: this._rectMapTip(rm, false),
    });
    this._handLatLngPath = [];
    this._draw();
    wx.showToast({ title: "已清空角点", icon: "none" });
  },

  resetCircleDraw() {
    const mode = this.data.circleInputMode || "twotap";
    this.setData({
      circleStep: 0,
      rimLat: null,
      rimLng: null,
      drawCapturing: false,
      handPolylines: [],
      mapTip: this._circleMapTip("circle", 0, mode),
    });
    this._handLatLngPath = [];
    this._draw();
    wx.showToast({ title: "请点地图选圆心", icon: "none" });
  },

  alignVehicle() {
    if (this.data.fenceShape !== "circle") {
      wx.showToast({ title: "方形围栏请用对角点框选", icon: "none" });
      return;
    }
    const v = this._vehicle;
    if (!v) return;
    const was = this.data.circleStep;
    const mode = this.data.circleInputMode || "draw";
    if (mode === "draw") {
      this.setData({
        flat: v.lat,
        flng: v.lng,
        circleStep: was === 2 ? 2 : 0,
        mapTip: was === 2 ? circleTip(2) : this._circleMapTip("circle", 0, "draw"),
      });
      this._draw();
      wx.showToast({ title: was === 2 ? "圆心已对齐车辆" : "已对齐，可开始画圈", icon: "none" });
      return;
    }
    this.setData({
      flat: v.lat,
      flng: v.lng,
      circleStep: was === 0 ? 1 : was === 1 ? 1 : 2,
      mapTip: circleTip(was === 0 ? 1 : was === 1 ? 1 : 2),
    });
    this._draw();
    wx.showToast({ title: was === 2 ? "圆心已对齐车辆，半径不变" : "圆心已对齐车辆", icon: "none" });
  },

  onSave() {
    const v = getCurrentVehicle();
    if (!v) return;
    const {
      fenceShape,
      flat,
      flng,
      fenceRadiusCm,
      alarmMarginCm,
      rectLat1,
      rectLng1,
      rectLat2,
      rectLng2,
    } = this.data;

    if (fenceShape === "circle") {
      if (this.data.circleStep !== 2) {
        wx.showToast({ title: "请先画完圆（圆心 + 圆周上一点）", icon: "none" });
        return;
      }
      const nv = stripLegacyMetersFields({
        ...v,
        fenceShape: "circle",
        fenceLat: flat,
        fenceLng: flng,
        fenceRadiusCm,
        alarmMarginCm,
        rectLat1: null,
        rectLng1: null,
        rectLat2: null,
        rectLng2: null,
      });
      persistVehicle(nv);
      this._vehicle = nv;
      wx.showModal({
        title: "已保存",
        content: `圆形围栏：半径 ${fenceRadiusCm} cm；车辆离开围栏边缘超过 ${alarmMarginCm} cm 将告警（演示数据，实际需设备/平台判定）。`,
        showCancel: false,
      });
      return;
    }

    if (rectLat1 == null || rectLng1 == null || rectLat2 == null || rectLng2 == null) {
      wx.showToast({ title: "请先手绘方框或点选两个对角", icon: "none" });
      return;
    }
    const latMin = Math.min(rectLat1, rectLat2);
    const latMax = Math.max(rectLat1, rectLat2);
    const lngMin = Math.min(rectLng1, rectLng2);
    const lngMax = Math.max(rectLng1, rectLng2);
    const cLat = (latMin + latMax) / 2;
    const cLng = (lngMin + lngMax) / 2;
    const nv = stripLegacyMetersFields({
      ...v,
      fenceShape: "rect",
      alarmMarginCm,
      fenceRadiusCm,
      rectLat1,
      rectLng1,
      rectLat2,
      rectLng2,
      fenceLat: cLat,
      fenceLng: cLng,
    });
    persistVehicle(nv);
    this._vehicle = nv;
    wx.showModal({
      title: "已保存",
      content: `方形围栏：已保存矩形范围；离开边缘超过 ${alarmMarginCm} cm 将告警（演示数据，实际需设备/平台判定）。`,
      showCancel: false,
    });
  },

  goFenceSettingLegacy() {
    wx.navigateTo({ url: "/pages/fence-setting/fence-setting" });
  },

  goVipCenter() {
    wx.navigateTo({ url: "/pages/vip-center/vip-center" });
  },

  goBackFromVipGate() {
    wx.navigateBack({
      fail: () => {
        wx.reLaunch({ url: "/pages/profile/profile" });
      },
    });
  },
});
