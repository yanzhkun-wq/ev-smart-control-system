<script setup lang="ts">
import { computed } from "vue";
import { mockVehicles } from "@/common/mock";

const stats = computed(() => ({
  total: mockVehicles.length,
  online: mockVehicles.filter((v) => v.online).length,
  alarm: mockVehicles.filter((v) => v.alarm && v.alarm > 0).length,
  offline: mockVehicles.filter((v) => !v.online).length,
}));

function go(url: string) {
  uni.navigateTo({ url });
}

function openVehicle(id: string) {
  uni.navigateTo({ url: `/pages/vehicle/detail?id=${id}` });
}
</script>

<template>
  <scroll-view scroll-y class="page">
    <!-- 头部 -->
    <view class="hero">
      <text class="hero-title">电动车智控</text>
      <text class="hero-sub">EV Smart Control · 定位 · 告警 · 远程控制</text>
    </view>

    <!-- 数据统计 -->
    <view class="stats">
      <view class="stat-item stat-blue">
        <text class="stat-num">{{ stats.total }}</text>
        <text class="stat-label">总车辆</text>
      </view>
      <view class="stat-item stat-green">
        <text class="stat-num">{{ stats.online }}</text>
        <text class="stat-label">在线</text>
      </view>
      <view class="stat-item stat-red">
        <text class="stat-num">{{ stats.alarm }}</text>
        <text class="stat-label">告警</text>
      </view>
      <view class="stat-item stat-gray">
        <text class="stat-num">{{ stats.offline }}</text>
        <text class="stat-label">离线</text>
      </view>
    </view>

    <!-- 功能网格 -->
    <view class="grid">
      <view class="grid-item" @click="go('/pages/map/map')">
        <text class="grid-icon">🗺</text>
        <text class="grid-text">实时地图</text>
      </view>
      <view class="grid-item" @click="go('/pages/alerts/alerts')">
        <text class="grid-icon">🔔</text>
        <text class="grid-text">告警</text>
      </view>
      <view class="grid-item" @click="go('/pages/tracks/tracks')">
        <text class="grid-icon">📍</text>
        <text class="grid-text">轨迹回放</text>
      </view>
      <view class="grid-item" @click="go('/pages/fence/fence')">
        <text class="grid-icon">⬡</text>
        <text class="grid-text">电子围栏</text>
      </view>
      <view class="grid-item" @click="go('/pages/remote/remote')">
        <text class="grid-icon">🎛</text>
        <text class="grid-text">远程控制</text>
      </view>
      <view class="grid-item" @click="go('/pages/mine/mine')">
        <text class="grid-icon">👤</text>
        <text class="grid-text">我的</text>
      </view>
    </view>

    <!-- 车辆列表 -->
    <view class="section-title">我的车辆</view>
    <view v-for="v in mockVehicles" :key="v.id" class="card" @click="openVehicle(v.id)">
      <view class="card-row">
        <text class="plate">{{ v.plate }}</text>
        <text :class="['badge', v.online ? 'on' : 'off']">{{ v.online ? "在线" : "离线" }}</text>
      </view>
      <view class="card-progress">
        <view class="bar-track">
          <view :class="['bar-fill', v.battery > 60 ? 'bar-green' : v.battery > 20 ? 'bar-yellow' : 'bar-red']" :style="{ width: v.battery + '%' }"></view>
        </view>
        <text class="bar-label">{{ v.battery }}%</text>
      </view>
      <view class="card-meta">
        <text>{{ v.locateMode }}</text>
        <text>·</text>
        <text>设防 {{ v.armed ? "开" : "关" }}</text>
        <text>·</text>
        <text>{{ v.speedKmh }} km/h</text>
      </view>
      <view class="card-foot">
        <text class="muted">终端 {{ v.terminalId }}</text>
        <text class="muted">{{ v.lastSeen }}</text>
      </view>
    </view>
  </scroll-view>
</template>

<style scoped>
.page {
  height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
}
.hero {
  padding: 32rpx 8rpx 24rpx;
}
.hero-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #111827;
  display: block;
}
.hero-sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #6b7280;
  display: block;
}

/* stats */
.stats {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.stat-item {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 8rpx;
  text-align: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
}
.stat-num {
  font-size: 36rpx;
  font-weight: 800;
  display: block;
}
.stat-label {
  margin-top: 4rpx;
  font-size: 22rpx;
  display: block;
}
.stat-blue .stat-num { color: #3b82f6; }
.stat-green .stat-num { color: #10b981; }
.stat-red .stat-num { color: #ef4444; }
.stat-gray .stat-num { color: #6b7280; }
.stat-blue .stat-label, .stat-green .stat-label, .stat-red .stat-label, .stat-gray .stat-label { color: #6b7280; }

/* grid */
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-bottom: 16rpx;
}
.grid-item {
  width: calc(33.33% - 14rpx);
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 12rpx;
  box-sizing: border-box;
  text-align: center;
  box-shadow: 0 8rpx 24rpx rgba(15, 118, 110, 0.08);
}
.grid-icon {
  font-size: 40rpx;
  display: block;
}
.grid-text {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #374151;
  display: block;
}

/* section */
.section-title {
  margin: 24rpx 8rpx 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #111827;
}

/* card */
.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
}
.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.plate {
  font-size: 32rpx;
  font-weight: 600;
  color: #111827;
}
.badge {
  font-size: 22rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
}
.badge.on {
  background: #d1fae5;
  color: #047857;
}
.badge.off {
  background: #f3f4f6;
  color: #6b7280;
}

/* battery bar */
.card-progress {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.bar-track {
  flex: 1;
  height: 10rpx;
  background: #f1f5f9;
  border-radius: 999rpx;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999rpx;
  transition: width 0.3s;
}
.bar-green { background: #10b981; }
.bar-yellow { background: #f59e0b; }
.bar-red { background: #ef4444; }
.bar-label {
  font-size: 22rpx;
  color: #6b7280;
  min-width: 40rpx;
  text-align: right;
}

.card-meta {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #4b5563;
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}
.card-foot {
  margin-top: 16rpx;
  display: flex;
  justify-content: space-between;
}
.muted {
  font-size: 22rpx;
  color: #9ca3af;
}
</style>
