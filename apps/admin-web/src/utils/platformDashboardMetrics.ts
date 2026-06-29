import dayjs, { type Dayjs } from "dayjs";
import type { AdminPartnerRewardLineRow } from "../types/gatewayStore";
import { parsePartnerChannelTime } from "./partnerChannelQuery";

function inRange(
  t: Dayjs,
  start: Dayjs,
  end: Dayjs,
): boolean {
  const a = start.startOf("day");
  const b = end.endOf("day");
  return (t.isAfter(a) || t.isSame(a)) && (t.isBefore(b) || t.isSame(b));
}

/** 区间内业绩金额汇总（元，两位小数） */
export function sumRewardYuanInRange(
  lines: AdminPartnerRewardLineRow[],
  start: Dayjs,
  end: Dayjs,
): number {
  let s = 0;
  for (const r of lines) {
    const t = parsePartnerChannelTime(r.time);
    if (!t || !t.isValid()) continue;
    if (!inRange(t, start, end)) continue;
    s += Number(r.amountYuan) || 0;
  }
  return Math.round(s * 100) / 100;
}

/** 区间内流水条数 */
export function countRewardLinesInRange(
  lines: AdminPartnerRewardLineRow[],
  start: Dayjs,
  end: Dayjs,
): number {
  let n = 0;
  for (const r of lines) {
    const t = parsePartnerChannelTime(r.time);
    if (!t || !t.isValid()) continue;
    if (inRange(t, start, end)) n += 1;
  }
  return n;
}

export function topRewardLinesToday(
  lines: AdminPartnerRewardLineRow[],
  ref: Dayjs = dayjs(),
  limit = 8,
): AdminPartnerRewardLineRow[] {
  const start = ref.startOf("day");
  const end = ref.endOf("day");
  const today = lines.filter((r) => {
    const t = parsePartnerChannelTime(r.time);
    if (!t || !t.isValid()) return false;
    return inRange(t, start, end);
  });
  return [...today].sort((a, b) => (Number(b.amountYuan) || 0) - (Number(a.amountYuan) || 0)).slice(0, limit);
}
