<script setup lang="ts">
import { ref, computed } from "vue";

interface AlertItem {
  id: string;
  time: string;
  plate: string;
  type: string;
  level: "高" | "中" | "低";
  status: "未处理" | "已处理" | "已推送";
  desc: string;
}

const mockAlerts: AlertItem[] = [
  { id: "a1", time: "今天 13:58", plate: "粤A·D12345", type: "超速报警", level: "中", status: "未处理", desc: "时速 68km/h，超过限速 50km/h" },
  { id: "a2", time: "今天 12:20", plate: "粤A·D12345", type: "震动报警（设防）", level: "高", status: "未处理", desc: "车辆设防状态下检测到持续震动，疑似被触碰" },
  { id: "a3", time: "昨天 09:02", plate: "未上牌 (138****0001)", type: "主电源断开", level: "高", status: "已推送", desc: "主电源被切断，已切换至内置电池供电" },
  { id: "a4", time: "昨天 06:30", plate: "粤B·F99887", type: "围栏报警", level: "中", status: "已处理", desc: "车辆驶出围栏「总部停车场」" },
  { id: "a5", time: "前天 22:15", plate: "粤A·D12345", type: "位移报警", level: "高", status: "已处理", desc: "车辆设防状态下发生位置偏移 > 50米" },
  { id: "a6", time: "前天 18:00", plate: "粤A·E67890", type: "信号丢失", level: "低", status: "未处理", desc: "终端离线超过 30 分钟，最后位置：黄埔大道" },
];

const filterTab = ref<"all" | "未处理" | "已处理">("all");

const filtered = computed(() => {
  if (filterTab.value === "all") return mockAlerts;
  return mockAlerts.filter((a) => a.status === filterTab.value);
});

const stats = computed(() => ({
  high: mockAlerts.filter((a) => a.level === "高").length,
  mid: mockAlerts.filter((a) => a.level === "中").length,
  low: mockAlerts.filter((a) => a.level === "低").length,
  pending: mockAlerts.filter((a) => a.status === "未处理").length,
}));

const showDetail = ref(false);
const detailItem = ref<AlertItem | null>(null);

function openDetail(a: AlertItem) {
  detailItem.value = a;
  showDetail.value = true;
}

function closeDetail() {
  showDetail.value = false;
  detailItem.value = null;
}

function markHandled(a: AlertItem) {
  a.status = "已处理";
  uni.showToast({ title: "已标记处理", icon: "success" });
  closeDetail();
}

function levelClass(level: string) {
  if (level === "高") return "high";
  if (level === "中") return "mid";
  return "low";
}
</script>

<template>
  <scroll-view scroll-y class="page safe-bottom">
    <!-- 统计 -->
    <view class="stats">
      <view class="stat-item">
        <text class="stat-num">{{ stats.pending }}</text>
        <text class="stat-label">待处理</text>
      </view>
      <view class="stat-item">
        <text class="stat-num" style="color:#ef4444">{{ stats.high }}</text>
        <text class="stat-label">高危</text>
      </view>
      <view class="stat-item">
        <text class="stat-num" style="color:#f59e0b">{{ stats.mid }}</text>
        <text class="stat-label">中危</text>
      </view>
      <view class="stat-item">
        <text class="stat-num" style="color:#6b7280">{{ stats.low }}</text>
        <text class="stat-label">低危</text>
      </view>
    </view>

    <!-- 过滤标签 -->
    <view class="tabs">
      <view :class="['tab', filterTab === 'all' ? 'tab-on' : '']" @click="filterTab = 'all'">全部</view>
      <view :class="['tab', filterTab === '未处理' ? 'tab-on' : '']" @click="filterTab = '未处理'">未处理</view>
      <view :class="['tab', filterTab === '已处理' ? 'tab-on' : '']" @click="filterTab = '已处理'">已处理</view>
    </view>

    <!-- 列表 -->
    <view v-for="a in filtered" :key="a.id" class="item card" @click="openDetail(a)">
      <view class="item-row">
        <view class="item-l">
          <text class="type">{{ a.type }}</text>
          <text :class="['lvl', levelClass(a.level)]">{{ a.level }}</text>
        </view>
        <text :class="['status-tag', a.status === '未处理' ? 'st-pending' : 'st-done']">{{ a.status }}</text>
      </view>
      <text class="meta">{{ a.plate }} · {{ a.time }}</text>
    </view>

    <view v-if="filtered.length === 0" class="empty">
      <text class="empty-icon">✅</text>
      <text class="empty-text">暂无{{ filterTab === '未处理' ? '未处理' : '' }}告警</text>
    </view>

    <!-- 详情弹窗 -->
    <view v-if="showDetail" class="overlay" @click="closeDetail"></view>
    <view v-if="showDetail && detailItem" class="detail-modal">
      <view class="modal-head">
        <text class="modal-title">告警详情</text>
        <text class="modal-close" @click="closeDetail">✕</text>
      </view>
      <view class="modal-body">
        <view class="row">
          <text class="k">类型</text>
          <text :class="['v', levelClass(detailItem.level)]">{{ detailItem.type }}</text>
        </view>
        <view class="row">
          <text class="k">风险等级</text>
          <text :class="['v', 'lvl', levelClass(detailItem.level)]">{{ detailItem.level }}</text>
        </view>
        <view class="row">
          <text class="k">车辆</text>
          <text class="v">{{ detailItem.plate }}</text>
        </view>
        <view class="row">
          <text class="k">时间</text>
          <text class="v">{{ detailItem.time }}</text>
        </view>
        <view class="row">
          <text class="k">状态</text>
          <text class="v">{{ detailItem.status }}</text>
        </view>
        <view class="row">
          <text class="k">描述</text>
          <text class="v-desc">{{ detailItem.desc }}</text>
        </view>
      </view>
      <view class="modal-actions" v-if="detailItem.status === '未处理'">
        <button class="action-btn cancel" @click="closeDetail">稍后处理</button>
        <button class="action-btn primary" @click="markHandled(detailItem)">标记已处理</button>
      </view>
      <view class="modal-actions" v-else>
        <button class="action-btn primary" @click="closeDetail">关闭</button>
      </view>
    </view>
  </scroll-view>
</template>

<style scoped>
.page { height: 100vh; padding: 20rpx; box-sizing: border-box; background: #f8fafc; }
.safe-bottom { box-sizing: border-box; }
.card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }

/* stats */
.stats { display: flex; gap: 12rpx; margin-bottom: 20rpx; }
.stat-item { flex: 1; background: #fff; border-radius: 14rpx; padding: 16rpx 8rpx; text-align: center; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.stat-num { font-size: 32rpx; font-weight: 800; display: block; color: #111827; }
.stat-label { margin-top: 4rpx; font-size: 22rpx; color: #6b7280; display: block; }

/* tabs */
.tabs { display: flex; gap: 12rpx; margin-bottom: 20rpx; }
.tab { padding: 12rpx 28rpx; background: #fff; border-radius: 40rpx; font-size: 26rpx; color: #64748b; border: 1rpx solid #e2e8f0; }
.tab-on { background: #0d9488; color: #fff; border-color: #0d9488; }

/* item */
.item-row { display: flex; justify-content: space-between; align-items: center; }
.item-l { display: flex; align-items: center; gap: 12rpx; }
.type { font-size: 28rpx; font-weight: 600; color: #111827; }
.lvl { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 999rpx; }
.lvl.high { background: #fee2e2; color: #b91c1c; }
.lvl.mid { background: #ffedd5; color: #c2410c; }
.lvl.low { background: #f1f5f9; color: #4b5563; }
.status-tag { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }
.st-pending { background: #fef2f2; color: #ef4444; }
.st-done { background: #f0fdf4; color: #10b981; }
.meta { margin-top: 10rpx; font-size: 24rpx; color: #64748b; display: block; }

/* empty */
.empty { text-align: center; padding: 80rpx 0; }
.empty-icon { font-size: 48rpx; display: block; }
.empty-text { margin-top: 12rpx; font-size: 26rpx; color: #94a3b8; display: block; }

/* detail modal */
.overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.4); z-index: 99; }
.detail-modal { position: fixed; left: 50%; top: 50%; transform: translate(-50%,-50%); width: 600rpx; background: #fff; border-radius: 24rpx; z-index: 100; overflow: hidden; }
.modal-head { display: flex; justify-content: space-between; align-items: center; padding: 28rpx 32rpx; border-bottom: 1rpx solid #f1f5f9; }
.modal-title { font-size: 30rpx; font-weight: 700; color: #0f172a; }
.modal-close { font-size: 32rpx; color: #94a3b8; padding: 8rpx; }
.modal-body { padding: 16rpx 32rpx; }
.row { display: flex; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid #f8fafc; }
.k { font-size: 26rpx; color: #64748b; }
.v { font-size: 26rpx; color: #0f172a; text-align: right; max-width: 360rpx; }
.v-desc { font-size: 24rpx; color: #0f172a; text-align: right; max-width: 360rpx; line-height: 1.5; }
.modal-actions { display: flex; gap: 16rpx; padding: 24rpx 32rpx; border-top: 1rpx solid #f1f5f9; }
.action-btn { flex: 1; height: 76rpx; line-height: 76rpx; border-radius: 16rpx; font-size: 26rpx; text-align: center; font-weight: 600; }
.action-btn.cancel { background: #f1f5f9; color: #475569; }
.action-btn.primary { background: #0d9488; color: #fff; }
</style>
