import type {
  AdminPartnerMerchantRow,
  AdminPartnerRewardLineRow,
  AdminSettledOrderRow,
  AdminWithdrawalReviewRow,
} from "../types/gatewayStore";

/** 仅保留数字，便于手机号对比 */
export function normPhoneDigits(s: string | undefined): string {
  return String(s ?? "").replace(/\D/g, "");
}

/** 合作商：体系下流水；主管本人取体系全部流水；员工取归因手机一致的流水 */
export function relevantPartnerRewardLines(
  row: AdminWithdrawalReviewRow,
  rewardLines: AdminPartnerRewardLineRow[],
): AdminPartnerRewardLineRow[] {
  const root = normPhoneDigits(row.partnerRootPhone);
  const appl = normPhoneDigits(row.applicantPhone);
  if (!root) return [];
  const forRoot = rewardLines.filter((l) => normPhoneDigits(l.rootPartnerPhone) === root);
  if (!appl || appl === root) return forRoot;
  return forRoot.filter((l) => normPhoneDigits(l.inviterStaffPhone) === appl);
}

/** 商家提现：同属体系且门店电话与申请人一致（或名称一致兜底） */
export function matchingMerchantsForWithdrawal(
  row: AdminWithdrawalReviewRow,
  merchants: AdminPartnerMerchantRow[],
): AdminPartnerMerchantRow[] {
  if (row.kind !== "merchant") return [];
  const root = normPhoneDigits(row.partnerRootPhone);
  const appl = normPhoneDigits(row.applicantPhone);
  const name = String(row.applicantName ?? "").trim();
  return merchants.filter((m) => {
    if (root && normPhoneDigits(m.rootPartnerPhone) !== root) return false;
    if (appl && normPhoneDigits(m.shopPhone) === appl) return true;
    if (name && m.merchantName === name) return true;
    return false;
  });
}

function orderIdEqualsInput(orderId: string, input: string): boolean {
  const a = String(orderId ?? "").trim();
  const b = String(input ?? "").trim();
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

/** 已结算订单是否与当前提现申请人为同一收益归属 */
export function orderBelongsToWithdrawal(o: AdminSettledOrderRow, row: AdminWithdrawalReviewRow): boolean {
  if (o.status !== "settled") return false;
  const ap = normPhoneDigits(row.applicantPhone);
  const root = normPhoneDigits(row.partnerRootPhone);

  if (row.kind === "merchant") {
    if (ap && normPhoneDigits(o.beneficiaryPhone) === ap) return true;
    if (ap && normPhoneDigits(o.merchantPhone) === ap) return true;
    if (ap && normPhoneDigits(o.shopPhone) === ap) return true;
    return false;
  }

  if (ap && normPhoneDigits(o.beneficiaryPhone) === ap) return true;
  if (ap && normPhoneDigits(o.inviterStaffPhone) === ap) return true;
  if (ap && root && ap === root && normPhoneDigits(o.rootPartnerPhone) === root) {
    if (!o.inviterStaffPhone || normPhoneDigits(o.inviterStaffPhone) === ap) return true;
  }
  return false;
}

/** 与当前申请人相关的已结算订单（供弹窗内选抄订单号） */
export function relevantSettledOrders(
  row: AdminWithdrawalReviewRow,
  settledOrders: AdminSettledOrderRow[] | undefined,
): AdminSettledOrderRow[] {
  const list = (settledOrders ?? []).filter((x) => x.status === "settled");
  return list.filter((o) => orderBelongsToWithdrawal(o, row));
}

function auditRefMatchesLedgerLegacy(
  ref: string,
  row: AdminWithdrawalReviewRow,
  rewardLines: AdminPartnerRewardLineRow[],
  merchants: AdminPartnerMerchantRow[],
): boolean {
  if (row.kind === "partner") {
    const lines = relevantPartnerRewardLines(row, rewardLines);
    return lines.some((l) => {
      const blob = `${l.key} ${l.kind} ${l.remark ?? ""} ${l.orderId ?? ""}`;
      return blob.includes(ref);
    });
  }
  const ms = matchingMerchantsForWithdrawal(row, merchants);
  return ms.some((m) => {
    const blob = `${m.key} ${m.merchantName} ${m.shopPhone ?? ""} ${m.remark ?? ""}`;
    return blob.includes(ref);
  });
}

/**
 * 打款前核对：优先校验「已结算订单」台账中是否存在该 orderId 且归属匹配。
 * 若网关尚未配置 settledOrders，则回退为流水/门店片段匹配（并提示尽快接入订单数据源）。
 */
export function verifyPayoutAuditRef(
  refRaw: string,
  row: AdminWithdrawalReviewRow,
  rewardLines: AdminPartnerRewardLineRow[],
  merchants: AdminPartnerMerchantRow[],
  settledOrders: AdminSettledOrderRow[] | undefined,
): { ok: true } | { ok: false; reason: string } {
  const ref = refRaw.trim();
  if (ref.length < 3) {
    return { ok: false, reason: "请填写订单号（至少 3 个字符）。" };
  }

  const orders = (settledOrders ?? []).filter((o) => o.status === "settled");
  if (orders.length > 0) {
    const order = orders.find((o) => orderIdEqualsInput(o.orderId, ref));
    if (!order) {
      return {
        ok: false,
        reason: `台账中无「已结算」订单号为「${ref}」的记录，或订单尚未结算。禁止仅凭猜测打款；请向订单/结算系统核实后再提交。`,
      };
    }
    if (!orderBelongsToWithdrawal(order, row)) {
      return {
        ok: false,
        reason: "该订单号已查到，但收益归属（门店/员工/主管）与当前提现申请人不一致，禁止打款。",
      };
    }
    return { ok: true };
  }

  if (auditRefMatchesLedgerLegacy(ref, row, rewardLines, merchants)) {
    return { ok: true };
  }
  return {
    ok: false,
    reason:
      "当前网关未配置已结算订单（admin.partnerChannel.settledOrders），无法按订单号核验。请先在渠道台账中补订单数据，或确保核对字段能命中渠道流水/门店档案。",
  };
}

export function sumRewardLineYuan(lines: AdminPartnerRewardLineRow[]): number {
  return lines.reduce((s, l) => s + (Number(l.amountYuan) || 0), 0);
}
