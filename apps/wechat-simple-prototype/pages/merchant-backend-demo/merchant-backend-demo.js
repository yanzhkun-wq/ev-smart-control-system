const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const merchantStore = require("../../utils/merchant-store.js");
const partnerStore = require("../../utils/partner-store.js");

function maskPhone(p) {
  const s = String(p || "");
  if (s.length !== 11) return s || "—";
  return s.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

function decorateJob(j) {
  let statusLabel = "";
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

const DEMO_SUBSIDY = merchantStore.getWalkInPlatformSubsidyYuan();

function walkInSubsidyDisplay() {
  const par = merchantStore.getWalkInSubsidyParams();
  return {
    walkInSubsidyYuan: merchantStore.getWalkInPlatformSubsidyYuan(),
    walkInSubsidyHint: `基数¥${par.baseYuan}×${par.pct}%`,
  };
}

const DEMO_JOBS = [
  {
    id: "demo_job_pending",
    userPhone: "13700001111",
    plate: "粤C·12345",
    status: "pending_online",
    installSource: "walk_in",
    subsidyYuan: DEMO_SUBSIDY,
    createdAt: "2026-04-27 10:00",
  },
  {
    id: "demo_job_1",
    userPhone: "13900008888",
    plate: "京A·88888",
    status: "settled_demo",
    installSource: "walk_in",
    subsidyYuan: DEMO_SUBSIDY,
    settledAt: "2026-04-21 16:00",
  },
  {
    id: "demo_job_2",
    userPhone: "13800006666",
    plate: "沪B·66666",
    status: "valid",
    installSource: "merchant_referral",
    subsidyYuan: 0,
    createdAt: "2026-04-26 09:10",
  },
];

Page({
  data: {
    demoPreview: false,
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

  onUnload() {
    this._demoSession = null;
  },

  ensureDemoSession() {
    if (!this._demoSession) {
      this._demoSession = {
        jobs: DEMO_JOBS.map((j) => ({ ...j })),
        inventory: [{ id: "demo_inv_1", deviceCode: "DEMO-GPS-001" }],
      };
    }
  },

  applyDemoSnapshotToPage() {
    if (!this._demoSession) return;
    this.setData({
      jobs: this._demoSession.jobs.map(decorateJob),
      inventory: [...this._demoSession.inventory],
    });
  },

  refresh() {
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    if (!p || !partnerStore.canAccessMgmtPortal(p)) {
      wx.showToast({ title: "无权限", icon: "none" });
      setTimeout(() => wx.navigateBack(), 500);
      return;
    }
    const r = org.getRoles(p);
    if (r.merchant) {
      this._demoSession = null;
      merchantStore.syncJobStatuses();
      const shop = merchantStore.getShopByOwner(p);
      let shopLine = "";
      if (shop && shop.shopName) {
        shopLine = `${shop.shopName}${shop.addressFull ? " · " + shop.addressFull : shop.city ? " · " + shop.city : ""}`;
      } else {
        shopLine = "请完善门店档案";
      }
      const jobs = merchantStore.listJobsForMerchant(p).map(decorateJob);
      const inventory = merchantStore.listMerchantInventory(p);
      this.setData({
        ok: true,
        demoPreview: false,
        phoneMask: maskPhone(p),
        shopLine,
        jobs,
        inventory,
        ...walkInSubsidyDisplay(),
      });
      return;
    }
    this.ensureDemoSession();
    this.setData({
      ok: true,
      demoPreview: true,
      phoneMask: maskPhone(p),
      shopLine: "海淀·极客电动车改装 · 中关村大街",
      jobs: this._demoSession.jobs.map(decorateJob),
      inventory: [...this._demoSession.inventory],
      ...walkInSubsidyDisplay(),
    });
  },

  onShow() {
    this.refresh();
  },

  goWallet() {
    const q = this.data.demoPreview ? "?demo=1" : "";
    wx.navigateTo({ url: `/pages/merchant-wallet/merchant-wallet${q}` });
  },

  goEditShop() {
    const q = this.data.demoPreview ? "?edit=1&demo=1" : "?edit=1";
    wx.navigateTo({ url: `/pages/merchant-apply/merchant-apply${q}` });
  },

  scanBindDevice() {
    if (this.data.demoPreview) {
      this.ensureDemoSession();
      const code = `SCAN-${Date.now().toString(36).slice(-8)}`;
      this._demoSession.inventory.push({
        id: `inv_${Date.now()}`,
        deviceCode: code,
      });
      this.applyDemoSnapshotToPage();
      wx.showToast({ title: "设备已入库", icon: "success" });
      return;
    }
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
        wx.showToast({ title: "设备已入库", icon: "success" });
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
    if (this.data.demoPreview) {
      const ok =
        String(this.data.fUserPhone || "").trim().length >= 11 &&
        String(this.data.fCode || "").trim() &&
        String(this.data.fPlate || "").trim();
      if (!ok) {
        wx.showToast({ title: "请填写手机号、设备编码与车牌", icon: "none" });
        return;
      }
      wx.showToast({ title: "已提交登记", icon: "success" });
      this.setData({ fUserPhone: "", fCode: "", fPlate: "" });
      return;
    }
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
    if (this.data.demoPreview) {
      this.ensureDemoSession();
      const row = this._demoSession.jobs.find((x) => x.id === id);
      if (!row || row.status !== "pending_online") return;
      row.status = "valid";
      this.applyDemoSnapshotToPage();
      wx.showToast({ title: "已确认联网", icon: "success" });
      return;
    }
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
    if (this.data.demoPreview) {
      this.ensureDemoSession();
      const row = this._demoSession.jobs.find((x) => x.id === id);
      if (!row || row.status !== "valid") return;
      row.status = "settled_demo";
      const d = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      row.settledAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      this.applyDemoSnapshotToPage();
      const referral = row.installSource === merchantStore.INSTALL_SOURCE_MERCHANT_REFERRAL;
      wx.showToast({ title: referral ? "办结已登记" : "结算已登记", icon: "success" });
      return;
    }
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
    wx.reLaunch({ url: "/pages/home/home" });
  },
});
