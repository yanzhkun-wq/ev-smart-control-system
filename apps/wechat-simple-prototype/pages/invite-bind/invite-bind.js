const auth = require("../../utils/auth-store.js");



Page({

  data: {

    mainPhone: "",

    mainMasked: "",

    riderName: "",

    riderPhone: "",

    err: "",

  },



  onLoad(query) {

    const raw = query.mp || query.scene || "";

    let mp = "";

    try {

      mp = decodeURIComponent(raw);

    } catch (e) {

      mp = raw;

    }

    const norm = auth.normalizePhone(mp);

    if (!norm) {

      this.setData({ err: "邀请链接无效，请让车主重新分享。" });

      return;

    }

    const masked = norm.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");

    this.setData({ mainPhone: norm, mainMasked: masked });

  },



  onNameInput(e) {

    this.setData({ riderName: e.detail.value, err: "" });

  },



  onPhoneInput(e) {

    this.setData({ riderPhone: e.detail.value, err: "" });

  },



  onBind() {

    const { mainPhone, riderPhone, riderName } = this.data;

    if (!mainPhone) {

      this.setData({ err: "链接无效" });

      return;

    }

    const p = auth.normalizePhone(riderPhone);

    if (!p) {

      this.setData({ err: "请输入正确的 11 位手机号" });

      return;

    }

    const nm = (riderName && String(riderName).trim()) || "";

    auth.addAuthorizedRider(mainPhone, p, "invite", nm);

    auth.setSessionRider(p, mainPhone, { name: nm });

    wx.showToast({ title: "绑定成功", icon: "success" });

    setTimeout(() => {

      wx.reLaunch({ url: "/pages/home/home" });

    }, 400);

  },

});

