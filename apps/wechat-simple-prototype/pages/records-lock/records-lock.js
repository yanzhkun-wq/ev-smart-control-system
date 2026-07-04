const app = getApp();

Page({
  data: {
    records: [],
    loading: true,
  },

  onShow() {
    this._loadRecords();
  },

  _loadRecords() {
    this.setData({ loading: true });

    // demo 数据 — 对接后端 GET /api/terminal/:phone/tracks 过滤锁车事件
    setTimeout(() => {
      const records = [
        { id: 1, action: "lock", plate: "京A12345", time: "2026-07-04 12:30", battery: "82%", location: "北京市朝阳区望京SOHO" },
        { id: 2, action: "unlock", plate: "京A12345", time: "2026-07-04 11:15", battery: "85%", location: "北京市朝阳区望京SOHO" },
        { id: 3, action: "lock", plate: "京A12345", time: "2026-07-04 08:00", battery: "90%", location: "北京市海淀区中关村" },
        { id: 4, action: "lock", plate: "京B67890", time: "2026-07-03 22:00", battery: "76%", location: "北京市东城区王府井" },
        { id: 5, action: "unlock", plate: "京B67890", time: "2026-07-03 19:30", battery: "78%", location: "北京市东城区王府井" },
        { id: 6, action: "lock", plate: "京A12345", time: "2026-07-03 18:00", battery: "88%", location: "北京市海淀区中关村" },
      ];
      this.setData({ records, loading: false });
    }, 300);
  },
});
