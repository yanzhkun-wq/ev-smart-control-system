const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");

const STORAGE_ALARMS = "ev_alarms";
const PROFILE_ROUTE = "pages/profile/profile";

function clipIcon(s) {
  const t = String(s ?? "").trim();
  if (!t) return "";
  return Array.from(t).slice(0, 2).join("");
}

const PROFILE_UI_DEFAULT = {
  sectionServices: "安全服务",
  tracksIcon: "行",
  tracksName: "行车轨迹",
  alarmIcon: "警",
  alarmName: "防盗报警",
  fenceIcon: "围",
  fenceName: "电子围栏",
  authIcon: "权",
  authName: "授权管理",
  sectionHardware: "兼容硬件",
  hardwareIcon: "硬",
  hardwareName: "兼容硬件参考",
  sectionSystem: "系统",
  sysLoginIcon: "登",
  sysLoginTitle: "登录账号",
  sysAccountIcon: "户",
  sysAccountTitle: "账号设置",
  sysNotifyIcon: "讯",
  sysNotifyTitle: "通知设置",
  sysLogoutIcon: "出",
  sysLogoutTitle: "退出登录（演示）",
};

function readProfileUi() {
  let rs;
  try {
    const app = getApp();
    rs = app && app.remoteUi ? (k, fb) => app.remoteUi.getString(PROFILE_ROUTE, k, fb) : (_k, fb) => fb;
  } catch (e) {
    rs = (_k, fb) => fb;
  }
  const d = PROFILE_UI_DEFAULT;
  return {
    sectionServices: rs("profileSectionServicesTitle", d.sectionServices),
    tracksIcon: clipIcon(rs("profileSvcTracksIcon", d.tracksIcon)),
    tracksName: rs("profileSvcTracksName", d.tracksName),
    alarmIcon: clipIcon(rs("profileSvcAlarmIcon", d.alarmIcon)),
    alarmName: rs("profileSvcAlarmName", d.alarmName),
    fenceIcon: clipIcon(rs("profileSvcFenceIcon", d.fenceIcon)),
    fenceName: rs("profileSvcFenceName", d.fenceName),
    authIcon: clipIcon(rs("profileSvcAuthIcon", d.authIcon)),
    authName: rs("profileSvcAuthName", d.authName),
    sectionHardware: rs("profileSectionHardwareTitle", d.sectionHardware),
    hardwareIcon: clipIcon(rs("profileHardwareEntryIcon", d.hardwareIcon)),
    hardwareName: rs("profileHardwareEntryName", d.hardwareName),
    sectionSystem: rs("profileSectionSystemTitle", d.sectionSystem),
    sysLoginIcon: clipIcon(rs("profileSysLoginIcon", d.sysLoginIcon)),
    sysLoginTitle: rs("profileSysLoginTitle", d.sysLoginTitle),
    sysAccountIcon: clipIcon(rs("profileSysAccountIcon", d.sysAccountIcon)),
    sysAccountTitle: rs("profileSysAccountTitle", d.sysAccountTitle),
    sysNotifyIcon: clipIcon(rs("profileSysNotifyIcon", d.sysNotifyIcon)),
    sysNotifyTitle: rs("profileSysNotifyTitle", d.sysNotifyTitle),
    sysLogoutIcon: clipIcon(rs("profileSysLogoutIcon", d.sysLogoutIcon)),
    sysLogoutTitle: rs("profileSysLogoutTitle", d.sysLogoutTitle),
  };
}

Page({
  data: {
    navPadTop: 88,
    isLoggedIn: false,
    user: { name: "游客", id: "—", avatarText: "游", role: "未登录" },
    bindLine: "",
    alarmPending: 0,
    showSuper: false,
    ui: readProfileUi(),
  },

  onLoad() {
    this.syncNavPad();
  },

  syncNavPad() {
    let top = 96;
    try {
      const sys = wx.getSystemInfoSync();
      const menu = wx.getMenuButtonBoundingClientRect();
      const sb = sys.statusBarHeight || 20;
      if (menu && typeof menu.bottom === "number" && menu.bottom > 0) {
        top = menu.bottom + 16;
      } else {
        top = sb + 48 + 16;
      }
    } catch (e) {
      /* ignore */
    }
    if (this.data.navPadTop !== top) {
      this.setData({ navPadTop: top });
    }
  },

  onShow() {
    this.syncNavPad();
    const session = auth.getSession();
    const isLoggedIn = !!session;
    this._refreshBody(isLoggedIn, session);
    this.setData({ ui: readProfileUi() });
    try {
      getApp().remoteUi.refreshFromGateway(() => {
        this.setData({ ui: readProfileUi() });
      });
    } catch (e) {
      /* ignore */
    }
  },

  _refreshBody(isLoggedIn, session) {
    const raw = wx.getStorageSync(STORAGE_ALARMS) || [];
    const alarmPending = raw.filter((a) => a.status === "pending").length;

    if (!isLoggedIn) {
      this.setData({
        isLoggedIn: false,
        user: { name: "游客", id: "—", avatarText: "游", role: "未登录" },
        bindLine: "",
        alarmPending,
        showSuper: false,
      });
      return;
    }

    const s = session;
    const id = s.phone || "—";
    const name = s.name || (s.phone ? `用户${s.phone.slice(-4)}` : "用户");
    const p = org.normalizePhone(s.phone);
    const bits = [];
    if (s.role === "main") bits.push("主账号");
    else bits.push("授权用户");
    if (org.isSuperAdmin(p)) bits.push("管理员");

    let bindLine = "";

    this.setData({
      isLoggedIn: true,
      user: {
        name,
        id,
        avatarText: (name && name[0]) || "用",
        role: bits.join(" · "),
      },
      bindLine,
      alarmPending,
      showSuper: org.isSuperAdmin(p),
    });
  },

  go(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.navigateTo({ url });
  },

  goLogin() {
    wx.reLaunch({ url: "/pages/home/home" });
  },

  logoutDemo() {
    wx.showModal({
      title: "退出登录",
      content: "演示版将清除本机登录态并返回首页。",
      confirmText: "退出",
      success: (res) => {
        if (!res.confirm) return;
        auth.clearSession();
        wx.reLaunch({ url: "/pages/home/home" });
      },
    });
  },
});
