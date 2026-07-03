import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "node:http";
import { createApiServer } from "../http-server.js";
import { TerminalRegistry, defaultAdminSeed, type StoreShape } from "../../core/store.js";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function jsonReq(
  srv: http.Server,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: (srv.address() as import("net").AddressInfo).port,
        method,
        path,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload).toString() } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c as Buffer));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          try {
            resolve({ status: res.statusCode ?? 0, data: text ? JSON.parse(text) : null });
          } catch {
            resolve({ status: res.statusCode ?? 0, data: text });
          }
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function createMockApp() {
  const registry = new TerminalRegistry();
  const mem: StoreShape = {
    binds: [
      { terminalPhone: "13800138000", plate: "粤A·D12345", note: "测试车" },
      { terminalPhone: "13800138001", plate: "粤B·E67890" },
    ],
    lastPositions: {
      "13800138000": {
        terminalPhone: "13800138000",
        latDeg: 23.125,
        lngDeg: 113.255,
        speedKmh: 35,
        alarm: 0,
        status: 256,
        receivedAt: "2026-07-03T00:00:00Z",
        accOn: true,
        positioned: true,
      },
    },
    settings: { registerAuthCode: "test_auth" },
    admin: defaultAdminSeed(),
  };

  return {
    registry,
    mem,
    reloadStoreCallCount: 0,
    savedBinds: [] as { phone: string; plate: string; note?: string }[],
    removedPhones: [] as string[],
    replacedMems: [] as StoreShape[],
    upsertedSubscribers: [] as { openid: string; tmplIds: string[] }[],
    controlResults: [] as { phone: string; cmd: number }[],

    // Jt808App interface mocks
    reloadStore() {
      this.reloadStoreCallCount++;
    },
    getMem() {
      return this.mem;
    },
    saveBind(phone: string, plate: string, note?: string) {
      this.savedBinds.push({ phone, plate, note });
      const key = phone.replace(/\D/g, "");
      const idx = this.mem.binds.findIndex((b) => b.terminalPhone === key);
      const row = { terminalPhone: key, plate, note };
      if (idx >= 0) this.mem.binds[idx] = row;
      else this.mem.binds.push(row);
    },
    removeBind(phone: string) {
      this.removedPhones.push(phone);
      const key = phone.replace(/\D/g, "");
      this.mem.binds = this.mem.binds.filter((b) => b.terminalPhone !== key);
    },
    replaceMem(next: StoreShape) {
      this.replacedMems.push(next);
      this.mem = next;
    },
    upsertMiniappAlarmSubscriber(openid: string, tmplIds: string[]) {
      this.upsertedSubscribers.push({ openid, tmplIds });
    },
    sendControl(phone: string, cmd: number) {
      this.controlResults.push({ phone, cmd });
      const sock = this.registry.getSocket(phone.replace(/\D/g, ""));
      if (!sock || sock.destroyed) return { ok: false, reason: "终端未连接（离线）" };
      return { ok: true };
    },
    trackLog: undefined,
  };
}

type MockApp = ReturnType<typeof createMockApp>;

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("HTTP API Server", () => {
  let srv: http.Server;
  let app: MockApp;

  beforeEach(async () => {
    app = createMockApp();
    srv = createApiServer(app as unknown as Parameters<typeof createApiServer>[0], 0);
    // wait for server to listen
    await new Promise<void>((resolve) => srv.once("listening", () => resolve()));
  });

  afterEach(() => {
    srv.close();
  });

  /* ---- health ---- */
  describe("GET /health", () => {
    it("should return 200 with service info", async () => {
      const { status, data } = await jsonReq(srv, "GET", "/health");
      expect(status).toBe(200);
      expect(data).toMatchObject({ ok: true, service: "ev-device-gateway" });
    });
  });

  /* ---- CORS ---- */
  describe("OPTIONS", () => {
    it("should return 204 for CORS preflight", async () => {
      const { status } = await jsonReq(srv, "OPTIONS", "/health");
      expect(status).toBe(204);
    });
  });

  /* ---- GET /api/terminals ---- */
  describe("GET /api/terminals", () => {
    it("should list all bound terminals with online status", async () => {
      const { status, data } = await jsonReq(srv, "GET", "/api/terminals");
      expect(status).toBe(200);
      expect(data).toMatchObject({
        binds: [
          { terminalPhone: "13800138000", plate: "粤A·D12345", online: false },
          { terminalPhone: "13800138001", plate: "粤B·E67890", online: false },
        ],
      });
    });
  });

  /* ---- GET /api/store ---- */
  describe("GET /api/store", () => {
    it("should return full store shape", async () => {
      const { status, data } = await jsonReq(srv, "GET", "/api/store");
      expect(status).toBe(200);
      expect(data).toHaveProperty("binds");
      expect(data).toHaveProperty("settings.registerAuthCode", "test_auth");
      expect(Array.isArray((data as any).binds)).toBe(true);
      expect((data as any).binds.length).toBeGreaterThanOrEqual(2);
      expect(app.reloadStoreCallCount).toBe(1);
    });
  });

  /* ---- PUT /api/store ---- */
  describe("PUT /api/store", () => {
    it("should update store fields", async () => {
      const { status } = await jsonReq(srv, "PUT", "/api/store", {
        admin: { mapProvider: "百度" },
      });
      expect(status).toBe(200);
      expect(app.replacedMems.length).toBe(1);
      expect(app.replacedMems[0]!.admin!.mapProvider).toBe("百度");
    });

    it("should replace binds when provided", async () => {
      const { status } = await jsonReq(srv, "PUT", "/api/store", {
        binds: [{ terminalPhone: "13800999000", plate: "粤C·F11111" }],
      });
      expect(status).toBe(200);
      expect(app.replacedMems[0]!.binds).toEqual([
        { terminalPhone: "13800999000", plate: "粤C·F11111" },
      ]);
    });
  });

  /* ---- POST /api/bind ---- */
  describe("POST /api/bind", () => {
    it("should bind a new terminal", async () => {
      const { status, data } = await jsonReq(srv, "POST", "/api/bind", {
        terminalPhone: "13800138999",
        plate: "粤B·NEW001",
        note: "新车",
      });
      expect(status).toBe(200);
      expect(data).toMatchObject({ ok: true, terminalPhone: "13800138999" });
      expect(app.savedBinds).toHaveLength(1);
      expect(app.savedBinds[0]!.phone).toBe("13800138999");
    });

    it("should reject missing fields", async () => {
      const { status, data } = await jsonReq(srv, "POST", "/api/bind", { plate: "粤A·T" });
      expect(status).toBe(400);
      expect(data).toMatchObject({ ok: false });
    });
  });

  /* ---- DELETE /api/bind/:phone ---- */
  describe("DELETE /api/bind/:phone", () => {
    it("should unbind a terminal", async () => {
      const { status } = await jsonReq(srv, "DELETE", "/api/bind/13800138000");
      expect(status).toBe(200);
      expect(app.removedPhones).toContain("13800138000");
    });
  });

  /* ---- GET /api/terminal/:phone/status ---- */
  describe("GET /api/terminal/:phone/status", () => {
    it("should return terminal status", async () => {
      const { status, data } = await jsonReq(srv, "GET", "/api/terminal/13800138000/status");
      expect(status).toBe(200);
      expect(data).toMatchObject({
        terminalPhone: "13800138000",
        online: false,
      });
    });

    it("should return 200 for unknown terminal", async () => {
      const { status, data } = await jsonReq(srv, "GET", "/api/terminal/13800000000/status");
      expect(status).toBe(200);
      expect(data).toMatchObject({ terminalPhone: "13800000000", last: null });
    });
  });

  /* ---- POST /api/terminal/:phone/command ---- */
  describe("POST /api/terminal/:phone/command", () => {
    it("should reject command for offline terminal", async () => {
      const { status, data } = await jsonReq(srv, "POST", "/api/terminal/13800138000/command", {
        action: "lock",
      });
      // offline terminal returns 503
      expect(status).toBe(503);
      expect(data).toMatchObject({ ok: false });
    });

    it("should reject unknown action", async () => {
      const { status, data } = await jsonReq(srv, "POST", "/api/terminal/13800138000/command", {
        action: "invalid_action",
      });
      expect(status).toBe(400);
      expect(data).toMatchObject({ ok: false });
    });
  });

  /* ---- GET /api/miniapp-ui ---- */
  describe("GET /api/miniapp-ui", () => {
    it("should return miniapp UI config", async () => {
      const { status, data } = await jsonReq(srv, "GET", "/api/miniapp-ui");
      expect(status).toBe(200);
      expect(data).toMatchObject({
        ok: true,
        pages: expect.any(Array),
        features: expect.any(Object),
        homeLayout: expect.any(Object),
      });
    });
  });

  /* ---- 404 ---- */
  describe("unknown route", () => {
    it("should return 404", async () => {
      const { status } = await jsonReq(srv, "GET", "/api/nonexistent");
      expect(status).toBe(404);
    });
  });
});
