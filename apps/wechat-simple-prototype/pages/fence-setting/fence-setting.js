const app = getApp();

Page({
  data: {
    fences: [
      { id: 1, name: "家", type: "circle", radius: 500, alarmDir: "both", enabled: true, addr: "北京市朝阳区望京" },
      { id: 2, name: "公司", type: "circle", radius: 300, alarmDir: "in", enabled: true, addr: "北京市海淀区中关村" },
    ],
    fenceTypes: [
      { key: "circle", label: "圆形围栏" },
      { key: "polygon", label: "多边形围栏" },
      { key: "route", label: "线路围栏" },
    ],
    alarmDirs: [
      { key: "both", label: "进出告警" },
      { key: "in", label: "仅进入" },
      { key: "out", label: "仅离开" },
    ],
    showEditor: false,
    editing: null,
    editingIdx: -1,
  },

  /* ---------- 新增围栏 ---------- */
  onAdd() {
    this.setData({
      showEditor: true,
      editing: {
        name: "",
        type: "circle",
        radius: 500,
        alarmDir: "both",
        enabled: true,
        addr: "",
      },
      editingIdx: -1,
    });
  },

  /* ---------- 编辑 ---------- */
  onEdit(e) {
    const idx = e.currentTarget.dataset.idx;
    const fence = { ...this.data.fences[idx] };
    this.setData({
      showEditor: true,
      editing: fence,
      editingIdx: idx,
    });
  },

  /* ---------- 删除 ---------- */
  onDelete(e) {
    const idx = e.currentTarget.dataset.idx;
    wx.showModal({
      title: "删除围栏",
      content: "确定删除此围栏？",
      success: (res) => {
        if (res.confirm) {
          const fences = this.data.fences.filter((_, i) => i !== idx);
          this.setData({ fences });
          wx.setStorageSync("fences", fences);
          wx.showToast({ title: "已删除", icon: "success" });
        }
      },
    });
  },

  /* ---------- 编辑器 ---------- */
  onNameInput(e) {
    this.setData({ "editing.name": e.detail.value });
  },

  onAddrInput(e) {
    this.setData({ "editing.addr": e.detail.value });
  },

  onTypeChange(e) {
    this.setData({ "editing.type": e.detail.value });
  },

  onRadiusChange(e) {
    this.setData({ "editing.radius": e.detail.value });
  },

  onAlarmDirChange(e) {
    this.setData({ "editing.alarmDir": e.detail.value });
  },

  onEnabledSwitch(e) {
    this.setData({ "editing.enabled": !!e.detail.value });
  },

  /* ---------- 保存 ---------- */
  onSaveFence() {
    const { editing, editingIdx, fences } = this.data;
    if (!editing.name || !editing.addr) {
      wx.showToast({ title: "请填写名称和地址", icon: "none" });
      return;
    }
    if (editingIdx >= 0) {
      fences[editingIdx] = editing;
    } else {
      editing.id = Date.now();
      fences.push(editing);
    }
    this.setData({ fences, showEditor: false });
    wx.setStorageSync("fences", fences);
    wx.showToast({ title: "已保存", icon: "success" });
  },

  /* ---------- 关闭编辑器 ---------- */
  onCloseEditor() {
    this.setData({ showEditor: false });
  },

  /* ---------- 加载 ---------- */
  onShow() {
    const saved = wx.getStorageSync("fences");
    if (saved && saved.length) {
      this.setData({ fences: saved });
    }
  },
});
