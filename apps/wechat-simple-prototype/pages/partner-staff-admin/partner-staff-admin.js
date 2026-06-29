const auth = require("../../utils/auth-store.js");

const org = require("../../utils/org-store.js");

const partnerStore = require("../../utils/partner-store.js");



function mask(p) {

  const s = String(p || "");

  if (s.length !== 11) return s || "—";

  return s.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");

}



function decorateReward(r) {

  return {

    ...r,

    merchantMask: mask(r.merchantPhone),

    orderAmountYuan: r.orderAmountYuan != null ? String(r.orderAmountYuan) : "—",

    rewardYuan: r.rewardYuan != null ? String(r.rewardYuan) : "—",

  };

}



Page({

  data: {

    ok: false,

    loadError: "",

    activeTab: 0,

    phone: "",

    phoneMask: "",

    rootPhone: "",

    rootMask: "",

    tierLabel: "",

    workspace: null,

    myInvites: [],

    incomeRows: [],

    incomeCount: 0,

    demoPreview: false,

    demoPreviewMask: "",

    walletAvailable: "0",

    walletPendingOut: "0",

  },



  onLoad(options) {

    wx.showShareMenu({ withShareTicket: true, menus: ["shareAppMessage"] });

    this._previewPhone = "";

    if (options && options.preview) {

      try {

        this._previewPhone = org.normalizePhone(decodeURIComponent(String(options.preview)));

      } catch (e) {

        this._previewPhone = "";

      }

    }

  },



  retryRefresh() {

    this.setData({ loadError: "" });

    this.refresh();

  },



  refresh() {

    try {

      const s = auth.getSession();

      const sessionP = s && s.phone ? org.normalizePhone(s.phone) : "";

      let demoPreview = false;

      let previewNorm = "";



      if (this._previewPhone && partnerStore.isPrincipalPartner(sessionP)) {

        const st = partnerStore.getStaffRow(this._previewPhone);

        if (st && org.normalizePhone(st.rootPartnerPhone) === sessionP) {

          demoPreview = true;

          previewNorm = this._previewPhone;

        } else {

          this._previewPhone = "";

          wx.showToast({ title: "无权预览该员工", icon: "none" });

          wx.reLaunch({

            url: "/pages/partner-admin/partner-admin",

            fail: () => wx.redirectTo({ url: "/pages/partner-admin/partner-admin" }),

          });

          return;

        }

      } else if (this._previewPhone && !partnerStore.isPrincipalPartner(sessionP)) {

        this._previewPhone = "";

      }



      const effectiveP = demoPreview ? previewNorm : sessionP;



      if (partnerStore.isPrincipalPartner(sessionP) && !demoPreview) {

        org.setPortalMode("partner");

        wx.reLaunch({

          url: "/pages/partner-admin/partner-admin",

          fail: () => {

            wx.redirectTo({ url: "/pages/partner-admin/partner-admin" });

          },

        });

        return;

      }



      const root = partnerStore.getPartnerRoot(effectiveP);

      if (!root) {

        this.setData({

          ok: false,

          loadError: "未找到合作商员工档案，请由主管在合作商「团队」中添加您的手机号。",

        });

        return;

      }



      const tierLabel = partnerStore.getStaffTierLabel(effectiveP);

      const workspace = partnerStore.getStaffWorkspaceSummary(root, effectiveP);

      const rewards = partnerStore.listRewardsForStaff(root, effectiveP).map(decorateReward);

      const myInvites = partnerStore.listStaffInviteLedger(root, effectiveP).slice(0, 40);

      const wsum = partnerStore.getPartnerWalletSummary(root, effectiveP);



      this.setData({

        ok: true,

        loadError: "",

        activeTab: Math.min(this.data.activeTab || 0, 1),

        phone: effectiveP,

        phoneMask: mask(effectiveP),

        rootPhone: root,

        rootMask: mask(root),

        tierLabel,

        workspace,

        incomeRows: rewards,

        incomeCount: rewards.length,

        myInvites,

        demoPreview,

        demoPreviewMask: demoPreview ? mask(previewNorm) : "",

        walletAvailable: String(wsum.availableYuan != null ? wsum.availableYuan : "0"),

        walletPendingOut: String(wsum.pendingOutYuan != null ? wsum.pendingOutYuan : "0"),

      });

    } catch (e) {

      this.setData({

        ok: false,

        loadError: (e && e.message) || "加载失败，请重试",

      });

    }

  },



  setTab(e) {

    const i = Number(e.currentTarget.dataset.i) || 0;

    this.setData({ activeTab: i });

  },



  onShow() {

    this.refresh();

  },



  onShareAppMessage(res) {

    const root = this.data.rootPhone;

    const inviter = this.data.phone;

    const kind =

      res.from === "button" && res.target && res.target.dataset && res.target.dataset.kind === "user"

        ? "user"

        : "merchant";

    if (kind === "user") {

      const path =

        partnerStore.buildUserInvitePath(inviter) ||

        `/pages/invite-system/invite-system?inv=${encodeURIComponent(inviter)}`;

      return {

        title: "邀请您加入智控 · 绑定车牌成为我的用户",

        path,

        imageUrl: "/images/invite-hero.png",

      };

    }

    const path =

      partnerStore.buildMerchantInvitePath(root, inviter) || "/pages/merchant-apply/merchant-apply";

    return {

      title: "邀请入驻智控升级网点",

      path,

    };

  },



  openWallet() {

    wx.navigateTo({ url: "/pages/partner-wallet/partner-wallet" });

  },



  openUserLookup() {

    wx.navigateTo({ url: "/pages/partner-user-lookup/partner-user-lookup" });

  },



  toUser() {

    org.setPortalMode("user");

    wx.reLaunch({ url: "/pages/home/home" });

  },

});

