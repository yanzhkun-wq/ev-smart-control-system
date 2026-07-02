import type { MiniappPageConfig } from "../types/gatewayStore";

/** 与网关 miniapp-pages-defaults 一致；未拉到 store 时用 */
export function fallbackMiniappPages(): MiniappPageConfig[] {
  return [
    { route: "pages/home/home", navigationBarTitle: "电动车智控" },
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
    { route: "pages/account/account", navigationBarTitle: "账号设置" },
    { route: "pages/notify/notify", navigationBarTitle: "通知设置" },
  ];
}
