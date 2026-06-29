/**
 * 管理端商城图：落盘到 data/mall-uploads，HTTP GET /uploads/ 对外提供直链（供小程序 image src）。
 */
import { createReadStream } from "node:fs";
import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const MAX_BYTES = 5 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

export function getMallUploadsDir(): string {
  return path.join(process.env.DATA_DIR ?? process.cwd(), "mall-uploads");
}

export async function ensureMallUploadsDir(): Promise<void> {
  await mkdir(getMallUploadsDir(), { recursive: true });
}

/** data URL → buffer；校验类型与大小 */
export function parseImageDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const s = String(dataUrl ?? "").trim();
  const m = /^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/=\s]+)$/i.exec(s);
  if (!m) return null;
  const mime = m[1]!.toLowerCase();
  if (!MIME_EXT[mime]) return null;
  const b64 = m[2]!.replace(/\s+/g, "");
  let buffer: Buffer;
  try {
    buffer = Buffer.from(b64, "base64");
  } catch {
    return null;
  }
  if (buffer.length === 0 || buffer.length > MAX_BYTES) return null;
  return { mime, buffer };
}

export async function saveMallUploadImage(buffer: Buffer, mime: string): Promise<string> {
  await ensureMallUploadsDir();
  const ext = MIME_EXT[mime];
  const name = `u_${randomBytes(12).toString("hex")}${ext}`;
  const fp = path.join(getMallUploadsDir(), name);
  await writeFile(fp, buffer);
  return name;
}

/** 安全解析磁盘路径；禁止路径穿越 */
export function resolveMallUploadFile(basename: string): string | null {
  const base = path.basename(basename);
  if (base !== basename || base.includes("..")) return null;
  if (!/^u_[a-f0-9]{24}\.(jpg|png|gif|webp)$/i.test(base)) return null;
  return path.join(getMallUploadsDir(), base);
}

export function contentTypeForUploadFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

export type StreamFileResult = {
  filePath: string;
  contentType: string;
  stream: ReturnType<typeof createReadStream>;
};

export async function openMallUploadStream(basename: string): Promise<StreamFileResult | null> {
  const fp = resolveMallUploadFile(basename);
  if (!fp) return null;
  try {
    await stat(fp);
  } catch {
    return null;
  }
  return {
    filePath: fp,
    contentType: contentTypeForUploadFile(fp),
    stream: createReadStream(fp),
  };
}
