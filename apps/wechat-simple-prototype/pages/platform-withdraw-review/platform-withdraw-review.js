const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const partnerStore = require("../../utils/partner-store.js");

Page({
  data: {
    ok: false,
    denied: false,
    loadError: "",
    list: [],
  },

  refresh() {
    try {
      const s = auth.getSession();
      const p = s && s.phone ? org.normalizePhone(s.phone) : "";
      if (!p) {
        this.setData({ ok: false, denied: true, loadError: "请先登录" });
        return;
      }
      if (!partnerStore.canAccessPlatformWithdrawReview(p)) {
        this.setData({
          ok: false,
          denied: true,
          loadError: "无平台审核权限（演示：需从后台管理入口进入且非正式版；正式版请接运营白名单）。",
        });
        return;
      }
      const list = partnerStore.listAllPendingWithdrawalsForPlatform();
      this.setData({ ok: true, denied: false, loadError: "", list });
    } catch (e) {
      this.setData({
        ok: false,
        denied: false,
        loadError: (e && e.message) || "加载失败",
      });
    }
  },

  onShow() {
    this.refresh();
  },

  confirmPay(e) {
    const id = e.currentTarget.dataset.id;
    const summary = e.currentTarget.dataset.summary || "";
    if (!id) return;
    const s = auth.getSession();
    const op = s && s.phone ? org.normalizePhone(s.phone) : "";
    const tip = summary ? `收款：${summary}\n\n` : "";
    wx.showModal({
      title: "平台确认已打款",
      content: `${tip}重要：打款前须在 PC 后台核对「平台·渠道与业绩」台账与订单依据，本操作不会校验业务真伪（演示）。\n确认后将从申请人可提现余额中扣减。`,
      success: (res) => {
        if (!res.confirm) return;
        const r = partnerStore.markWithdrawalPaid(op, id);
        if (!r.ok) {
          wx.showToast({ title: r.reason || "失败", icon: "none" });
          return;
        }
        wx.showToast({ title: "已确认", icon: "success" });
        this.refresh();
      },
    });
  },

  rejectPay(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const s = auth.getSession();
    const op = s && s.phone ? org.normalizePhone(s.phone) : "";
    wx.showModal({
      title: "平台驳回",
      editable: true,
      placeholderText: "原因（选填）",
      success: (res) => {
        if (!res.confirm) return;
        const r = partnerStore.markWithdrawalRejected(op, id, res.content || "");
        if (!r.ok) {
          wx.showToast({ title: r.reason || "失败", icon: "none" });
          return;
        }
        wx.showToast({ title: "已驳回", icon: "none" });
        this.refresh();
      },
    });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.reLaunch({ url: "/pages/mgmt-portal/mgmt-portal" }) });
  },
});
