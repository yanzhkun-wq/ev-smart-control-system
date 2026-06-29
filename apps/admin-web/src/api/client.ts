const LS_KEY = "ev-admin-gateway-api-base";

export function getApiBase(): string {
  if (typeof window === "undefined" || !window.localStorage) {
    return (import.meta.env.VITE_GATEWAY_URL || "").trim().replace(/\/$/, "");
  }
  const fromLS = localStorage.getItem(LS_KEY)?.trim();
  if (fromLS) return fromLS.replace(/\/$/, "");
  const fromEnv = (import.meta.env.VITE_GATEWAY_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  // 生产环境：同源部署，由 Nginx 代理到网关，使用相对路径
  return "";
}

export function setApiBasePersisted(url: string): void {
  localStorage.setItem(LS_KEY, url.replace(/\/$/, ""));
}

export async function gatewayFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const hdr = new Headers(init?.headers);
  if (init?.body && !hdr.has("Content-Type")) hdr.set("Content-Type", "application/json");
  const res = await fetch(url, { ...init, headers: hdr });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** 本机图片 → Data URL，供 POST /api/upload-image */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error ?? new Error("read file failed"));
    fr.readAsDataURL(file);
  });
}

/** 上传到设备网关 mall-uploads，返回可给小程序、管理端共用的 http 直链 */
export async function gatewayUploadMallImage(dataUrl: string): Promise<string> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/upload-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `${res.status} ${res.statusText}`);
  }
  const j = (await res.json()) as { ok?: boolean; url?: string };
  if (!j?.url) throw new Error("网关未返回 url");
  return j.url;
}
