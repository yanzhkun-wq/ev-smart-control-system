import type {
  AdminBranding,
  AdminCommerceConfig,
  AdminDistributionConfig,
  AdminMerchantApplyRow,
  AdminSidebarMenuItem,
  AdminWithdrawalReviewRow,
  VipBenefitRow,
} from "../types/gatewayStore";

/** 与网关 defaultCommerceConfig.distribution 数值一致；用于草稿与表单回退 */
export const DEFAULT_DISTRIBUTION: AdminDistributionConfig = {
  partnerMerchantRevenueSharePct: 10,
  partnerInviteReferralRatePct: 10,
  partnerMinWithdrawYuan: 1,
  merchantMinWithdrawYuan: 1,
  walkInMerchantSubsidyPct: 15,
  walkInMerchantSubsidyBaseYuan: 800,
  demoPartnerAgencyFeeYuan: 100,
  remark: "",
};

/** 读本地草稿或旧网关字段时，将 legacy 定额元迁移为「15% + 推断基数」 */
export function normalizeDistributionInput(
  partial:
    | (Partial<AdminDistributionConfig> & { walkInPlatformSubsidyYuan?: number })
    | undefined
    | null,
): AdminDistributionConfig {
  const seed = DEFAULT_DISTRIBUTION;
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
  const { walkInPlatformSubsidyYuan: _omit, ...rest } = flat as AdminDistributionConfig & {
    walkInPlatformSubsidyYuan?: number;
  };
  void _omit;
  return {
    ...seed,
    ...rest,
    walkInMerchantSubsidyPct: Math.min(100, Math.max(0, Number(walkInMerchantSubsidyPct))),
    walkInMerchantSubsidyBaseYuan: Math.max(0, Number(walkInMerchantSubsidyBaseYuan)),
  };
}
export const OPS_DRAFT_LS_KEY = "ev-admin-operations-draft-v1";

export type OperationsDraft = {
  branding: AdminBranding;
  /** 历史字段，已不再写入；读入时忽略 */
  sidebarMenu?: AdminSidebarMenuItem[];
  vip: AdminCommerceConfig["vip"];
  distribution: AdminCommerceConfig["distribution"];
  /** 未连网关时与本机草稿一并保存 */
  withdrawalReviewQueue?: AdminWithdrawalReviewRow[];
  /** 商户入驻：合作商通过后待平台终审 */
  merchantApplyReviewQueue?: AdminMerchantApplyRow[];
};
/** 与网关 seed 一致；key 对应 vipDeviceFeatureCatalog 条目 id */
export const DEFAULT_VIP_BENEFITS: VipBenefitRow[] = [
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
    detail: "按累计有效邀请绑定人数等规则获赠主机类免单次数；门槛以 VIP 配置与活动为准。",
  },
];

export function readOperationsDraft(): OperationsDraft | null {
  try {
    const raw = localStorage.getItem(OPS_DRAFT_LS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as OperationsDraft;
    if (!o || typeof o !== "object") return null;
    return o;
  } catch {
    return null;
  }
}

export function writeOperationsDraft(d: OperationsDraft) {
  localStorage.setItem(OPS_DRAFT_LS_KEY, JSON.stringify(d));
}

export function notifyOperationsDraftSaved() {
  window.dispatchEvent(new Event("ev-admin-ops-saved"));
}
