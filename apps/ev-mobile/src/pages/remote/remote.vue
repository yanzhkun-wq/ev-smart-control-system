<script setup lang="ts">
import { ref, computed } from "vue";
import { mockVehicles } from "@/common/mock";

interface CmdRecord {
  id: number;
  action: string;
  plate: string;
  time: string;
  result: "成功" | "失败";
}

const vehicles = mockVehicles;
const currentIdx = ref(0);
const cmdLog = ref<CmdRecord[]>([]);
const loading = ref<string>(""); // 当前正在执行的命令

const currentVehicle = computed(() => vehicles[currentIdx.value]);

function onVehicleChange(e: any) {
  currentIdx.value = Number(e.detail.value);
}

function sendCommand(action: string, actionLabel: string) {
  const v = currentVehicle.value;
  if (!v) return;

  loading.value = action;

  // 模拟网络延迟
  setTimeout(() => {
    loading.value = "";
    const record: CmdRecord = {
      id: Date.now(),
      action: actionLabel,
      plate: v.plate,
      time: new Date().toLocaleString("zh-CN", { hour12: false }),
      result: Math.random() > 0.1 ? "成功" : "失败", // 90% 成功率模拟
    };
    // 更新车辆状态
    if (action === "lock" || action === "arm") v.armed = true;
    else if (action === "unlock" || action === "disarm") v.armed = false;
    else if (action === "cut") v.speedKmh = 0;
    else if (action === "restore") v.speedKmh = 0;

    cmdLog.value.unshift(record);
    if (cmdLog.value.length > 20) cmdLog.value.pop();

    uni.showToast({
      title: record.result === "成功" ? `已${actionLabel}` : "指令失败",
      icon: record.result === "成功" ? "success" : "error",
    });
  }, 600);

  // 先弹出确认
  return new Promise<void>((resolve) => {
    uni.showModal({
      title: "确认操作",
      content: `对 ${v.plate} 执行「${actionLabel}」？`,
      confirmText: "确认",
      cancelText: "取消",
      success: (res) => {
        if (!res.confirm) {
          loading.value = "";
        }
        resolve();
      },
    });
  });
}

function confirmAndRun(action: string, label: string) {
  sendCommand(action, label);
}

function clearLog() {
  cmdLog.value = [];
}
</script>

<template>
  <scroll-view scroll-y class="page safe-bottom">
    <!-- 警告 -->
    <view class="warn">⚠️ 远程控制涉及车辆安全，操作前请确认安全环境。</view>

    <!-- 车辆选择 -->
    <view class="vehicle-selector card">
      <picker mode="selector" :range="vehicles" range-key="plate" @change="onVehicleChange">
        <view class="vs-row">
          <view class="vs-l">
            <text class="vs-plate">{{ currentVehicle?.plate }}</text>
            <text :class="['vs-status', currentVehicle?.online ? 'on' : 'off']">
              {{ currentVehicle?.online ? '在线' : '离线' }}
            </text>
          </view>
          <text class="vs-arr">›</text>
        </view>
      </picker>
      <view class="vs-meta">
        <text>终端 {{ currentVehicle?.terminalId }}</text>
        <text>·</text>
        <text>设防 {{ currentVehicle?.armed ? '开' : '关' }}</text>
        <text>·</text>
        <text>{{ currentVehicle?.speedKmh }} km/h</text>
      </view>
    </view>

    <!-- 控制按钮组 -->
    <view class="section-title">设防 / 撤防</view>
    <view class="btn-row">
      <button
        class="cmd-btn cmd-primary"
        :disabled="!!loading"
        @click="confirmAndRun('lock', '设防')"
      >
        <text class="cmd-icon">🔒</text>
        <text class="cmd-label">{{ loading === 'lock' ? '执行中...' : '设防' }}</text>
        <text class="cmd-hint">0x66</text>
      </button>
      <button
        class="cmd-btn cmd-secondary"
        :disabled="!!loading"
        @click="confirmAndRun('unlock', '撤防')"
      >
        <text class="cmd-icon">🔓</text>
        <text class="cmd-label">{{ loading === 'unlock' ? '执行中...' : '撤防' }}</text>
        <text class="cmd-hint">0x67</text>
      </button>
    </view>

    <view class="section-title">油路控制</view>
    <view class="btn-row">
      <button
        class="cmd-btn cmd-danger"
        :disabled="!!loading"
        @click="confirmAndRun('cut', '断油电')"
      >
        <text class="cmd-icon">⛽</text>
        <text class="cmd-label">{{ loading === 'cut' ? '执行中...' : '断油电' }}</text>
        <text class="cmd-hint">0x64</text>
      </button>
      <button
        class="cmd-btn cmd-secondary"
        :disabled="!!loading"
        @click="confirmAndRun('restore', '恢复油电')"
      >
        <text class="cmd-icon">🔋</text>
        <text class="cmd-label">{{ loading === 'restore' ? '执行中...' : '恢复油电' }}</text>
        <text class="cmd-hint">0x65</text>
      </button>
    </view>

    <view class="section-title">终端维护</view>
    <view class="btn-row">
      <button class="cmd-btn cmd-danger" disabled>
        <text class="cmd-icon">🔄</text>
        <text class="cmd-label">终端复位</text>
        <text class="cmd-hint">待对接</text>
      </button>
      <button class="cmd-btn cmd-danger" disabled>
        <text class="cmd-icon">🏭</text>
        <text class="cmd-label">恢复出厂</text>
        <text class="cmd-hint">待对接</text>
      </button>
    </view>

    <!-- 操作记录 -->
    <view class="section-title log-header">
      <text>操作记录</text>
      <text class="log-clear" @click="clearLog" v-if="cmdLog.length">清除</text>
    </view>
    <view v-if="cmdLog.length === 0" class="log-empty">
      <text>暂无操作记录</text>
    </view>
    <view v-for="r in cmdLog" :key="r.id" class="log-item">
      <view class="log-l">
        <text class="log-action">{{ r.action }}</text>
        <text class="log-plate">{{ r.plate }}</text>
      </view>
      <view class="log-r">
        <text :class="['log-result', r.result === '成功' ? 'ok' : 'fail']">{{ r.result }}</text>
        <text class="log-time">{{ r.time }}</text>
      </view>
    </view>

    <view class="footnote">指令通过 JT/T808 0x8105 协议下发；设备在线时立即生效。</view>
  </scroll-view>
</template>

<style scoped>
.page { height: 100vh; padding: 20rpx; box-sizing: border-box; background: #f8fafc; }
.safe-bottom { box-sizing: border-box; }
.card { background: #fff; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }

.warn {
  background: #fffbeb; color: #92400e; padding: 16rpx; border-radius: 12rpx;
  font-size: 24rpx; margin-bottom: 20rpx; line-height: 1.5;
}

/* vehicle selector */
.vehicle-selector { margin-bottom: 20rpx; }
.vs-row { display: flex; justify-content: space-between; align-items: center; }
.vs-l { display: flex; align-items: center; gap: 12rpx; }
.vs-plate { font-size: 32rpx; font-weight: 700; color: #0f172a; }
.vs-status { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 999rpx; }
.vs-status.on { background: #d1fae5; color: #047857; }
.vs-status.off { background: #f1f5f9; color: #6b7280; }
.vs-arr { font-size: 36rpx; color: #94a3b8; }
.vs-meta { margin-top: 10rpx; font-size: 22rpx; color: #64748b; display: flex; gap: 8rpx; }

.section-title { font-size: 26rpx; font-weight: 600; color: #0f172a; margin: 20rpx 4rpx 12rpx; }

/* buttons */
.btn-row { display: flex; gap: 16rpx; margin-bottom: 4rpx; }
.cmd-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 28rpx 16rpx; border-radius: 16rpx; border: none; margin: 0;
}
.cmd-btn::after { border: none; }
.cmd-icon { font-size: 40rpx; display: block; }
.cmd-label { font-size: 26rpx; font-weight: 600; margin-top: 8rpx; display: block; }
.cmd-hint { font-size: 20rpx; margin-top: 4rpx; opacity: 0.7; display: block; }
.cmd-primary { background: linear-gradient(135deg, #0d9488, #0ca5af); color: #fff; }
.cmd-secondary { background: #fff; color: #0f172a; border: 1rpx solid #e2e8f0; }
.cmd-danger { background: #fef2f2; color: #dc2626; border: 1rpx solid #fecaca; }
.cmd-btn[disabled] { opacity: 0.5; }

/* log */
.log-header { display: flex; justify-content: space-between; align-items: center; }
.log-clear { font-size: 22rpx; color: #3b82f6; }
.log-empty { text-align: center; padding: 40rpx 0; color: #94a3b8; font-size: 24rpx; }
.log-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16rpx 20rpx; background: #fff; border-radius: 12rpx;
  margin-bottom: 8rpx; box-shadow: 0 1rpx 6rpx rgba(0,0,0,0.03);
}
.log-l { display: flex; gap: 12rpx; align-items: center; }
.log-action { font-size: 26rpx; font-weight: 600; color: #0f172a; }
.log-plate { font-size: 22rpx; color: #64748b; }
.log-r { text-align: right; }
.log-result { font-size: 22rpx; font-weight: 600; display: block; }
.log-result.ok { color: #10b981; }
.log-result.fail { color: #ef4444; }
.log-time { font-size: 20rpx; color: #94a3b8; margin-top: 2rpx; display: block; }

.footnote { margin-top: 24rpx; font-size: 22rpx; color: #94a3b8; text-align: center; }
</style>
