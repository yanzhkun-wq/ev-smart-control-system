/** 小程序界面功能开关（管理端编辑；GET /api/miniapp-ui 下发） */

export function defaultMiniappFeatures(): Record<string, boolean> {
  return {
    home_show_hero: true,
    home_show_remote: true,
    home_show_status: true,
    profile_vip_entry: true,
    profile_svc_tracks: true,
    profile_svc_alarm: true,
    profile_svc_fence: true,
    profile_svc_auth: true,
    profile_mall_module: true,
    profile_mall_entry: true,
    profile_shops_entry: true,
    profile_partner_module: true,
    profile_share_invite: true,
    profile_partner_apply: true,
    profile_system_module: true,
  };
}
