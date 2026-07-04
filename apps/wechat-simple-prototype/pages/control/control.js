const app = getApp();

Page({
  data: {
    model: "雅迪 G5",
    plate: "京A12345",
    online: true,
    battery: 85,
    locked: true,
    powerCut: false,

    /** 控制按钮加载状态 */
    cmdLoading: "", // "lock" | "unlock" | "cut" | "restore" | "find" | ""
  },

  onShow() {
    // 对接后端刷新状态
    this._refreshStatus();
  },

  /* ---------- 刷新状态 ---------- */
  _refreshStatus() {
    // demo: 从缓存读取当前车辆状态
    const saved = wx.getStorageSync("vehicle_control_status");
    if (saved) {
      this.setData(saved);
    }
  },

  _saveStatus() {
    wx.setStorageSync("vehicle_control_status", {
      online: this.data.online,
      battery: this.data.battery,
      locked: this.data.locked,
      powerCut: this.data.powerCut,
    });
  },

  _simulateCommand(action, successData) {
    this.setData({ cmdLoading: action });
    // 模拟网络延迟
    setTimeout(() => {
      this.setData({ ...successData, cmdLoading: "" });
      this._saveStatus();
      wx.showToast({ title: action === "find" ? "车辆正在鸣笛" : "指令已下发", icon: "success" });
    }, 800);
  },

  /* ---------- 控制指令 ---------- */
  unlock() {
    if (this.data.cmdLoading) return;
    this._simulateCommand("unlock", { locked: false });
  },

  lock() {
    if (this.data.cmdLoading) return;
    this._simulateCommand("lock", { locked: true });
  },

  cutPower() {
    if (this.data.cmdLoading) return;
    wx.showModal({
      title: "断油断电",
      content: "确认执行断油/断电？车辆将无法启动。",
      success: (res) => {
        if (res.confirm) {
          this._simulateCommand("cut", { powerCut: true, locked: true });
        }
      },
    });
  },

  restorePower() {
    if (this.data.cmdLoading) return;
    this._simulateCommand("restore", { powerCut: false });
  },

  findVehicle() {
    if (this.data.cmdLoading) return;
    this._simulateCommand("find", {});
  },

  /* ---------- 电量图标 ---------- */
  batteryIcon() {
    const v = this.data.battery;
    if (v > 60) return "🟢";
    if (v > 20) return "🟡";
    return "🔴";
  },
});
