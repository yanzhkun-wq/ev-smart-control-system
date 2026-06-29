<script setup lang="ts"></script>

<template>
  <scroll-view scroll-y class="page">
    <view class="profile">
      <view class="avatar">车</view>
      <view>
        <text class="name">演示账号</text>
        <text class="sub">车队：华南配送一组</text>
      </view>
    </view>

    <view class="list">
      <view class="cell">
        <text>API 基地址</text>
        <text class="right">待配置</text>
      </view>
      <view class="cell">
        <text>消息推送</text>
        <text class="right">未接入</text>
      </view>
      <view class="cell">
        <text>关于</text>
        <text class="right">v0.1 原型</text>
      </view>
    </view>

    <view class="note">
      本工程为 uni-app：npm run dev:mp-weixin 生成微信小程序；App 可使用 HBuilderX 云打包或 npm run build:app 后按 DCloud 文档发行。
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
}
.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background: #ccfbf1;
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
.list {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.cell {
  display: flex;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid #f3f4f6;
  font-size: 28rpx;
}
.cell:last-child {
  border-bottom: none;
}
.right {
  color: #9ca3af;
  font-size: 26rpx;
}
.note {
  margin-top: 24rpx;
  font-size: 22rpx;
  color: #9ca3af;
  line-height: 1.6;
}
</style>
