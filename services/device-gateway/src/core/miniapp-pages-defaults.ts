/**
 * wechat-simple-prototype 全页面清单（与 app.json 顺序、各页 json 默认标题对齐）
 * 供管理端编辑 + GET /api/miniapp-ui 下发
 */
export type MiniappPageConfig = {
  /** 如 pages/home/home */
  route: string;
  navigationBarTitle: string;
  /** false 时端上仍进入页面，仅提示（可按需扩展为拦截） */
  enabled?: boolean;
  /** 键值文案；各页可在代码里 remoteUi.getString(route, key, 本地默认) 读取 */
  strings?: Record<string, string>;
  /** 后台备注，不下发小程序 */
  adminNote?: string;
};

export function defaultMiniappPages(): MiniappPageConfig[] {
  return [
    { route: "pages/home/home", navigationBarTitle: "电动车安全守护" },
    { route: "pages/hardware/hardware", navigationBarTitle: "兼容硬件" },
    { route: "pages/hardware-detail/hardware-detail", navigationBarTitle: "硬件详情" },
    { route: "pages/hardware-product-edit/hardware-product-edit", navigationBarTitle: "硬件信息编辑" },
    { route: "pages/hardware-product-form/hardware-product-form", navigationBarTitle: "编辑硬件信息" },
    { route: "pages/vehicle-manage/vehicle-manage", navigationBarTitle: "车辆管理" },
    { route: "pages/add-bind/add-bind", navigationBarTitle: "绑定车辆" },
    { route: "pages/location/location", navigationBarTitle: "实时定位" },
    { route: "pages/fence-edit/fence-edit", navigationBarTitle: "电子围栏" },
    { route: "pages/profile/profile", navigationBarTitle: "我的" },
    { route: "pages/control/control", navigationBarTitle: "车辆控制" },
    { route: "pages/alarm/alarm", navigationBarTitle: "防盗报警" },
    { route: "pages/records-lock/records-lock", navigationBarTitle: "行车记录" },
    { route: "pages/fence-setting/fence-setting", navigationBarTitle: "电子围栏" },
    { route: "pages/tracks/tracks", navigationBarTitle: "行车记录" },
    { route: "pages/auth/auth", navigationBarTitle: "授权管理" },
    { route: "pages/mgmt-portal/mgmt-portal", navigationBarTitle: "后台管理" },
    { route: "pages/super-binding/super-binding", navigationBarTitle: "绑定管理（超管）" },
    { route: "pages/account/account", navigationBarTitle: "账号设置" },
    { route: "pages/notify/notify", navigationBarTitle: "通知设置" },
  ];
}
