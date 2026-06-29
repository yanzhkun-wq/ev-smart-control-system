<script setup lang="ts">
function run(title: string, content: string) {
  uni.showModal({
    title,
    content,
    confirmText: "确认",
    success: (res) => {
      if (res.confirm) uni.showToast({ title: "已模拟", icon: "none" });
    },
  });
}
</script>

<template>
  <scroll-view scroll-y class="page">
    <view class="warn">高危操作需后端鉴权与审计；此处为界面原型。</view>

    <view class="group-title">设防 / 撤防 · 0x8105</view>
    <button class="btn" type="primary" @click="run('外部设防', '下发命令字 0x66？')">外部设防（0x66）</button>
    <button class="btn plain" @click="run('外部撤防', '下发命令字 0x67？')">外部撤防（0x67）</button>

    <view class="group-title">终端维护</view>
    <button class="btn danger" @click="run('终端复位', '下发 0x04，设备将重启')">终端复位（0x04）</button>
    <button class="btn danger" @click="run('恢复出厂', '下发 0x05')">恢复出厂（0x05）</button>

    <view class="group-title">油路（谨慎）</view>
    <button class="btn danger" @click="run('断油电', '下发 0x64')">断油电（0x64）</button>
    <button class="btn plain" @click="run('恢复油电', '下发 0x65')">恢复油电（0x65）</button>
  </scroll-view>
</template>

<style scoped>
.page {
  height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
}
.warn {
  background: #fffbeb;
  color: #92400e;
  padding: 16rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  margin-bottom: 24rpx;
}
.group-title {
  font-size: 26rpx;
  font-weight: 600;
  margin: 16rpx 0 12rpx;
  color: #374151;
}
.btn {
  margin-bottom: 16rpx;
  background: #0d9488;
}
.btn.plain {
  background: #fff;
  color: #111827;
  border: 1rpx solid #e5e7eb;
}
.btn.danger {
  background: #dc2626;
}
</style>
