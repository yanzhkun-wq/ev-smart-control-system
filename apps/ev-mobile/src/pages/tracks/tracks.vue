<script setup lang="ts">
import { ref, computed } from "vue";
import { mockVehicles } from "@/common/mock";

const currentIdx = ref(0);
const selectedDate = ref("今天");

const dates = ["今天", "昨天", "前天", "2026-07-05", "2026-07-04", "2026-07-03"];

const currentVehicle = computed(() => mockVehicles[currentIdx.value]);

// 模拟轨迹数据：不同车辆有不同的轨迹
const trackData: Record<string, { points: { latitude: number; longitude: number }[]; distance: string; duration: string; maxSpeed: number }> = {
  "1": {
    points: [
      { latitude: 23.1291, longitude: 113.2644 },
      { latitude: 23.1305, longitude: 113.2680 },
      { latitude: 23.1320, longitude: 113.2720 },
      { latitude: 23.1340, longitude: 113.2780 },
      { latitude: 23.1365, longitude: 113.2850 },
      { latitude: 23.1390, longitude: 113.2900 },
      { latitude: 23.1400, longitude: 113.2950 },
    ],
    distance: "4.2",
    duration: "35分钟",
    maxSpeed: 42,
  },
  "2": {
    points: [
      { latitude: 22.5431, longitude: 114.0579 },
      { latitude: 22.5450, longitude: 114.0600 },
      { latitude: 22.5475, longitude: 114.0630 },
      { latitude: 22.5500, longitude: 114.0650 },
    ],
    distance: "1.8",
    duration: "18分钟",
    maxSpeed: 28,
  },
};

const polyline = computed(() => {
  const data = trackData[currentVehicle.value?.id] || trackData["1"];
  return [{
    points: data.points,
    color: "#0d9488",
    width: 6,
    arrowLine: true,
  }];
});

const center = computed(() => {
  const data = trackData[currentVehicle.value?.id] || trackData["1"];
  const pts = data.points;
  return {
    latitude: pts[Math.floor(pts.length / 2)].latitude,
    longitude: pts[Math.floor(pts.length / 2)].longitude,
  };
});

const stats = computed(() => {
  const data = trackData[currentVehicle.value?.id] || trackData["1"];
  return data;
});

function onVehicleChange(e: any) {
  currentIdx.value = Number(e.detail.value);
}

function onDateChange(e: any) {
  selectedDate.value = dates[Number(e.detail.value)];
}
</script>

<template>
  <view class="wrap">
    <!-- 查询栏 -->
    <view class="bar">
      <picker mode="selector" :range="mockVehicles" range-key="plate" @change="onVehicleChange">
        <view class="picker">🚗 {{ mockVehicles[currentIdx]?.plate }}</view>
      </picker>
      <picker mode="selector" :range="dates" @change="onDateChange">
        <view class="picker date-picker">📅 {{ selectedDate }}</view>
      </picker>
    </view>

    <!-- 地图 -->
    <map
      class="map"
      :latitude="center.latitude"
      :longitude="center.longitude"
      :scale="13"
      :polyline="polyline"
      :markers="[{
        id: 1,
        latitude: polyline[0]?.points[0]?.latitude || 23.1291,
        longitude: polyline[0]?.points[0]?.longitude || 113.2644,
        title: '起点',
        iconPath: '/static/start.png',
        width: 24,
        height: 24,
      }, {
        id: 2,
        latitude: polyline[0]?.points[polyline[0]?.points.length - 1]?.latitude || 23.14,
        longitude: polyline[0]?.points[polyline[0]?.points.length - 1]?.longitude || 113.295,
        title: '终点',
        iconPath: '/static/end.png',
        width: 24,
        height: 24,
      }]"
    />

    <!-- 统计信息 -->
    <view class="stats">
      <view class="stat-row">
        <view class="stat-item">
          <text class="stat-value">{{ stats.distance }}</text>
          <text class="stat-unit">公里</text>
          <text class="stat-label">行驶距离</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ stats.duration }}</text>
          <text class="stat-unit"></text>
          <text class="stat-label">行驶时长</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ stats.maxSpeed }}</text>
          <text class="stat-unit">km/h</text>
          <text class="stat-label">最高速度</text>
        </view>
      </view>
      <text class="stats-hint">轨迹数据由 JT/T808 0x0200 位置上报记录，保留 30 天。</text>
    </view>
  </view>
</template>

<style scoped>
.wrap { display: flex; flex-direction: column; height: 100vh; }

.bar {
  display: flex; align-items: center; gap: 12rpx;
  padding: 12rpx 16rpx; background: #fff;
  border-bottom: 1rpx solid #f1f5f9;
}
.picker {
  flex: 1; font-size: 26rpx; color: #0f172a;
  padding: 12rpx 16rpx; background: #f8fafc;
  border-radius: 12rpx; white-space: nowrap; overflow: hidden;
}
.date-picker { text-align: center; }

.map { flex: 1; width: 100%; }

.stats {
  padding: 20rpx 20rpx 32rpx; background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.04);
}
.stat-row { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.stat-item { flex: 1; text-align: center; }
.stat-value { font-size: 36rpx; font-weight: 800; color: #0d9488; display: block; }
.stat-unit { font-size: 22rpx; color: #6b7280; margin-left: 4rpx; display: block; }
.stat-label { font-size: 22rpx; color: #6b7280; margin-top: 4rpx; display: block; }
.stats-hint { font-size: 22rpx; color: #94a3b8; display: block; text-align: center; }
</style>
