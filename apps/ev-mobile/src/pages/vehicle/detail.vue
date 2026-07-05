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

function goMap() {
  uni.navigateTo({ url: "/pages/map/map" });
}

function goTracks() {
  uni.navigateTo({ url: "/pages/tracks/tracks" });
}
</script>

<template>
  <scroll-view scroll-y class="page" v-if="v">
    <!-- 头部 -->
    <view class="head">
      <view class="head-l">
        <text class="plate">{{ v.plate }}</text>
        <text :class="['badge', v.online ? 'on' : 'off']">{{ v.online ? "在线" : "离线" }}</text>
      </view>
      <view class="battery-circle" :class="v.battery > 60 ? 'bc-green' : v.battery > 20 ? 'bc-yellow' : 'bc-red'">
        <text class="bc-text">{{ v.battery }}%</text>
      </view>
    </view>

    <!-- 快捷操作 -->
    <view class="quick-actions">
      <view class="qa-item" @click="goRemote">
        <text class="qa-icon">🎛</text>
        <text class="qa-text">远程控制</text>
      </view>
      <view class="qa-item" @click="goMap">
        <text class="qa-icon">🗺</text>
        <text class="qa-text">查看位置</text>
      </view>
      <view class="qa-item" @click="goTracks">
        <text class="qa-icon">📍</text>
        <text class="qa-text">轨迹回放</text>
      </view>
    </view>

    <!-- 基础信息 -->
    <view class="section-title">基础信息</view>
    <view class="panel">
      <view class="row"><text class="k">终端号</text><text class="v">{{ v.terminalId }}</text></view>
      <view class="row"><text class="k">定位模式</text><text class="v">{{ v.locateMode }}</text></view>
      <view class="row"><text class="k">设防状态</text><text :class="['v', v.armed ? 'ok' : '']">{{ v.armed ? "已设防" : "未设防" }}</text></view>
      <view class="row"><text class="k">速度</text><text class="v">{{ v.speedKmh }} km/h</text></view>
      <view class="row"><text class="k">累计里程</text><text class="v">{{ v.mileage || 0 }} km</text></view>
      <view class="row"><text class="k">内置电池</text><text :class="['v', v.battery < 20 ? 'err' : '']">{{ v.battery }}%</text></view>
      <view class="row"><text class="k">信号强度</text><text class="v">{{ v.csq || "—" }}</text></view>
      <view class="row"><text class="k">定位卫星</text><text class="v">{{ v.gpsSatellites || "—" }}</text></view>
    </view>

    <!-- TLV 附加数据 -->
    <view class="section-title">附加数据 (TLV)</view>
    <view class="panel">
      <view class="row"><text class="k">主电压</text><text class="v">{{ v.mainVoltageV || "—" }} V</text></view>
      <view class="row"><text class="k">ICCID</text><text class="v" style="font-size: 22rpx">{{ v.iccid || "—" }}</text></view>
      <view class="row"><text class="k">充电状态</text><text class="v">{{ v.chargeStatus !== undefined ? (v.chargeStatus === 1 ? "充电中" : "未充电") : "—" }}</text></view>
      <view class="row"><text class="k">ACC 累计</text><text class="v">{{ v.accCumulativeSec ? Math.floor(v.accCumulativeSec / 3600) + "h" : "—" }}</text></view>
      <view class="row"><text class="k">GSensor</text><text class="v">{{ v.gsensorX !== undefined ? `X:${v.gsensorX} Y:${v.gsensorY} Z:${v.gsensorZ}` : "—" }}</text></view>
    </view>

    <!-- 告警状态 -->
    <view class="section-title">最近告警</view>
    <view class="panel" v-if="v.alarm && v.alarm > 0">
      <view class="row"><text class="k err">⚠ 存在 {{ v.alarm }} 条未处理告警</text></view>
    </view>
    <view class="panel" v-else>
      <view class="row"><text class="k ok">✓ 无告警</text></view>
    </view>

    <button type="primary" class="btn" @click="goRemote">远程控制</button>
    <view class="hint">TLV 数据通过 JT/T808 0x0200 位置附加信息上报。</view>
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
.head-l {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.plate {
  font-size: 40rpx;
  font-weight: 700;
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

/* battery circle */
.battery-circle {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid;
}
.bc-green { border-color: #10b981; }
.bc-yellow { border-color: #f59e0b; }
.bc-red { border-color: #ef4444; }
.bc-text { font-size: 24rpx; font-weight: 700; }

/* quick actions */
.quick-actions {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.qa-item {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 12rpx;
  text-align: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
}
.qa-icon { font-size: 36rpx; display: block; }
.qa-text { margin-top: 8rpx; font-size: 24rpx; color: #374151; display: block; }

/* section */
.section-title {
  margin: 16rpx 8rpx 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #111827;
}

/* panel */
.panel {
  background: #fff;
  border-radius: 16rpx;
  padding: 4rpx 20rpx;
  margin-bottom: 8rpx;
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
.k { color: #6b7280; font-size: 26rpx; }
.v { color: #111827; font-size: 26rpx; max-width: 420rpx; text-align: right; }
.ok { color: #10b981 !important; }
.err { color: #ef4444 !important; }

.btn {
  background: linear-gradient(135deg, #0d9488, #0ca5af);
  margin-top: 24rpx;
  border: none;
}
.hint {
  margin-top: 16rpx;
  font-size: 22rpx;
  color: #9ca3af;
  line-height: 1.5;
  text-align: center;
}
</style>
