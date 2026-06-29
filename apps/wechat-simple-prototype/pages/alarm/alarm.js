const { buildDefaultAlarms } = require("../../utils/alarms-seed.js");
const remoteUi = require("../../utils/remote-ui-config.js");

const STORAGE_ALARMS = "ev_alarms";

function getSubscribeTmplIds() {
  const ids = remoteUi.getAlarmSubscribeTmplIds();
  return Array.isArray(ids) ? ids.filter((x) => x && String(x).trim().length) : [];
}
function pad2(n) {
  return n < 10 ? "0" + n : "" + n;
}

function ymd(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function nowStr() {
  const d = new Date();
  return `${ymd(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function decorateItem(item) {
  const pending = item.status === "pending";
  const { protocolRef, pushNote, ...rest } = item;
  const risk = item.risk || "中";
  let riskClass = "risk-mid";
  if (risk === "高") riskClass = "risk-hi";
  else if (risk === "低") riskClass = "risk-lo";
  return {
    ...rest,
    riskLabel: risk,
    riskClass,
    statusText: pending ? "待处理" : "已处理",
    statusClass: pending ? "st-pending" : "st-done",
  };
}

const RISK_ORDER = { 高: 0, 中: 1, 低: 2 };

function splitAndStats(list) {
  const decorated = list.map(decorateItem);
  const pendingList = decorated.filter((x) => x.status === "pending");
  const doneList = decorated.filter((x) => x.status === "done");
  pendingList.sort((a, b) => {
    const ra = RISK_ORDER[a.riskLabel] ?? 1;
    const rb = RISK_ORDER[b.riskLabel] ?? 1;
    if (ra !== rb) return ra - rb;
    return String(b.time).localeCompare(String(a.time));
  });
  doneList.sort((a, b) => String(b.time).localeCompare(String(a.time)));
  const urgent = pendingList.filter((x) => x.riskLabel === "高").length;
  return {
    pendingList,
    doneList,
    urgentPending: urgent,
    stats: [
      { label: "总记录", value: String(list.length), filterKey: "all" },
      { label: "待处理", value: String(pendingList.length), filterKey: "pending" },
      { label: "高风险", value: String(urgent), filterKey: "high" },
      { label: "已处理", value: String(doneList.length), filterKey: "done" },
    ],
  };
}

Page({
  data: {
    stats: [],
    pendingList: [],
    doneList: [],
    urgentPending: 0,
    listFilter: "all",
    filterBarText: "",
  },

  onShow() {
    remoteUi.refreshFromGateway();
    let raw = wx.getStorageSync(STORAGE_ALARMS);
    if (!raw || !raw.length) {
      raw = buildDefaultAlarms();
      wx.setStorageSync(STORAGE_ALARMS, raw);
    }
    this.refresh(raw);
  },

  refresh(list) {
    const split = splitAndStats(list);
    this._alarmSplit = split;
    const keep = this.data.listFilter || "all";
    this.applyListFilter(keep);
  },

  applyListFilter(filterKey) {
    const f = filterKey || this.data.listFilter || "all";
    const split = this._alarmSplit;
    if (!split) return;

    let pending = split.pendingList.slice();
    let done = split.doneList.slice();

    if (f === "pending") {
      done = [];
    } else if (f === "high") {
      pending = pending.filter((x) => x.riskLabel === "高");
      done = [];
    } else if (f === "done") {
      pending = [];
    }

    const stats = split.stats.map((s) => ({
      ...s,
      active: s.filterKey === f,
    }));

    const hintMap = {
      all: "",
      pending: "正在查看：待处理",
      high: "正在查看：待处理中的高风险",
      done: "正在查看：已处理",
    };

    this.setData({
      listFilter: f,
      pendingList: pending,
      doneList: done,
      stats,
      urgentPending: split.urgentPending,
      filterBarText: hintMap[f] || "",
    });
  },

  onStatTap(e) {
    const filterKey = e.currentTarget.dataset.filter;
    if (!filterKey) return;
    this.applyListFilter(filterKey);
  },

  markHandled(e) {
    const id = e.currentTarget.dataset.id;
    const raw = (wx.getStorageSync(STORAGE_ALARMS) || []).map((a) =>
      a.id === id
        ? { ...a, status: "done", handledAt: a.handledAt || nowStr() }
        : a
    );
    wx.setStorageSync(STORAGE_ALARMS, raw);
    this.refresh(raw);
    wx.showToast({ title: "已标记为已处理", icon: "success" });
  },

  openSubscribe() {
    const tmplIds = getSubscribeTmplIds();
    if (!tmplIds.length) {
      wx.showModal({
        title: "微信提醒",
        content:
          "车辆出现防盗类报警时，可经微信给您发订阅消息提醒（需您点同意订阅）。请先在管理端「告警推送」里配置小程序 AppID 与订阅消息模板 ID，并确保网关已配置 WECHAT_MP_SECRET。",
        showCancel: false,
      });
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds,
      success: (res) => {
        const accepted = tmplIds.filter((id) => res[id] === "accept");
        if (!accepted.length) {
          wx.showToast({ title: "未授权订阅，告警时无法微信通知", icon: "none" });
          return;
        }
        wx.login({
          success: (lr) => {
            if (!lr.code) {
              wx.showToast({ title: "登录失败，请重试", icon: "none" });
              return;
            }
            const base = remoteUi.getGatewayBase();
            wx.request({
              url: `${base}/api/miniapp/alarm-subscribe`,
              method: "POST",
              header: { "Content-Type": "application/json" },
              data: JSON.stringify({ code: lr.code, acceptTmplIds: accepted }),
              success: (r2) => {
                const ok = r2.statusCode === 200 && r2.data && r2.data.ok;
                if (ok) {
                  wx.showToast({ title: "已开启微信告警提醒", icon: "success" });
                } else {
                  const reason =
                    r2.data && (r2.data.reason || r2.data.message)
                      ? String(r2.data.reason || r2.data.message)
                      : "登记失败";
                  wx.showToast({ title: reason, icon: "none", duration: 2500 });
                }
              },
              fail: () => wx.showToast({ title: "网络错误", icon: "none" }),
            });
          },
          fail: () => wx.showToast({ title: "登录失败", icon: "none" }),
        });
      },
      fail: () => wx.showToast({ title: "订阅弹窗失败，可稍后在通知设置重试", icon: "none" }),
    });
  },});
