/** 行车记录：近 30 天轨迹 + 按日期/时段筛选；用车卡片逻辑同前 */

const auth = require("../../utils/auth-store.js");
const vehicleStore = require("../../utils/vehicle-store.js");
const STORAGE_LOCK_LOGS = "ev_lock_logs";
const DEMO_PLATE = "京A·D12345";

function pad2(n) {
  return n < 10 ? "0" + n : "" + n;
}

function ymd(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateTime(d) {
  return `${ymd(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function startOfCalendarDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function addCalendarDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function atTimeDate(d, h, m, s) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, s);
  return formatDateTime(x);
}

/** 仅保留「今日 0 点」往前共 30 个自然日内的轨迹（含今日） */
function retentionStartTs() {
  const t0 = startOfCalendarDay(new Date());
  return t0 - 29 * 86400000;
}

function mergeLockLogs(stored, dynamicSeeds) {
  const seen = new Set((stored || []).map((x) => x.id));
  const merged = [...(stored || [])];
  (dynamicSeeds || []).forEach((s) => {
    if (!seen.has(s.id)) merged.push(s);
  });
  merged.sort((a, b) => String(b.time).localeCompare(String(a.time)));
  return merged;
}

function parseTime(str) {
  if (!str) return 0;
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return 0;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
}

function minuteOfDayFromStr(str) {
  const m = String(str).match(/(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function formatDurMs(ms) {
  if (ms <= 0) return "—";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`;
}

function pairLockLogsWithPending(merged) {
  const byPlate = {};
  (merged || []).forEach((e) => {
    if (e.action !== "unlock" && e.action !== "lock") return;
    const pl = e.plate || "—";
    if (!byPlate[pl]) byPlate[pl] = [];
    byPlate[pl].push(e);
  });
  const pairs = [];
  const pendingUnlocks = [];
  Object.keys(byPlate).forEach((plate) => {
    const arr = byPlate[plate].sort((a, b) => parseTime(a.time) - parseTime(b.time));
    let pending = null;
    arr.forEach((e) => {
      if (e.action === "unlock") pending = e;
      else if (e.action === "lock" && pending && parseTime(e.time) > parseTime(pending.time)) {
        pairs.push({ plate, unlock: pending, lock: e });
        pending = null;
      }
    });
    if (pending) pendingUnlocks.push({ plate, unlock: pending });
  });
  pairs.sort((a, b) => parseTime(b.lock.time) - parseTime(a.lock.time));
  pendingUnlocks.sort((a, b) => parseTime(b.unlock.time) - parseTime(a.unlock.time));
  return { pairs, pendingUnlocks };
}

function interpolateSeg(a, b, steps) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push({
      latitude: a.lat + (b.lat - a.lat) * t,
      longitude: a.lng + (b.lng - a.lng) * t,
    });
  }
  return out;
}

function buildRoutePoints(path) {
  let all = [];
  for (let i = 0; i < path.length - 1; i++) {
    const seg = interpolateSeg(
      { lat: path[i].lat, lng: path[i].lng },
      { lat: path[i + 1].lat, lng: path[i + 1].lng },
      6
    );
    if (i > 0) seg.shift();
    all = all.concat(seg);
  }
  return all;
}

function boundsFromPoints(pts) {
  let minLat = pts[0].latitude,
    maxLat = pts[0].latitude,
    minLng = pts[0].longitude,
    maxLng = pts[0].longitude;
  pts.forEach((p) => {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
  });
  const lat = (minLat + maxLat) / 2;
  const lng = (minLng + maxLng) / 2;
  const span = Math.max(
    Math.abs(maxLat - minLat) * 111000,
    Math.abs(maxLng - minLng) * 85000
  );
  let scale = 14;
  if (span < 800) scale = 16;
  else if (span < 2500) scale = 15;
  else if (span < 6000) scale = 14;
  else if (span < 12000) scale = 13;
  else scale = 12;
  return { lat, lng, scale };
}

function buildDemoTrips(plateOverlay) {
  const now = new Date();
  const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d1 = addCalendarDays(d0, -1);
  const d2 = addCalendarDays(d0, -2);
  const y0 = ymd(d0);
  const y1 = ymd(d1);
  const y2 = ymd(d2);
  const plate = plateOverlay || DEMO_PLATE;

  const base = [
    {
      id: "tr1",
      title: "通勤 · 中关村 → 西二旗",
      dateFull: y0,
      startTime: atTimeDate(d0, 8, 12, 3),
      endTime: atTimeDate(d0, 8, 44, 18),
      durationText: "32 分 15 秒",
      distanceKm: "8.6",
      avgSpeedKmh: "16",
      rider: "李四",
      plate: DEMO_PLATE,
      startName: "海淀区中关村大街1号（起点）",
      endName: "昌平区西二旗北路附近（终点）",
      waypoints: [
        { name: "海淀黄庄路口", time: "08:14", lat: 39.9122, lng: 116.397 },
        { name: "知春路地铁站", time: "08:21", lat: 39.9234, lng: 116.393 },
        { name: "学清路", time: "08:33", lat: 39.936, lng: 116.352 },
      ],
      path: [
        { lat: 39.9078, lng: 116.3974 },
        { lat: 39.9122, lng: 116.397 },
        { lat: 39.9234, lng: 116.393 },
        { lat: 39.936, lng: 116.352 },
        { lat: 39.958, lng: 116.318 },
      ],
    },
    {
      id: "tr2",
      title: "短途 · 黄庄周边",
      dateFull: y1,
      startTime: atTimeDate(d1, 14, 5, 22),
      endTime: atTimeDate(d1, 14, 22, 8),
      durationText: "16 分 46 秒",
      distanceKm: "2.1",
      avgSpeedKmh: "12",
      rider: "张三",
      plate: DEMO_PLATE,
      startName: "鼎好大厦南侧",
      endName: "中关村广场步行街",
      waypoints: [{ name: "欧美汇购物中心", time: "14:12", lat: 39.9095, lng: 116.3992 }],
      path: [
        { lat: 39.9085, lng: 116.3968 },
        { lat: 39.9095, lng: 116.3992 },
        { lat: 39.9108, lng: 116.401 },
      ],
    },
    {
      id: "tr3",
      title: "晚间 · 周边短途",
      dateFull: y2,
      startTime: atTimeDate(d2, 19, 10, 0),
      endTime: atTimeDate(d2, 19, 28, 15),
      durationText: "18 分 15 秒",
      distanceKm: "1.8",
      avgSpeedKmh: "11",
      rider: "张三",
      plate: DEMO_PLATE,
      startName: "小区东门",
      endName: "附近商超停车区",
      waypoints: [{ name: "路口便利店", time: "19:18", lat: 39.906, lng: 116.395 }],
      path: [
        { lat: 39.9055, lng: 116.3945 },
        { lat: 39.906, lng: 116.395 },
        { lat: 39.9068, lng: 116.396 },
      ],
    },
  ];

  return base.map((t) => ({ ...t, plate: plate || t.plate }));
}

function buildSeedLockLogs(trips, d1) {
  const seeds = [];
  trips.forEach((t) => {
    const st = parseTime(t.startTime);
    const et = parseTime(t.endTime);
    const u = new Date(st - 4 * 60 * 1000);
    const l = new Date(et + 30 * 1000);
    seeds.push(
      {
        id: "seed_u_" + t.id,
        action: "unlock",
        actionLabel: "远程解锁",
        operator: t.rider,
        role: t.id === "tr1" ? "授权用户" : "主账号",
        plate: DEMO_PLATE,
        time: formatDateTime(u),
        address: t.startName,
        source: "小程序 · 车辆首页",
        result: "成功",
        detail: "",
      },
      {
        id: "seed_l_" + t.id,
        action: "lock",
        actionLabel: "远程关锁",
        operator: t.rider,
        role: t.id === "tr1" ? "授权用户" : "主账号",
        plate: DEMO_PLATE,
        time: formatDateTime(l),
        address: t.endName,
        source: "小程序 · 车辆首页",
        result: "成功",
        detail: "",
      }
    );
  });
  const u = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate(), 21, 40, 10);
  const l = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate(), 21, 45, 33);
  seeds.push(
    {
      id: "seed_u_orphan",
      action: "unlock",
      actionLabel: "远程解锁",
      operator: "王五",
      role: "普通成员",
      plate: DEMO_PLATE,
      time: formatDateTime(u),
      address: "北京市丰台区某路口",
      source: "管理端 · Web",
      result: "成功",
      detail: "短停演示",
    },
    {
      id: "seed_l_orphan",
      action: "lock",
      actionLabel: "远程关锁",
      operator: "王五",
      role: "普通成员",
      plate: DEMO_PLATE,
      time: formatDateTime(l),
      address: "北京市丰台区南三环西路",
      source: "管理端 · Web",
      result: "成功",
      detail: "",
    }
  );
  return seeds;
}

function mapPayloadForTrip(trip, idOffset) {
  const pts = buildRoutePoints(trip.path);
  const { lat, lng, scale } = boundsFromPoints(pts);
  const start = trip.path[0];
  const end = trip.path[trip.path.length - 1];
  const markers = [
    { id: idOffset + 1, latitude: start.lat, longitude: start.lng, title: "起" },
    { id: idOffset + 2, latitude: end.lat, longitude: end.lng, title: "终" },
  ];
  trip.waypoints.forEach((w, i) => {
    markers.push({
      id: idOffset + 10 + i,
      latitude: w.lat,
      longitude: w.lng,
      title: w.name,
    });
  });
  return {
    mapLat: lat,
    mapLng: lng,
    mapScale: scale,
    markers,
    polyline: [{ points: pts, color: "#4f46e5DD", width: 6 }],
  };
}

function sessionToCard(session, index) {
  const idOffset = index * 100 + 7;
  const trip = session.trip;
  const u = session.unlock;
  const l = session.lock;
  const isRiding = session.kind === "riding";

  const plate = trip ? trip.plate : u ? u.plate : "—";
  const title = session.title;
  const dateLine = trip
    ? `${trip.dateFull} · ${trip.startTime.slice(11, 16)}–${trip.endTime.slice(11, 16)}`
    : u
      ? String(u.time).slice(0, 16)
      : "";

  const startTimeStr = trip ? trip.startTime : u ? u.time : "";
  const dayKey = startTimeStr.length >= 10 ? startTimeStr.slice(0, 10) : "";
  const startMin = minuteOfDayFromStr(startTimeStr || "");

  let unlockWho = "—";
  let unlockTime = "—";
  if (u) {
    unlockWho = u.operator;
    unlockTime = u.time;
  } else if (trip) {
    unlockWho = "无开锁记录";
    unlockTime = trip.startTime;
  }

  let lockWho = "—";
  let lockTime = "—";
  if (l) {
    lockWho = l.operator;
    lockTime = l.time;
  } else if (isRiding) {
    lockWho = "—";
    lockTime = "待关锁";
  } else if (trip) {
    lockWho = "无关锁记录";
    lockTime = trip.endTime;
  }

  let startName = trip ? trip.startName : u ? u.address : "—";
  let endName = trip ? trip.endName : l ? l.address : "—";
  if (isRiding) {
    endName = trip ? "骑行中 · 终点待到达" : "骑行中 · 关锁后更新终点";
  }

  let statsLine = "";
  let hasTrack = !!trip;
  let mapLat = 39.90923;
  let mapLng = 116.397428;
  let mapScale = 13;
  let markers = [];
  let polyline = [];
  let waypointsLine = "";
  let mapHint = "";

  if (trip) {
    statsLine = `${trip.durationText} · ${trip.distanceKm} km · 均速 ${trip.avgSpeedKmh} km/h`;
    const m = mapPayloadForTrip(trip, idOffset);
    mapLat = m.mapLat;
    mapLng = m.mapLng;
    mapScale = m.mapScale;
    markers = m.markers;
    polyline = m.polyline;
    waypointsLine = trip.waypoints.map((w) => w.name).join(" → ");
  } else if (u && l) {
    statsLine = `开锁间隔 ${formatDurMs(parseTime(l.time) - parseTime(u.time))}`;
    mapHint = "本轮无轨迹";
  } else if (isRiding && u) {
    statsLine = `开锁于 ${u.time.slice(11, 19)} · 车辆未关锁`;
    mapHint = "关锁后显示完整归档";
  }

  if (u && l && trip) {
    statsLine += ` · 开锁–关锁 ${u.time.slice(11, 16)}–${l.time.slice(11, 16)}`;
  }

  const sortTs = trip ? parseTime(trip.endTime) : l ? parseTime(l.time) : u ? parseTime(u.time) : 0;

  return {
    id: session.id,
    status: isRiding ? "riding" : "done",
    statusText: isRiding ? "骑行中" : "已完成",
    title,
    dateLine,
    plate,
    unlockWho,
    unlockTime,
    lockWho,
    lockTime,
    startName,
    endName,
    statsLine,
    hasTrack,
    mapLat,
    mapLng,
    mapScale,
    markers,
    polyline,
    waypointsLine,
    mapHint,
    dayKey,
    startMin,
    sortTs,
  };
}

const DEMO_TRIP_IDS = new Set(["tr1", "tr2", "tr3"]);

function lockLogMatchesTrip(pairPlate, trip) {
  if (!pairPlate || pairPlate === "—") return trip.plate === "—" || !trip.plate;
  if (pairPlate === trip.plate) return true;
  return DEMO_TRIP_IDS.has(trip.id) && pairPlate === DEMO_PLATE;
}

function buildRideCards(plateFilter, trips, mergedLogs) {
  const { pairs, pendingUnlocks } = pairLockLogsWithPending(mergedLogs);
  const used = new Set();
  const sessions = [];

  const plateOk = (p) =>
    !plateFilter || p === plateFilter || p === "—" || plateFilter === "—";

  const cutoff = retentionStartTs();

  trips.forEach((trip) => {
    if (parseTime(trip.endTime) < cutoff) return;
    let bestIdx = -1;
    let bestScore = Infinity;
    const t0 = parseTime(trip.startTime);
    const t1 = parseTime(trip.endTime);
    for (let i = 0; i < pairs.length; i++) {
      if (used.has(i)) continue;
      if (!lockLogMatchesTrip(pairs[i].plate, trip)) continue;
      const u = parseTime(pairs[i].unlock.time);
      const l = parseTime(pairs[i].lock.time);
      if (l < t0 || u > t1) continue;
      const score = Math.abs(u - t0) + Math.abs(l - t1);
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) used.add(bestIdx);
    sessions.push({
      id: trip.id,
      kind: "trip",
      title: trip.title,
      dateFull: trip.dateFull,
      trip,
      unlock: bestIdx >= 0 ? pairs[bestIdx].unlock : null,
      lock: bestIdx >= 0 ? pairs[bestIdx].lock : null,
    });
  });

  for (let i = 0; i < pairs.length; i++) {
    if (used.has(i)) continue;
    if (!plateOk(pairs[i].plate)) continue;
    const p = pairs[i];
    if (parseTime(p.lock.time) < cutoff) continue;
    sessions.push({
      id: "lp_" + p.unlock.id,
      kind: "locks_only",
      title: "短停 · 仅有开关锁",
      dateFull: p.unlock.time.slice(0, 10),
      trip: null,
      unlock: p.unlock,
      lock: p.lock,
    });
  }

  pendingUnlocks.forEach((pu) => {
    if (!plateOk(pu.plate)) return;
    if (parseTime(pu.unlock.time) < cutoff) return;
    sessions.push({
      id: "rid_" + pu.unlock.id,
      kind: "riding",
      title: "用车中（待关锁）",
      dateFull: pu.unlock.time.slice(0, 16),
      trip: null,
      unlock: pu.unlock,
      lock: null,
    });
  });

  sessions.sort((a, b) => {
    const ar = a.kind === "riding" ? 1 : 0;
    const br = b.kind === "riding" ? 1 : 0;
    if (ar !== br) return br - ar;
    const ta = a.trip ? parseTime(a.trip.endTime) : a.lock ? parseTime(a.lock.time) : parseTime(a.unlock.time);
    const tb = b.trip ? parseTime(b.trip.endTime) : b.lock ? parseTime(b.lock.time) : parseTime(b.unlock.time);
    return tb - ta;
  });

  return sessions.map((s, i) => sessionToCard(s, i));
}

/** 解析「几月几日」，年份用传入的 year（默认当前自然年）。支持 4-27、04/27、4月27、4月27日 */
function parseMonthDayToYmd(str, year) {
  const s = String(str || "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{1,2})\s*月\s*(\d{1,2})\s*日?$/);
  if (!m) m = s.match(/^(\d{1,2})\s*[.\-\/]\s*(\d{1,2})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return ymd(d);
}

Page({
  data: {
    rideCards: [],
    allRideCards: [],
    minDate: "",
    maxDate: "",
    defaultYear: new Date().getFullYear(),
    filterDate: "",
    mdStart: "",
    mdEnd: "",
    filterSummary: "",
  },

  onShow() {
    const now = new Date();
    const dMin = addCalendarDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -29);
    const dMax = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const minDate = ymd(dMin);
    const maxDate = ymd(dMax);

    const stored = wx.getStorageSync(STORAGE_LOCK_LOGS) || [];
    const list = vehicleStore.listForSession(auth.getSession());
    const vid = wx.getStorageSync(vehicleStore.STORAGE_CURRENT);
    const cur = list.find((x) => x.id === vid) || list[0];
    const plate = cur ? cur.plate : "";

    const trips = buildDemoTrips(plate || "");
    const d1 = addCalendarDays(dMax, -1);
    const seeds = buildSeedLockLogs(trips, d1);
    const merged = mergeLockLogs(stored, seeds);
    const allRideCards = buildRideCards(plate || "", trips, merged);

    this.setData({
      allRideCards,
      minDate,
      maxDate,
      defaultYear: now.getFullYear(),
    });
    this.applyFilter();
  },

  onPickDate(e) {
    const v = e.detail.value;
    this.setData({ filterDate: v });
    this.applyFilter();
  },

  clearDate() {
    this.setData({ filterDate: "" });
    this.applyFilter();
  },

  onMdStartInput(e) {
    this.setData({ mdStart: e.detail.value });
  },

  onMdEndInput(e) {
    this.setData({ mdEnd: e.detail.value });
  },

  runQuery() {
    this.applyFilter();
  },

  resetQuery() {
    this.setData({ filterDate: "", mdStart: "", mdEnd: "" });
    this.applyFilter();
  },

  applyFilter() {
    const { allRideCards, filterDate, mdStart, mdEnd, defaultYear } = this.data;
    const year = defaultYear || new Date().getFullYear();
    let list = allRideCards.slice();

    const y0 = parseMonthDayToYmd(mdStart, year);
    const y1 = parseMonthDayToYmd(mdEnd, year);
    const hasPairMd = !!(mdStart && mdEnd);
    const hasPartialMd = (!!mdStart || !!mdEnd) && !hasPairMd;

    if (hasPartialMd) {
      wx.showToast({ title: "月日区间需同时填写开始与结束", icon: "none" });
    }

    let rangeLabel = "";
    if (hasPairMd) {
      if (!y0 || !y1) {
        wx.showToast({ title: "月日格式：如 4-27 或 4月27", icon: "none" });
      } else if (y0 > y1) {
        wx.showToast({ title: "开始日期不能晚于结束", icon: "none" });
      } else {
        list = list.filter((c) => c.dayKey >= y0 && c.dayKey <= y1);
        rangeLabel = `${year}年 ${String(mdStart).trim()}～${String(mdEnd).trim()}`;
      }
    } else if (filterDate) {
      list = list.filter((c) => c.dayKey === filterDate);
    }

    const n = list.length;
    const parts = [];
    if (rangeLabel) parts.push(rangeLabel);
    else if (filterDate) parts.push(filterDate);
    const filterSummary =
      parts.length > 0 ? `已筛选 ${n} 条（${parts.join(" · ")}）` : `共 ${n} 条（近 3 日）`;
    this.setData({ rideCards: list, filterSummary });
  },
});
