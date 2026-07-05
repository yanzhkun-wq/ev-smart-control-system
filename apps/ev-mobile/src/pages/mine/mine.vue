<script setup lang="ts">
import { mockVehicles } from "@/common/mock";
import { computed } from "vue";

const vehicleCount = computed(() => mockVehicles.length);
const onlineCount = computed(() => mockVehicles.filter((v) => v.online).length);
</script>

<template>
  <scroll-view scroll-y class="page">
    <!-- 用户信息 -->
    <view class="profile">
      <view class="avatar">车</view>
      <view>
        <text class="name">演示账号</text>
        <text class="sub">车队：华南配送一组 · {{ vehicleCount }} 辆车</text>
      </view>
    </view>

    <!-- 数据概览 -->
    <view class="stats">
      <view class="stat-item">
        <text class="stat-num">{{ vehicleCount }}</text>
        <text class="stat-label">总车辆</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">{{ onlineCount }}</text>
        <text class="stat-label">在线</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">{{ vehicleCount - onlineCount }}</text>
        <text class="stat-label">离线</text>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="list">
      <view class="cell">
        <text>🔔 告警设置</text>
        <text class="right">›</text>
      </view>
      <view class="cell">
        <text>📍 电子围栏</text>
        <text class="right">›</text>
      </view>
      <view class="cell">
        <text>📡 服务配置</text>
        <text class="right demo">演示模式</text>
      </view>
      <view class="cell">
        <text>📖 使用说明</text>
        <text class="right">›</text>
      </view>
      <view class="cell">
        <text>ℹ️ 关于</text>
        <text class="right">v0.1 原型</text>
      </view>
    </view>

    <view class="note">
      本工程为 uni-app 项目。运行方式：
      npm run dev:mp-weixin → 微信小程序
      HBuilderX 云打包 → Android/iOS App
    </view>
  </scroll-view>
</template>

<style scoped>
.page {
  height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
}
.profile {
  display: flex;
  gap: 20rpx;
  align-items: center;
  background: #fff;
  padding: 28rpx;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
}
.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #ccfbf1, #a7f3d0);
  color: #0f766e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: 700;
}
.name {
  font-size: 32rpx;
  font-weight: 600;
  display: block;
}
.sub {
  margin-top: 6rpx;
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
.stat-num { font-size: 36rpx; font-weight: 800; color: #0d9488; display: block; }
.stat-label { margin-top: 4rpx; font-size: 22rpx; color: #6b7280; display: block; }

/* list */
.list {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
}
.cell {
  display: flex;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid #f3f4f6;
  font-size: 28rpx;
}
.cell:last-child { border-bottom: none; }
.right { color: #9ca3af; font-size: 26rpx; }
.right.demo { color: #0d9488; }

.note {
  margin-top: 24rpx;
  font-size: 22rpx;
  color: #9ca3af;
  line-height: 1.6;
  padding: 0 8rpx;
}
</style>
