const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const partnerStore = require("../../utils/partner-store.js");
const userVipStore = require("../../utils/user-vip-store.js");

const STORAGE_ALARMS = "ev_alarms";
const PROFILE_ROUTE = "pages/profile/profile";

/** 图标区：取前 2 个 Unicode 字符（支持多数表情） */
function clipIcon(s) {
  const t = String(s ?? "").trim();
  if (!t) return "";
  return Array.from(t).slice(0, 2).join("");
}

const PROFILE_UI_DEFAULT = {
  sectionServices: "常用服务",
  tracksIcon: "行",
  tracksName: "行车记录",
  alarmIcon: "警",
  alarmName: "防盗报警",
  fenceIcon: "围",
  fenceName: "电子围栏",
  authIcon: "权",
  authName: "授权管理",
  sectionMall: "智控商城与升级",
  mallIcon: "商",
  mallName: "智控商城",
  shopsIcon: "网",
  shopsName: "智控升级网点",
  sectionPartner: "合作与拓展",
  inviteIcon: "邀",
  inviteName: "邀请好友",
  applyIcon: "渠",
  applyName: "合作商申请",
  mgmtIcon: "管",
  mgmtName: "后台管理",
  superIcon: "绑",
  superName: "绑定管理",
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
    sectionMall: rs("profileSectionMallTitle", d.sectionMall),
    mallIcon: clipIcon(rs("profileMallEntryIcon", d.mallIcon)),
    mallName: rs("profileMallEntryName", d.mallName),
    shopsIcon: clipIcon(rs("profileShopsEntryIcon", d.shopsIcon)),
    shopsName: rs("profileShopsEntryName", d.shopsName),
    sectionPartner: rs("profileSectionPartnerTitle", d.sectionPartner),
    inviteIcon: clipIcon(rs("profilePartnerInviteIcon", d.inviteIcon)),
    inviteName: rs("profilePartnerInviteName", d.inviteName),
    applyIcon: clipIcon(rs("profilePartnerApplyIcon", d.applyIcon)),
    applyName: rs("profilePartnerApplyName", d.applyName),
    mgmtIcon: clipIcon(rs("profilePartnerMgmtIcon", d.mgmtIcon)),
    mgmtName: rs("profilePartnerMgmtName", d.mgmtName),
    superIcon: clipIcon(rs("profilePartnerSuperIcon", d.superIcon)),
    superName: rs("profilePartnerSuperName", d.superName),
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

function emptyVipInline() {
  return { active: false };
}

Page({
  data: {
    navPadTop: 88,
    isLoggedIn: false,
    user: { name: "游客", id: "—", avatarText: "游", role: "未登录" },
    bindLine: "",
    alarmPending: 0,
    showMgmtPortal: false,
    showSuper: false,
    vipInline: emptyVipInline(),
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
        showMgmtPortal: false,
        showSuper: false,
        vipInline: emptyVipInline(),
      });
      return;
    }

    const s = session;
    const id = s.phone || "—";
    const name = s.name || (s.phone ? `用户${s.phone.slice(-4)}` : "用户");
    const p = org.normalizePhone(s.phone);
    const r = p ? org.getRoles(p) : {};
    const up = p ? org.getUpline(p) : null;
    const bits = [];
    if (s.role === "main") bits.push("主账号");
    else bits.push("授权用户");
    if (r.partner) bits.push("合作商");
    else if (partnerStore.isPartnerStaff(p)) bits.push(partnerStore.getStaffTierLabel(p));
    if (r.merchant) bits.push("商家");
    if (org.isSuperAdmin(p)) bits.push("超管");

    let bindLine = "";
    if (up && up.inviterPhone) {
      const m = up.inviterPhone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
      bindLine = `邀请关系：上级 ${m} · 绑定车牌 ${up.plate || "—"}`;
    }

    const summary = p ? userVipStore.getUserVipSummary(p) : userVipStore.getUserVipSummary("");
    const vipInline = { active: !!summary.vipActive };

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
      showMgmtPortal: partnerStore.canAccessMgmtPortal(p),
      showSuper: org.isSuperAdmin(p),
      vipInline,
    });
  },

  go(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.navigateTo({ url });
  },

  goLogin() {
    wx.reLaunch({ url: "/pages/home/home" });
  },

  goVipCenter() {
    wx.navigateTo({ url: "/pages/vip-center/vip-center" });
  },

  openMgmtPortal() {
    wx.navigateTo({ url: "/pages/mgmt-portal/mgmt-portal" });
  },

  logoutDemo() {
    wx.showModal({
      title: "退出登录",
      content: "演示版将清除本机登录态并返回首页登录界面。",
      confirmText: "退出",
      success: (res) => {
        if (!res.confirm) return;
        auth.clearSession();
        wx.reLaunch({ url: "/pages/home/home" });
      },
    });
  },
});
