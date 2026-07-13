<script setup lang="ts">
import { computed, ref } from "vue";
import { mockVehicles } from "@/common/mock";

const showPanel = ref(false);
const selectedVehicle = ref<any>(null);

const markers = computed(() =>
  mockVehicles
    .filter((v) => v.online)
    .map((v) => ({
      id: parseInt(v.id),
      latitude: v.lat,
      longitude: v.lng,
      title: v.plate,
      iconPath: "/static/marker.png",
      width: 32,
      height: 42,
      callout: {
        content: `${v.plate}\n${v.speedKmh} km/h · 电量 ${v.batteryPct}%`,
        display: "BYCLICK",
        bgColor: "#0f172a",
        color: "#ffffff",
        borderRadius: 8,
        padding: 8,
      },
    })),
);

const center = computed(() => {
  const online = mockVehicles.filter((v) => v.online);
  if (!online.length) return { lat: 23.13, lng: 113.26 };
  const lat = online.reduce((s, v) => s + v.lat, 0) / online.length;
  const lng = online.reduce((s, v) => s + v.lng, 0) / online.length;
  return { lat, lng };
});

const onlineCount = computed(() => mockVehicles.filter((v) => v.online).length);
const offlineCount = computed(() => mockVehicles.filter((v) => !v.online).length);

function onMarkerTap(e: any) {
  const id = e.detail?.markerId;
  const v = mockVehicles.find((m) => parseInt(m.id) === id);
  if (v) {
    selectedVehicle.value = v;
    showPanel.value = true;
  }
}

function closePanel() {
  showPanel.value = false;
  selectedVehicle.value = null;
}

function goToDetail(id: string) {
  uni.navigateTo({ url: `/pages/vehicle/detail?id=${id}` });
  closePanel();
}
</script>

<template>
  <view class="wrap">
    <!-- 统计条 -->
    <view class="stats-bar">
      <view class="stat-item">
        <text class="stat-num">{{ mockVehicles.length }}</text>
        <text class="stat-lbl">总车辆</text>
      </view>
      <view class="stat-item">
        <text class="stat-num" style="color:#10b981">{{ onlineCount }}</text>
        <text class="stat-lbl">在线</text>
      </view>
      <view class="stat-item">
        <text class="stat-num" style="color:#94a3b8">{{ offlineCount }}</text>
        <text class="stat-lbl">离线</text>
      </view>
    </view>

    <!-- 地图 -->
    <map
      class="map"
      :latitude="center.lat"
      :longitude="center.lng"
      :scale="11"
      :markers="markers"
      show-location
      @markertap="onMarkerTap"
    />

    <!-- 底部提示 -->
    <view class="tip" v-if="!showPanel">
      <text class="tip-text">点击地图上的车辆标记查看详情。数据来自 JT/T808 0x0200 位置上报。</text>
    </view>

    <!-- 底部车辆详情面板 -->
    <view v-if="showPanel && selectedVehicle" class="bottom-panel">
      <view class="panel-handle" @click="closePanel">
        <view class="handle-bar"></view>
      </view>
      <view class="panel-body">
        <view class="panel-row">
          <text class="panel-plate">{{ selectedVehicle.plate }}</text>
          <text :class="['panel-status', selectedVehicle.online ? 'on' : 'off']">
            {{ selectedVehicle.online ? '在线' : '离线' }}
          </text>
          <text class="panel-close" @click="closePanel">✕</text>
        </view>
        <view class="panel-meta">
          <text>终端 {{ selectedVehicle.terminalId }}</text>
          <text>·</text>
          <text>{{ selectedVehicle.locateMode }}</text>
        </view>
        <view class="panel-grid">
          <view class="pg-item">
            <text class="pg-val">{{ selectedVehicle.speedKmh }}</text>
            <text class="pg-lbl">km/h</text>
          </view>
          <view class="pg-item">
            <text class="pg-val">{{ selectedVehicle.batteryPct }}%</text>
            <text class="pg-lbl">电量</text>
          </view>
          <view class="pg-item">
            <text :class="['pg-val', selectedVehicle.armed ? 'armed' : '']">
              {{ selectedVehicle.armed ? '已设防' : '未设防' }}
            </text>
            <text class="pg-lbl">设防</text>
          </view>
        </view>
        <button class="panel-btn" @click="goToDetail(selectedVehicle.id)">查看详细信息</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.wrap { display: flex; flex-direction: column; height: 100vh; }

/* stats */
.stats-bar {
  display: flex; gap: 12rpx; padding: 12rpx 16rpx;
  background: #fff; border-bottom: 1rpx solid #f1f5f9;
}
.stat-item { flex: 1; text-align: center; }
.stat-num { font-size: 28rpx; font-weight: 800; color: #0f172a; display: block; }
.stat-lbl { font-size: 20rpx; color: #64748b; margin-top: 2rpx; display: block; }

.map { flex: 1; width: 100%; }

.tip { padding: 16rpx 24rpx 32rpx; background: #fff; }
.tip-text { font-size: 22rpx; color: #64748b; line-height: 1.5; }

/* bottom panel */
.bottom-panel {
  background: #fff; border-radius: 24rpx 24rpx 0 0;
  box-shadow: 0 -4rpx 24rpx rgba(0,0,0,0.08);
  padding: 0 24rpx 32rpx;
}
.panel-handle { display: flex; justify-content: center; padding: 12rpx 0; }
.handle-bar { width: 48rpx; height: 6rpx; background: #e2e8f0; border-radius: 3rpx; }
.panel-body { }
.panel-row { display: flex; align-items: center; gap: 12rpx; }
.panel-plate { font-size: 32rpx; font-weight: 700; color: #0f172a; flex: 1; }
.panel-status { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 999rpx; }
.panel-status.on { background: #d1fae5; color: #047857; }
.panel-status.off { background: #f1f5f9; color: #6b7280; }
.panel-close { font-size: 28rpx; color: #94a3b8; padding: 8rpx; }
.panel-meta { margin-top: 8rpx; font-size: 22rpx; color: #64748b; display: flex; gap: 8rpx; }
.panel-grid { display: flex; gap: 16rpx; margin: 20rpx 0; }
.pg-item { flex: 1; background: #f8fafc; border-radius: 12rpx; padding: 16rpx 8rpx; text-align: center; }
.pg-val { font-size: 28rpx; font-weight: 700; color: #0f172a; display: block; }
.pg-val.armed { color: #f59e0b; }
.pg-lbl { font-size: 20rpx; color: #64748b; margin-top: 4rpx; display: block; }
.panel-btn { background: linear-gradient(135deg, #0d9488, #0ca5af); color: #fff; border-radius: 16rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
</style>
