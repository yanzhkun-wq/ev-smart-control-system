import dayjs, { type Dayjs } from "dayjs";

/** 解析流水时间，支持 2026-05-01 09:55:10 或 ISO */
export function parsePartnerChannelTime(s: string): Dayjs | null {
  const t = String(s ?? "").trim();
  if (!t) return null;
  const a = dayjs(t, "YYYY-MM-DD HH:mm:ss", true);
  if (a.isValid()) return a;
  const b = dayjs(t);
  return b.isValid() ? b : null;
}

export function inDateRange(t: Dayjs | null, range: [Dayjs, Dayjs] | null): boolean {
  if (!range) return true;
  if (!t || !t.isValid()) return true;
  const [a, b] = range;
  const start = a.startOf("day");
  const end = b.endOf("day");
  return (t.isAfter(start) || t.isSame(start)) && (t.isBefore(end) || t.isSame(end));
}

export function norm(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

export function matchKeyword(hay: string, needle: string): boolean {
  const n = norm(needle);
  if (!n) return true;
  return norm(hay).includes(n);
}
