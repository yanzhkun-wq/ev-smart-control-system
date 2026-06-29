const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const userVipStore = require("../../utils/user-vip-store.js");

const VIP_ROUTE = "pages/vip-center/vip-center";

function rs(key, fallback) {
  try {
    return getApp().remoteUi.getString(VIP_ROUTE, key, fallback);
  } catch (e) {
    return fallback;
  }
}

Page({
  data: {
    needLogin: false,
    loadErr: "",
    gateOk: false,
    vipActive: false,
    isSuper: false,
    statusTitle: "",
    statusSub: "",
    inviteHint: "",
    payPriceStr: "36.5",
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    try {
      const s = auth.getSession();
      if (!s || !s.phone) {
        this.setData({
          needLogin: true,
          loadErr: "",
          gateOk: false,
          vipActive: false,
          isSuper: false,
          statusTitle: "",
          statusSub: "",
          inviteHint: "",
          payPriceStr: String(userVipStore.VIP_PAY_YEAR_YUAN),
        });
        return;
      }

      const p = org.normalizePhone(s.phone);
      const summary = userVipStore.getUserVipSummary(p);
      const gateOk = userVipStore.canUseVipGatedFeatures(p);
      const isSuper = org.isSuperAdmin(p);
      const vipActive = !!summary.vipActive;
      const payPriceStr = String(userVipStore.VIP_PAY_YEAR_YUAN);

      let statusTitle = rs("titleNotOpen", "尚未开通 VIP");
      let statusSub =
        summary.vipOrderHint || rs("subNotOpen", "邀请好友完成绑定并入网，达标即可开通。");

      if (!gateOk && !isSuper) {
        const payTail = rs(
          "paySuffix",
          ` 也可直接付费 ¥${payPriceStr}/年 立即开通。`
        );
        statusSub = `${statusSub}${payTail}`;
      }

      if (gateOk) {
        if (isSuper) {
          statusTitle = rs("titleSuper", "权益已解锁");
          statusSub = rs(
            "subSuper",
            "演示超管可使用电子围栏与多账号授权（正式环境以平台规则为准）。"
          );
        } else if (vipActive) {
          statusTitle = summary.vipHeadline || rs("titleVipActive", "VIP 已开通");
          statusSub = `有效期至 ${summary.vipUntilStr}`;
        }
      }

      this.setData({
        needLogin: false,
        loadErr: "",
        gateOk,
        vipActive,
        isSuper,
        statusTitle,
        statusSub,
        inviteHint: summary.vipOrderHint || "",
        payPriceStr,
      });
    } catch (err) {
      const msg = err && err.message ? String(err.message) : "未知错误";
      console.error("[vip-center]", err);
      this.setData({
        needLogin: false,
        loadErr: msg,
        gateOk: false,
      });
    }
  },

  goFence() {
    if (!this.data.gateOk) {
      wx.showToast({ title: "开通 VIP 后即可使用", icon: "none" });
      return;
    }
    wx.navigateTo({ url: "/pages/fence-edit/fence-edit" });
  },

  goAuth() {
    if (!this.data.gateOk) {
      wx.showToast({ title: "开通 VIP 后即可使用", icon: "none" });
      return;
    }
    wx.navigateTo({ url: "/pages/auth/auth" });
  },

  goInvite() {
    wx.navigateTo({ url: "/pages/share-app/share-app" });
  },

  onPayYear() {
    if (this.data.isSuper) return;
    const price = this.data.payPriceStr || String(userVipStore.VIP_PAY_YEAR_YUAN);
    wx.showModal({
      title: this.data.gateOk ? "续费 VIP" : "开通 VIP",
      content: `确认支付 ¥${price}，购买 1 年 VIP？\n（演示版为模拟支付，未对接真实微信商户。）`,
      confirmText: "确认支付",
      success: (res) => {
        if (!res.confirm) return;
        const s = auth.getSession();
        if (!s || !s.phone) return;
        const p = org.normalizePhone(s.phone);
        const r = userVipStore.addOneYearVipAfterPaidDemo(p);
        if (!r.ok) {
          wx.showToast({ title: "操作失败", icon: "none" });
          return;
        }
        wx.showToast({ title: "已开通 1 年", icon: "success" });
        this.refresh();
      },
    });
  },

  goHome() {
    wx.reLaunch({ url: "/pages/home/home" });
  },
});
