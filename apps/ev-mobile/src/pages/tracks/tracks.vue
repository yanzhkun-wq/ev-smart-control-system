<script setup lang="ts">
import { ref } from "vue";
import { mockVehicles } from "@/common/mock";

const current = ref(mockVehicles[0]!.id);

function onVehicleChange(e: { detail: { value: string | number } }) {
  const i = Number(e.detail.value);
  const v = mockVehicles[i];
  if (v) current.value = v.id;
}
const polyline = ref<{ points: { latitude: number; longitude: number }[]; color: string; width: number }[]>([
  {
    points: [
      { latitude: 23.125, longitude: 113.255 },
      { latitude: 23.1262, longitude: 113.2581 },
      { latitude: 23.1275, longitude: 113.2615 },
      { latitude: 23.1291, longitude: 113.2644 },
    ],
    color: "#0d9488",
    width: 6,
  },
]);

const center = ref({ latitude: 23.1291, longitude: 113.2644 });
</script>

<template>
  <view class="wrap">
    <view class="bar">
      <picker mode="selector" :range="mockVehicles" range-key="plate" @change="onVehicleChange">
        <view class="picker">选择车辆：{{ mockVehicles.find((v) => v.id === current)?.plate }}</view>
      </picker>
      <button size="mini" type="primary" class="go">查询</button>
    </view>
    <map class="map" :latitude="center.latitude" :longitude="center.longitude" :scale="14" :polyline="polyline" />
    <view class="stats">
      <text>演示轨迹 · 目标存储 30 天 · 支持速度/停顿统计</text>
    </view>
  </view>
</template>

<style scoped>
.wrap {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 20rpx;
  background: #fff;
}
.picker {
  flex: 1;
  font-size: 26rpx;
  color: #374151;
}
.go {
  background: #0d9488;
}
.map {
  flex: 1;
  width: 100%;
}
.stats {
  padding: 16rpx 20rpx 28rpx;
  background: #fff;
  font-size: 22rpx;
  color: #6b7280;
}
</style>
