const auth = require("../../utils/auth-store.js");
const org = require("../../utils/org-store.js");
const partnerStore = require("../../utils/partner-store.js");

Page({
  data: {
    ok: false,
    loadError: "",
    query: "",
    rows: [],
    searched: false,
    emptyHint: "",
  },

  onShow() {
    this.tryGate();
  },

  tryGate() {
    try {
      const s = auth.getSession();
      const p = s && s.phone ? org.normalizePhone(s.phone) : "";
      const root = partnerStore.getPartnerRoot(p);
      if (!root || !partnerStore.ensureInPartnerTree(root, p)) {
        this.setData({
          ok: false,
          loadError: "当前账号无权使用客户装机查询（需合作商主管或体系内员工）。",
        });
        return;
      }
      this.setData({ ok: true, loadError: "" });
    } catch (e) {
      this.setData({
        ok: false,
        loadError: (e && e.message) || "校验失败",
      });
    }
  },

  retryGate() {
    this.setData({ loadError: "" });
    this.tryGate();
  },

  onQueryInput(e) {
    this.setData({ query: e.detail.value });
  },

  doSearch() {
    const q = String(this.data.query || "").trim();
    if (!q) {
      wx.showToast({ title: "请输入手机号或关键词", icon: "none" });
      return;
    }
    const s = auth.getSession();
    const p = s && s.phone ? org.normalizePhone(s.phone) : "";
    const res = partnerStore.searchPartnerUserLookup(p, q);
    if (!res.ok) {
      wx.showToast({ title: res.reason || "查询失败", icon: "none" });
      return;
    }
    const rows = res.rows || [];
    this.setData({
      searched: true,
      rows,
      emptyHint: rows.length ? "" : "暂无匹配记录（仅限本合作商体系内网点与用户）",
    });
  },
});
