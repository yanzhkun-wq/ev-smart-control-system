/**
 * 商户入驻申请与设备网关 admin.merchantApplyReviewQueue 同步（演示）。
 */

function getBase() {
  const a = wx.getStorageSync("ev-admin-gateway-api-base");
  if (a && typeof a === "string" && a.trim()) return a.trim().replace(/\/$/, "");
  const b = wx.getStorageSync("ev_gateway_api_base");
  if (b && typeof b === "string" && b.trim()) return b.trim().replace(/\/$/, "");
  return "http://127.0.0.1:7612";
}

function pushMerchantApply(row, done) {
  wx.request({
    url: `${getBase()}/api/miniapp/merchant-apply`,
    method: "POST",
    header: { "Content-Type": "application/json" },
    data: JSON.stringify(row),
    success(res) {
      if (res.statusCode !== 200 || !res.data || !res.data.ok) {
        console.warn("[merchantApply] push", res.statusCode, res.data);
      }
    },
    complete() {
      if (typeof done === "function") done();
    },
  });
}

function pushPartnerReview(id, payload, done) {
  wx.request({
    url: `${getBase()}/api/miniapp/merchant-apply/${encodeURIComponent(id)}/partner-review`,
    method: "POST",
    header: { "Content-Type": "application/json" },
    data: JSON.stringify(payload),
    success(res) {
      if (res.statusCode !== 200 || !res.data || !res.data.ok) {
        console.warn("[merchantApply] partner-review", res.statusCode, res.data);
      }
    },
    complete() {
      if (typeof done === "function") done();
    },
  });
}

function fetchMerchantApplyStatus(phone, done) {
  wx.request({
    url: `${getBase()}/api/miniapp/merchant-apply-status?phone=${encodeURIComponent(phone)}`,
    method: "GET",
    success(res) {
      if (res.statusCode === 200 && res.data && res.data.ok && res.data.row) {
        done(null, res.data.row);
        return;
      }
      done(null, null);
    },
    fail(err) {
      done(err, null);
    },
  });
}

module.exports = {
  getBase,
  pushMerchantApply,
  pushPartnerReview,
  fetchMerchantApplyStatus,
};
