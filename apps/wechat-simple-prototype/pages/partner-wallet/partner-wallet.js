const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const partnerStore = require("../../utils/partner-store.js");
const portalCap = require("../../utils/portal-capabilities.js");

Page({
  data: {
    ok: false,
    loadError: "",
    phone: "",
    rootPhone: "",
    rootMask: "",
    isPrincipal: false,
    tierLabel: "",
    wallet: {
      accruedLifetimeYuan: 0,
      withdrawnPaidYuan: 0,
      pendingOutYuan: 0,
      availableYuan: 0,
    },
    amountInput: "",
    myList: [],
    minWithdraw: partnerStore.MIN_WITHDRAW_YUAN,
    payoutBound: false,
    bindTitle: "",
    bindSubtitle: "",
  },

  retryRefresh() {
    this.setData({ loadError: "" });
    this.refresh();
  },

  refresh() {
    try {
      const s = auth.getSession();
      const p = s && s.phone ? org.normalizePhone(s.phone) : "";
      const root = partnerStore.getPartnerRoot(p);
      if (!root) {
        this.setData({
          ok: false,
          loadError: "当前账号不在合作商体系内。",
        });
        return;
      }
      if (!partnerStore.ensureInPartnerTree(root, p)) {
        this.setData({ ok: false, loadError: "无权访问钱包。" });
        return;
      }
      if (!portalCap.can(p, "partner_wallet")) {
        this.setData({
          ok: false,
          loadError: "管理员已在后台关闭合作商钱包相关能力。",
        });
        return;
      }
      const isPrincipal = partnerStore.isPrincipalPartner(p);
      const tierLabel = partnerStore.getStaffTierLabel(p);
      const wallet = partnerStore.getPartnerWalletSummary(root, p);
      const myList = partnerStore.listMyWithdrawals(root, p);
      const pendingList = isPrincipal ? partnerStore.listPendingWithdrawalsForPrincipal(root) : [];
      const bind = partnerStore.getPayoutBindSummary(p);

      function maskPhone(pm) {
        const s = String(pm || "");
        if (s.length !== 11) return s || "—";
        return s.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
      }

      this.setData({
        ok: true,
        loadError: "",
        phone: p,
        rootPhone: root,
        rootMask: maskPhone(root),
        isPrincipal,
        tierLabel,
        wallet,
        myList,
        pendingList,
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
    if (!this.data.payoutBound) {
      wx.showToast({ title: "请先绑定收款账户", icon: "none" });
      return;
    }
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    const raw = this.data.amountInput;
    const r = partnerStore.requestPartnerWithdrawal(p, raw);
    if (!r.ok) {
      wx.showToast({ title: r.reason || "失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已提交申请", icon: "success" });
    this.setData({ amountInput: "" });
    this.refresh();
  },

  toUser() {
    org.setPortalMode("user");
    wx.reLaunch({ url: "/pages/home/home" });
  },
});
