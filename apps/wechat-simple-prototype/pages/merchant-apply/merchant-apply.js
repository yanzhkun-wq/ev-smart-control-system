const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const merchantStore = require("../../utils/merchant-store.js");
const partnerStore = require("../../utils/partner-store.js");

function parseCityDistrict(address) {
  const a = String(address || "");
  const m = a.match(/^(.+?市)(.+?[区县])/);
  if (m) return { city: m[1], district: m[2] };
  const cityM = a.match(/(.+?市)/);
  return { city: cityM ? cityM[1] : "", district: "" };
}

function maskPhone(p) {
  const s = String(p || "");
  if (s.length !== 11) return s || "—";
  return s.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

Page({
  onLoad(options) {
    this._edit = options && options.edit === "1";
    this._demoMode = options && options.demo === "1";
    const partner = options && options.partner ? decodeURIComponent(options.partner) : "";
    const staff = options && options.staff ? decodeURIComponent(options.staff) : "";
    this._invitePartner = org.normalizePhone(partner) || "";
    this._inviteStaff = org.normalizePhone(staff) || "";
  },

  data: {
    done: false,
    applicationPending: false,
    applicationPendingPlatform: false,
    applicationRejected: false,
    rejectHint: "",
    needInviteLink: false,
    inviteLinkMsg: "",
    inviteHint: "",
    storefrontImage: "",
    shopName: "",
    bossName: "",
    contactPhone: "",
    sessionPhoneMask: "",
    locName: "",
    locAddress: "",
    lat: null,
    lng: null,
    addressExtra: "",
    applyNote: "",
    locSummary: "请选择门店位置（自动带入地址，可再补充）",
  },

  refreshState() {
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    const sessionPhoneMask = p && p.length === 11 ? maskPhone(p) : "";
    const r = p ? org.getRoles(p) : {};
    const hasInvite = !!(this._invitePartner && this._inviteStaff);
    const pendingActive = p ? partnerStore.getPendingApplicationForMerchant(p) : null;
    const latestApp = p ? partnerStore.getLatestMerchantApplicationForMerchant(p) : null;
    const rejectedRow =
      latestApp &&
      (latestApp.status === "partner_rejected" || latestApp.status === "platform_rejected") &&
      !pendingActive
        ? latestApp
        : null;

    if (this._demoMode && this._edit) {
      this.setData({
        done: false,
        applicationPending: false,
        applicationPendingPlatform: false,
        applicationRejected: false,
        rejectHint: "",
        needInviteLink: false,
        inviteLinkMsg: "",
        storefrontImage: "",
        shopName: "海淀·极客电动车改装",
        bossName: "门店负责人",
        contactPhone: p || "",
        sessionPhoneMask,
        locName: "中关村大街",
        locAddress: "北京市海淀区中关村大街（示例）",
        lat: 39.984,
        lng: 116.318,
        addressExtra: "临街门面",
        applyNote: "",
        locSummary: "北京市海淀区中关村大街（示例）",
        inviteHint: "预览门店档案 · 保存不会影响线上数据",
      });
      return;
    }

    if (this._edit && !r.merchant) {
      wx.showToast({ title: "请先完成商家入驻", icon: "none" });
      setTimeout(() => wx.navigateBack(), 400);
      return;
    }

    if (this._edit && r.merchant && p) {
      const shop = merchantStore.getShopByOwner(p);
      this.setData({
        done: false,
        applicationPending: false,
        applicationPendingPlatform: false,
        applicationRejected: false,
        rejectHint: "",
        needInviteLink: false,
        inviteLinkMsg: "",
        storefrontImage: (shop && shop.storefrontImage) || "",
        shopName: (shop && shop.shopName) || "",
        bossName: (shop && shop.bossName) || "",
        contactPhone: (shop && shop.contactPhone) || p || "",
        locName: "",
        locAddress: (shop && shop.addressFull) || "",
        lat: shop && shop.lat != null ? Number(shop.lat) : null,
        lng: shop && shop.lng != null ? Number(shop.lng) : null,
        addressExtra: (shop && shop.addressDetail) || "",
        applyNote: "",
        locSummary: (shop && shop.addressFull) || "请选择门店位置",
        inviteHint: "",
        sessionPhoneMask,
      });
      return;
    }

    if (r.merchant) {
      this.setData({
        done: true,
        applicationPending: false,
        applicationPendingPlatform: false,
        applicationRejected: false,
        rejectHint: "",
        needInviteLink: false,
        inviteLinkMsg: "",
        inviteHint: "",
      });
      return;
    }

    if (rejectedRow) {
      const st = rejectedRow.status;
      if (hasInvite && this._invitePartner && this._inviteStaff) {
        const v = partnerStore.validateInvite(this._invitePartner, this._inviteStaff);
        if (v.ok) {
          const who = st === "platform_rejected" ? "平台" : "合作商";
          const reason = rejectedRow.partnerRejectReason || rejectedRow.platformRejectReason || "";
          this.setData({
            done: false,
            applicationPending: false,
            applicationPendingPlatform: false,
            applicationRejected: false,
            rejectHint: "",
            needInviteLink: false,
            inviteLinkMsg: "",
            contactPhone: p || "",
            sessionPhoneMask,
            inviteHint: reason
              ? `上次${who}未通过：${reason}。可修改后重新提交。`
              : `上次${who}未通过，可修改后重新提交。`,
          });
          return;
        }
      }
      const who = st === "platform_rejected" ? "平台" : "合作商";
      const reason = rejectedRow.partnerRejectReason || rejectedRow.platformRejectReason || "";
      this.setData({
        done: false,
        applicationPending: false,
        applicationPendingPlatform: false,
        applicationRejected: true,
        rejectHint: reason ? `${who}驳回：${reason}` : `${who}未通过审核。`,
        needInviteLink: !hasInvite,
        inviteLinkMsg: hasInvite
          ? ""
          : "您的入驻申请未通过。请让合作商员工重新分享「商家入驻」卡片，从卡片进入后再提交资料。",
        contactPhone: p || "",
        sessionPhoneMask,
        inviteHint: "",
      });
      return;
    }

    if (pendingActive) {
      const mask = (x) => (x && x.length === 11 ? x.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : x || "—");
      const st = pendingActive.status || "pending_partner";
      if (st === "pending_platform") {
        this.setData({
          done: false,
          applicationPending: false,
          applicationPendingPlatform: true,
          applicationRejected: false,
          rejectHint: "",
          needInviteLink: false,
          inviteLinkMsg: "",
          inviteHint: `合作商已通过 · 邀请方 ${mask(pendingActive.partnerRootPhone)} · 提交于 ${pendingActive.createdAt}`,
        });
        return;
      }
      this.setData({
        done: false,
        applicationPending: true,
        applicationPendingPlatform: false,
        applicationRejected: false,
        rejectHint: "",
        needInviteLink: false,
        inviteLinkMsg: "",
        inviteHint: `合作商审核中 · 邀请方 ${mask(pendingActive.partnerRootPhone)} · 提交于 ${pendingActive.createdAt}`,
      });
      return;
    }

    if (!hasInvite) {
      this.setData({
        done: false,
        applicationPending: false,
        applicationPendingPlatform: false,
        applicationRejected: false,
        rejectHint: "",
        needInviteLink: true,
        inviteLinkMsg: "商家入驻须由合作商体系内的员工发起邀请。请让对方在微信中向您分享「商家入驻」小程序卡片，从卡片进入本页后再填写资料。",
        contactPhone: p || "",
        sessionPhoneMask,
        inviteHint: "",
      });
      return;
    }

    const v = partnerStore.validateInvite(this._invitePartner, this._inviteStaff);
    if (!v.ok) {
      this.setData({
        done: false,
        applicationPending: false,
        applicationPendingPlatform: false,
        applicationRejected: false,
        rejectHint: "",
        needInviteLink: true,
        inviteLinkMsg: `${v.reason || "邀请无效"}，请向对方重新索取有效邀请卡片。`,
        contactPhone: p || "",
        sessionPhoneMask,
        inviteHint: "",
      });
      return;
    }

    this.setData({
      done: false,
      applicationPending: false,
      applicationPendingPlatform: false,
      applicationRejected: false,
      rejectHint: "",
      needInviteLink: false,
      inviteLinkMsg: "",
      contactPhone: p || "",
      sessionPhoneMask,
      inviteHint: `由合作商邀请入驻（主管 ${this._invitePartner.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}）`,
    });
  },

  onShow() {
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    if (p && !this._edit && !this._demoMode) {
      partnerStore.reconcileMerchantApplyFromGateway(p, () => this.refreshState());
    } else {
      this.refreshState();
    }
  },

  openEdit() {
    wx.navigateTo({ url: "/pages/merchant-apply/merchant-apply?edit=1" });
  },

  pickImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sizeType: ["compressed"],
      success: (res) => {
        const temp = res.tempFiles[0].tempFilePath;
        wx.saveFile({
          tempFilePath: temp,
          success: (r) => this.setData({ storefrontImage: r.savedFilePath }),
          fail: () => this.setData({ storefrontImage: temp }),
        });
      },
    });
  },

  pickLocation() {
    wx.chooseLocation({
      success: (res) => {
        const locAddress = [res.name, res.address].filter(Boolean).join(" · ");
        this.setData({
          locName: res.name || "",
          locAddress: res.address || "",
          lat: res.latitude,
          lng: res.longitude,
          locSummary: locAddress || "已选位置",
        });
      },
      fail: () => wx.showToast({ title: "需授权位置", icon: "none" }),
    });
  },

  onShopName(e) {
    this.setData({ shopName: e.detail.value });
  },
  onBossName(e) {
    this.setData({ bossName: e.detail.value });
  },
  onContactPhone(e) {
    this.setData({ contactPhone: e.detail.value });
  },
  onAddressExtra(e) {
    this.setData({ addressExtra: e.detail.value });
  },
  onApplyNote(e) {
    this.setData({ applyNote: e.detail.value });
  },

  onSubmit() {
    const s = auth.getSession();
    if (!s || !s.phone) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }
    if (this._edit) {
      if (this._demoMode) {
        wx.showToast({ title: "未写入真实档案", icon: "success" });
        setTimeout(() => wx.navigateBack(), 400);
        return;
      }
      if (!this.data.storefrontImage) {
        wx.showToast({ title: "请上传门头照片", icon: "none" });
        return;
      }
      if (!this.data.shopName.trim() || !this.data.bossName.trim()) {
        wx.showToast({ title: "请填写门店与老板信息", icon: "none" });
        return;
      }
      const fp = org.normalizePhone(this.data.contactPhone);
      if (!fp) {
        wx.showToast({ title: "请填写有效门店电话", icon: "none" });
        return;
      }
      if (this.data.lat == null || this.data.lng == null) {
        wx.showToast({ title: "请选择地图位置", icon: "none" });
        return;
      }
      const extra = (this.data.addressExtra || "").trim();
      const baseAddr = [this.data.locAddress, this.data.locName].filter(Boolean).join(" ");
      const addressFull = extra ? `${baseAddr} ${extra}` : baseAddr;
      const { city, district } = parseCityDistrict(this.data.locAddress || baseAddr);
      merchantStore.upsertShopProfile(s.phone, {
        shopName: this.data.shopName.trim(),
        bossName: this.data.bossName.trim(),
        contactPhone: fp,
        storefrontImage: this.data.storefrontImage,
        city,
        district,
        addressDetail: extra,
        lat: this.data.lat,
        lng: this.data.lng,
        addressFull,
      });
      wx.showToast({ title: "已保存", icon: "success" });
      setTimeout(() => wx.navigateBack(), 400);
      return;
    }

    if (!this._invitePartner || !this._inviteStaff) {
      wx.showToast({ title: "请使用员工分享的入驻链接", icon: "none" });
      return;
    }
    const chk = partnerStore.validateInvite(this._invitePartner, this._inviteStaff);
    if (!chk.ok) {
      wx.showToast({ title: chk.reason || "邀请无效", icon: "none" });
      return;
    }

    if (!this.data.storefrontImage) {
      wx.showToast({ title: "请上传门头照片", icon: "none" });
      return;
    }
    if (!this.data.shopName.trim() || !this.data.bossName.trim()) {
      wx.showToast({ title: "请填写门店与老板信息", icon: "none" });
      return;
    }
    const fp = org.normalizePhone(this.data.contactPhone);
    if (!fp) {
      wx.showToast({ title: "请填写有效门店电话", icon: "none" });
      return;
    }
    if (this.data.lat == null || this.data.lng == null) {
      wx.showToast({ title: "请选择地图位置", icon: "none" });
      return;
    }
    const extra = (this.data.addressExtra || "").trim();
    const baseAddr = [this.data.locAddress, this.data.locName].filter(Boolean).join(" ");
    const addressFull = extra ? `${baseAddr} ${extra}` : baseAddr;
    const { city, district } = parseCityDistrict(this.data.locAddress || baseAddr);

    const shopDraft = {
      shopName: this.data.shopName.trim(),
      bossName: this.data.bossName.trim(),
      contactPhone: fp,
      storefrontImage: this.data.storefrontImage,
      city,
      district,
      addressDetail: extra,
      lat: this.data.lat,
      lng: this.data.lng,
      addressFull,
      applyNote: (this.data.applyNote || "").trim(),
    };

    const r = partnerStore.createMerchantApplication({
      merchantPhone: s.phone,
      partnerRootPhone: this._invitePartner,
      inviterStaffPhone: this._inviteStaff,
      shopDraft,
    });
    if (!r.ok) {
      wx.showToast({ title: r.reason || "提交失败", icon: "none" });
      return;
    }
    this.refreshState();
    const rate = partnerStore.getPartnerRewardRateLabel(this._invitePartner || "");
    wx.showModal({
      title: "已提交审核",
      content: `合作商将先审核您的门店资料；通过后还需平台运营终审，通过后将自动开通商家工作台。「上门改装」产生平台定额补贴时，合作商可按档位从补贴额计提（演示 ${rate}）；「本店邀约」无平台补贴、不产生该项计提。`,
      showCancel: false,
    });
  },

  goAdmin() {
    org.setPortalMode("merchant");
    wx.reLaunch({ url: "/pages/merchant-admin/merchant-admin" });
  },
});
