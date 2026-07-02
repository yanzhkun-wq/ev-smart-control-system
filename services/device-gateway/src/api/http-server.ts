import http from "node:http";
import { URL } from "node:url";
import type { Jt808App } from "../core/jt808-app.js";
import { ControlCmd } from "../core/jt808-app.js";
import { jscode2session } from "../core/wechat-mp-client.js";
import { normalizePhoneDigits, defaultAdminSeed, defaultMiniappPages } from "../core/store.js";
import { defaultMiniappFeatures } from "../core/miniapp-features-defaults.js";
import { defaultMiniappHomeLayout, mergeMiniappHomeLayout } from "../core/miniapp-home-layout-defaults.js";

function json(res: http.ServerResponse, code: number, body: unknown): void {
  if (code === 204) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }
  const s = JSON.stringify(body);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(s);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function createApiServer(app: Jt808App, port: number): http.Server {
  const srv = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      json(res, 204, {});
      return;
    }
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const path = url.pathname;

    try {
      if (path === "/health" && req.method === "GET") {
        json(res, 200, { ok: true, service: "ev-device-gateway", ts: new Date().toISOString() });
        return;
      }

      if (path === "/api/miniapp-ui" && req.method === "GET") {
        app.reloadStore();
        const mem = app.getMem();
        const pages = mem.admin?.miniappPages?.length
          ? mem.admin.miniappPages
          : defaultMiniappPages();
        const publicPages = pages.map(({ adminNote: _a, ...rest }) => rest);
        const seedF = defaultMiniappFeatures();
        const rawF = mem.admin?.miniappFeatures;
        const features: Record<string, boolean> = { ...seedF };
        if (rawF && typeof rawF === "object") {
          for (const k of Object.keys(seedF)) {
            if (typeof rawF[k] === "boolean") features[k] = rawF[k];
          }
        }
        const homeLayout = mergeMiniappHomeLayout(defaultMiniappHomeLayout(), mem.admin?.miniappHomeLayout);
        const alarmSubscribeTmplIds = mem.admin?.miniappAlarmSubscribeTmplIds?.map(String).filter(Boolean) ?? [];
        const miniappWxAppId =
          (process.env.WECHAT_MP_APPID ?? "").trim() || (mem.admin?.miniappWxAppId ?? "").trim();
        json(res, 200, {
          ok: true,
          pages: publicPages,
          features,
          homeLayout,
          alarmSubscribeTmplIds,
          miniappWxAppId,
          ts: new Date().toISOString(),
        });
        return;
      }

      if (path === "/api/miniapp/alarm-subscribe" && req.method === "POST") {
        const raw = await readBody(req);
        const o = JSON.parse(raw || "{}") as { code?: string; acceptTmplIds?: unknown };
        const code = typeof o.code === "string" ? o.code.trim() : "";
        const acceptTmplIds = Array.isArray(o.acceptTmplIds) ? o.acceptTmplIds.map(String).filter(Boolean) : [];
        if (!code) {
          json(res, 400, { ok: false, reason: "需要 wx.login 返回的 code" });
          return;
        }
        app.reloadStore();
        const mem = app.getMem();
        const admin = mem.admin;
        const appid = (process.env.WECHAT_MP_APPID ?? "").trim() || (admin?.miniappWxAppId ?? "").trim();
        const secret = (process.env.WECHAT_MP_SECRET ?? "").trim();
        if (!appid || !secret) {
          json(
            res,
            503,
            {
              ok: false,
              reason: "网关未配置 WECHAT_MP_SECRET；AppID 可用环境变量 WECHAT_MP_APPID 或管理端「小程序 AppID」",
            },
          );
          return;
        }
        const sess = await jscode2session(appid, secret, code);
        if (!sess.ok) {
          json(res, 400, { ok: false, reason: sess.err });
          return;
        }
        app.upsertMiniappAlarmSubscriber(sess.openid, acceptTmplIds);
        json(res, 200, { ok: true });
        return;
      }

      if (path === "/api/store" && req.method === "GET") {
        app.reloadStore();
        json(res, 200, app.getMem());
        return;
      }

      if (path === "/api/store" && req.method === "PUT") {
        const raw = await readBody(req);
        const body = JSON.parse(raw || "{}") as Record<string, unknown>;
        app.reloadStore();
        const cur = app.getMem();
        let mergedAdmin = cur.admin ?? defaultAdminSeed();
        if (body.admin && typeof body.admin === "object") {
          mergedAdmin = { ...mergedAdmin, ...(body.admin as Record<string, unknown>) } as typeof mergedAdmin;
        }
        const merged = {
          binds: Array.isArray(body.binds) ? body.binds : cur.binds,
          lastPositions:
            body.lastPositions && typeof body.lastPositions === "object"
              ? (body.lastPositions as (typeof cur)["lastPositions"])
              : cur.lastPositions,
          settings:
            body.settings && typeof body.settings === "object"
              ? { ...cur.settings, ...(body.settings as Record<string, unknown>) }
              : cur.settings,
          admin: body.admin && typeof body.admin === "object" ? mergedAdmin : cur.admin ?? defaultAdminSeed(),
        };
        const next = {
          ...cur,
          ...merged,
          admin: merged.admin,
        };
        app.replaceMem(next as Parameters<typeof app.replaceMem>[0]);
        json(res, 200, { ok: true });
        return;
      }

      if (path === "/api/terminals" && req.method === "GET") {
        app.reloadStore();
        const mem = app.getMem();
        const online = app.registry.listOnline();
        const list = mem.binds.map((b) => ({
          ...b,
          online: app.registry.isOnline(b.terminalPhone),
          last: mem.lastPositions[b.terminalPhone] ?? null,
        }));
        json(res, 200, { binds: list, onlineSockets: online });
        return;
      }

      if (path === "/api/bind" && req.method === "POST") {
        const raw = await readBody(req);
        const o = JSON.parse(raw || "{}") as { terminalPhone?: string; plate?: string; note?: string };
        if (!o.terminalPhone || !o.plate) {
          json(res, 400, { ok: false, reason: "需要 terminalPhone 与 plate" });
          return;
        }
        const phone = normalizePhoneDigits(o.terminalPhone);
        app.saveBind(phone, String(o.plate).trim(), o.note);
        json(res, 200, { ok: true, terminalPhone: phone });
        return;
      }

      const delBind = /^\/api\/bind\/([^/]+)$/.exec(path);
      if (delBind && req.method === "DELETE") {
        const phone = normalizePhoneDigits(decodeURIComponent(delBind[1]!));
        app.removeBind(phone);
        json(res, 200, { ok: true });
        return;
      }

      const st = /^\/api\/terminal\/([^/]+)\/status$/.exec(path);
      if (st && req.method === "GET") {
        app.reloadStore();
        const phone = normalizePhoneDigits(decodeURIComponent(st[1]!));
        const mem = app.getMem();
        json(res, 200, {
          terminalPhone: phone,
          online: app.registry.isOnline(phone),
          last: mem.lastPositions[phone] ?? null,
        });
        return;
      }

      const trackDays = /^\/api\/terminal\/([^/]+)\/track-days$/.exec(path);
      if (trackDays && req.method === "GET") {
        const phone = normalizePhoneDigits(decodeURIComponent(trackDays[1]!));
        const tl = app.trackLog;
        if (!tl) {
          json(res, 503, { ok: false, reason: "轨迹服务未初始化" });
          return;
        }
        json(res, 200, { terminalPhone: phone, days: tl.listDays(phone) });
        return;
      }

      const trk = /^\/api\/terminal\/([^/]+)\/tracks$/.exec(path);
      if (trk && req.method === "GET") {
        const phone = normalizePhoneDigits(decodeURIComponent(trk[1]!));
        const date = url.searchParams.get("date");
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          json(res, 400, { ok: false, reason: "需要查询参数 date=YYYY-MM-DD" });
          return;
        }
        const tl = app.trackLog;
        if (!tl) {
          json(res, 503, { ok: false, reason: "轨迹服务未初始化" });
          return;
        }
        json(res, 200, { terminalPhone: phone, date, points: tl.readDay(phone, date) });
        return;
      }

      const cmd = /^\/api\/terminal\/([^/]+)\/command$/.exec(path);
      if (cmd && req.method === "POST") {
        const phone = normalizePhoneDigits(decodeURIComponent(cmd[1]!));
        const raw = await readBody(req);
        const o = JSON.parse(raw || "{}") as { action?: string };
        const a = (o.action || "").toLowerCase();
        let byte: number | undefined;
        if (a === "lock" || a === "arm") byte = ControlCmd.ARM;
        else if (a === "unlock" || a === "disarm") byte = ControlCmd.DISARM;
        else if (a === "cut" || a === "cut_fuel") byte = ControlCmd.CUT_FUEL;
        else if (a === "restore" || a === "restore_fuel") byte = ControlCmd.RESTORE_FUEL;
        if (byte === undefined) {
          json(res, 400, {
            ok: false,
            reason: "action 须为 lock|unlock|arm|disarm|cut|restore",
          });
          return;
        }
        const r = app.sendControl(phone, byte);
        json(res, r.ok ? 200 : 503, r.ok ? { ok: true, action: a, cmd: `0x${byte.toString(16)}` } : r);
        return;
      }

      json(res, 404, { ok: false, reason: "not found" });
    } catch (e) {
      json(res, 500, { ok: false, reason: String(e) });
    }
  });

  srv.listen(port, "0.0.0.0", () => {
    console.info(`[api] http://0.0.0.0:${port}  health=/health  terminals=/api/terminals`);
  });
  return srv;
}
