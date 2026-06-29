/**
 * 对接自研 808 网关 HTTP 层（device-gateway）。
 * 在本机调试：开发者工具 详情 → 本地设置 勾「不校验合法域名」。
 * 配置：wx.setStorageSync("ev_platform_api_base", "https://你的域名:7612")
 * 或在真机预览前于代码中临时 setApiBase（勿提交密钥）。
 */

const KEY = "ev_platform_api_base";

function getApiBase() {
  try {
    const u = wx.getStorageSync(KEY);
    return u ? String(u).trim().replace(/\/$/, "") : "";
  } catch {
    return "";
  }
}

function setApiBase(url) {
  wx.setStorageSync(KEY, (url || "").trim().replace(/\/$/, ""));
}

function bindOnServer(terminalPhone, plate) {
  const base = getApiBase();
  if (!base || !terminalPhone) return Promise.resolve({ skipped: true });
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${base}/api/bind`,
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { terminalPhone, plate },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject(new Error((res.data && res.data.reason) || `bind ${res.statusCode}`));
      },
      fail: (e) => reject(e),
    });
  });
}

function sendTerminalCommand(terminalPhone, action) {
  const base = getApiBase();
  if (!base || !terminalPhone) return Promise.resolve({ skipped: true });
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${base}/api/terminal/${encodeURIComponent(terminalPhone)}/command`,
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { action },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.ok) resolve(res.data);
        else
          reject(new Error((res.data && res.data.reason) || `command ${res.statusCode}`));
      },
      fail: (e) => reject(e),
    });
  });
}

module.exports = {
  getApiBase,
  setApiBase,
  bindOnServer,
  sendTerminalCommand,
};
