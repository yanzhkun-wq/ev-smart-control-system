<script setup lang="ts">
import { mockVehicles } from "@/common/mock";

function go(url: string) {
  uni.navigateTo({ url });
}

function openVehicle(id: string) {
  uni.navigateTo({ url: `/pages/vehicle/detail?id=${id}` });
}
</script>

<template>
  <scroll-view scroll-y class="page">
    <view class="hero">
      <text class="hero-title">电动车智控</text>
      <text class="hero-sub">WZ808 · 小程序原型（后续接 API，可编译 App）</text>
    </view>

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

    <view class="section-title">我的车辆</view>
    <view v-for="v in mockVehicles" :key="v.id" class="card" @click="openVehicle(v.id)">
      <view class="card-row">
        <text class="plate">{{ v.plate }}</text>
        <text :class="['badge', v.online ? 'on' : 'off']">{{ v.online ? "在线" : "离线" }}</text>
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
        <text class="muted">更新 {{ v.lastSeen }}</text>
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
.section-title {
  margin: 24rpx 8rpx 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #111827;
}
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
