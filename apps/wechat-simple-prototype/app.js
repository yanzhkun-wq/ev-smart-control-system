const { buildDefaultAlarms } = require("./utils/alarms-seed.js");
const remoteUi = require("./utils/remote-ui-config.js");
const auth = require("./utils/auth-store.js");
const org = require("./utils/org-store.js");

/** 多车演示：车辆列表存本地缓存 ev_vehicles，当前车 ev_current_vid */
App({
  /** 供页面引用：动态导航/文案（可选） */
  remoteUi,

  onLaunch() {
    remoteUi.init();
    remoteUi.refreshFromGateway();

    const STORAGE_ALARMS = "ev_alarms";
    const COPY_VER = "ev_alarms_user_copy_v3";
    if (!wx.getStorageSync(COPY_VER)) {
      wx.setStorageSync(STORAGE_ALARMS, buildDefaultAlarms());
      wx.setStorageSync(COPY_VER, "1");
    } else {
      const raw = wx.getStorageSync(STORAGE_ALARMS);
      if (!raw || !raw.length) {
        wx.setStorageSync(STORAGE_ALARMS, buildDefaultAlarms());
      }
    }

    try {
      const s = auth.getSession();
      if (s && s.phone) {
        partnerStore.reconcileMerchantApplyFromGateway(org.normalizePhone(s.phone), () => {});
      }
    } catch (e) {
      /* ignore */
    }
  },

  /**
   * 网关联动：终端经 JT/T808 上报告警后由后端调用或 MQTT 同步到端上时可调此方法，写入本地并提示。
   * 正式环境以服务端推送 + 订阅消息为主。
   */
  /** entry：type、typeTag、risk(高|中|低)、smartWhy、desc、suggest、time、address、tone */
  reportAlarm(entry) {
    const STORAGE_ALARMS = "ev_alarms";
    const list = wx.getStorageSync(STORAGE_ALARMS) || [];
    const row = {
      id: "a_" + Date.now(),
      status: "pending",
      tone: "r",
      ...entry,
    };
    list.unshift(row);
    wx.setStorageSync(STORAGE_ALARMS, list.slice(0, 500));
    wx.showToast({ title: "新的防盗报警", icon: "none", duration: 2500 });
  },
});
