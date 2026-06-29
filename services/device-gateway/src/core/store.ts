import fs, { writeFile } from "node:fs";
import path from "node:path";
import type { Socket } from "node:net";
import { defaultMiniappFeatures } from "./miniapp-features-defaults.js";
import {
  defaultMiniappHomeLayout,
  mergeMiniappHomeLayout,
  mergeMiniappUiPolicy,
  type MiniappHomeLayout,
  type MiniappUiPolicy,
} from "./miniapp-home-layout-defaults.js";
import { defaultMiniappPages, type MiniappPageConfig } from "./miniapp-pages-defaults.js";

export type {
  MiniappCarouselItem,
  MiniappAdBlock,
  MiniappHomeBlock,
  MiniappHomeLayout,
  MiniappUiPolicy,
} from "./miniapp-home-layout-defaults.js";
export type { MiniappPageConfig };
export { defaultMiniappPages };

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
  /** 表 17 常用位 */
  accOn?: boolean;
  positioned?: boolean;
  armed?: boolean;
  oilCut?: boolean;
  mainPowerDisconnected?: boolean;
  /** Bit18 GPS 定位 */
  gpsPositioned?: boolean;
  /** Bit19 北斗定位 */
  beidouPositioned?: boolean;
  direction?: number;
  altitudeM?: number;
  /** TLV 等 */
  mileageKm?: number;
  mainVoltageV?: number;
  csq?: number;
  gpsSatellites?: number;
  batteryPct?: number;
  iccid?: string;
  armAttach?: number;
  extendedAlarm?: number;
  /** 0xF5 Gsensor 三轴原始值 */
  gsensorX?: number;
  gsensorY?: number;
  gsensorZ?: number;
  /** 0xF6 工作模式 */
  workMode?: number;
  /** 0xF6 充电状态 */
  chargeStatus?: number;
  /** 0xF9 ACC 累计秒数 */
  accCumulativeSec?: number;
  /** 0xFA RFID */
  rfid?: string;
};

export type GatewaySettings = {
  /** 0x8100 下发鉴权码，终端 0x0102 须一致 */
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

/** 管理端可编辑的展示字段（808 未上报或需覆盖时） */
export type DevicePresentation = {
  armed?: boolean;
  acc?: boolean;
  mainPowerOk?: boolean;
  csq?: number;
  sat?: number;
  batteryPct?: number;
  locateMode?: string;
};

/** 侧栏菜单项：path 与前端路由一致，仅 label / 是否隐藏可改 */
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

/** 与演示小程序 user-vip-store 默认逻辑对齐；正式环境由服务端执行规则 */
export type AdminVipConfig = {
  payYearYuan: number;
  /** 0~1，好友订单入账邀请方回馈金比例 */
  inviteOrderRebateRate: number;
  joinThresh1Y: number;
  joinThresh3Y: number;
  joinCountPerFreeDevice: number;
  benefits: VipBenefitRow[];
};

/** 与演示 partner-store / merchant-store 常量对齐的分销摘要（可后台改数） */
export type AdminDistributionConfig = {
  /** 合作商就从商家收款计提比例，如 10 表示 10% */
  partnerMerchantRevenueSharePct: number;
  /** 邀请合作商开通时，邀请方获得被邀请方代理费的比例，如 10 表示 10% */
  partnerInviteReferralRatePct: number;
  partnerMinWithdrawYuan: number;
  merchantMinWithdrawYuan: number;
  /**
   * 上门单：平台补贴商家 = walkInMerchantSubsidyBaseYuan × (该值 / 100)。
   * 如 15 表示 15%，不是 1500。
   */
  walkInMerchantSubsidyPct: number;
  /**
   * 上门单补贴计算基数（元/单）。无订单实付录入时的演示/兜底口径，可对齐单笔服务成交价。
   */
  walkInMerchantSubsidyBaseYuan: number;
  demoPartnerAgencyFeeYuan: number;
  remark?: string;
};

export type AdminCommerceConfig = {
  vip: AdminVipConfig;
  distribution: AdminDistributionConfig;
};

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
  tierLabel?: string;
  backupPhone?: string;
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
  orderId?: string;
};

export type AdminSettledOrderRow = {
  orderId: string;
  kind?: string;
  status: "settled" | "pending" | "cancelled";
  settledAt?: string;
  rootPartnerPhone?: string;
  beneficiaryPhone?: string;
  merchantPhone?: string;
  shopPhone?: string;
  amountYuan?: number;
  subsidyYuan?: number;
  inviterStaffPhone?: string;
  inviterStaffName?: string;
  remark?: string;
};

export type AdminPartnerMerchantRow = {
  key: string;
  rootPartnerPhone: string;
  rootPartnerName?: string;
  merchantName: string;
  shopPhone?: string;
  address?: string;
  inviterStaffPhone?: string;
  inviterStaffName?: string;
  status?: string;
  bindAt?: string;
  periodOrderYuan?: number;
  remark?: string;
  bossName?: string;
  city?: string;
  adminNote?: string;
};

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
  endUsers?: AdminChannelEndUserRow[];
  settledOrders?: AdminSettledOrderRow[];
};

export type AdminPlatformKpi = {
  todayOrderCount: number;
  monthOrderCount: number;
  todayNewUsers: number;
  monthNewUsers: number;
};

/** 申请提现时快照（小程序写入；用于与管理后台渠道台账交叉验证） */
export type AdminWithdrawalWalletAuditSnapshot = {
  accruedLifetimeYuan: number;
  availableYuanAtApply: number;
  withdrawnPaidYuan?: number;
  pendingOutYuanAtApply?: number;
};

/** 平台运营审核：合作商 / 商家提现（人工打款登记，字段可对齐小程序提现单） */
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
  walletAuditSnapshot?: AdminWithdrawalWalletAuditSnapshot;
  payoutAuditRef?: string;
};

/** 商户入驻审核：合作商一审 → 平台二审通过后 C 端开通商家身份 */
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

/** 智控商城商品（管理端维护，GET /api/miniapp-ui 下发） */
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
  /** false 时小程序商城列表不展示 */
  published: boolean;
  sortOrder?: number;
};

/** 小程序侧：合作商主管 / 员工 / 商家 门户能力（显式 false 关闭；缺省 key 在非合并场景下按种子默认） */
export type AdminPortalPermissions = {
  partnerPrincipal: Record<string, boolean>;
  partnerStaff: Record<string, boolean>;
  merchant: Record<string, boolean>;
};

/** 小程序侧：合作商 / 商家 / 员工 / 邀请关系演示数据（与 wechat-simple-prototype 存储对齐；GET /api/miniapp-ui 下发） */
export type AdminMiniappStaffBlob = {
  rootPartnerPhone: string;
  tier: "L1" | "L2";
  /** L2 挂靠的一级员工手机；L1 为空串；未划拨用 ROOT（与 partner-store PARENT_ROOT 一致） */
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

/** PC 管理端可改；小程序拉取后写入本地 ev_partner_staff_v2 / ev_merchant_shops_data 等 */
export type AdminMiniappEcology = {
  partnerStaffByPhone: Record<string, AdminMiniappStaffBlob>;
  merchantShops: AdminMiniappMerchantShopRow[];
  accountRoles: Record<string, { partner?: boolean; merchant?: boolean }>;
  referralUplines: Record<string, AdminMiniappReferralEntry>;
};

/** 小程序防盗报警订阅消息：已授权用户（openid 由服务端 jscode2session 写入） */
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
  /** 小程序 AppID（可公开；网关优先使用环境变量 WECHAT_MP_APPID） */
  miniappWxAppId?: string;
  /** 报警类订阅消息模板 ID 列表（微信公众平台创建；字段需含 thing1、time2、thing3 或后续扩展映射） */
  miniappAlarmSubscribeTmplIds?: string[];
  /** 已登记订阅用户（小程序 POST /api/miniapp/alarm-subscribe） */
  miniappAlarmNotifySubscribers?: MiniappAlarmNotifySubscriber[];
  compatProtocolYear?: string;
  compatNoteTemplate?: string;
  compatFlags?: Record<string, string>;
  geofences?: AdminGeofenceRow[];
  alerts?: AdminAlertRow[];
  fleetUsers?: AdminUserRow[];
  orgTree?: OrgTreeNode[];
  /** 演示轨迹：11 位终端号为 key */
  trackDemo?: Record<string, [number, number][]>;
  dashboardTodayKm?: number;
  devicePresentations?: Record<string, DevicePresentation>;
  /** 侧栏产品名、菜单文案（持久化后可改） */
  branding?: AdminBranding;
  sidebarMenu?: AdminSidebarMenuItem[];
  /** VIP 门槛、权益说明、分销数字（供管理端编辑；小程序正式对接时读 GET /api/store） */
  commerce?: AdminCommerceConfig;
  /** 合作商/员工业绩与流水（平台总览；演示种子与 admin-web「平台·渠道与业绩」对齐） */
  partnerChannel?: AdminPartnerChannelStore;
  /** 首页经营 KPI（订单、新增用户等，可手填或任务回写） */
  platformKpi?: AdminPlatformKpi;
  /** 微信小程序各页导航标题、开关与可下发文案（GET /api/miniapp-ui） */
  miniappPages?: MiniappPageConfig[];
  /** 小程序界面模块级开关（与 admin-web「小程序页面」一致；GET /api/miniapp-ui 带 features） */
  miniappFeatures?: Record<string, boolean>;
  /** 小程序首页轮播与广告（GET /api/miniapp-ui 带 homeLayout） */
  miniappHomeLayout?: MiniappHomeLayout;
  /** 装修权限等（管理端读取；不强制下发给小程序） */
  miniappUiPolicy?: MiniappUiPolicy;
  /** 提现审核队列（运营与分销页维护；可与结算系统双向同步） */
  withdrawalReviewQueue?: AdminWithdrawalReviewRow[];
  /** 商户入驻审核队列（小程序同步 + 管理端终审） */
  merchantApplyReviewQueue?: AdminMerchantApplyRow[];
  /** 智控商城商品库 */
  mallCatalog?: AdminMallProductRow[];
  /** 小程序门户能力开关 */
  portalPermissions?: AdminPortalPermissions;
  /** 小程序合作商/员工/商家门店/邀请链（与演示小程序本地缓存对齐） */
  miniappEcology?: AdminMiniappEcology;
};

export type StoreShape = {
  binds: VehicleBind[];
  lastPositions: Record<string, LastPosition>;
  settings: GatewaySettings;
  admin?: AdminStore;
};

const DEFAULT_TRACK: [number, number][] = [
  [23.125, 113.255],
  [23.1262, 113.2581],
  [23.1275, 113.2615],
  [23.1284, 113.2638],
  [23.1291, 113.2644],
];

export function defaultSidebarMenuItems(): AdminSidebarMenuItem[] {
  return [
    { path: "/", label: "工作台" },
    { path: "/vehicle-risk", label: "车联与风控" },
    { path: "/mall-manage", label: "智控商城" },
    { path: "/portal-permissions", label: "小程序门户权限" },
    { path: "/miniapp-ecology", label: "小程序后台数据" },
    { path: "/operations", label: "运营与分销" },
    { path: "/partner-channel", label: "平台·渠道与业绩" },
    { path: "/miniapp-pages", label: "小程序页面" },
    { path: "/settings", label: "系统设置" },
  ];
}

export function defaultBranding(): AdminBranding {
  return {
    title: "电动车智控",
    subtitle: "WZ808 · 管理端",
  };
}

export function defaultCommerceConfig(): AdminCommerceConfig {
  return {
    vip: {
      payYearYuan: 36.5,
      inviteOrderRebateRate: 0.2,
      joinThresh1Y: 8,
      joinThresh3Y: 10,
      joinCountPerFreeDevice: 5,
      benefits: [
        {
          key: "vip_fence_advanced",
          title: "围栏与高级能力（会员）",
          detail:
            "部分围栏或高阶能力可面向会员开放；具体以运营配置与 C 端展示为准。",
        },
        {
          key: "vip_invite_rebate",
          title: "邀请回馈金（会员）",
          detail:
            "好友在商城等场景消费后，按规则计入邀请人回馈金（演示环境不可提现则以平台说明为准）。",
        },
        {
          key: "vip_free_device",
          title: "主机免单资格（会员）",
          detail:
            "按累计有效邀请绑定人数等规则获赠主机类免单次数；门槛以 VIP 配置与活动为准。",
        },
      ],
    },
    distribution: {
      partnerMerchantRevenueSharePct: 10,
      partnerInviteReferralRatePct: 10,
      partnerMinWithdrawYuan: 1,
      merchantMinWithdrawYuan: 1,
      walkInMerchantSubsidyPct: 15,
      walkInMerchantSubsidyBaseYuan: 800,
      demoPartnerAgencyFeeYuan: 100,
      remark: "与演示小程序默认常量一致；上门补贴=基数×比例；上线后以服务端结算为准。",
    },
  };
}

export function defaultPlatformKpi(): AdminPlatformKpi {
  return {
    todayOrderCount: 18,
    monthOrderCount: 426,
    todayNewUsers: 7,
    monthNewUsers: 198,
  };
}

function mergePlatformKpi(seed: AdminPlatformKpi, partial: AdminPlatformKpi | undefined): AdminPlatformKpi {
  if (!partial || typeof partial !== "object") {
    return { ...seed };
  }
  return {
    todayOrderCount: Number.isFinite(Number(partial.todayOrderCount))
      ? Number(partial.todayOrderCount)
      : seed.todayOrderCount,
    monthOrderCount: Number.isFinite(Number(partial.monthOrderCount))
      ? Number(partial.monthOrderCount)
      : seed.monthOrderCount,
    todayNewUsers: Number.isFinite(Number(partial.todayNewUsers))
      ? Number(partial.todayNewUsers)
      : seed.todayNewUsers,
    monthNewUsers: Number.isFinite(Number(partial.monthNewUsers))
      ? Number(partial.monthNewUsers)
      : seed.monthNewUsers,
  };
}

export function defaultWithdrawalReviewSeed(): AdminWithdrawalReviewRow[] {
  return [
    {
      id: "seed_wr_partner_pending",
      kind: "partner",
      status: "pending",
      applicantPhone: "13800001001",
      applicantName: "陈强",
      applicantRoleHint: "合作商主管",
      partnerRootPhone: "13800001001",
      partnerRootName: "华南体系",
      amountYuan: 1200,
      createdAt: "2026-04-30 10:12:00",
      payoutChannel: "wechat_wallet",
      payoutSummary: "微信零钱 · 演示账户",
      payPipeline: "manual",
      walletAuditSnapshot: {
        accruedLifetimeYuan: 4520,
        availableYuanAtApply: 2200,
        withdrawnPaidYuan: 800,
        pendingOutYuanAtApply: 520,
      },
    },
    {
      id: "seed_wr_merchant_pending",
      kind: "merchant",
      status: "pending",
      applicantPhone: "13900001001",
      applicantName: "海淀·极客电动车改装",
      applicantRoleHint: "升级网点商家",
      partnerRootPhone: "13800001001",
      partnerRootName: "华南体系（渠道归属演示）",
      amountYuan: 800,
      createdAt: "2026-05-01 09:00:00",
      payoutChannel: "wechat_wallet",
      payoutSummary: "微信零钱 · 对公法人同名（演示）",
      walletAuditSnapshot: {
        accruedLifetimeYuan: 960,
        availableYuanAtApply: 800,
        withdrawnPaidYuan: 0,
        pendingOutYuanAtApply: 160,
      },
    },
    {
      id: "seed_wr_paid_done",
      kind: "partner",
      status: "paid",
      applicantPhone: "13800001002",
      applicantName: "刘洋",
      applicantRoleHint: "合作商主管",
      partnerRootPhone: "13800001002",
      partnerRootName: "华北体系",
      amountYuan: 560.5,
      createdAt: "2026-04-28 14:20:00",
      resolvedAt: "2026-04-29 11:00:00",
      payoutChannel: "bank",
      payoutSummary: "对公账户 6222 **** 801",
      paidAt: "2026-04-29",
      transferChannel: "对公转账",
      transferRefNo: "BOC-DEMO-202604290001",
      operatorNote: "已核对营业执照与账户名一致",
      lastOperator: "平台财务（演示）",
    },
  ];
}

function normalizeWithdrawalReviewRow(input: unknown): AdminWithdrawalReviewRow {
  const o = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const id =
    String(o.id ?? "").trim() ||
    `wr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const kind = o.kind === "merchant" ? "merchant" : "partner";
  const st = o.status;
  const status: AdminWithdrawalReviewRow["status"] =
    st === "paid" || st === "rejected" ? st : "pending";
  const amountYuan = Number.isFinite(Number(o.amountYuan)) ? Number(o.amountYuan) : 0;
  return {
    id,
    kind,
    status,
    applicantPhone: String(o.applicantPhone ?? "").replace(/\D/g, "").slice(0, 11),
    applicantName: typeof o.applicantName === "string" ? o.applicantName : undefined,
    amountYuan,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
    resolvedAt: typeof o.resolvedAt === "string" ? o.resolvedAt : undefined,
    partnerRootPhone:
      typeof o.partnerRootPhone === "string"
        ? o.partnerRootPhone.replace(/\D/g, "").slice(0, 11)
        : undefined,
    partnerRootName: typeof o.partnerRootName === "string" ? o.partnerRootName : undefined,
    applicantRoleHint: typeof o.applicantRoleHint === "string" ? o.applicantRoleHint : undefined,
    payoutChannel: typeof o.payoutChannel === "string" ? o.payoutChannel : undefined,
    payoutSummary: typeof o.payoutSummary === "string" ? o.payoutSummary : undefined,
    payPipeline: typeof o.payPipeline === "string" ? o.payPipeline : undefined,
    rejectReason: typeof o.rejectReason === "string" ? o.rejectReason : undefined,
    operatorNote: typeof o.operatorNote === "string" ? o.operatorNote : undefined,
    paidAt: typeof o.paidAt === "string" ? o.paidAt : undefined,
    transferChannel: typeof o.transferChannel === "string" ? o.transferChannel : undefined,
    transferRefNo: typeof o.transferRefNo === "string" ? o.transferRefNo : undefined,
    lastOperator: typeof o.lastOperator === "string" ? o.lastOperator : undefined,
    payoutAuditRef: typeof o.payoutAuditRef === "string" ? o.payoutAuditRef : undefined,
    walletAuditSnapshot: (() => {
      const w = o.walletAuditSnapshot;
      if (!w || typeof w !== "object") return undefined;
      const r = w as Record<string, unknown>;
      const accrued = Number(r.accruedLifetimeYuan);
      const avail = Number(r.availableYuanAtApply);
      if (!Number.isFinite(accrued) || !Number.isFinite(avail)) return undefined;
      const wd = Number(r.withdrawnPaidYuan);
      const pend = Number(r.pendingOutYuanAtApply);
      return {
        accruedLifetimeYuan: accrued,
        availableYuanAtApply: avail,
        withdrawnPaidYuan: Number.isFinite(wd) ? wd : undefined,
        pendingOutYuanAtApply: Number.isFinite(pend) ? pend : undefined,
      };
    })(),
  };
}

function mergeWithdrawalReviewQueue(
  seed: AdminWithdrawalReviewRow[],
  partial: AdminWithdrawalReviewRow[] | undefined,
): AdminWithdrawalReviewRow[] {
  if (!partial || !Array.isArray(partial)) {
    return seed.map((r) => ({ ...r }));
  }
  return partial.map((x) => normalizeWithdrawalReviewRow(x)).filter((r) => r.id.length > 0);
}

function normalizeMerchantApplyStatus(s: unknown): AdminMerchantApplyStatus {
  const st = String(s ?? "");
  const allowed: AdminMerchantApplyStatus[] = [
    "pending_partner",
    "pending_platform",
    "approved",
    "partner_rejected",
    "platform_rejected",
  ];
  return allowed.includes(st as AdminMerchantApplyStatus) ? (st as AdminMerchantApplyStatus) : "pending_partner";
}

function normalizeMerchantApplyRow(o: unknown): AdminMerchantApplyRow | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const id = String(r.id ?? "").trim();
  const merchantPhone = String(r.merchantPhone ?? "").replace(/\D/g, "").slice(0, 11);
  if (!id || merchantPhone.length !== 11) return null;
  const shopDraftRaw = r.shopDraft;
  const shopDraft: AdminMerchantApplyShopDraft =
    shopDraftRaw && typeof shopDraftRaw === "object" ? (shopDraftRaw as AdminMerchantApplyShopDraft) : {};
  return {
    id,
    merchantPhone,
    partnerRootPhone: String(r.partnerRootPhone ?? "").replace(/\D/g, "").slice(0, 11),
    inviterStaffPhone: String(r.inviterStaffPhone ?? "").replace(/\D/g, "").slice(0, 11),
    shopDraft,
    status: normalizeMerchantApplyStatus(r.status),
    createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
    partnerReviewedAt: typeof r.partnerReviewedAt === "string" ? r.partnerReviewedAt : undefined,
    partnerReviewerPhone: typeof r.partnerReviewerPhone === "string" ? r.partnerReviewerPhone : undefined,
    partnerRejectReason: typeof r.partnerRejectReason === "string" ? r.partnerRejectReason : undefined,
    platformReviewedAt: typeof r.platformReviewedAt === "string" ? r.platformReviewedAt : undefined,
    platformReviewer: typeof r.platformReviewer === "string" ? r.platformReviewer : undefined,
    platformRejectReason: typeof r.platformRejectReason === "string" ? r.platformRejectReason : undefined,
  };
}

function mergeMerchantApplyQueue(
  seed: AdminMerchantApplyRow[],
  partial: AdminMerchantApplyRow[] | undefined,
): AdminMerchantApplyRow[] {
  if (!partial || !Array.isArray(partial)) {
    return seed.map((r) => ({ ...r }));
  }
  return partial
    .map((x) => normalizeMerchantApplyRow(x))
    .filter((x): x is AdminMerchantApplyRow => x != null);
}

export function defaultMerchantApplySeed(): AdminMerchantApplyRow[] {
  return [];
}

/** 与演示小程序 DEFAULT_PRODUCTS 对齐；价格在管理端可改 */
export function defaultMallCatalogSeed(): AdminMallProductRow[] {
  return [
    {
      id: "p_gw",
      name: "4G 车载智能终端",
      subtitle: "部标 808 · 远程锁车 · 官方标配",
      price: 399,
      unit: "套",
      desc: "北斗/GPS 双模，远程锁车，含首年流量（演示）。",
      detail:
        "【产品概述】\n面向电动两轮/三轮车的 4G 车载智能终端，支持部标 808 协议接入智控平台，实现定位、轨迹、围栏与远程控车能力（以终端与车型适配为准）。\n\n【包装清单】\n主机 ×1、线束套件 ×1、说明书 ×1（演示）。\n\n【安装说明】\n须由「智控升级网点」专业人员安装调试；私自拆改可能影响功能与质保。\n\n【售后】\n演示环境不具法律效力，以正式平台规则为准。",
      mainImage: "",
      gallery: [],
      tags: ["官方", "热销"],
      published: true,
      sortOrder: 10,
    },
    {
      id: "p_ctrl",
      name: "智能中控一体机",
      subtitle: "仪表联动 · 支持 OTA",
      price: 259,
      unit: "台",
      desc: "状态采集与远程控制扩展，具体车型请咨询网点。",
      detail:
        "【产品概述】\n智能中控扩展单元，可与仪表/车身总线对接（视车型协议而定），用于丰富人机交互与远程控制场景。\n\n【注意事项】\n不同车型线束与固定支架可能不同，下单前建议在智控升级网点确认适配方案。\n\n【安装】\n仅限合作网点施工，确保绝缘与防水符合规范。",
      mainImage: "",
      gallery: [],
      tags: ["新品"],
      published: true,
      sortOrder: 20,
    },
    {
      id: "p_kit",
      name: "智控改装套件",
      subtitle: "线束 · 支架 · 防水组件",
      price: 128,
      unit: "套",
      desc: "标准化辅材包，建议与终端一并购买。",
      detail:
        "【产品概述】\n改装施工常用辅材组合，含延长线、扎带、固定支架与防水套件（演示配置）。\n\n【适用】\n与 4G 终端、中控等主设备配套使用，具体数量以网点清单为准。\n\n【提示】\n不包含主机；运输易损，签收请当面验货。",
      mainImage: "",
      gallery: [],
      tags: ["配件"],
      published: true,
      sortOrder: 30,
    },
  ];
}

/** 三类账号在小程序「后台/门户」中的能力缺省值；管理端可改为 false 关闭 */
export function defaultPortalPermissionsSeed(): AdminPortalPermissions {
  return {
    partnerPrincipal: {
      mgmt_portal: true,
      mall_product_manage: true,
      merchant_apply_review: true,
      partner_wallet: true,
      staff_management: true,
      invite_user_merchant: true,
    },
    partnerStaff: {
      mgmt_portal: true,
      mall_product_manage: false,
      merchant_apply_review: true,
      partner_wallet: true,
      staff_management: false,
      invite_user_merchant: true,
    },
    merchant: {
      mgmt_portal: true,
      mall_product_manage: false,
      merchant_apply_review: false,
      merchant_wallet: true,
      merchant_shop_edit: true,
      merchant_orders: true,
    },
  };
}

/** 与 wechat-simple-prototype 演示数据结构对齐；管理端可改后由 miniapp-ui 下发覆盖本地缓存 */
export function defaultMiniappEcologySeed(): AdminMiniappEcology {
  const partnerStaffByPhone: Record<string, AdminMiniappStaffBlob> = {
    "13800002001": {
      rootPartnerPhone: "13800001001",
      tier: "L1",
      parentL1Phone: "",
      displayName: "一级 · 赵磊",
      createdAt: "2026-01-15 10:00",
      commissionPct: 18,
      targetUserCount: 50,
    },
    "13800002002": {
      rootPartnerPhone: "13800001001",
      tier: "L1",
      parentL1Phone: "",
      displayName: "一级 · 孙婷",
      createdAt: "2026-01-15 10:01",
      commissionPct: 15,
      targetUserCount: 40,
    },
    "13800002003": {
      rootPartnerPhone: "13800001001",
      tier: "L2",
      parentL1Phone: "13800002001",
      displayName: "二级 · 周凯",
      createdAt: "2026-01-16 09:00",
      commissionPct: 10,
      targetUserCount: 30,
    },
    "13800002004": {
      rootPartnerPhone: "13800001001",
      tier: "L2",
      parentL1Phone: "13800002002",
      displayName: "二级 · 钱珊",
      createdAt: "2026-01-16 09:05",
      commissionPct: 8,
      targetUserCount: 20,
    },
    "13800002011": {
      rootPartnerPhone: "13800001002",
      tier: "L1",
      parentL1Phone: "",
      displayName: "一级 · 吴迪",
      createdAt: "2026-01-10 11:00",
      commissionPct: 20,
      targetUserCount: 35,
    },
    "13800002012": {
      rootPartnerPhone: "13800001002",
      tier: "L2",
      parentL1Phone: "13800002011",
      displayName: "二级 · 郑雪",
      createdAt: "2026-01-11 14:00",
      commissionPct: 12,
      targetUserCount: 25,
    },
    "13800002013": {
      rootPartnerPhone: "13800001002",
      tier: "L2",
      parentL1Phone: "13800002011",
      displayName: "二级 · 冯浩",
      createdAt: "2026-01-12 10:00",
      commissionPct: 10,
      targetUserCount: 15,
    },
    "13800002021": {
      rootPartnerPhone: "13800001003",
      tier: "L1",
      parentL1Phone: "",
      displayName: "一级 · 何静",
      createdAt: "2026-02-01 08:30",
      commissionPct: 16,
      targetUserCount: 28,
    },
    "13800002022": {
      rootPartnerPhone: "13800001003",
      tier: "L2",
      parentL1Phone: "13800002021",
      displayName: "二级 · 蒋鹏",
      createdAt: "2026-02-02 15:00",
      commissionPct: 9,
      targetUserCount: 18,
    },
  };

  const merchantShops: AdminMiniappMerchantShopRow[] = [
    {
      id: "shop_hd_demo",
      ownerPhone: "13900001001",
      shopName: "海淀·极客电动车改装",
      bossName: "张店主",
      contactPhone: "13900001001",
      storefrontImage: "",
      city: "北京市",
      district: "海淀区",
      addressDetail: "中关村大街 58 号一层",
      lat: 39.9832,
      lng: 116.3164,
      addressFull: "北京市海淀区中关村大街 58 号一层",
      published: true,
      partnerPhone: "13800001001",
      inviterStaffPhone: "13800002001",
      bindLocked: true,
      merchantApprovedAt: "2026-04-01",
    },
    {
      id: "seed_bj_2",
      ownerPhone: "13900001002",
      shopName: "朝阳·闪电动力改装店",
      bossName: "王姐",
      contactPhone: "13900001002",
      storefrontImage: "",
      city: "北京市",
      district: "朝阳区",
      addressDetail: "工体北路 12 号",
      lat: 39.937,
      lng: 116.454,
      addressFull: "北京市朝阳区工体北路 12 号",
      published: true,
      partnerPhone: "13800001001",
      inviterStaffPhone: "13800002003",
      bindLocked: true,
      merchantApprovedAt: "2026-03-10",
    },
    {
      id: "seed_sh_1",
      ownerPhone: "13900001003",
      shopName: "浦东·安骑改装服务中心",
      bossName: "陈师傅",
      contactPhone: "13900001003",
      storefrontImage: "",
      city: "上海市",
      district: "浦东新区",
      addressDetail: "张杨路 500 号",
      lat: 31.23,
      lng: 121.52,
      addressFull: "上海市浦东新区张杨路 500 号",
      published: true,
    },
  ];

  const accountRoles: Record<string, { partner?: boolean; merchant?: boolean }> = {
    "13800001001": { partner: true },
    "13800001002": { partner: true },
    "13800001003": { partner: true },
    "13900001001": { merchant: true },
    "13900001002": { merchant: true },
    "13900001003": { merchant: true },
  };

  const referralUplines: Record<string, AdminMiniappReferralEntry> = {
    "13900008888": {
      inviterPhone: "13800002001",
      plate: "粤A·D12345",
      at: "2026-03-01 12:20",
      locked: true,
    },
    "13900009999": {
      inviterPhone: "13800002003",
      plate: "粤B·F99887",
      at: "2026-04-12 09:00",
      locked: true,
    },
  };

  return { partnerStaffByPhone, merchantShops, accountRoles, referralUplines };
}

function normalizePhone11Key(input: string): string {
  const d = String(input ?? "").replace(/\D/g, "");
  if (d.length === 11) return d;
  if (d.length > 11) return d.slice(-11);
  return "";
}

function normalizeStaffBlob(r: unknown): AdminMiniappStaffBlob | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  const root = normalizePhone11Key(String(o.rootPartnerPhone ?? ""));
  if (!root) return null;
  let tier: "L1" | "L2" = o.tier === "L1" ? "L1" : "L2";
  let parentL1Phone = typeof o.parentL1Phone === "string" ? o.parentL1Phone.replace(/\D/g, "").slice(0, 11) : "";
  if (tier === "L1") parentL1Phone = "";
  const dpct = Number(o.commissionPct);
  const commissionPct = Number.isFinite(dpct) ? Math.min(100, Math.max(0, Math.round(dpct))) : 0;
  const tu = Number(o.targetUserCount);
  const targetUserCount = Number.isFinite(tu) && tu >= 0 ? Math.floor(tu) : 0;
  return {
    rootPartnerPhone: root,
    tier,
    parentL1Phone: tier === "L2" ? parentL1Phone : "",
    displayName: typeof o.displayName === "string" && o.displayName.trim() ? o.displayName.trim() : "员工",
    createdAt: typeof o.createdAt === "string" ? o.createdAt : undefined,
    commissionPct,
    targetUserCount,
  };
}

function normalizePartnerStaffMap(raw: Record<string, unknown>): Record<string, AdminMiniappStaffBlob> {
  const out: Record<string, AdminMiniappStaffBlob> = {};
  for (const [k, v] of Object.entries(raw)) {
    const ph = normalizePhone11Key(k);
    if (ph.length !== 11) continue;
    const b = normalizeStaffBlob(v);
    if (b) out[ph] = b;
  }
  return out;
}

function normalizeMerchantShopRow(o: unknown): AdminMiniappMerchantShopRow | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const id = String(r.id ?? "").trim();
  const ownerPhone = normalizePhone11Key(String(r.ownerPhone ?? ""));
  const shopName = String(r.shopName ?? "").trim();
  if (!id || ownerPhone.length !== 11 || !shopName) return null;
  const lat = r.lat != null ? Number(r.lat) : null;
  const lng = r.lng != null ? Number(r.lng) : null;
  return {
    id,
    ownerPhone,
    shopName,
    bossName: typeof r.bossName === "string" ? r.bossName : undefined,
    contactPhone: typeof r.contactPhone === "string" ? r.contactPhone : undefined,
    storefrontImage: typeof r.storefrontImage === "string" ? r.storefrontImage : undefined,
    city: typeof r.city === "string" ? r.city : undefined,
    district: typeof r.district === "string" ? r.district : undefined,
    addressDetail: typeof r.addressDetail === "string" ? r.addressDetail : undefined,
    lat: Number.isFinite(lat as number) ? lat : null,
    lng: Number.isFinite(lng as number) ? lng : null,
    addressFull: typeof r.addressFull === "string" ? r.addressFull : undefined,
    published: r.published === false ? false : true,
    partnerPhone: (() => {
      const p = normalizePhone11Key(String(r.partnerPhone ?? ""));
      return p.length === 11 ? p : undefined;
    })(),
    inviterStaffPhone: (() => {
      const p = normalizePhone11Key(String(r.inviterStaffPhone ?? ""));
      return p.length === 11 ? p : undefined;
    })(),
    bindLocked: r.bindLocked === true,
    merchantApprovedAt: typeof r.merchantApprovedAt === "string" ? r.merchantApprovedAt : undefined,
  };
}

function mergeMiniappEcology(seed: AdminMiniappEcology, partial: AdminMiniappEcology | undefined): AdminMiniappEcology {
  if (!partial || typeof partial !== "object") {
    return {
      partnerStaffByPhone: { ...seed.partnerStaffByPhone },
      merchantShops: seed.merchantShops.map((s) => ({ ...s })),
      accountRoles: { ...seed.accountRoles },
      referralUplines: { ...seed.referralUplines },
    };
  }
  const partnerStaffByPhone =
    partial.partnerStaffByPhone && typeof partial.partnerStaffByPhone === "object"
      ? normalizePartnerStaffMap(partial.partnerStaffByPhone as Record<string, unknown>)
      : { ...seed.partnerStaffByPhone };
  const merchantShops =
    Array.isArray(partial.merchantShops) && partial.merchantShops.length >= 0
      ? partial.merchantShops.map((x) => normalizeMerchantShopRow(x)).filter((x): x is AdminMiniappMerchantShopRow => x != null)
      : seed.merchantShops.map((s) => ({ ...s }));
  const accountRoles =
    partial.accountRoles && typeof partial.accountRoles === "object"
      ? { ...(partial.accountRoles as Record<string, { partner?: boolean; merchant?: boolean }>) }
      : { ...seed.accountRoles };
  const referralUplines =
    partial.referralUplines && typeof partial.referralUplines === "object"
      ? { ...(partial.referralUplines as Record<string, AdminMiniappReferralEntry>) }
      : { ...seed.referralUplines };
  return { partnerStaffByPhone, merchantShops, accountRoles, referralUplines };
}

function normalizeMallProductRow(o: unknown): AdminMallProductRow | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const id = String(r.id ?? "").trim();
  const name = String(r.name ?? "").trim();
  if (!id || !name) return null;
  const price = Number(r.price);
  if (!Number.isFinite(price) || price < 0) return null;
  const published = r.published === false ? false : true;
  const sortN = Number(r.sortOrder);
  return {
    id,
    name,
    subtitle: typeof r.subtitle === "string" ? r.subtitle : undefined,
    price,
    unit: typeof r.unit === "string" ? r.unit : undefined,
    desc: typeof r.desc === "string" ? r.desc : undefined,
    detail: typeof r.detail === "string" ? r.detail : undefined,
    mainImage: typeof r.mainImage === "string" ? r.mainImage : undefined,
    gallery: Array.isArray(r.gallery) ? r.gallery.map(String).filter(Boolean) : undefined,
    tags: Array.isArray(r.tags) ? r.tags.map(String).filter(Boolean) : undefined,
    published,
    sortOrder: Number.isFinite(sortN) ? sortN : undefined,
  };
}

function mergeMallCatalog(
  seed: AdminMallProductRow[],
  partial: AdminMallProductRow[] | undefined,
): AdminMallProductRow[] {
  if (!partial || !Array.isArray(partial)) {
    return seed.map((r) => ({ ...r, gallery: r.gallery ? [...r.gallery] : [], tags: r.tags ? [...r.tags] : [] }));
  }
  return partial
    .map((x) => normalizeMallProductRow(x))
    .filter((x): x is AdminMallProductRow => x != null);
}

function mergePortalPermissionGroup(
  seed: Record<string, boolean>,
  partial: Record<string, boolean> | undefined,
): Record<string, boolean> {
  if (!partial || typeof partial !== "object") return { ...seed };
  const out = { ...seed };
  for (const [k, v] of Object.entries(partial)) {
    if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

function mergePortalPermissions(
  seed: AdminPortalPermissions,
  partial: AdminPortalPermissions | undefined,
): AdminPortalPermissions {
  if (!partial || typeof partial !== "object") {
    return {
      partnerPrincipal: { ...seed.partnerPrincipal },
      partnerStaff: { ...seed.partnerStaff },
      merchant: { ...seed.merchant },
    };
  }
  return {
    partnerPrincipal: mergePortalPermissionGroup(seed.partnerPrincipal, partial.partnerPrincipal),
    partnerStaff: mergePortalPermissionGroup(seed.partnerStaff, partial.partnerStaff),
    merchant: mergePortalPermissionGroup(seed.merchant, partial.merchant),
  };
}

export function defaultPartnerChannelSeed(): AdminPartnerChannelStore {
  return {
    overview: {
      periodLabel: "今日（演示）",
      totalPartners: 3,
      totalStaff: 9,
      platformGrossYuan: 12880.55,
      remark: "演示数据；正式环境由结算服务写入。字段对齐小程序「合作商工作台 / 员工工作台 / 业绩明细」",
      updatedAt: "2026-05-01 10:30:00",
    },
    principals: [
      {
        key: "pp1",
        principalPhone: "13800001001",
        principalName: "华南主管 · 陈强",
        staffCount: 4,
        periodGrossYuan: 5620.4,
        principalRetainYuan: 3201.5,
        teamLineRewardYuan: 2418.9,
        newUsers: 12,
        newMerchants: 2,
        settleCount: 8,
        tierLabel: "V2",
        backupPhone: "",
        adminNote: "演示主管·华南",
      },
      {
        key: "pp2",
        principalPhone: "13800001002",
        principalName: "华北主管 · 刘洋",
        staffCount: 3,
        periodGrossYuan: 4105.2,
        principalRetainYuan: 2510.0,
        teamLineRewardYuan: 1595.2,
        newUsers: 7,
        newMerchants: 1,
        settleCount: 5,
        tierLabel: "V1",
      },
      {
        key: "pp3",
        principalPhone: "13800001003",
        principalName: "西南主管 · 王敏",
        staffCount: 2,
        periodGrossYuan: 3154.95,
        principalRetainYuan: 1980.0,
        teamLineRewardYuan: 1174.95,
        newUsers: 5,
        newMerchants: 0,
        settleCount: 4,
        tierLabel: "V1",
      },
    ],
    staffDetails: [
      {
        key: "st1",
        rootPartnerPhone: "13800001001",
        rootPartnerName: "华南 · 陈强",
        staffPhone: "13800002001",
        staffName: "一级 · 赵磊",
        tier: "L1",
        commissionPct: 18,
        targetUserCount: 50,
        periodRewardYuan: 890.12,
        inviteUsers: 5,
        inviteMerchants: 1,
        parentL1Hint: "主管直线",
      },
      {
        key: "st2",
        rootPartnerPhone: "13800001001",
        rootPartnerName: "华南 · 陈强",
        staffPhone: "13800002002",
        staffName: "一级 · 孙婷",
        tier: "L1",
        commissionPct: 15,
        targetUserCount: 40,
        periodRewardYuan: 720.5,
        inviteUsers: 4,
        inviteMerchants: 0,
        parentL1Hint: "主管直线",
      },
      {
        key: "st3",
        rootPartnerPhone: "13800001001",
        rootPartnerName: "华南 · 陈强",
        staffPhone: "13800002003",
        staffName: "二级 · 周凯",
        tier: "L2",
        commissionPct: 10,
        targetUserCount: 30,
        periodRewardYuan: 408.28,
        inviteUsers: 3,
        inviteMerchants: 1,
        parentL1Hint: "挂靠一级 138****2001",
      },
      {
        key: "st4",
        rootPartnerPhone: "13800001001",
        rootPartnerName: "华南 · 陈强",
        staffPhone: "13800002004",
        staffName: "二级 · 钱珊",
        tier: "L2",
        commissionPct: 8,
        targetUserCount: 20,
        periodRewardYuan: 400.0,
        inviteUsers: 2,
        inviteMerchants: 0,
        parentL1Hint: "挂靠一级 138****2002",
      },
      {
        key: "st5",
        rootPartnerPhone: "13800001002",
        rootPartnerName: "华北 · 刘洋",
        staffPhone: "13800002011",
        staffName: "一级 · 吴迪",
        tier: "L1",
        commissionPct: 20,
        targetUserCount: 35,
        periodRewardYuan: 950.0,
        inviteUsers: 6,
        inviteMerchants: 0,
        parentL1Hint: "主管直线",
      },
      {
        key: "st6",
        rootPartnerPhone: "13800001002",
        rootPartnerName: "华北 · 刘洋",
        staffPhone: "13800002012",
        staffName: "二级 · 郑雪",
        tier: "L2",
        commissionPct: 12,
        targetUserCount: 25,
        periodRewardYuan: 445.2,
        inviteUsers: 1,
        inviteMerchants: 1,
        parentL1Hint: "挂靠一级 138****2011",
      },
      {
        key: "st7",
        rootPartnerPhone: "13800001002",
        rootPartnerName: "华北 · 刘洋",
        staffPhone: "13800002013",
        staffName: "二级 · 冯浩",
        tier: "L2",
        commissionPct: 10,
        targetUserCount: 15,
        periodRewardYuan: 200.0,
        inviteUsers: 0,
        inviteMerchants: 0,
        parentL1Hint: "挂靠一级 138****2011",
      },
      {
        key: "st8",
        rootPartnerPhone: "13800001003",
        rootPartnerName: "西南 · 王敏",
        staffPhone: "13800002021",
        staffName: "一级 · 何静",
        tier: "L1",
        commissionPct: 16,
        targetUserCount: 28,
        periodRewardYuan: 680.0,
        inviteUsers: 4,
        inviteMerchants: 0,
        parentL1Hint: "主管直线",
      },
      {
        key: "st9",
        rootPartnerPhone: "13800001003",
        rootPartnerName: "西南 · 王敏",
        staffPhone: "13800002022",
        staffName: "二级 · 蒋鹏",
        tier: "L2",
        commissionPct: 9,
        targetUserCount: 18,
        periodRewardYuan: 494.95,
        inviteUsers: 1,
        inviteMerchants: 0,
        parentL1Hint: "挂靠一级 138****2021",
      },
    ],
    merchants: [
      {
        key: "m1",
        rootPartnerPhone: "13800001001",
        rootPartnerName: "华南 · 陈强",
        merchantName: "海珠智控专卖店A",
        shopPhone: "020-11112222",
        address: "广州海珠区演示路 1 号",
        inviterStaffPhone: "13800002001",
        inviterStaffName: "赵磊",
        status: "合作中",
        bindAt: "2025-12-01",
        periodOrderYuan: 12800,
        remark: "",
      },
      {
        key: "m2",
        rootPartnerPhone: "13800001001",
        rootPartnerName: "华南 · 陈强",
        merchantName: "天河升级网点B",
        shopPhone: "020-33334444",
        address: "广州天河区演示街 8 号",
        inviterStaffPhone: "13800002003",
        inviterStaffName: "周凯",
        status: "合作中",
        bindAt: "2026-03-15",
        periodOrderYuan: 5600,
        remark: "",
      },
      {
        key: "m3",
        rootPartnerPhone: "13800001002",
        rootPartnerName: "华北 · 刘洋",
        merchantName: "朝阳骑行服务站",
        shopPhone: "010-55556666",
        address: "北京朝阳区演示路",
        inviterStaffPhone: "13800002011",
        inviterStaffName: "吴迪",
        status: "合作中",
        bindAt: "2026-01-20",
        periodOrderYuan: 8900,
        remark: "",
      },
      {
        key: "m4",
        rootPartnerPhone: "13800001003",
        rootPartnerName: "西南 · 王敏",
        merchantName: "成都武侯门店",
        shopPhone: "028-77778888",
        address: "成都武侯区演示巷",
        inviterStaffPhone: "13800002021",
        inviterStaffName: "何静",
        status: "合作中",
        bindAt: "2025-11-10",
        periodOrderYuan: 4200,
        remark: "",
      },
      {
        key: "m5",
        rootPartnerPhone: "13800001001",
        rootPartnerName: "华南 · 陈强",
        merchantName: "海淀·极客电动车改装",
        shopPhone: "13900001001",
        address: "北京海淀演示大道（与提现审核种子对齐）",
        inviterStaffPhone: "13800002001",
        inviterStaffName: "赵磊",
        status: "合作中",
        bindAt: "2026-04-01",
        periodOrderYuan: 5600,
        remark: "上门单补贴累计（演示，可对齐提现审核 applicantPhone）",
        bossName: "张店主",
        city: "北京",
      },
    ],
    rewardLines: [
      {
        key: "rw1",
        time: "2026-05-01 09:55:10",
        rootPartnerPhone: "13800001001",
        kind: "商家结算·计提",
        amountYuan: 128.5,
        inviterStaffPhone: "13800002001",
        inviterStaffName: "赵磊",
        remark: "门店 A 收款分成",
      },
      {
        key: "rw2",
        time: "2026-05-01 09:40:22",
        rootPartnerPhone: "13800001001",
        kind: "拉新奖励",
        amountYuan: 36.0,
        inviterStaffPhone: "13800002003",
        inviterStaffName: "周凯",
        remark: "用户绑定",
      },
      {
        key: "rw3",
        time: "2026-05-01 08:12:05",
        rootPartnerPhone: "13800001002",
        kind: "商家结算·计提",
        amountYuan: 210.0,
        inviterStaffPhone: "13800002011",
        inviterStaffName: "吴迪",
        remark: "上门单补贴结算",
      },
      {
        key: "rw4",
        time: "2026-04-30 21:03:18",
        rootPartnerPhone: "13800001001",
        kind: "邀请合作商·代理费分成",
        amountYuan: 10.0,
        inviterStaffPhone: "13800002002",
        inviterStaffName: "孙婷",
        remark: "演示代理费 100×10%",
      },
      {
        key: "rw5",
        time: "2026-04-30 18:30:00",
        rootPartnerPhone: "13800001003",
        kind: "商家结算·计提",
        amountYuan: 88.75,
        inviterStaffPhone: "13800002021",
        inviterStaffName: "何静",
        remark: "",
      },
      {
        key: "rw6",
        time: "2026-04-30 10:05:00",
        rootPartnerPhone: "13800001001",
        kind: "主管区间留存·计提",
        amountYuan: 1500,
        inviterStaffPhone: "13800001001",
        inviterStaffName: "陈强",
        remark: "季度留存演示，可与「平台·渠道与业绩」汇总交叉核对",
        orderId: "EV-ORD-20260430-PR-1200",
      },
    ],
    endUsers: [
      {
        key: "eu1",
        userPhone: "13900008888",
        displayName: "车主·老王",
        inviterPhone: "13800002001",
        inviterName: "赵磊",
        rootPartnerPhone: "13800001001",
        vipTierLabel: "VIP 年卡",
        registeredAt: "2026-03-01",
        remark: "演示用户；可对齐流水 rw2",
      },
      {
        key: "eu2",
        userPhone: "13900009999",
        displayName: "车友·小李",
        inviterPhone: "13800002003",
        inviterName: "周凯",
        rootPartnerPhone: "13800001001",
        vipTierLabel: "普通",
        registeredAt: "2026-04-12",
      },
      {
        key: "eu3",
        userPhone: "13700001111",
        displayName: "",
        inviterPhone: "13800001002",
        inviterName: "华北主管",
        rootPartnerPhone: "13800001002",
        vipTierLabel: "VIP 年卡",
        registeredAt: "2025-12-20",
      },
    ],
    settledOrders: [
      {
        orderId: "EV-ORD-20260501-HD001",
        kind: "上门单·门店补贴",
        status: "settled",
        settledAt: "2026-05-01 11:00:00",
        rootPartnerPhone: "13800001001",
        beneficiaryPhone: "13900001001",
        merchantPhone: "13900001001",
        shopPhone: "13900001001",
        subsidyYuan: 960,
        inviterStaffPhone: "13800002001",
        inviterStaffName: "赵磊",
        remark: "海淀极客门店（与商家提现演示 applicantPhone 对齐）",
      },
      {
        orderId: "EV-ORD-20260430-PR-1200",
        kind: "主管区间留存·结算",
        status: "settled",
        settledAt: "2026-04-30 10:06:00",
        rootPartnerPhone: "13800001001",
        beneficiaryPhone: "13800001001",
        amountYuan: 1500,
        remark: "与流水 rw6 对应；合作商主管提现须核对本订单号",
      },
    ],
  };
}

function mergePartnerChannel(
  seed: AdminPartnerChannelStore,
  partial: AdminPartnerChannelStore | undefined,
): AdminPartnerChannelStore {
  if (!partial || typeof partial !== "object") {
    return {
      overview: { ...seed.overview },
      principals: seed.principals.map((x) => ({ ...x })),
      staffDetails: seed.staffDetails.map((x) => ({ ...x })),
      merchants: seed.merchants.map((x) => ({ ...x })),
      rewardLines: seed.rewardLines.map((x) => ({ ...x })),
      endUsers: (seed.endUsers ?? []).map((x) => ({ ...x })),
      settledOrders: (seed.settledOrders ?? []).map((x) => ({ ...x })),
    };
  }
  const po =
    partial.overview && typeof partial.overview === "object" ? partial.overview : {};
  return {
    overview: { ...seed.overview, ...po },
    principals:
      Array.isArray(partial.principals) && partial.principals.length > 0
        ? partial.principals.map((x) => ({ ...x }))
        : seed.principals.map((x) => ({ ...x })),
    staffDetails:
      Array.isArray(partial.staffDetails) && partial.staffDetails.length > 0
        ? partial.staffDetails.map((x) => ({ ...x }))
        : seed.staffDetails.map((x) => ({ ...x })),
    merchants:
      Array.isArray(partial.merchants) && partial.merchants.length > 0
        ? partial.merchants.map((x) => ({ ...x }))
        : seed.merchants.map((x) => ({ ...x })),
    rewardLines:
      Array.isArray(partial.rewardLines) && partial.rewardLines.length > 0
        ? partial.rewardLines.map((x) => ({ ...x }))
        : seed.rewardLines.map((x) => ({ ...x })),
    settledOrders:
      Array.isArray(partial.settledOrders) && partial.settledOrders.length > 0
        ? partial.settledOrders.map((x) => ({ ...x }))
        : (seed.settledOrders ?? []).map((x) => ({ ...x })),
    endUsers: Array.isArray(partial.endUsers)
      ? partial.endUsers.map((x) => ({ ...x }))
      : (seed.endUsers ?? []).map((x) => ({ ...x })),
  };
}

function mergeSidebarMenus(
  defaults: AdminSidebarMenuItem[],
  partial: AdminSidebarMenuItem[] | undefined,
): AdminSidebarMenuItem[] {
  if (!partial?.length) return defaults.map((d) => ({ ...d }));
  const map = new Map(defaults.map((d) => [d.path, { ...d }]));
  for (const p of partial) {
    const path = String(p.path ?? "").trim();
    if (!path) continue;
    const cur = map.get(path);
    if (cur) {
      if (typeof p.label === "string" && p.label.trim()) cur.label = p.label.trim();
      cur.hidden = !!p.hidden;
    }
  }
  return defaults.map((d) => map.get(d.path)!);
}

function normalizeDistribution(
  seed: AdminDistributionConfig,
  partial: (Partial<AdminDistributionConfig> & { walkInPlatformSubsidyYuan?: number }) | undefined,
): AdminDistributionConfig {
  if (!partial || typeof partial !== "object") {
    return { ...seed };
  }
  const partialAny = partial as Record<string, unknown>;
  const hadLegacy =
    typeof partialAny.walkInPlatformSubsidyYuan === "number" &&
    Number.isFinite(partialAny.walkInPlatformSubsidyYuan as number);
  const hadNewPct = Object.prototype.hasOwnProperty.call(partial, "walkInMerchantSubsidyPct");
  const hadNewBase = Object.prototype.hasOwnProperty.call(partial, "walkInMerchantSubsidyBaseYuan");

  const flat = { ...seed, ...partial } as AdminDistributionConfig & { walkInPlatformSubsidyYuan?: number };
  let walkInMerchantSubsidyPct = flat.walkInMerchantSubsidyPct;
  let walkInMerchantSubsidyBaseYuan = flat.walkInMerchantSubsidyBaseYuan;

  if (hadLegacy && !hadNewPct && !hadNewBase) {
    walkInMerchantSubsidyPct = 15;
    walkInMerchantSubsidyBaseYuan =
      Math.round((((partialAny.walkInPlatformSubsidyYuan as number) / 0.15) * 100)) / 100;
  } else {
    if (!Number.isFinite(walkInMerchantSubsidyPct)) walkInMerchantSubsidyPct = seed.walkInMerchantSubsidyPct;
    if (!Number.isFinite(walkInMerchantSubsidyBaseYuan))
      walkInMerchantSubsidyBaseYuan = seed.walkInMerchantSubsidyBaseYuan;
  }

  const { walkInPlatformSubsidyYuan: _legacyYuan, ...rest } = flat as AdminDistributionConfig & {
    walkInPlatformSubsidyYuan?: number;
  };
  void _legacyYuan;
  return {
    ...seed,
    ...rest,
    walkInMerchantSubsidyPct: Math.min(100, Math.max(0, Number(walkInMerchantSubsidyPct))),
    walkInMerchantSubsidyBaseYuan: Math.max(0, Number(walkInMerchantSubsidyBaseYuan)),
  };
}

function mergeCommerce(base: AdminCommerceConfig, partial: AdminCommerceConfig | undefined): AdminCommerceConfig {
  if (!partial) {
    return {
      vip: {
        ...base.vip,
        benefits: base.vip.benefits.map((b) => ({ ...b })),
      },
      distribution: normalizeDistribution(base.distribution, undefined),
    };
  }
  const vip = { ...base.vip, ...partial.vip };
  if (Array.isArray(partial.vip?.benefits) && partial.vip!.benefits!.length > 0) {
    vip.benefits = partial.vip!.benefits!.map((b) => ({
      key: String(b.key || `b_${Math.random().toString(36).slice(2, 9)}`),
      title: String(b.title || ""),
      detail: typeof b.detail === "string" ? b.detail : "",
    }));
  } else {
    vip.benefits = base.vip.benefits.map((b) => ({ ...b }));
  }
  return {
    vip,
    distribution: normalizeDistribution(
      base.distribution,
      partial.distribution as Partial<AdminDistributionConfig> & { walkInPlatformSubsidyYuan?: number },
    ),
  };
}

function mergeMiniappPages(
  baseList: MiniappPageConfig[],
  partial: MiniappPageConfig[] | undefined,
): MiniappPageConfig[] {
  if (!partial?.length) return baseList.map((x) => ({ ...x, strings: x.strings ? { ...x.strings } : {} }));
  const map = new Map(baseList.map((b) => [b.route, { ...b, strings: b.strings ? { ...b.strings } : {} }]));
  for (const p of partial) {
    const r = String(p.route ?? "").trim();
    if (!r) continue;
    const cur = map.get(r);
    if (cur) {
      if (typeof p.navigationBarTitle === "string") cur.navigationBarTitle = p.navigationBarTitle;
      if (typeof p.enabled === "boolean") cur.enabled = p.enabled;
      if (p.strings && typeof p.strings === "object") cur.strings = { ...cur.strings, ...p.strings };
      if (typeof p.adminNote === "string") cur.adminNote = p.adminNote;
    } else {
      map.set(r, {
        route: r,
        navigationBarTitle: p.navigationBarTitle || r,
        enabled: p.enabled !== false,
        strings: p.strings && typeof p.strings === "object" ? { ...p.strings } : {},
        adminNote: typeof p.adminNote === "string" ? p.adminNote : undefined,
      });
    }
  }
  return baseList.map((b) => map.get(b.route)!);
}

function mergeMiniappFeaturesSeed(partial: Record<string, boolean> | undefined): Record<string, boolean> {
  const seed = defaultMiniappFeatures();
  if (!partial || typeof partial !== "object") return { ...seed };
  const out = { ...seed };
  for (const k of Object.keys(seed)) {
    if (typeof partial[k] === "boolean") out[k] = partial[k]!;
  }
  return out;
}

function normalizeMiniappSubscribers(
  raw: unknown,
  seed: MiniappAlarmNotifySubscriber[],
): MiniappAlarmNotifySubscriber[] {
  if (!Array.isArray(raw)) return seed;
  const out: MiniappAlarmNotifySubscriber[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (typeof o.openid !== "string" || !o.openid.trim()) continue;
    out.push({
      openid: o.openid.trim(),
      updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
      acceptedTmplIds: Array.isArray(o.acceptedTmplIds) ? o.acceptedTmplIds.map(String).filter(Boolean) : undefined,
    });
  }
  return out;
}

export function mergeAdminWithSeed(partial: AdminStore | undefined): AdminStore {
  const seed = defaultAdminSeed();
  if (!partial || typeof partial !== "object") return seed;
  const branding = { ...(seed.branding ?? defaultBranding()), ...(partial.branding ?? {}) };
  const sidebarMenu = mergeSidebarMenus(seed.sidebarMenu ?? defaultSidebarMenuItems(), partial.sidebarMenu);
  const commerce =
    partial.commerce != null && typeof partial.commerce === "object"
      ? mergeCommerce(seed.commerce ?? defaultCommerceConfig(), partial.commerce)
      : mergeCommerce(seed.commerce ?? defaultCommerceConfig(), undefined);
  const miniappPages = mergeMiniappPages(
    seed.miniappPages ?? defaultMiniappPages(),
    partial.miniappPages,
  );
  const partnerChannel = mergePartnerChannel(
    seed.partnerChannel ?? defaultPartnerChannelSeed(),
    partial.partnerChannel,
  );
  const platformKpi = mergePlatformKpi(seed.platformKpi ?? defaultPlatformKpi(), partial.platformKpi);
  const miniappFeatures = mergeMiniappFeaturesSeed(partial.miniappFeatures);
  const miniappHomeLayout = mergeMiniappHomeLayout(
    seed.miniappHomeLayout ?? defaultMiniappHomeLayout(),
    partial.miniappHomeLayout,
  );
  const miniappUiPolicy = mergeMiniappUiPolicy(seed.miniappUiPolicy, partial.miniappUiPolicy);
  const withdrawalReviewQueue = mergeWithdrawalReviewQueue(
    seed.withdrawalReviewQueue ?? defaultWithdrawalReviewSeed(),
    partial.withdrawalReviewQueue,
  );
  const merchantApplyReviewQueue = mergeMerchantApplyQueue(
    seed.merchantApplyReviewQueue ?? defaultMerchantApplySeed(),
    partial.merchantApplyReviewQueue,
  );
  const mallCatalog = mergeMallCatalog(
    seed.mallCatalog ?? defaultMallCatalogSeed(),
    partial.mallCatalog,
  );
  const portalPermissions = mergePortalPermissions(
    seed.portalPermissions ?? defaultPortalPermissionsSeed(),
    partial.portalPermissions,
  );
  const miniappEcology = mergeMiniappEcology(
    seed.miniappEcology ?? defaultMiniappEcologySeed(),
    partial.miniappEcology,
  );
  return {
    ...seed,
    ...partial,
    branding,
    sidebarMenu,
    commerce,
    miniappPages,
    partnerChannel,
    platformKpi,
    miniappFeatures,
    miniappHomeLayout,
    miniappUiPolicy,
    withdrawalReviewQueue,
    merchantApplyReviewQueue,
    mallCatalog,
    portalPermissions,
    miniappEcology,
    compatFlags: partial.compatFlags ?? seed.compatFlags,
    geofences: partial.geofences ?? seed.geofences,
    alerts: partial.alerts ?? seed.alerts,
    fleetUsers: partial.fleetUsers ?? seed.fleetUsers,
    orgTree: partial.orgTree ?? seed.orgTree,
    trackDemo: partial.trackDemo ?? seed.trackDemo,
    devicePresentations: partial.devicePresentations ?? seed.devicePresentations,
    miniappAlarmSubscribeTmplIds: Array.isArray(partial.miniappAlarmSubscribeTmplIds)
      ? partial.miniappAlarmSubscribeTmplIds.map(String).filter(Boolean)
      : seed.miniappAlarmSubscribeTmplIds ?? [],
    miniappWxAppId:
      typeof partial.miniappWxAppId === "string" ? partial.miniappWxAppId.trim() : seed.miniappWxAppId ?? "",
    miniappAlarmNotifySubscribers: normalizeMiniappSubscribers(
      partial.miniappAlarmNotifySubscribers,
      seed.miniappAlarmNotifySubscribers ?? [],
    ),
  };
}

export function defaultAdminSeed(): AdminStore {
  return {
    restApiBase: "",
    wsUrl: "",
    jwtRefreshMin: 30,
    mapProvider: "高德 / 百度 / OpenStreetMap",
    mapWebKey: "",
    mapStreetView: true,
    notifyFcm: "",
    notifySms: "",
    notifyWebhook: "",
    compatProtocolYear: "2013",
    compatNoteTemplate: "",
    compatFlags: {},
    dashboardTodayKm: 1864.2,
    geofences: [
      {
        key: "g1",
        name: "总部停车场",
        type: "圆形",
        bindPlates: "粤A·D12345",
        alarm: "出区域",
        enabled: true,
        centerLat: 23.1291,
        centerLng: 113.2644,
        radiusM: 420,
      },
      {
        key: "g2",
        name: "夜间禁行区",
        type: "多边形",
        bindPlates: "粤B·F99887、粤A·D12345",
        alarm: "进区域",
        enabled: true,
        polygon: [
          [23.131, 113.262],
          [23.131, 113.268],
          [23.126, 113.268],
          [23.126, 113.262],
        ],
      },
    ],
    alerts: [
      {
        key: "a1",
        time: "2026-04-27 13:58:12",
        terminalId: "138081234567",
        plate: "粤A·D12345",
        type: "超速报警",
        level: "中",
        status: "未处理",
        source: "报警标志 bit1",
      },
      {
        key: "a2",
        time: "2026-04-27 12:20:44",
        terminalId: "138081234567",
        plate: "粤A·D12345",
        type: "震动报警（设防）",
        level: "高",
        status: "已推送",
        source: "报警标志 bit16 + 设防",
      },
      {
        key: "a3",
        time: "2026-04-27 09:02:01",
        terminalId: "138000000001",
        plate: "未上牌",
        type: "主电源断开",
        level: "高",
        status: "已确认",
        source: "状态位 主电 + 报警 bit8",
      },
      {
        key: "a4",
        time: "2026-04-26 22:15:33",
        terminalId: "138081234999",
        plate: "粤B·F99887",
        type: "扩展报警 · 急减速",
        level: "低",
        status: "已确认",
        source: "附加信息 0xF4",
      },
    ],
    fleetUsers: [
      {
        key: "u1",
        name: "张管理员",
        role: "超级管理员",
        phone: "138****8000",
        fleet: "全车队",
        devices: 128,
      },
      {
        key: "u2",
        name: "李车队长",
        role: "车队长",
        phone: "139****1201",
        fleet: "华南配送一组",
        devices: 32,
      },
    ],
    orgTree: [
      {
        title: "全车队",
        key: "root",
        children: [
          { title: "华南配送一组（32 终端）", key: "s1" },
          { title: "华南配送二组（18 终端）", key: "s2" },
          { title: "运维备用池（6 终端）", key: "s3" },
        ],
      },
    ],
    trackDemo: {
      "138081234567": [...DEFAULT_TRACK],
      "138081234999": [...DEFAULT_TRACK],
      "138000000001": [...DEFAULT_TRACK],
    },
    devicePresentations: {
      "138081234567": {
        armed: true,
        acc: true,
        mainPowerOk: true,
        csq: 24,
        sat: 9,
        batteryPct: 88,
        locateMode: "GPS+北斗",
      },
      "138081234999": {
        armed: false,
        acc: false,
        mainPowerOk: true,
        csq: 28,
        sat: 11,
        batteryPct: 72,
        locateMode: "Wi‑Fi+LBS",
      },
      "138000000001": {
        armed: false,
        acc: false,
        mainPowerOk: false,
        csq: 0,
        sat: 0,
        batteryPct: 41,
        locateMode: "—",
      },
    },
    branding: defaultBranding(),
    sidebarMenu: defaultSidebarMenuItems(),
    commerce: defaultCommerceConfig(),
    partnerChannel: defaultPartnerChannelSeed(),
    platformKpi: defaultPlatformKpi(),
    miniappPages: defaultMiniappPages(),
    miniappFeatures: defaultMiniappFeatures(),
    miniappHomeLayout: defaultMiniappHomeLayout(),
    miniappUiPolicy: { allowHomeLayoutEdit: true },
    withdrawalReviewQueue: defaultWithdrawalReviewSeed(),
    merchantApplyReviewQueue: defaultMerchantApplySeed(),
    mallCatalog: defaultMallCatalogSeed(),
    portalPermissions: defaultPortalPermissionsSeed(),
    miniappEcology: defaultMiniappEcologySeed(),
    miniappWxAppId: "",
    miniappAlarmSubscribeTmplIds: [],
    miniappAlarmNotifySubscribers: [],
  };
}

export function normalizeStoreShape(input: unknown, bootstrapAuthCode: string): StoreShape {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const bindsIn = Array.isArray(raw.binds) ? raw.binds : [];
  const binds: VehicleBind[] = [];
  for (const b of bindsIn) {
    if (!b || typeof b !== "object") continue;
    const o = b as Record<string, unknown>;
    const phone = String(o.terminalPhone ?? "").replace(/\D/g, "");
    const plate = String(o.plate ?? "").trim();
    if (phone.length !== 11 || !plate) continue;
    const row: VehicleBind = { terminalPhone: phone, plate };
    if (typeof o.note === "string" && o.note.length) row.note = o.note;
    binds.push(row);
  }

  const lastIn =
    raw.lastPositions && typeof raw.lastPositions === "object"
      ? (raw.lastPositions as Record<string, unknown>)
      : {};
  const lastPositions: Record<string, LastPosition> = {};
  for (const [k, v] of Object.entries(lastIn)) {
    const key = k.replace(/\D/g, "");
    if (key.length !== 11) continue;
    if (!v || typeof v !== "object") continue;
    const p = v as Record<string, unknown>;
    const lat = Number(p.latDeg);
    const lng = Number(p.lngDeg);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const lp: LastPosition = {
      terminalPhone: key,
      latDeg: lat,
      lngDeg: lng,
      speedKmh: Number.isFinite(Number(p.speedKmh)) ? Number(p.speedKmh) : 0,
      alarm: Number.isFinite(Number(p.alarm)) ? Number(p.alarm) : 0,
      status: Number.isFinite(Number(p.status)) ? Number(p.status) : 0,
      receivedAt: typeof p.receivedAt === "string" ? p.receivedAt : new Date().toISOString(),
    };
    if (typeof p.deviceTime === "string") lp.deviceTime = p.deviceTime;
    lastPositions[key] = lp;
  }

  let registerAuthCode = bootstrapAuthCode;
  if (raw.settings && typeof raw.settings === "object") {
    const s = (raw.settings as Record<string, unknown>).registerAuthCode;
    if (typeof s === "string" && s.trim().length > 0) registerAuthCode = s.trim();
  }

  let adminPatch: AdminStore | undefined;
  if (raw.admin && typeof raw.admin === "object") {
    adminPatch = raw.admin as AdminStore;
  }

  const mem: StoreShape = {
    binds,
    lastPositions,
    settings: { registerAuthCode },
    admin: mergeAdminWithSeed(adminPatch),
  };
  return mem;
}

/** 从磁盘读取后补齐 settings / admin，不覆盖已有有效值 */
export function hydrateStoreFromDisk(raw: StoreShape, bootstrapAuthCode: string): StoreShape {
  const registerAuthCode =
    typeof raw.settings?.registerAuthCode === "string" && raw.settings.registerAuthCode.trim().length > 0
      ? raw.settings.registerAuthCode.trim()
      : bootstrapAuthCode;
  const admin = mergeAdminWithSeed(
    raw.admin && typeof raw.admin === "object" ? (raw.admin as AdminStore) : undefined,
  );
  return {
    binds: Array.isArray(raw.binds) ? raw.binds : [],
    lastPositions:
      raw.lastPositions && typeof raw.lastPositions === "object" ? raw.lastPositions : {},
    settings: { registerAuthCode },
    admin,
  };
}

export class JsonPersistence {
  readonly filePath: string;
  private writePending = false;
  private latestData: StoreShape | null = null;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, "evo-gateway-store.json");
  }

  loadPartial(): Partial<StoreShape> & { binds?: VehicleBind[]; lastPositions?: Record<string, LastPosition> } {
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const o = JSON.parse(raw) as StoreShape;
      return o && typeof o === "object" ? o : {};
    } catch {
      return {};
    }
  }

  load(): StoreShape {
    const partial = this.loadPartial();
    const binds = Array.isArray(partial.binds) ? partial.binds : [];
    const lastPositions =
      partial.lastPositions && typeof partial.lastPositions === "object" ? partial.lastPositions : {};
    const settings =
      partial.settings && typeof partial.settings === "object" && partial.settings !== null
        ? (partial.settings as GatewaySettings)
        : { registerAuthCode: "" };
    return {
      binds,
      lastPositions,
      settings: { registerAuthCode: settings.registerAuthCode ?? "" },
      admin: partial.admin,
    };
  }

  save(data: StoreShape): void {
    this.latestData = data;
    if (this.writePending) return;
    this.writePending = true;
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      void this.flush();
    }, 200);
  }

  private async flush(): Promise<void> {
    const data = this.latestData;
    this.latestData = null;
    this.writePending = false;
    if (!data) return;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = this.filePath + ".tmp";
    await new Promise<void>((resolve, reject) => {
      writeFile(tmp, JSON.stringify(data, null, 2), "utf8", (err) => {
        err ? reject(err) : resolve();
      });
    });
    await new Promise<void>((resolve, reject) => {
      fs.rename(tmp, this.filePath, (err) => {
        err ? reject(err) : resolve();
      });
    });
  }

  /** 等待最后一次排队的写入完成（用于优雅关闭） */
  async drain(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    if (this.writePending) {
      await this.flush();
    }
  }
}

export function normalizePhoneDigits(input: string): string {
  const d = input.replace(/\D/g, "");
  if (d.length === 11) return d;
  if (d.length === 12) return d.slice(1);
  if (d.length > 11) return d.slice(-11);
  throw new Error("手机号须为 11 位数字");
}

type SessionEntry = {
  socket: Socket;
  remote: string;
};

/** 终端在线会话 + 平台侧下行流水号 */
export class TerminalRegistry {
  private readonly sessions = new Map<string, SessionEntry>();
  private downSerial = new Map<string, number>();

  setSocket(phoneKey: string, socket: Socket, remote: string): void {
    const prev = this.sessions.get(phoneKey);
    if (prev && prev.socket !== socket) {
      try {
        prev.socket.destroy();
      } catch {
        /* ignore */
      }
    }
    this.sessions.set(phoneKey, { socket, remote });
  }

  removeSocket(socket: Socket): void {
    for (const [k, v] of this.sessions) {
      if (v.socket === socket) {
        this.sessions.delete(k);
        console.info(`[registry] offline phoneKey=${k}`);
      }
    }
  }

  getSocket(phoneKey: string): Socket | undefined {
    return this.sessions.get(phoneKey)?.socket;
  }

  isOnline(phoneKey: string): boolean {
    const s = this.sessions.get(phoneKey)?.socket;
    return !!s && !s.destroyed;
  }

  nextDownSerial(phoneKey: string): number {
    const n = (this.downSerial.get(phoneKey) ?? 0) + 1;
    this.downSerial.set(phoneKey, n);
    return n & 0xffff;
  }

  listOnline(): { phoneKey: string; remote: string }[] {
    const out: { phoneKey: string; remote: string }[] = [];
    for (const [phoneKey, v] of this.sessions) {
      if (!v.socket.destroyed) out.push({ phoneKey, remote: v.remote });
    }
    return out;
  }
}
