const app = getApp();

Page({
  data: {
    wechatNotify: true,
    soundEnabled: true,
    vibrateEnabled: true,
    alarmTypes: [
      { key: "vibration", label: "震动报警", desc: "车辆被剧烈震动时推送", checked: true },
      { key: "move", label: "位移报警", desc: "车辆被非法移动时推送", checked: true },
      { key: "power_cut", label: "断电报警", desc: "电瓶/电源被切断时推送", checked: true },
      { key: "tilt", label: "倾倒报警", desc: "车辆被推倒时推送", checked: false },
      { key: "fence", label: "围栏报警", desc: "车辆超出电子围栏时推送", checked: true },
      { key: "signal_lost", label: "信号丢失", desc: "设备离线超过10分钟时推送", checked: true },
    ],
    recentAlarms: [],

    /** 订阅消息状态 */
    subscribeReady: false,
  },

  onLoad() {
    this._loadSettings();
    this._loadRecent();
  },

  /* ---------- 微信提醒开关 ---------- */
  onWechatSwitch(e) {
    const enabled = !!e.detail.value;
    this.setData({ wechatNotify: enabled });
    if (enabled) {
      this._requestSubscribe();
    }
    wx.setStorageSync("notify_wechat", enabled);
  },

  onSoundSwitch(e) {
    const v = !!e.detail.value;
    this.setData({ soundEnabled: v });
    wx.setStorageSync("notify_sound", v);
  },

  onVibrateSwitch(e) {
    const v = !!e.detail.value;
    this.setData({ vibrateEnabled: v });
    wx.setStorageSync("notify_vibrate", v);
  },

  /* ---------- 报警类型开关 ---------- */
  onAlarmType(e) {
    const key = e.currentTarget.dataset.key;
    const types = this.data.alarmTypes.map((t) =>
      t.key === key ? { ...t, checked: !t.checked } : t
    );
    this.setData({ alarmTypes: types });
    wx.setStorageSync("notify_alarm_types", types);
  },

  /* ---------- 订阅消息 ---------- */
  openSubscribe() {
    this._requestSubscribe();
  },

  _requestSubscribe() {
    const tmplIds = app.globalData?.alarmSubscribeTmplIds;
    if (!tmplIds || tmplIds.length === 0) {
      wx.showToast({ title: "暂未配置订阅模板", icon: "none" });
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds,
      success: (res) => {
        const ok = Object.values(res).some((v) => v === "accept");
        this.setData({ subscribeReady: ok });
        if (ok) wx.showToast({ title: "订阅成功", icon: "success" });
      },
      fail: () => {
        wx.showToast({ title: "订阅失败，请在设置中开启", icon: "none" });
      },
    });
  },

  /* ---------- 消息免打扰时段 ---------- */
  showQuietPicker() {
    wx.showActionSheet({
      itemList: ["关闭免打扰", "22:00 - 08:00", "23:00 - 07:00"],
      success: (res) => {
        const modes = ["", "22:00-08:00", "23:00-07:00"];
        const mode = modes[res.tapIndex] || "";
        wx.setStorageSync("notify_quiet", mode);
        this.setData({ quietMode: mode });
        wx.showToast({ title: mode ? "免打扰已开启" : "免打扰已关闭", icon: "success" });
      },
    });
  },

  /* ---------- 测试推送 ---------- */
  testPush() {
    wx.showToast({ title: "测试推送已发送", icon: "none" });
    // 实际对接：调用后端推送测试
  },

  /* ---------- 跳转报警页 ---------- */
  navToAlarm() {
    wx.navigateTo({ url: "/pages/alarm/alarm" });
  },

  /* ---------- 历史告警 ---------- */
  _loadRecent() {
    // demo 数据
    const recentAlarms = [
      { id: 1, type: "震动报警", plate: "京A12345", time: "2026-07-04 08:12", level: "高" },
      { id: 2, type: "围栏报警", plate: "京B67890", time: "2026-07-04 06:30", level: "中" },
      { id: 3, type: "断电报警", plate: "京A12345", time: "2026-07-03 22:15", level: "高" },
    ];
    this.setData({ recentAlarms });
  },

  _loadSettings() {
    this.setData({
      wechatNotify: wx.getStorageSync("notify_wechat") !== false,
      soundEnabled: wx.getStorageSync("notify_sound") !== false,
      vibrateEnabled: wx.getStorageSync("notify_vibrate") !== false,
      alarmTypes: wx.getStorageSync("notify_alarm_types") || this.data.alarmTypes,
      quietMode: wx.getStorageSync("notify_quiet") || "",
    });
  },
});
