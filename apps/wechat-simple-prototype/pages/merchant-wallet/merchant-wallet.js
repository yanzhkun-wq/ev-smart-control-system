const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const merchantStore = require("../../utils/merchant-store.js");
const partnerStore = require("../../utils/partner-store.js");
const portalCap = require("../../utils/portal-capabilities.js");

Page({
  data: {
    demoMode: false,
    ok: false,
    loadError: "",
    phone: "",
    shopLine: "",
    wallet: {
      accruedLifetimeYuan: 0,
      withdrawnPaidYuan: 0,
      pendingOutYuan: 0,
      availableYuan: 0,
    },
    amountInput: "",
    myList: [],
    incomeLedger: [],
    minWithdraw: merchantStore.MIN_MERCHANT_WITHDRAW_YUAN,
    payoutBound: false,
    bindTitle: "",
    bindSubtitle: "",
  },

  onLoad(options) {
    this._demoMode = !!(options && options.demo === "1");
    this.setData({ demoMode: this._demoMode });
  },

  retryRefresh() {
    this.setData({ loadError: "" });
    this.refresh();
  },

  refresh() {
    try {
      if (this._demoMode) {
        const s = auth.getSession();
        const p = s && s.phone ? org.normalizePhone(s.phone) : "";
        const mask = (x) =>
          x && String(x).length === 11 ? String(x).replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : "—";
        const minWithdraw =
          partnerStore.MIN_WITHDRAW_YUAN != null ? partnerStore.MIN_WITHDRAW_YUAN : merchantStore.MIN_MERCHANT_WITHDRAW_YUAN;
        const demoSub = merchantStore.getWalkInPlatformSubsidyYuan();
        this.setData({
          ok: true,
          loadError: "",
          phone: p || "",
          shopLine: "海淀·极客电动车改装 · 中关村大街（示例门店）",
          wallet: {
            accruedLifetimeYuan: demoSub * 2,
            withdrawnPaidYuan: demoSub,
            pendingOutYuan: 0,
            availableYuan: demoSub,
          },
          amountInput: "",
          myList: [],
          incomeLedger: [
            {
              id: "demo_inc_1",
              plate: "京A·88888",
              subsidyYuanStr: String(demoSub),
              kindLabel: "到店平台补贴（演示）",
              detailLine: "演示入账 · 非真实结算",
              settledAt: "2026-04-21 16:00",
              creditsWallet: true,
              userPhoneMask: mask("13900008888"),
            },
          ],
          minWithdraw,
          payoutBound: true,
          bindTitle: "微信零钱（示意）",
          bindSubtitle: "从网点工作台预览进入 · 非真实绑定",
        });
        return;
      }

      const s = auth.getSession();
      const p = s && s.phone ? org.normalizePhone(s.phone) : "";
      const r = p ? org.getRoles(p) : {};
      if (!r.merchant) {
        this.setData({
          ok: false,
          loadError: "当前账号不是商家身份，请在演示数据中授予商家权限或由邀请入驻开通。",
        });
        return;
      }
      if (!portalCap.can(p, "merchant_wallet")) {
        this.setData({
          ok: false,
          loadError: "管理员已在后台关闭商家钱包相关能力。",
        });
        return;
      }
      const shop = merchantStore.getShopByOwner(p);
      const shopLine = shop && shop.shopName ? `${shop.shopName} · ${shop.addressFull || shop.city || "—"}` : "";
      const wallet = merchantStore.getMerchantWalletSummary(p);
      const myList = merchantStore.listMerchantWithdrawals(p);
      const incomeLedger = merchantStore.listMerchantIncomeLedger(p);
      const minWithdraw =
        partnerStore.MIN_WITHDRAW_YUAN != null ? partnerStore.MIN_WITHDRAW_YUAN : merchantStore.MIN_MERCHANT_WITHDRAW_YUAN;
      const bind = partnerStore.getPayoutBindSummary(p);

      this.setData({
        ok: true,
        loadError: "",
        phone: p || "",
        shopLine,
        wallet,
        myList,
        incomeLedger,
        minWithdraw,
        payoutBound: bind.bound,
        bindTitle: bind.title,
        bindSubtitle: bind.subtitle,
      });
    } catch (e) {
      this.setData({
        ok: false,
        loadError: (e && e.message) || "加载失败",
      });
    }
  },

  onShow() {
    this.refresh();
  },

  openPayoutBind() {
    if (this._demoMode) {
      wx.showToast({ title: "收款账户为预览示意", icon: "none" });
      return;
    }
    wx.navigateTo({ url: "/pages/partner-payout-bind/partner-payout-bind" });
  },

  onAmountInput(e) {
    this.setData({ amountInput: e.detail.value });
  },

  fillAll() {
    const a = this.data.wallet.availableYuan;
    this.setData({ amountInput: a > 0 ? String(a) : "" });
  },

  submitWithdraw() {
    if (this._demoMode) {
      wx.showToast({ title: "提现为预览流程", icon: "none" });
      return;
    }
    if (!this.data.payoutBound) {
      wx.showToast({ title: "请先绑定收款账户", icon: "none" });
      return;
    }
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    const raw = this.data.amountInput;
    const r = merchantStore.requestMerchantWithdrawal(p, raw);
    if (!r.ok) {
      wx.showToast({ title: r.reason || "失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已提交申请", icon: "success" });
    this.setData({ amountInput: "" });
    this.refresh();
  },

  toMerchantHome() {
    if (this._demoMode) {
      wx.navigateBack({
        fail: () =>
          wx.redirectTo({ url: "/pages/merchant-backend-demo/merchant-backend-demo" }),
      });
      return;
    }
    wx.navigateBack({ fail: () => wx.redirectTo({ url: "/pages/merchant-admin/merchant-admin" }) });
  },
});
