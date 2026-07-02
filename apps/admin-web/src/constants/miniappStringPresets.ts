/** 预置文案项：展示给运营看的名称 + 程序内键名（键名不在界面上展示） */

export type MiniappStringPreset = { key: string; label: string };

export const MINIAPP_STRING_PRESETS: Partial<Record<string, MiniappStringPreset[]>> = {
  "pages/home/home": [{ key: "welcomeTip", label: "首页提示条" }],
  "pages/shops/shops": [{ key: "shopsHeadTip", label: "网点列表顶部提示" }],
  "pages/profile/profile": [
    { key: "profileSlogan", label: "我的页标语（头像下）" },
    { key: "profileSectionServicesTitle", label: "板块标题 · 常用服务" },
    { key: "profileSvcTracksIcon", label: "常用服务 · 行车记录 · 图标（1～2字或表情）" },
    { key: "profileSvcTracksName", label: "常用服务 · 行车记录 · 名称" },
    { key: "profileSvcAlarmIcon", label: "常用服务 · 防盗报警 · 图标" },
    { key: "profileSvcAlarmName", label: "常用服务 · 防盗报警 · 名称" },
    { key: "profileSvcFenceIcon", label: "常用服务 · 电子围栏 · 图标" },
    { key: "profileSvcFenceName", label: "常用服务 · 电子围栏 · 名称" },
    { key: "profileSvcAuthIcon", label: "常用服务 · 授权管理 · 图标" },
    { key: "profileSvcAuthName", label: "常用服务 · 授权管理 · 名称" },
    { key: "profileShopsEntryIcon", label: "升级网点 · 图标" },
    { key: "profileShopsEntryName", label: "升级网点 · 名称" },
    { key: "profileSectionSystemTitle", label: "板块标题 · 系统" },
    { key: "profileSysLoginIcon", label: "系统 · 登录账号 · 图标" },
    { key: "profileSysLoginTitle", label: "系统 · 登录账号 · 标题" },
    { key: "profileSysAccountIcon", label: "系统 · 账号设置 · 图标" },
    { key: "profileSysAccountTitle", label: "系统 · 账号设置 · 标题" },
    { key: "profileSysNotifyIcon", label: "系统 · 通知设置 · 图标" },
    { key: "profileSysNotifyTitle", label: "系统 · 通知设置 · 标题" },
    { key: "profileSysLogoutIcon", label: "系统 · 退出登录 · 图标" },
    { key: "profileSysLogoutTitle", label: "系统 · 退出登录 · 标题" },
  ],
};
