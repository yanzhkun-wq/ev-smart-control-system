const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");

Page({
  data: {
    ok: false,
    list: [],
    editPhone: "",
    newInviter: "",
    newPlate: "",
  },

  refresh() {
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    const ok = org.isSuperAdmin(p);
    const raw = org.readUplines();
    const list = Object.keys(raw).map((k) => ({
      phone: k,
      inviterPhone: raw[k].inviterPhone,
      plate: raw[k].plate,
      at: raw[k].at,
    }));
    this.setData({ ok, list });
  },

  onShow() {
    this.refresh();
  },

  goMallProductEdit() {
    wx.navigateTo({ url: "/pages/mall-product-edit/mall-product-edit" });
  },

  onEditPhone(e) {
    this.setData({ editPhone: e.detail.value });
  },
  onNewInv(e) {
    this.setData({ newInviter: e.detail.value });
  },
  onNewPl(e) {
    this.setData({ newPlate: e.detail.value });
  },

  onPick(e) {
    const phone = e.currentTarget.dataset.phone;
    const inv = e.currentTarget.dataset.inv;
    const plate = e.currentTarget.dataset.plate;
    this.setData({
      editPhone: phone || "",
      newInviter: inv || "",
      newPlate: plate || "",
    });
  },

  onSave() {
    const s = auth.getSession();
    const op = s && s.phone;
    const r = org.superAdminSetReferral(this.data.editPhone, this.data.newInviter, this.data.newPlate, op);
    if (!r.ok) {
      wx.showToast({ title: r.reason || "失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已更新", icon: "success" });
    this.refresh();
  },
});
