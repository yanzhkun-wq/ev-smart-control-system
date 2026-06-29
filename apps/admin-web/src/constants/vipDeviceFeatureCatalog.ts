import type { VipBenefitRow } from "../types/gatewayStore";

/** 单条能力：id 写入网关 vip.benefits[].key，文案由系统统一维护 */
export type VipDeviceFeatureCatalogEntry = {
  id: string;
  group: string;
  title: string;
  detail: string;
};

/**
 * 与 docs/hardware-capabilities.md、808 网关能力对齐的「全量设备/平台能力」清单，
 * 运营只勾选，不手填文案，避免写错。
 */
export const VIP_DEVICE_FEATURE_CATALOG: VipDeviceFeatureCatalogEntry[] = [
  {
    id: "loc_multi",
    group: "定位与轨迹",
    title: "多重融合定位",
    detail:
      "GPS + 北斗 + Wi‑Fi + LBS 多重定位，内置天线；冷启动搜星与上报频率以终端与协议为准。",
  },
  {
    id: "loc_realtime_track",
    group: "定位与轨迹",
    title: "实时定位追踪",
    detail: "终端按策略回传经纬度与状态，平台 / App 实时查看在线与位置。",
  },
  {
    id: "loc_history_track",
    group: "定位与轨迹",
    title: "历史轨迹回放",
    detail:
      "长周期轨迹存储与回放（目标 365 天级），含速度、方向、里程等；以存储与查询服务为准。",
  },
  {
    id: "cfg_report_policy",
    group: "定位与轨迹",
    title: "可配置上报策略",
    detail: "定时 / 定距 / 事件触发等上报策略，在协议与厂家能力范围内由平台配置。",
  },
  {
    id: "alm_overspeed",
    group: "告警与安全",
    title: "超速报警",
    detail: "车速超过设定阈值触发告警，平台上报文记录与消息通知（以阈值与协议为准）。",
  },
  {
    id: "alm_vibration",
    group: "告警与安全",
    title: "震动报警",
    detail: "设防状态下异常震动触发告警，联动平台记录与推送。",
  },
  {
    id: "alm_geofence",
    group: "告警与安全",
    title: "电子围栏进出告警",
    detail: "驶入/驶出预设区域触发告警；围栏几何与策略在平台配置。",
  },
  {
    id: "alm_main_power",
    group: "告警与安全",
    title: "主电断电告警",
    detail: "主电源断开检测并上报，用于拆电、亏电等风险感知。",
  },
  {
    id: "alm_tamper",
    group: "告警与安全",
    title: "非法拆除告警",
    detail: "终端非法拆卸、剪线等安全类事件上报（以终端与协议定义为准）。",
  },
  {
    id: "ctrl_remote_808",
    group: "远程与控车",
    title: "远程指令（808）",
    detail: "经网关向在线终端下发控制类指令（如部标 0x8105 等，以当前适配与终端在线为准）。",
  },
  {
    id: "ctrl_arm_disarm",
    group: "远程与控车",
    title: "设防 / 撤防",
    detail: "终端设防、撤防状态管理与平台侧展示；可与震动等告警联动。",
  },
  {
    id: "fence_manage",
    group: "远程与控车",
    title: "电子围栏管理",
    detail: "平台侧围栏创建、编辑、启用停用及与车辆绑定；告警与终端下发以协议为准。",
  },
  {
    id: "hw_battery_backup",
    group: "电源与联网",
    title: "内置备用电池",
    detail: "内置锂电池短时备电与断电后上报能力（容量与规格以设备铭牌/厂家资料为准）。",
  },
  {
    id: "hw_wide_voltage",
    group: "电源与联网",
    title: "宽电压车载供电",
    detail: "支持约 9～90 V 车载宽电压输入，适配常见电动车 / 汽车电瓶回路。",
  },
  {
    id: "hw_cell_4g",
    group: "电源与联网",
    title: "4G 全网通联网",
    detail: "蜂窝数据上传位置与告警；频段与模组以设备认证与出货规格为准。",
  },
  {
    id: "plat_tcp_808",
    group: "平台能力",
    title: "TCP + 808 长连接接入",
    detail: "终端经 TCP 与 device-gateway 保持会话，部标 JT/T 808（及厂家扩展）解析与适配。",
  },
  {
    id: "plat_map_app",
    group: "平台能力",
    title: "地图与 App 展示",
    detail: "管理端 / 未来 App 地图展示实时位置、轨迹与围栏；街景等依赖地图服务商能力。",
  },
  {
    id: "plat_fleet_bind",
    group: "平台能力",
    title: "多车绑定与车队",
    detail: "一车多终端、一机多车、车队与多账号可见范围等（随业务与账号模型扩展）。",
  },
  {
    id: "vip_fence_advanced",
    group: "会员与营销说明",
    title: "围栏与高级能力（会员）",
    detail: "部分围栏或高阶能力可面向会员开放；具体以运营配置与 C 端展示为准。",
  },
  {
    id: "vip_invite_rebate",
    group: "会员与营销说明",
    title: "邀请回馈金（会员）",
    detail:
      "好友在商城等场景消费后，按规则计入邀请人回馈金（演示环境不可提现则以平台说明为准）。",
  },
  {
    id: "vip_free_device",
    group: "会员与营销说明",
    title: "主机免单资格（会员）",
    detail: "按累计有效邀请绑定人数等规则获赠主机类免单次数；门槛以 VIP 配置与活动为准。",
  },
];

/** 旧版运营种子 key → 目录 id，加载时自动纠偏 */
export const VIP_BENEFIT_LEGACY_KEY_MAP: Record<string, string> = {
  vip_b1: "vip_fence_advanced",
  vip_b2: "vip_invite_rebate",
  vip_b3: "vip_free_device",
};

export function catalogEntryById(id: string): VipDeviceFeatureCatalogEntry | undefined {
  return VIP_DEVICE_FEATURE_CATALOG.find((c) => c.id === id);
}

/** 合并重复 key、纠偏 legacy key，并用目录正文覆盖（保证与硬件说明一致） */
export function normalizeVipBenefitsAgainstCatalog(rows: VipBenefitRow[] | undefined): VipBenefitRow[] {
  const list = rows?.length ? [...rows] : [];
  const seen = new Set<string>();
  const out: VipBenefitRow[] = [];
  for (const r of list) {
    const id = VIP_BENEFIT_LEGACY_KEY_MAP[r.key] ?? r.key;
    const cat = catalogEntryById(id);
    if (!cat) {
      if (!seen.has(r.key)) {
        seen.add(r.key);
        out.push({ ...r });
      }
      continue;
    }
    if (seen.has(cat.id)) continue;
    seen.add(cat.id);
    out.push({ key: cat.id, title: cat.title, detail: cat.detail });
  }
  return out;
}

export function catalogSelectOptions(excludeIds: Set<string>) {
  const groups = new Map<string, VipDeviceFeatureCatalogEntry[]>();
  for (const e of VIP_DEVICE_FEATURE_CATALOG) {
    if (excludeIds.has(e.id)) continue;
    const arr = groups.get(e.group) ?? [];
    arr.push(e);
    groups.set(e.group, arr);
  }
  return [...groups.entries()].map(([label, opts]) => ({
    label,
    options: opts.map((o) => ({ value: o.id, label: o.title })),
  }));
}
