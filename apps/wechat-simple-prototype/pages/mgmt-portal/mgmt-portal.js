const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const partnerStore = require("../../utils/partner-store.js");
const portalCap = require("../../utils/portal-capabilities.js");

const PARENT_ROOT = partnerStore.PARENT_ROOT;

function maskPhone(p) {
  const s = String(p || "");
  if (s.length !== 11) return s || "—";
  return s.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

/** 正式版 release：登录后仍自动进对应后台；开发/体验版展示演示入口中心 */
function shouldShowMgmtHub() {
  try {
    const { miniProgram } = wx.getAccountInfoSync();
    return miniProgram.envVersion !== "release";
  } catch (e) {
    return true;
  }
}

Page({
  data: {
    state: "loading",
    routeErr: "",
    isPrincipal: false,
    sessionMask: "",
    tierLabel: "",
    staffL1: [],
    staffL2: [],
  },

  openAdminTarget(url) {
    const onFail = (err) => {
      this.setData({
        state: "route_fail",
        routeErr: (err && err.errMsg) || "无法打开后台页，请确认 app.json 已注册该路径并重新编译",
      });
    };
    wx.navigateTo({
      url,
      fail: () => {
        wx.redirectTo({
          url,
          fail: () => {
            wx.reLaunch({
              url,
              fail: (e3) => onFail(e3),
            });
          },
        });
      },
    });
  },

  onShow() {
    this.setData({ state: "loading", routeErr: "" });
    const s = auth.getSession();
    if (!s || !s.phone) {
      this.setData({ state: "need_login" });
      return;
    }
    const p = org.normalizePhone(s.phone);
    if (!partnerStore.canAccessMgmtPortal(p)) {
      this.setData({ state: "denied" });
      return;
    }
    if (!portalCap.can(p, "mgmt_portal")) {
      this.setData({ state: "denied" });
      return;
    }
    const r = org.getRoles(p);
    const goPartner = partnerStore.canAccessPartnerPortal(p);

    if (goPartner && shouldShowMgmtHub()) {
      org.setPortalMode("partner");
      const isPrincipal = partnerStore.isPrincipalPartner(p);
      let staffL1 = [];
      let staffL2 = [];
      if (isPrincipal) {
        staffL1 = partnerStore.listL1StaffForRoot(p).map((x) => ({
          ...x,
          phoneMask: maskPhone(x.phone),
        }));
        staffL2 = partnerStore.listL2StaffForRoot(p).map((x) => ({
          ...x,
          phoneMask: maskPhone(x.phone),
          parentHint:
            x.parentL1Phone === PARENT_ROOT ? "主管直线" : maskPhone(x.parentL1Phone),
        }));
      }
      this.setData({
        state: "hub",
        isPrincipal,
        sessionMask: maskPhone(p),
        tierLabel: partnerStore.getStaffTierLabel(p),
        staffL1,
        staffL2,
      });
      return;
    }

    if (goPartner) {
      org.setPortalMode("partner");
      if (partnerStore.isPrincipalPartner(p)) {
        this.openAdminTarget("/pages/partner-admin/partner-admin");
      } else {
        this.openAdminTarget("/pages/partner-staff-admin/partner-staff-admin");
      }
      return;
    }
    if (r.merchant) {
      org.setPortalMode("merchant");
      this.openAdminTarget("/pages/merchant-admin/merchant-admin");
      return;
    }
    this.setData({ state: "denied" });
  },

  openPrincipalAdmin() {
    this.openAdminTarget("/pages/partner-admin/partner-admin");
  },

  openMerchantBackendDemo() {
    wx.navigateTo({
      url: "/pages/merchant-backend-demo/merchant-backend-demo",
    });
  },

  openMyStaffWorkbench() {
    this.openAdminTarget("/pages/partner-staff-admin/partner-staff-admin");
  },

  previewStaffWorkbench(e) {
    const ph = e.currentTarget.dataset.phone;
    if (!ph) return;
    wx.navigateTo({
      url: `/pages/partner-staff-admin/partner-staff-admin?preview=${encodeURIComponent(ph)}`,
    });
  },

  goHome() {
    wx.reLaunch({ url: "/pages/profile/profile" });
  },

  goProfile() {
    wx.reLaunch({ url: "/pages/profile/profile" });
  },

  retryPortal() {
    this.onShow();
  },
});
