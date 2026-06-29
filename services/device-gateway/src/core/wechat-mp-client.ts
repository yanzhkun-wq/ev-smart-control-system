/**
 * 微信小程序服务端：access_token、code2session、订阅消息下发。
 * AppSecret 仅允许从环境变量 WECHAT_MP_SECRET 读取，勿写入可下发给前端的 store。
 */

type TokenCache = { token: string; expireAtMs: number };
let tokenCache: TokenCache | null = null;

export async function getStableAccessToken(
  appid: string,
  secret: string,
): Promise<{ ok: true; token: string } | { ok: false; err: string }> {
  const now = Date.now();
  if (tokenCache && tokenCache.expireAtMs > now + 60_000) {
    return { ok: true, token: tokenCache.token };
  }
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}`;
  const res = await fetch(url);
  const j = (await res.json()) as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string };
  if (j.access_token && typeof j.access_token === "string") {
    const sec = Number(j.expires_in) || 7200;
    tokenCache = { token: j.access_token, expireAtMs: now + sec * 1000 };
    return { ok: true, token: j.access_token };
  }
  return { ok: false, err: j.errmsg ? `${j.errcode ?? ""} ${j.errmsg}` : JSON.stringify(j) };
}

export async function jscode2session(
  appid: string,
  secret: string,
  jsCode: string,
): Promise<{ ok: true; openid: string; session_key?: string } | { ok: false; err: string }> {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}&js_code=${encodeURIComponent(jsCode)}&grant_type=authorization_code`;
  const res = await fetch(url);
  const j = (await res.json()) as { openid?: string; session_key?: string; errcode?: number; errmsg?: string };
  if (j.openid && typeof j.openid === "string") {
    return { ok: true, openid: j.openid, session_key: j.session_key };
  }
  return { ok: false, err: j.errmsg ? `${j.errcode ?? ""} ${j.errmsg}` : JSON.stringify(j) };
}

export type SubscribeMessagePayload = {
  touser: string;
  template_id: string;
  page?: string;
  data: Record<string, { value: string }>;
  miniprogram_state?: "developer" | "trial" | "formal";
};

export async function subscribeMessageSend(
  accessToken: string,
  p: SubscribeMessagePayload,
): Promise<{ ok: true } | { ok: false; err: string }> {
  const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(accessToken)}`;
  const body = {
    touser: p.touser,
    template_id: p.template_id,
    page: p.page ?? "pages/alarm/alarm",
    data: p.data,
    miniprogram_state: p.miniprogram_state ?? "formal",
    lang: "zh_CN",
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await res.json()) as { errcode?: number; errmsg?: string };
  if (j.errcode === 0) return { ok: true };
  return { ok: false, err: `${j.errcode ?? "?"} ${j.errmsg ?? JSON.stringify(j)}` };
}

/** 微信 thing/time 类字段常有长度限制，保守截断 */
export function clampWxField(s: string, max: number): string {
  const t = String(s ?? "").replace(/\r?\n/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}
