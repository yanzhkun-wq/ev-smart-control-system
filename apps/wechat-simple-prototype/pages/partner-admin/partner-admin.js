const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const partnerStore = require("../../utils/partner-store.js");

const PARENT_ROOT = partnerStore.PARENT_ROOT;

function mask(p) {
  const s = String(p || "");
  if (s.length !== 11) return s || "—";
  return s.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

function decorateApp(a) {
  const d = a.shopDraft || {};
  return {
    ...a,
    merchantMask: mask(a.merchantPhone),
    inviterMask: mask(a.inviterStaffPhone),
    shopTitle: d.shopName || "（未命名门店）",
  };
}

function decorateReward(r) {
  return {
    ...r,
    merchantMask: mask(r.merchantPhone),
    inviterMask: mask(r.inviterStaffPhone),
    orderAmountYuan: r.orderAmountYuan != null ? String(r.orderAmountYuan) : "—",
    rewardYuan: r.rewardYuan != null ? String(r.rewardYuan) : "—",
  };
}

Page({
  data: {
    ok: false,
    loadError: "",
    activeTab: 0,
    detailTab: "flow",
    phone: "",
    rootPhone: "",
    isPrincipal: false,
    tierLabel: "",
    dashboard: null,
    incomeRows: [],
    staffL1: [],
    staffL2: [],
    pendingApps: [],
    newStaffPhone: "",
    newStaffName: "",
    newTier: "L1",
    parentPickerRange: [],
    parentPickerIndex: 0,
    pendingCount: 0,
    incomeCount: 0,
    periodPreset: "today",
    customStart: "",
    customEnd: "",
    periodLabel: "今日",
    periodStats: {
      rewardTotal: 0,
      orderAmountTotal: 0,
      newUsers: 0,
      newMerchants: 0,
      settleCount: 0,
      staffCommissionPctSum: 0,
      principalPct: 100,
      principalRetain: 0,
      rootLineReward: 0,
      teamLineReward: 0,
      memberShares: [],
      myShare: { role: "", amount: 0, hint: "" },
    },
    partnerRateLabel: "15%",
    newStaffPct: "0",
    inviteLedger: [],
    inviteLedgerCount: 0,
    walletAvailable: "0",
    walletPendingOut: "0",
    tierSummary: null,
    newStaffTarget: "",
    phoneMask: "",
    rootMask: "",
    directRewardRows: [],
    teamRewardRows: [],
    overviewPerfSide: "",
    partnerInviteRewards: [],
    partnerInviteRewardsCount: 0,
    demoPartnerAgencyFeeYuan: "100",
  },

  onLoad() {
    wx.showShareMenu({ withShareTicket: true, menus: ["shareAppMessage"] });
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
          loadError: "当前账号不在合作商体系内，或未完成合作商开通。",
        });
        return;
      }
      const isPrincipal = partnerStore.isPrincipalPartner(p);
      const tierLabel = partnerStore.getStaffTierLabel(p);
      const dashboard = partnerStore.getPartnerDashboard(root);
      const incomeAll = partnerStore.listEnrichedRewardsForRoot(root, 0).map(decorateReward);
      const pendingApps = partnerStore.listPendingApplicationsForRoot(root).map(decorateApp);
      const staffL1 = partnerStore.listL1StaffForRoot(root);
      const staffL2 = partnerStore.listL2StaffForRoot(root);

      const parentPickerRange = [
        { label: "挂靠：主管直线（未划给一级）", value: PARENT_ROOT },
        ...staffL1.map((x) => ({ label: `挂靠：一级 ${x.displayName} ${x.phone}`, value: x.phone })),
      ];

      const partnerRateLabel = partnerStore.getPartnerRewardRateLabel(root);
      const tierSummary = partnerStore.getPartnerTierSummary(root);

      const today = partnerStore.formatDateYMD(new Date());
      const inviteLedgerAll = partnerStore.listInviteLedgerForRoot(root);
      const inviteLedger = inviteLedgerAll.filter((row) => row.kind === "商家");
      const wsum = partnerStore.getPartnerWalletSummary(root, p);

      const pipRaw = isPrincipal ? partnerStore.listPartnerInvitePartnerRewardsForInviter(p, 80) : [];
      const partnerInviteRewards = pipRaw.map((row) => ({
        ...row,
        inviteeMask: mask(row.inviteePrincipalPhone),
        agencyFeeYuan: row.agencyFeeYuan != null ? String(row.agencyFeeYuan) : "—",
        referralYuan: row.referralYuan != null ? String(row.referralYuan) : "—",
        tierDiffYuan: row.tierDiffYuan != null ? String(row.tierDiffYuan) : "—",
        totalYuan: row.totalYuan != null ? String(row.totalYuan) : "—",
      }));

      let activeTab = this.data.activeTab || 0;
      let detailTab = this.data.detailTab || "flow";
      if (activeTab === 4) {
        activeTab = 2;
        detailTab = "ledger";
      } else if (activeTab > 3) {
        activeTab = 0;
      }

      this.setData(
        {
          ok: true,
          loadError: "",
          activeTab,
          detailTab,
          phone: p || "",
          phoneMask: mask(p || ""),
          rootMask: mask(root || ""),
          rootPhone: root,
          isPrincipal,
          tierLabel,
          dashboard,
          partnerRateLabel,
          incomeRows: incomeAll,
          incomeCount: incomeAll.length,
          staffL1,
          staffL2,
          parentPickerRange,
          pendingApps,
          pendingCount: pendingApps.length,
          customStart: this.data.customStart || today,
          customEnd: this.data.customEnd || today,
          inviteLedger,
          inviteLedgerCount: inviteLedger.length,
          tierSummary,
          walletAvailable: String(wsum.availableYuan != null ? wsum.availableYuan : "0"),
          walletPendingOut: String(wsum.pendingOutYuan != null ? wsum.pendingOutYuan : "0"),
          partnerInviteRewards,
          partnerInviteRewardsCount: partnerInviteRewards.length,
          demoPartnerAgencyFeeYuan: String(partnerStore.DEMO_PARTNER_AGENCY_FEE_YUAN || 100),
        },
        () => {
          try {
            this.applyPeriodFromUi();
          } catch (e2) {
            this.setData({
              loadError: "业绩区间计算异常，可尝试重试",
            });
          }
        }
      );
    } catch (e) {
      this.setData({
        ok: false,
        loadError: (e && e.message) || "数据加载失败，请重试",
      });
    }
  },

  applyPeriodFromUi() {
    const root = this.data.rootPhone;
    if (!root) return;
    const preset = this.data.periodPreset || "today";
    const tag = preset === "custom" ? "custom" : preset;
    const range = partnerStore.computeTimeRange(tag, this.data.customStart, this.data.customEnd);
    const p = this.data.phone || "";
    const periodStats = partnerStore.getPartnerIncomeSplitInRange(root, range.startMs, range.endMs, p);
    const split = partnerStore.listIntervalRewardsDirectVsTeam(root, range.startMs, range.endMs);
    const directRewardRows = split.directRewards.map(decorateReward);
    const teamRewardRows = split.teamRewards.map(decorateReward);
    this.setData({
      periodLabel: range.label,
      periodStats,
      directRewardRows,
      teamRewardRows,
    });
  },

  setPeriod(e) {
    const p = e.currentTarget.dataset.p;
    if (!p) return;
    this.setData({ periodPreset: p }, () => this.applyPeriodFromUi());
  },

  onPickStart(e) {
    this.setData({ customStart: e.detail.value, periodPreset: "custom" }, () => this.applyPeriodFromUi());
  },

  onPickEnd(e) {
    this.setData({ customEnd: e.detail.value, periodPreset: "custom" }, () => this.applyPeriodFromUi());
  },

  applyCustomRange() {
    this.setData({ periodPreset: "custom" }, () => this.applyPeriodFromUi());
  },

  selectPerfSide(e) {
    const s = e.currentTarget.dataset.side;
    if (s !== "direct" && s !== "team") return;
    const cur = this.data.overviewPerfSide;
    this.setData({ overviewPerfSide: cur === s ? "" : s });
  },

  onShow() {
    this.refresh();
  },

  setTab(e) {
    const i = Number(e.currentTarget.dataset.i) || 0;
    this.setData({ activeTab: i });
  },

  setDetailTab(e) {
    const t = e.currentTarget.dataset.t;
    if (t !== "flow" && t !== "ledger") return;
    this.setData({ detailTab: t });
  },

  openPendingTab() {
    this.setData({ activeTab: 3 });
  },

  onShareAppMessage(res) {
    const root = this.data.rootPhone;
    const inviter = this.data.phone;
    const ds = res.from === "button" && res.target && res.target.dataset ? res.target.dataset : {};
    const btnKind = ds.kind || "";
    if (btnKind === "partner_partner") {
      const path =
        partnerStore.buildPartnerInvitePartnerPath(inviter) || `/pages/partner-apply/partner-apply?inv=${encodeURIComponent(inviter)}`;
      return {
        title: "邀请您开通智控合作商主管 · 共享渠道奖励",
        path,
        imageUrl: "/images/invite-hero.png",
      };
    }
    const kind = btnKind === "user" ? "user" : "merchant";
    if (kind === "user") {
      const path = partnerStore.buildUserInvitePath(inviter) || `/pages/invite-system/invite-system?inv=${encodeURIComponent(inviter)}`;
      return {
        title: "邀请您加入智控 · 绑定车牌成为我的用户",
        path,
        imageUrl: "/images/invite-hero.png",
      };
    }
    const path = partnerStore.buildMerchantInvitePath(root, inviter) || "/pages/merchant-apply/merchant-apply";
    return {
      title: "邀请您入驻智控升级网点",
      path,
    };
  },

  openWallet() {
    wx.navigateTo({ url: "/pages/partner-wallet/partner-wallet" });
  },

  goL1Detail(e) {
    const ph = e.currentTarget.dataset.phone;
    if (!ph) return;
    wx.navigateTo({
      url: `/pages/partner-l1-detail/partner-l1-detail?l1=${encodeURIComponent(ph)}`,
    });
  },

  openUserLookup() {
    wx.navigateTo({ url: "/pages/partner-user-lookup/partner-user-lookup" });
  },

  onNewStaffPhone(e) {
    this.setData({ newStaffPhone: e.detail.value });
  },
  onNewStaffName(e) {
    this.setData({ newStaffName: e.detail.value });
  },
  onNewStaffPct(e) {
    this.setData({ newStaffPct: e.detail.value });
  },
  onNewStaffTarget(e) {
    this.setData({ newStaffTarget: e.detail.value });
  },

  onStaffPctBlur(e) {
    if (!this.data.isPrincipal) return;
    const ph = e.currentTarget.dataset.phone;
    if (!ph) return;
    const s = auth.getSession();
    const op = s && s.phone ? org.normalizePhone(s.phone) : "";
    const r = partnerStore.setStaffCommissionPct(op, ph, e.detail.value);
    if (!r.ok) {
      wx.showToast({ title: r.reason || "失败", icon: "none" });
      this.refresh();
      return;
    }
    this.refresh();
  },

  onStaffTargetBlur(e) {
    if (!this.data.isPrincipal) return;
    const ph = e.currentTarget.dataset.phone;
    if (!ph) return;
    const s = auth.getSession();
    const op = s && s.phone ? org.normalizePhone(s.phone) : "";
    const r = partnerStore.setStaffCommissionAndTarget(op, ph, undefined, e.detail.value);
    if (!r.ok) {
      wx.showToast({ title: r.reason || "失败", icon: "none" });
      this.refresh();
      return;
    }
    this.refresh();
  },

  setTierL1() {
    this.setData({ newTier: "L1" });
  },
  setTierL2() {
    this.setData({ newTier: "L2" });
  },

  onParentPick(e) {
    this.setData({ parentPickerIndex: Number(e.detail.value) || 0 });
  },

  addStaff() {
    const s = auth.getSession();
    const op = s && s.phone ? org.normalizePhone(s.phone) : "";
    const tier = this.data.newTier;
    let parentVal = PARENT_ROOT;
    if (tier === "L2") {
      const pr = this.data.parentPickerRange[this.data.parentPickerIndex];
      parentVal = pr ? pr.value : PARENT_ROOT;
    }
    const r = partnerStore.addPartnerStaff(
      op,
      this.data.newStaffPhone,
      this.data.newStaffName,
      tier,
      parentVal,
      this.data.newStaffPct,
      this.data.newStaffTarget
    );
    if (!r.ok) {
      wx.showToast({ title: r.reason || "添加失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已保存", icon: "success" });
    this.setData({ newStaffPhone: "", newStaffName: "", newStaffPct: "0", newStaffTarget: "", newTier: "L1", parentPickerIndex: 0 });
    this.refresh();
  },

  reassignL2(e) {
    const l2 = e.currentTarget.dataset.phone;
    if (!l2 || !this.data.isPrincipal) return;
    const l1 = this.data.staffL1;
    const items = ["划回主管直线（ROOT）", ...l1.map((x) => `划给一级 ${x.displayName}`)];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const s = auth.getSession();
        const op = s && s.phone ? org.normalizePhone(s.phone) : "";
        let newParent = PARENT_ROOT;
        if (res.tapIndex > 0) {
          const pick = l1[res.tapIndex - 1];
          if (pick) newParent = pick.phone;
        }
        const r = partnerStore.reassignL2Parent(op, l2, newParent);
        if (!r.ok) {
          wx.showToast({ title: r.reason || "失败", icon: "none" });
          return;
        }
        wx.showToast({ title: "已划拨", icon: "success" });
        this.refresh();
      },
    });
  },

  approveApp(e) {
    const id = e.currentTarget.dataset.id;
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    const r = partnerStore.approveMerchantApplication(p, id);
    if (!r.ok) {
      wx.showToast({ title: r.reason || "失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已提交平台审核", icon: "success" });
    this.refresh();
  },

  rejectApp(e) {
    const id = e.currentTarget.dataset.id;
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    const r = partnerStore.rejectMerchantApplication(p, id);
    if (!r.ok) {
      wx.showToast({ title: r.reason || "失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已拒绝", icon: "none" });
    this.refresh();
  },

  toUser() {
    org.setPortalMode("user");
    wx.reLaunch({ url: "/pages/home/home" });
  },
});
