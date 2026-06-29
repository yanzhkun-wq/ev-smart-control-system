<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { mockVehicles } from "@/common/mock";

const id = ref("1");

onLoad((query) => {
  id.value = (query?.id as string) || "1";
});

const v = computed(() => mockVehicles.find((x) => x.id === id.value) ?? mockVehicles[0]!);

function goRemote() {
  uni.navigateTo({ url: "/pages/remote/remote" });
}
</script>

<template>
  <scroll-view scroll-y class="page" v-if="v">
    <view class="head">
      <text class="plate">{{ v.plate }}</text>
      <text :class="['state', v.online ? 'on' : 'off']">{{ v.online ? "在线" : "离线" }}</text>
    </view>
    <view class="panel">
      <view class="row"><text class="k">终端号</text><text class="v">{{ v.terminalId }}</text></view>
      <view class="row"><text class="k">定位模式</text><text class="v">{{ v.locateMode }}</text></view>
      <view class="row"><text class="k">设防</text><text class="v">{{ v.armed ? "开" : "关" }}</text></view>
      <view class="row"><text class="k">速度</text><text class="v">{{ v.speedKmh }} km/h</text></view>
      <view class="row"><text class="k">内置电池</text><text class="v">{{ v.batteryPct }}%</text></view>
      <view class="row"><text class="k">最近上报</text><text class="v">{{ v.lastSeen }}</text></view>
    </view>
    <button type="primary" class="btn" @click="goRemote">远程控制（设防/油电）</button>
    <view class="hint">完整 TLV（0xF1/0xF3/0xF4/0xF6…）对接网关后展示。</view>
  </scroll-view>
</template>

<style scoped>
.page {
  height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.plate {
  font-size: 40rpx;
  font-weight: 700;
}
.state {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
}
.state.on {
  background: #d1fae5;
  color: #047857;
}
.state.off {
  background: #f3f4f6;
  color: #6b7280;
}
.panel {
  background: #fff;
  border-radius: 16rpx;
  padding: 8rpx 20rpx;
  margin-bottom: 24rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f3f4f6;
}
.row:last-child {
  border-bottom: none;
}
.k {
  color: #6b7280;
  font-size: 26rpx;
}
.v {
  color: #111827;
  font-size: 26rpx;
  max-width: 420rpx;
  text-align: right;
}
.btn {
  background: #0d9488;
  margin-bottom: 16rpx;
}
.hint {
  font-size: 22rpx;
  color: #9ca3af;
  line-height: 1.5;
}
</style>
