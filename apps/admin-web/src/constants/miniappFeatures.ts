import type { MiniappPageConfig } from "../types/gatewayStore";
import type { MiniappGroupId } from "./miniappPageGroups";

/** 与 services/device-gateway miniapp-features-defaults 键一致 */
export const MINIAPP_FEATURE_DEFAULTS: Record<string, boolean> = {
  home_show_hero: true,
  home_show_remote: true,
  home_show_status: true,
  profile_svc_tracks: true,
  profile_svc_alarm: true,
  profile_svc_fence: true,
  profile_svc_auth: true,
  profile_hardware_module: true,
  profile_hardware_entry: true,
  profile_system_module: true,
};

export type MiniappFeatureDef = {
  key: string;
  label: string;
  group: MiniappGroupId;
  hint?: string;
};

/** 后台表单展示顺序与分组 */
export const MINIAPP_FEATURE_DEFS: MiniappFeatureDef[] = [
  { key: "home_show_hero", label: "首页·车辆卡片（车牌/状态）", group: "home", hint: "已绑车首页顶部大卡" },
  { key: "home_show_remote", label: "首页·远程上锁 / 解锁", group: "home", hint: "依赖车辆卡片展示" },
  { key: "home_show_status", label: "首页·地图与位置/围栏摘要", group: "home" },
  { key: "profile_svc_tracks", label: "我的·行车轨迹", group: "vehicle" },
  { key: "profile_svc_alarm", label: "我的·防盗报警", group: "vehicle" },
  { key: "profile_svc_fence", label: "我的·电子围栏", group: "vehicle" },
  { key: "profile_svc_auth", label: "我的·授权管理", group: "vehicle" },
  { key: "profile_hardware_module", label: "我的·「兼容硬件」整区", group: "hardware" },
  { key: "profile_hardware_entry", label: "我的·兼容硬件入口", group: "hardware" },
  { key: "profile_system_module", label: "我的·系统区（账号等文案）", group: "system" },
];

export function mergeMiniappFeaturesClient(partial: Record<string, boolean> | undefined): Record<string, boolean> {
  const seed = { ...MINIAPP_FEATURE_DEFAULTS };
  if (!partial || typeof partial !== "object") return seed;
  const out = { ...seed };
  for (const k of Object.keys(seed)) {
    if (typeof partial[k] === "boolean") out[k] = partial[k]!;
  }
  return out;
}

export function miniappFeatureOn(features: Record<string, boolean> | undefined, key: string): boolean {
  const def = MINIAPP_FEATURE_DEFAULTS[key];
  if (def === undefined) return true;
  if (!features || !(key in features)) return def;
  return !!features[key];
}

export function miniappPagesConfigSignature(list: MiniappPageConfig[]): string {
  return JSON.stringify(
    (list ?? []).map((p) => ({
      r: p.route,
      t: p.navigationBarTitle,
      e: p.enabled,
      s: p.strings,
      n: p.adminNote,
    })),
  );
}

export function miniappFeaturesSignature(f: Record<string, boolean> | undefined): string {
  const m = mergeMiniappFeaturesClient(f);
  const keys = Object.keys(MINIAPP_FEATURE_DEFAULTS).sort();
  return JSON.stringify(keys.map((k) => m[k]));
}
