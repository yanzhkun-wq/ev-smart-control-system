import fs from "node:fs";
import path from "node:path";

export type TrackPointLine = {
  src: "0200" | "0704";
  receivedAt: string;
  deviceTime?: string;
  lat: number;
  lng: number;
  speedKmh: number;
  direction?: number;
  alarm: number;
  status: number;
  altitudeM?: number;
};

/** 按终端、按日 JSONL 轨迹（可对接规格 T-11～T-12，后续可迁 DB） */
export class TrackLog {
  constructor(private readonly dataDir: string) {}

  private filePathForDay(phone: string, dayYmd: string): string {
    const safePhone = phone.replace(/\D/g, "");
    const dir = path.join(this.dataDir, "tracks", safePhone);
    return path.join(dir, `${dayYmd}.jsonl`);
  }

  /** dayYmd = YYYY-MM-DD */
  append(phone: string, dayYmd: string, point: TrackPointLine): void {
    const fp = this.filePathForDay(phone, dayYmd);
    const d = path.dirname(fp);
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    fs.appendFileSync(fp, `${JSON.stringify(point)}\n`, "utf8");
  }

  readDay(phone: string, dayYmd: string): TrackPointLine[] {
    const fp = this.filePathForDay(phone, dayYmd);
    if (!fs.existsSync(fp)) return [];
    const raw = fs.readFileSync(fp, "utf8");
    const out: TrackPointLine[] = [];
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try {
        out.push(JSON.parse(t) as TrackPointLine);
      } catch {
        /* skip corrupt line */
      }
    }
    return out;
  }

  listDays(phone: string): string[] {
    const safePhone = phone.replace(/\D/g, "");
    const dir = path.join(this.dataDir, "tracks", safePhone);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => f.replace(/\.jsonl$/, ""))
      .sort()
      .reverse();
  }
}

export function dayYmdFromIso(iso: string): string {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1]!;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}
