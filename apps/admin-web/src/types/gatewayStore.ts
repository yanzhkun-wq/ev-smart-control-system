/** 与 services/device-gateway 落盘 JSON 对齐（管理端编辑用） */

export type VehicleBind = {
  terminalPhone: string;
  plate: string;
  note?: string;
};

export type LastPosition = {
  terminalPhone: string;
  latDeg: number;
  lngDeg: number;
  speedKmh: number;
  alarm: number;
  status: number;
  deviceTime?: string;
  receivedAt: string;
  accOn?: boolean;
  positioned?: boolean;
  armed?: boolean;
  oilCut?: boolean;
  mainPowerDisconnected?: boolean;
  direction?: number;
  altitudeM?: number;
  mileageKm?: number;
  mainVoltageV?: number;
  csq?: number;
  gpsSatellites?: number;
  batteryPct?: number;
  iccid?: string;
  armAttach?: number;
  extendedAlarm?: number;
};

export type GatewaySettings = {
  registerAuthCode: string;
};

export type AdminAlertRow = {
  key: string;
  time: string;
  terminalId: string;
  plate: string;
  type: string;
  level: "高" | "中" | "低";
  status: "未处理" | "已确认" | "已推送";
  source: string;
};

export type AdminGeofenceRow = {
  key: string;
  name: string;
  type: "圆形" | "多边形";
  bindPlates: string;
  alarm: "进区域" | "出区域" | "进出";
  enabled: boolean;
  centerLat?: number;
  centerLng?: number;
  radiusM?: number;
  polygon?: [number, number][];
};

export type AdminUserRow = {
  key: string;
  name: string;
  role: string;
  phone: string;
  fleet: string;
  devices: number;
};

export type OrgTreeNode = {
  title: string;
  key: string;
  children?: OrgTreeNode[];
};

export type DevicePresentation = {
  armed?: boolean;
  acc?: boolean;
  mainPowerOk?: boolean;
  csq?: number;
  sat?: number;
  batteryPct?: number;
  locateMode?: string;
};

export type AdminSidebarMenuItem = {
  path: string;
  label: string;
  hidden?: boolean;
};

export type AdminBranding = {
  title: string;
  subtitle: string;
};

export type MiniappPageConfig = {
  route: string;
  navigationBarTitle: string;
  enabled?: boolean;
  strings?: Record<string, string>;
  adminNote?: string;
};

/** 小程序首页轮播单项 */
export type MiniappCarouselItem = {
  id: string;
  imageUrl: string;
  title?: string;
  link?: string;
};

/** 首页广告 / 运营位 */
export type MiniappAdBlock = {
  id: string;
  imageUrl: string;
  title?: string;
  link?: string;
  variant?: "banner" | "card";
};

/** 首页板块 */
export type MiniappHomeBlock =
  | { id: string; type: "welcome_tip"; hidden?: boolean }
  | { id: string; type: "hero"; hidden?: boolean }
  | { id: string; type: "vehicle_status"; hidden?: boolean }
  | { id: string; type: "carousel"; hidden?: boolean; items: MiniappCarouselItem[] }
  | (MiniappAdBlock & { type: "ad"; hidden?: boolean });

export type MiniappHomeLayout = {
  blocks?: MiniappHomeBlock[];
  carouselEnabled?: boolean;
  carousel?: MiniappCarouselItem[];
  adBlocks?: MiniappAdBlock[];
};

export type MiniappUiPolicy = {
  allowHomeLayoutEdit?: boolean;
};

export type MiniappAlarmNotifySubscriber = {
  openid: string;
  updatedAt: string;
  acceptedTmplIds?: string[];
};

export type AdminStore = {
  restApiBase?: string;
  wsUrl?: string;
  jwtRefreshMin?: number;
  mapProvider?: string;
  mapWebKey?: string;
  mapStreetView?: boolean;
  notifyFcm?: string;
  notifySms?: string;
  notifyWebhook?: string;
  miniappWxAppId?: string;
  miniappAlarmSubscribeTmplIds?: string[];
  miniappAlarmNotifySubscribers?: MiniappAlarmNotifySubscriber[];
  compatProtocolYear?: string;
  compatNoteTemplate?: string;
  compatFlags?: Record<string, string>;
  geofences?: AdminGeofenceRow[];
  alerts?: AdminAlertRow[];
  fleetUsers?: AdminUserRow[];
  orgTree?: OrgTreeNode[];
  trackDemo?: Record<string, [number, number][]>;
  dashboardTodayKm?: number;
  devicePresentations?: Record<string, DevicePresentation>;
  branding?: AdminBranding;
  sidebarMenu?: AdminSidebarMenuItem[];
  miniappPages?: MiniappPageConfig[];
  miniappFeatures?: Record<string, boolean>;
  miniappHomeLayout?: MiniappHomeLayout;
  miniappUiPolicy?: MiniappUiPolicy;
};

export type StoreShape = {
  binds: VehicleBind[];
  lastPositions: Record<string, LastPosition>;
  settings: GatewaySettings;
  admin?: AdminStore;
};
