<script setup lang="ts">
import { mockAlerts } from "@/common/mock";

function levelClass(level: string) {
  if (level === "高") return "high";
  if (level === "中") return "mid";
  return "low";
}
</script>

<template>
  <scroll-view scroll-y class="page">
    <view v-for="a in mockAlerts" :key="a.id" class="item">
      <view class="row">
        <text class="type">{{ a.type }}</text>
        <text :class="['lvl', levelClass(a.level)]">{{ a.level }}</text>
      </view>
      <text class="meta">{{ a.plate }} · {{ a.time }}</text>
      <view class="actions">
        <button size="mini" class="btn" type="default">详情</button>
        <button size="mini" class="btn primary" type="primary">处理</button>
      </view>
    </view>
    <view class="foot">
      <text>对接后：关联 0x0200 快照、推送通道、8001 确认。</text>
    </view>
  </scroll-view>
</template>

<style scoped>
.page {
  height: 100vh;
  padding: 20rpx;
  box-sizing: border-box;
}
.item {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.type {
  font-size: 30rpx;
  font-weight: 600;
  color: #111827;
}
.lvl {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
}
.lvl.high {
  background: #fee2e2;
  color: #b91c1c;
}
.lvl.mid {
  background: #ffedd5;
  color: #c2410c;
}
.lvl.low {
  background: #e5e7eb;
  color: #4b5563;
}
.meta {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #6b7280;
  display: block;
}
.actions {
  margin-top: 16rpx;
  display: flex;
  gap: 16rpx;
}
.btn.primary {
  background: #0d9488;
}
.foot {
  padding: 24rpx 8rpx;
  font-size: 22rpx;
  color: #9ca3af;
  line-height: 1.5;
}
</style>
