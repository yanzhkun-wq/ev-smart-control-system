<script setup lang="ts">
import { ref, computed } from "vue";

interface FenceItem {
  id: string;
  name: string;
  type: "圆形" | "多边形" | "线路";
  policy: string;
  radius?: number;
  bindVehicles: string;
  enabled: boolean;
}

const fences = ref<FenceItem[]>([
  { id: "f1", name: "总部停车场", type: "圆形", policy: "驶出告警", radius: 500, bindVehicles: "粤A·D12345, 粤A·E67890", enabled: true },
  { id: "f2", name: "夜间禁行区", type: "多边形", policy: "驶入告警", bindVehicles: "粤B·F99887, 粤A·D12345", enabled: true },
  { id: "f3", name: "充电站", type: "圆形", policy: "驶入告警", radius: 200, bindVehicles: "粤A·H33333", enabled: false },
  { id: "f4", name: "仓库", type: "圆形", policy: "进出告警", radius: 300, bindVehicles: "粤A·D12345", enabled: true },
]);

const showEditor = ref(false);
const editing = ref<FenceItem | null>(null);
const editingIdx = ref(-1);

function toggleFence(f: FenceItem) {
  f.enabled = !f.enabled;
  uni.showToast({ title: f.enabled ? "已启用" : "已停用", icon: "success" });
}

function onEdit(f: FenceItem) {
  editing.value = { ...f };
  editingIdx.value = fences.value.findIndex((x) => x.id === f.id);
  showEditor.value = true;
}

function onDelete(f: FenceItem) {
  uni.showModal({
    title: "删除围栏",
    content: `确定删除「${f.name}」？`,
    success: (res) => {
      if (res.confirm) {
        fences.value = fences.value.filter((x) => x.id !== f.id);
        uni.showToast({ title: "已删除", icon: "success" });
      }
    },
  });
}

function onAdd() {
  editing.value = { id: "f" + Date.now(), name: "", type: "圆形", policy: "进出告警", radius: 500, bindVehicles: "", enabled: true };
  editingIdx.value = -1;
  showEditor.value = true;
}

function onSave() {
  if (!editing.value) return;
  if (!editing.value.name.trim()) {
    uni.showToast({ title: "请输入围栏名称", icon: "none" });
    return;
  }
  if (editingIdx.value >= 0) {
    fences.value[editingIdx.value] = { ...editing.value };
  } else {
    fences.value.push({ ...editing.value });
  }
  showEditor.value = false;
  uni.showToast({ title: "已保存", icon: "success" });
}

function onEditorClose() {
  showEditor.value = false;
}

const typeOptions = ["圆形", "多边形", "线路"];
const policyOptions = ["驶出告警", "驶入告警", "进出告警"];

const activeCount = computed(() => fences.value.filter((f) => f.enabled).length);
</script>

<template>
  <scroll-view scroll-y class="page safe-bottom">
    <!-- 统计 -->
    <view class="stats">
      <view class="stat-item">
        <text class="stat-num">{{ fences.length }}</text>
        <text class="stat-label">总计</text>
      </view>
      <view class="stat-item">
        <text class="stat-num" style="color:#10b981">{{ activeCount }}</text>
        <text class="stat-label">启用</text>
      </view>
      <view class="stat-item">
        <text class="stat-num" style="color:#94a3b8">{{ fences.length - activeCount }}</text>
        <text class="stat-label">停用</text>
      </view>
    </view>

    <!-- 列表 -->
    <view v-for="f in fences" :key="f.id" class="card">
      <view class="card-row">
        <view class="card-l">
          <text class="name">{{ f.name }}</text>
          <text :class="['tag', f.enabled ? 'on' : 'off']">{{ f.enabled ? "启用" : "停用" }}</text>
        </view>
        <view class="switch" :class="{ 'switch-on': f.enabled }" @click="toggleFence(f)">
          <view class="switch-knob"></view>
        </view>
      </view>
      <view class="card-meta">
        <text class="meta-tag">{{ f.type }}</text>
        <text class="meta-tag">{{ f.policy }}</text>
        <text class="meta-tag" v-if="f.radius">{{ f.radius }}m</text>
      </view>
      <text class="bind-info">绑定车辆：{{ f.bindVehicles }}</text>
      <view class="card-actions">
        <text class="act act-edit" @click="onEdit(f)">✏️ 编辑</text>
        <text class="act act-del" @click="onDelete(f)">🗑️ 删除</text>
      </view>
    </view>

    <view v-if="fences.length === 0" class="empty">
      <text class="empty-icon">📍</text>
      <text class="empty-text">暂无围栏，点击下方新建</text>
    </view>

    <button type="primary" class="add" @click="onAdd">+ 新建围栏</button>

    <!-- 编辑器弹窗 -->
    <view v-if="showEditor" class="overlay" @click="onEditorClose"></view>
    <view v-if="showEditor && editing" class="editor">
      <view class="editor-head">
        <text class="editor-cancel" @click="onEditorClose">取消</text>
        <text class="editor-title">{{ editingIdx >= 0 ? '编辑围栏' : '新建围栏' }}</text>
        <text class="editor-save" @click="onSave">保存</text>
      </view>
      <scroll-view scroll-y class="editor-body">
        <view class="field">
          <text class="field-label">名称</text>
          <input class="field-input" placeholder="如：家、公司" v-model="editing.name" />
        </view>
        <view class="field">
          <text class="field-label">类型</text>
          <picker :value="editing.type" :range="typeOptions" @change="(e: any) => editing.type = typeOptions[e.detail.value]">
            <view class="picker-row"><text>{{ editing.type }}</text><text class="arr">›</text></view>
          </picker>
        </view>
        <view class="field" v-if="editing.type === '圆形'">
          <text class="field-label">半径（米）</text>
          <slider min="50" max="2000" step="50" :value="editing.radius || 500" show-value @change="(e: any) => editing.radius = e.detail.value" />
        </view>
        <view class="field">
          <text class="field-label">告警策略</text>
          <picker :value="editing.policy" :range="policyOptions" @change="(e: any) => editing.policy = policyOptions[e.detail.value]">
            <view class="picker-row"><text>{{ editing.policy }}</text><text class="arr">›</text></view>
          </picker>
        </view>
        <view class="field">
          <text class="field-label">绑定车辆</text>
          <input class="field-input" placeholder="如：粤A·D12345" v-model="editing.bindVehicles" />
        </view>
      </scroll-view>
    </view>
  </scroll-view>
</template>

<style scoped>
.page { height: 100vh; padding: 24rpx; box-sizing: border-box; background: #f8fafc; }
.safe-bottom { box-sizing: border-box; }
.card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }

/* stats */
.stats { display: flex; gap: 12rpx; margin-bottom: 20rpx; }
.stat-item { flex: 1; background: #fff; border-radius: 14rpx; padding: 16rpx 8rpx; text-align: center; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.stat-num { font-size: 32rpx; font-weight: 800; display: block; color: #111827; }
.stat-label { margin-top: 4rpx; font-size: 22rpx; color: #6b7280; display: block; }

/* card */
.card-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-l { display: flex; align-items: center; gap: 12rpx; }
.name { font-size: 30rpx; font-weight: 600; color: #111827; }
.tag { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 999rpx; }
.tag.on { background: #d1fae5; color: #047857; }
.tag.off { background: #f1f5f9; color: #6b7280; }

/* custom switch */
.switch { width: 80rpx; height: 44rpx; background: #e2e8f0; border-radius: 999rpx; position: relative; transition: 0.2s; }
.switch-on { background: #0d9488; }
.switch-knob { width: 36rpx; height: 36rpx; border-radius: 50%; background: #fff; position: absolute; top: 4rpx; left: 4rpx; transition: 0.2s; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.15); }
.switch-on .switch-knob { left: 40rpx; }

.card-meta { display: flex; gap: 10rpx; margin-bottom: 8rpx; }
.meta-tag { font-size: 22rpx; padding: 4rpx 12rpx; background: #f1f5f9; border-radius: 8rpx; color: #475569; }
.bind-info { font-size: 22rpx; color: #94a3b8; display: block; margin-bottom: 12rpx; }
.card-actions { display: flex; gap: 24rpx; padding-top: 12rpx; border-top: 1rpx solid #f1f5f9; }
.act { font-size: 24rpx; }
.act-edit { color: #3b82f6; }
.act-del { color: #ef4444; }

/* empty */
.empty { text-align: center; padding: 80rpx 0; }
.empty-icon { font-size: 64rpx; display: block; }
.empty-text { margin-top: 12rpx; font-size: 26rpx; color: #94a3b8; display: block; }

.add { margin-top: 8rpx; height: 88rpx; line-height: 88rpx; border-radius: 999rpx; background: linear-gradient(135deg, #0d9488, #0ca5af); color: #fff; }

/* overlay */
.overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.4); z-index: 99; }
.editor { position: fixed; left:0; right:0; bottom:0; max-height: 80vh; background: #fff; border-radius: 32rpx 32rpx 0 0; z-index: 100; display: flex; flex-direction: column; }
.editor-head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 32rpx; border-bottom: 1rpx solid #f1f5f9; }
.editor-cancel { font-size: 28rpx; color: #64748b; }
.editor-title { font-size: 30rpx; font-weight: 700; color: #0f172a; }
.editor-save { font-size: 28rpx; color: #0d9488; font-weight: 600; }
.editor-body { padding: 24rpx 32rpx; padding-bottom: 40rpx; }
.field { margin-bottom: 28rpx; }
.field-label { font-size: 26rpx; color: #475569; display: block; margin-bottom: 12rpx; }
.field-input { height: 80rpx; padding: 0 20rpx; background: #f8fafc; border-radius: 12rpx; font-size: 28rpx; border: 1rpx solid #e2e8f0; width: 100%; box-sizing: border-box; }
.picker-row { display: flex; align-items: center; justify-content: space-between; height: 80rpx; padding: 0 20rpx; background: #f8fafc; border-radius: 12rpx; font-size: 28rpx; border: 1rpx solid #e2e8f0; color: #0f172a; }
.arr { font-size: 36rpx; color: #94a3b8; }
</style>
