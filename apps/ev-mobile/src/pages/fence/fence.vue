<script setup lang="ts">
const items = [
  { name: "总部停车场", type: "圆形", policy: "驶出告警", on: true },
  { name: "夜间禁行区", type: "多边形", policy: "驶入告警", on: true },
];
</script>

<template>
  <scroll-view scroll-y class="page">
    <view v-for="(it, i) in items" :key="i" class="card">
      <view class="row">
        <text class="name">{{ it.name }}</text>
        <text :class="['tag', it.on ? 'on' : 'off']">{{ it.on ? "启用" : "停用" }}</text>
      </view>
      <text class="meta">{{ it.type }} · {{ it.policy }}</text>
      <view class="ops">
        <button size="mini">编辑</button>
        <button size="mini" type="warn">删除</button>
      </view>
    </view>
    <button type="primary" class="add">新建围栏（对接后保存）</button>
    <view class="foot">终端若支持部标区域下发则同步；否则平台侧地理判定。</view>
  </scroll-view>
</template>

<style scoped>
.page {
  height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
}
.card {
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
.name {
  font-size: 30rpx;
  font-weight: 600;
}
.tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
}
.tag.on {
  background: #d1fae5;
  color: #047857;
}
.tag.off {
  background: #f3f4f6;
  color: #6b7280;
}
.meta {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #6b7280;
  display: block;
}
.ops {
  margin-top: 16rpx;
  display: flex;
  gap: 16rpx;
}
.add {
  margin-top: 8rpx;
  background: #0d9488;
}
.foot {
  margin-top: 24rpx;
  font-size: 22rpx;
  color: #9ca3af;
  line-height: 1.5;
}
</style>
