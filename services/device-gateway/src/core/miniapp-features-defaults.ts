/** 小程序界面功能开关（管理端编辑；GET /api/miniapp-ui 下发） */

export function defaultMiniappFeatures(): Record<string, boolean> {
  return {
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
}
