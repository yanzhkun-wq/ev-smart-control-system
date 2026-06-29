<script setup lang="ts">
import { computed } from "vue";
import { mockVehicles } from "@/common/mock";

const markers = computed(() =>
  mockVehicles
    .filter((v) => v.online)
    .map((v) => ({
      id: v.id,
      latitude: v.lat,
      longitude: v.lng,
      title: v.plate,
      callout: {
        content: `${v.plate}\n${v.speedKmh} km/h`,
        display: "BYCLICK",
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
</script>

<template>
  <view class="wrap">
    <map
      class="map"
      :latitude="center.lat"
      :longitude="center.lng"
      :scale="11"
      :markers="markers"
      show-location
    />
    <view class="tip">
      <text class="tip-text">演示数据 · 生产环境需配置服务端域名与地图 key；多重定位信息来自 0x0200 附加项。</text>
    </view>
  </view>
</template>

<style scoped>
.wrap {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.map {
  flex: 1;
  width: 100%;
}
.tip {
  padding: 16rpx 24rpx 32rpx;
  background: #fff;
}
.tip-text {
  font-size: 22rpx;
  color: #6b7280;
  line-height: 1.5;
}
</style>
