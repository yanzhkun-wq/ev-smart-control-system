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

export type VipBenefitRow = {
  key: string;
  title: string;
  detail?: string;
};

export type AdminVipConfig = {
  payYearYuan: number;
  inviteOrderRebateRate: number;
  joinThresh1Y: number;
  joinThresh3Y: number;
  joinCountPerFreeDevice: number;
  benefits: VipBenefitRow[];
};

export type AdminDistributionConfig = {
  partnerMerchantRevenueSharePct: number;
  partnerInviteReferralRatePct: number;
  partnerMinWithdrawYuan: number;
  merchantMinWithdrawYuan: number;
  /** 上门单平台补贴商家比例（0~100 表示 0%~100%），补贴额 = 基数 × 该值 / 100 */
  walkInMerchantSubsidyPct: number;
  /** 上门单补贴计算基数（元/单）；无实付金额时按此演示，可对齐单笔成交价 */
  walkInMerchantSubsidyBaseYuan: number;
  demoPartnerAgencyFeeYuan: number;
  remark?: string;
};

export type AdminCommerceConfig = {
  vip: AdminVipConfig;
  distribution: AdminDistributionConfig;
};

/** 平台方视角：合作商体系业绩（对齐小程序 partner-admin / partner-staff-admin / partner-l1-detail） */
export type AdminPartnerNetworkOverview = {
  periodLabel: string;
  totalPartners: number;
  totalStaff: number;
  platformGrossYuan: number;
  remark?: string;
  updatedAt?: string;
};

export type AdminPartnerPrincipalPerfRow = {
  key: string;
  principalPhone: string;
  principalName: string;
  staffCount: number;
  periodGrossYuan: number;
  principalRetainYuan: number;
  teamLineRewardYuan: number;
  newUsers: number;
  newMerchants: number;
  settleCount: number;
  /** 合作商计提档位（如 V1~V5，可与小程序 tier 展示对齐） */
  tierLabel?: string;
  backupPhone?: string;
  /** 平台内部备注（不对 C 端展示） */
  adminNote?: string;
};

export type AdminPartnerStaffPerfRow = {
  key: string;
  rootPartnerPhone: string;
  rootPartnerName: string;
  staffPhone: string;
  staffName: string;
  tier: "L1" | "L2";
  commissionPct: number;
  targetUserCount: number;
  periodRewardYuan: number;
  inviteUsers: number;
  inviteMerchants: number;
  parentL1Hint?: string;
  backupPhone?: string;
  email?: string;
  /** 如：在职 / 停用 */
  workStatus?: string;
  adminNote?: string;
};

export type AdminPartnerRewardLineRow = {
  key: string;
  time: string;
  rootPartnerPhone: string;
  kind: string;
  amountYuan: number;
  inviterStaffPhone?: string;
  inviterStaffName?: string;
  remark?: string;
  /** 对应业务订单号（与 settledOrders 对齐时可强制打款核对） */
  orderId?: string;
};

/** 已结算订单/业务单（演示可与上门单、补贴结算对齐；正式环境由订单/结算服务写入） */
export type AdminSettledOrderRow = {
  orderId: string;
  kind?: string;
  status: "settled" | "pending" | "cancelled";
  settledAt?: string;
  rootPartnerPhone?: string;
  /** 本单计提归属手机（优先与提现申请人比对） */
  beneficiaryPhone?: string;
  merchantPhone?: string;
  shopPhone?: string;
  amountYuan?: number;
  subsidyYuan?: number;
  inviterStaffPhone?: string;
  inviterStaffName?: string;
  remark?: string;
};

/** 归属某一合作商体系的商家/网点（演示台账；可对接 merchant-store 汇总） */
export type AdminPartnerMerchantRow = {
  key: string;
  rootPartnerPhone: string;
  rootPartnerName?: string;
  merchantName: string;
  shopPhone?: string;
  address?: string;
  inviterStaffPhone?: string;
  inviterStaffName?: string;
  /** 合作中 / 暂停 / 清退 等 */
  status?: string;
  /** 建档或绑定时间 YYYY-MM-DD */
  bindAt?: string;
  periodOrderYuan?: number;
  remark?: string;
  /** 店主/老板姓名 */
  bossName?: string;
  city?: string;
  adminNote?: string;
};

/** 渠道下属终端用户（车主/注册用户台账，平台可查改） */
export type AdminChannelEndUserRow = {
  key: string;
  userPhone: string;
  displayName?: string;
  inviterPhone?: string;
  inviterName?: string;
  rootPartnerPhone?: string;
  vipTierLabel?: string;
  registeredAt?: string;
  remark?: string;
};

export type AdminPartnerChannelStore = {
  overview: AdminPartnerNetworkOverview;
  principals: AdminPartnerPrincipalPerfRow[];
  staffDetails: AdminPartnerStaffPerfRow[];
  merchants: AdminPartnerMerchantRow[];
  rewardLines: AdminPartnerRewardLineRow[];
  /** 终端用户/车主档案（演示；正式可由用户中心同步） */
  endUsers?: AdminChannelEndUserRow[];
  /** 已结算订单列表（有数据时：打款核对凭证须为其中一笔 orderId 且归属匹配申请人） */
  settledOrders?: AdminSettledOrderRow[];
};

/** 申请提现时快照（小程序写入；用于与管理后台渠道台账交叉验证） */
export type AdminWithdrawalWalletAuditSnapshot = {
  accruedLifetimeYuan: number;
  availableYuanAtApply: number;
  withdrawnPaidYuan?: number;
  pendingOutYuanAtApply?: number;
};

/** 平台运营：合作商/商家提现审核与打款登记 */
export type AdminWithdrawalReviewRow = {
  id: string;
  kind: "partner" | "merchant";
  status: "pending" | "paid" | "rejected";
  applicantPhone: string;
  applicantName?: string;
  amountYuan: number;
  createdAt: string;
  resolvedAt?: string;
  partnerRootPhone?: string;
  partnerRootName?: string;
  applicantRoleHint?: string;
  payoutChannel?: string;
  payoutSummary?: string;
  payPipeline?: string;
  rejectReason?: string;
  operatorNote?: string;
  paidAt?: string;
  transferChannel?: string;
  transferRefNo?: string;
  lastOperator?: string;
  /** 小程序申请时钱包快照；纯后台伪造单通常无此块 */
  walletAuditSnapshot?: AdminWithdrawalWalletAuditSnapshot;
  /** 财务打款前填写的、已命中台账/门店档案的核对凭证（写入流水 key、订单号等） */
  payoutAuditRef?: string;
};

/** 商户入驻：合作商一审 → 平台二审 */
export type AdminMerchantApplyStatus =
  | "pending_partner"
  | "pending_platform"
  | "approved"
  | "partner_rejected"
  | "platform_rejected";

export type AdminMerchantApplyShopDraft = {
  shopName?: string;
  bossName?: string;
  contactPhone?: string;
  storefrontImage?: string;
  city?: string;
  district?: string;
  addressDetail?: string;
  lat?: number | null;
  lng?: number | null;
  addressFull?: string;
  applyNote?: string;
};

export type AdminMerchantApplyRow = {
  id: string;
  merchantPhone: string;
  partnerRootPhone: string;
  inviterStaffPhone: string;
  shopDraft: AdminMerchantApplyShopDraft;
  status: AdminMerchantApplyStatus;
  createdAt: string;
  partnerReviewedAt?: string;
  partnerReviewerPhone?: string;
  partnerRejectReason?: string;
  platformReviewedAt?: string;
  platformReviewer?: string;
  platformRejectReason?: string;
};

/** 智控商城商品（网关 admin.mallCatalog + GET /api/miniapp-ui.mallCatalog） */
export type AdminMallProductRow = {
  id: string;
  name: string;
  subtitle?: string;
  price: number;
  unit?: string;
  desc?: string;
  detail?: string;
  mainImage?: string;
  gallery?: string[];
  tags?: string[];
  published: boolean;
  sortOrder?: number;
};

/** 与网关 admin.miniappEcology、演示小程序本地缓存对齐 */
export type AdminMiniappStaffBlob = {
  rootPartnerPhone: string;
  tier: "L1" | "L2";
  parentL1Phone: string;
  displayName: string;
  createdAt?: string;
  commissionPct: number;
  targetUserCount: number;
};

export type AdminMiniappMerchantShopRow = {
  id: string;
  ownerPhone: string;
  shopName: string;
  bossName?: string;
  contactPhone?: string;
  storefrontImage?: string;
  city?: string;
  district?: string;
  addressDetail?: string;
  lat?: number | null;
  lng?: number | null;
  addressFull?: string;
  published?: boolean;
  partnerPhone?: string;
  inviterStaffPhone?: string;
  bindLocked?: boolean;
  merchantApprovedAt?: string;
};

export type AdminMiniappReferralEntry = {
  inviterPhone: string;
  plate: string;
  at?: string;
  locked?: boolean;
  inviteKind?: string;
};

export type AdminMiniappEcology = {
  partnerStaffByPhone: Record<string, AdminMiniappStaffBlob>;
  merchantShops: AdminMiniappMerchantShopRow[];
  accountRoles: Record<string, { partner?: boolean; merchant?: boolean }>;
  referralUplines: Record<string, AdminMiniappReferralEntry>;
};

/** 小程序门户能力：false 为关闭；缺省以网关种子为准 */
export type AdminPortalPermissions = {
  partnerPrincipal: Record<string, boolean>;
  partnerStaff: Record<string, boolean>;
  merchant: Record<string, boolean>;
};

/** 首页经营看板补录（可与订单系统/注册服务回写对接；与渠道流水汇总并列展示） */
export type AdminPlatformKpi = {
  todayOrderCount: number;
  monthOrderCount: number;
  todayNewUsers: number;
  monthNewUsers: number;
};

export type MiniappPageConfig = {
  route: string;
  navigationBarTitle: string;
  enabled?: boolean;
  strings?: Record<string, string>;
  adminNote?: string;
};

/** 小程序首页轮播单项（保存后随 GET /api/miniapp-ui 下发） */
export type MiniappCarouselItem = {
  id: string;
  imageUrl: string;
  title?: string;
  /** 可填小程序路径如 pages/mall/mall 或 https 外链（外链需在小程序 downloadFile 域名中配置） */
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

/** 首页板块（顺序即展示顺序，后台可拖拽） */
export type MiniappHomeBlock =
  | { id: string; type: "welcome_tip"; hidden?: boolean }
  | { id: string; type: "hero"; hidden?: boolean }
  | { id: string; type: "vehicle_status"; hidden?: boolean }
  | { id: string; type: "carousel"; hidden?: boolean; items: MiniappCarouselItem[] }
  | (MiniappAdBlock & { type: "ad"; hidden?: boolean });

/** 首页可视化装修（仅已登录且已绑车态展示区由小程序 home 页消费） */
export type MiniappHomeLayout = {
  blocks?: MiniappHomeBlock[];
  carouselEnabled?: boolean;
  carousel?: MiniappCarouselItem[];
  adBlocks?: MiniappAdBlock[];
};

/** 后台装修权限（正式环境可由账号角色写入网关） */
export type MiniappUiPolicy = {
  /** false 时隐藏轮播/广告编辑，仅保留文案与模块开关 */
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
  /** 小程序 AppID（可公开；网关环境变量 WECHAT_MP_APPID 优先） */
  miniappWxAppId?: string;
  /** 报警订阅消息模板 ID（微信公众平台；须与下发 data 字段一致） */
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
  commerce?: AdminCommerceConfig;
  /** 渠道与合作商业绩明细（平台总览；可对接结算服务写入） */
  partnerChannel?: AdminPartnerChannelStore;
  /** 首页经营指标（订单数、新增用户等，可手填或接口更新） */
  platformKpi?: AdminPlatformKpi;
  miniappPages?: MiniappPageConfig[];
  /** 小程序模块开关（GET /api/miniapp-ui 返回 features） */
  miniappFeatures?: Record<string, boolean>;
  /** 小程序首页轮播与广告位（GET /api/miniapp-ui 返回 homeLayout） */
  miniappHomeLayout?: MiniappHomeLayout;
  /** 装修权限等策略 */
  miniappUiPolicy?: MiniappUiPolicy;
  withdrawalReviewQueue?: AdminWithdrawalReviewRow[];
  merchantApplyReviewQueue?: AdminMerchantApplyRow[];
  mallCatalog?: AdminMallProductRow[];
  portalPermissions?: AdminPortalPermissions;
  /** 合作商员工 / 商家门店 / 角色 / 邀请链（GET /api/miniapp-ui 下发演示小程序） */
  miniappEcology?: AdminMiniappEcology;
};

export type StoreShape = {
  binds: VehicleBind[];
  lastPositions: Record<string, LastPosition>;
  settings: GatewaySettings;
  admin?: AdminStore;
};
