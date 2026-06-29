const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const merchantStore = require("../../utils/merchant-store.js");

function maskPhone(p) {
  const s = String(p || "");
  if (s.length !== 11) return s || "—";
  return s.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

/** 商家侧文案：不出现「有效单」等合作商专用术语；本店邀约无平台补贴，勿用「待结算补贴」表述 */
function decorateJob(j) {
  let statusLabel = "";
  /** wait | ready | done */
  let statusTone = "wait";
  const src = j.installSource;
  const referral = src === merchantStore.INSTALL_SOURCE_MERCHANT_REFERRAL;

  if (j.status === "pending_online") {
    statusLabel = "等待设备联网";
    statusTone = "wait";
  }
  if (j.status === "valid") {
    if (referral) {
      statusLabel = "待办结确认";
      statusTone = "ready";
    } else {
      statusLabel = "待结算补贴";
      statusTone = "ready";
    }
  }
  if (j.status === "settled_demo") {
    statusLabel = "已完成";
    statusTone = "done";
  }
  const subsidy = Number(j.subsidyYuan) || 0;
  const cp = Number(j.consumerPayYuan);
  const hasLegacyPay = cp > 0 && !Number.isNaN(cp);
  let serviceTypeLabel = "";
  let econLine = "";
  if (src === "walk_in") {
    serviceTypeLabel = "到店改装 · 平台补贴";
    econLine = subsidy > 0 ? `补贴 ¥${subsidy}（用户不向店内付款）` : "—";
  } else if (src === "merchant_referral") {
    serviceTypeLabel = "本店邀约客户";
    econLine = "线下收款自行协商（系统不记录金额）";
  } else {
    serviceTypeLabel = "历史记录";
    const ord = j.orderAmountYuan != null ? String(j.orderAmountYuan) : "—";
    const sub = j.subsidyYuan != null ? String(j.subsidyYuan) : "—";
    econLine = hasLegacyPay ? `现场收款 ¥${cp}` : `订单 ¥${ord} · 补贴 ¥${sub}`;
  }
  return {
    ...j,
    statusLabel,
    statusTone,
    userPhoneMask: maskPhone(j.userPhone),
    subsidyYuan: j.subsidyYuan != null ? String(j.subsidyYuan) : "0",
    serviceTypeLabel,
    econLine,
    displayTime: j.settledAt || j.createdAt || "",
    settleBtnLabel:
      j.status === "valid" ? (referral ? "确认办结" : "确认补贴结算") : "",
  };
}

function walkInSubsidyDisplay() {
  const par = merchantStore.getWalkInSubsidyParams();
  return {
    walkInSubsidyYuan: merchantStore.getWalkInPlatformSubsidyYuan(),
    walkInSubsidyHint: `基数¥${par.baseYuan}×${par.pct}%`,
  };
}

Page({
  data: {
    ok: false,
    phoneMask: "",
    shopLine: "",
    jobs: [],
    inventory: [],
    fUserPhone: "",
    fCode: "",
    fPlate: "",
    installSegIndex: 0,
    ...walkInSubsidyDisplay(),
  },

  refresh() {
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    const r = p ? org.getRoles(p) : {};
    const ok = !!r.merchant;
    if (!ok) {
      wx.showToast({ title: "无商家权限", icon: "none" });
      setTimeout(() => wx.reLaunch({ url: "/pages/profile/profile" }), 600);
      return;
    }
    const shop = merchantStore.getShopByOwner(p);
    let shopLine = "";
    if (shop && shop.shopName) {
      shopLine = `${shop.shopName}${shop.addressFull ? " · " + shop.addressFull : shop.city ? " · " + shop.city : ""}`;
    } else {
      shopLine = "请完善门店档案";
    }
    merchantStore.syncJobStatuses();
    const jobs = merchantStore.listJobsForMerchant(p).map(decorateJob);
    const inventory = merchantStore.listMerchantInventory(p);
    this.setData({
      ok,
      phoneMask: maskPhone(p),
      shopLine,
      jobs,
      inventory,
      ...walkInSubsidyDisplay(),
    });
  },

  onShow() {
    this.refresh();
  },

  goWallet() {
    wx.navigateTo({ url: "/pages/merchant-wallet/merchant-wallet" });
  },

  goEditShop() {
    wx.navigateTo({ url: "/pages/merchant-apply/merchant-apply?edit=1" });
  },

  scanBindDevice() {
    const s = auth.getSession();
    const mp = s && s.phone ? org.normalizePhone(s.phone) : "";
    if (!mp) return;
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ["qrCode", "barCode"],
      success: (res) => {
        const r = merchantStore.merchantScanBindDevice(mp, res.result || "");
        if (!r.ok) {
          wx.showToast({ title: r.reason || "入库失败", icon: "none" });
          return;
        }
        wx.showToast({ title: "已入库", icon: "success" });
        this.refresh();
      },
      fail: () => wx.showToast({ title: "已取消扫码", icon: "none" }),
    });
  },

  onFUserPhone(e) {
    this.setData({ fUserPhone: e.detail.value });
  },
  onFCode(e) {
    this.setData({ fCode: e.detail.value });
  },
  onFPlate(e) {
    this.setData({ fPlate: e.detail.value });
  },

  setInstallSeg(e) {
    const i = Number(e.currentTarget.dataset.i);
    if (i !== 0 && i !== 1) return;
    this.setData({ installSegIndex: i });
  },

  submitBind() {
    const s = auth.getSession();
    const mp = s && s.phone ? org.normalizePhone(s.phone) : "";
    const installSource =
      this.data.installSegIndex === 1
        ? merchantStore.INSTALL_SOURCE_MERCHANT_REFERRAL
        : merchantStore.INSTALL_SOURCE_WALK_IN;
    const r = merchantStore.submitMerchantBind({
      merchantPhone: mp,
      userPhone: this.data.fUserPhone,
      deviceCode: this.data.fCode,
      plate: this.data.fPlate,
      installSource,
    });
    if (!r.ok) {
      wx.showToast({ title: r.reason || "提交失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已提交", icon: "success" });
    this.setData({ fUserPhone: "", fCode: "", fPlate: "" });
    this.refresh();
  },

  markOnline(e) {
    const id = e.currentTarget.dataset.id;
    const s = auth.getSession();
    const mp = s && s.phone ? org.normalizePhone(s.phone) : "";
    const r = merchantStore.markJobVehicleOnline(mp, id);
    if (!r.ok) {
      wx.showToast({ title: r.reason || "失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已确认联网", icon: "success" });
    this.refresh();
  },

  markSettled(e) {
    const id = e.currentTarget.dataset.id;
    const s = auth.getSession();
    const mp = s && s.phone ? org.normalizePhone(s.phone) : "";
    const r = merchantStore.markJobSettledDemo(mp, id);
    if (!r.ok) {
      wx.showToast({ title: r.reason || "失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "补贴结算已登记", icon: "success" });
    this.refresh();
  },

  toUser() {
    org.setPortalMode("user");
    wx.reLaunch({ url: "/pages/profile/profile" });
  },
});
