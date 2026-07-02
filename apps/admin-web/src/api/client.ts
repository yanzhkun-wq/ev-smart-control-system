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

/** 本机图片 → Data URL */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error ?? new Error("read file failed"));
    fr.readAsDataURL(file);
  });
}
