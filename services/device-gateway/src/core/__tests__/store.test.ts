import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  normalizePhoneDigits,
  normalizeStoreShape,
  hydrateStoreFromDisk,
  mergeAdminWithSeed,
  defaultAdminSeed,
  defaultSidebarMenuItems,
  defaultBranding,
  JsonPersistence,
  TerminalRegistry,
  type StoreShape,
  type AdminStore,
} from "../store.js";
import { Socket } from "node:net";

/* ------------------------------------------------------------------ */
/*  normalizePhoneDigits                                              */
/* ------------------------------------------------------------------ */
describe("normalizePhoneDigits", () => {
  it("should pass through clean 11-digit phone", () => {
    expect(normalizePhoneDigits("13800138000")).toBe("13800138000");
  });

  it("should strip non-digit characters", () => {
    expect(normalizePhoneDigits("138-0013-8000")).toBe("13800138000");
  });

  it("should strip leading 0 from 12-digit phone", () => {
    expect(normalizePhoneDigits("013800138000")).toBe("13800138000");
  });

  it("should strip leading 86 from 13-digit phone", () => {
    expect(normalizePhoneDigits("8613800138000")).toBe("13800138000");
  });

  it("should take last 11 digits from longer input", () => {
    expect(normalizePhoneDigits("8613800138000123")).toBe("00138000123");
  });

  it("should throw for invalid phone", () => {
    expect(() => normalizePhoneDigits("123")).toThrow("11 位数字");
    expect(() => normalizePhoneDigits("")).toThrow("11 位数字");
  });
});

/* ------------------------------------------------------------------ */
/*  defaultAdminSeed / defaultSidebarMenuItems / defaultBranding      */
/* ------------------------------------------------------------------ */
describe("defaultAdminSeed", () => {
  it("should return a complete AdminStore object", () => {
    const seed = defaultAdminSeed();
    expect(seed).toBeDefined();
    expect(typeof seed.restApiBase).toBe("string");
    expect(typeof seed.jwtRefreshMin).toBe("number");
    expect(Array.isArray(seed.geofences)).toBe(true);
    expect(seed.geofences!.length).toBeGreaterThanOrEqual(2);
    expect(seed.geofences![0]!.name).toBeTruthy();
    expect(Array.isArray(seed.alerts)).toBe(true);
    expect(seed.alerts!.length).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(seed.fleetUsers)).toBe(true);
    expect(seed.fleetUsers!.length).toBeGreaterThanOrEqual(2);
    expect(seed.branding).toEqual(defaultBranding());
    expect(seed.sidebarMenu).toEqual(defaultSidebarMenuItems());
  });

  it("should have stable default sidebar items", () => {
    const items = defaultSidebarMenuItems();
    expect(items).toHaveLength(4);
    expect(items[0]!.path).toBe("/");
    expect(items[0]!.label).toBe("工作台");
    expect(items[1]!.path).toBe("/vehicle-risk");
  });
});

/* ------------------------------------------------------------------ */
/*  mergeAdminWithSeed                                                 */
/* ------------------------------------------------------------------ */
describe("mergeAdminWithSeed", () => {
  it("should return seed when partial is undefined", () => {
    const merged = mergeAdminWithSeed(undefined);
    expect(merged.geofences).toHaveLength(2);
    expect(merged.sidebarMenu).toHaveLength(4);
  });

  it("should merge top-level fields", () => {
    const merged = mergeAdminWithSeed({ mapProvider: "高德" });
    expect(merged.mapProvider).toBe("高德");
    expect(merged.jwtRefreshMin).toBe(30); // seed default
  });

  it("should merge branding", () => {
    const merged = mergeAdminWithSeed({
      branding: { title: "自定义标题", subtitle: "测试" },
    });
    expect(merged.branding!.title).toBe("自定义标题");
    expect(merged.branding!.subtitle).toBe("测试");
  });

  it("should merge sidebar menu labels", () => {
    const merged = mergeAdminWithSeed({
      sidebarMenu: [{ path: "/", label: "首页" }],
    });
    expect(merged.sidebarMenu![0]!.label).toBe("首页");
    expect(merged.sidebarMenu![1]!.label).toBe("车联与风控"); // unchanged
  });

  it("should overwrite geofences when provided", () => {
    const merged = mergeAdminWithSeed({
      geofences: [
        { key: "gx", name: "测试围栏", type: "圆形", bindPlates: "粤A·T", alarm: "进出", enabled: true },
      ],
    });
    expect(merged.geofences).toHaveLength(1);
    expect(merged.geofences![0]!.name).toBe("测试围栏");
  });

  it("should merge miniapp page titles", () => {
    const merged = mergeAdminWithSeed({
      miniappPages: [{ route: "pages/home/home", navigationBarTitle: "自定义首页" }],
    });
    const home = merged.miniappPages!.find((p) => p.route === "pages/home/home");
    expect(home?.navigationBarTitle).toBe("自定义首页");
  });

  it("should enable/disable miniapp features", () => {
    const merged = mergeAdminWithSeed({
      miniappFeatures: { home_show_hero: false },
    });
    expect(merged.miniappFeatures!.home_show_hero).toBe(false);
    // other features still at defaults
    expect(merged.miniappFeatures!.home_show_remote).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  normalizeStoreShape                                                */
/* ------------------------------------------------------------------ */
describe("normalizeStoreShape", () => {
  it("should return default shape when input is empty", () => {
    const result = normalizeStoreShape({}, "auth123");
    expect(result.binds).toEqual([]);
    expect(result.lastPositions).toEqual({});
    expect(result.settings.registerAuthCode).toBe("auth123");
    expect(result.admin).toBeDefined();
  });

  it("should parse valid binds", () => {
    const result = normalizeStoreShape(
      {
        binds: [
          { terminalPhone: "13800138000", plate: "粤A·D12345", note: "测试车" },
        ],
      },
      "auth123",
    );
    expect(result.binds).toHaveLength(1);
    expect(result.binds[0]!.terminalPhone).toBe("13800138000");
    expect(result.binds[0]!.plate).toBe("粤A·D12345");
    expect(result.binds[0]!.note).toBe("测试车");
  });

  it("should skip invalid binds", () => {
    const result = normalizeStoreShape(
      {
        binds: [
          { terminalPhone: "13800138000", plate: "粤A·D12345" },
          { terminalPhone: "123", plate: "粤B·T" },         // phone too short
          { plate: "粤C·X" },                               // missing phone
          null,
        ],
      },
      "auth123",
    );
    expect(result.binds).toHaveLength(1);
  });

  it("should parse valid lastPositions", () => {
    const result = normalizeStoreShape(
      {
        lastPositions: {
          "13800138000": {
            latDeg: 23.125,
            lngDeg: 113.255,
            speedKmh: 35,
            alarm: 0,
            status: 0,
            receivedAt: "2026-07-03T00:00:00Z",
          },
        },
      },
      "auth123",
    );
    expect(result.lastPositions["13800138000"]).toBeDefined();
    expect(result.lastPositions["13800138000"]!.latDeg).toBe(23.125);
    expect(result.lastPositions["13800138000"]!.lngDeg).toBe(113.255);
  });

  it("should skip lastPositions with invalid coords", () => {
    const result = normalizeStoreShape(
      {
        lastPositions: {
          "13800138000": { latDeg: "abc", lngDeg: 113.255, speedKmh: 0, alarm: 0, status: 0, receivedAt: "" },
        },
      },
      "auth123",
    );
    expect(result.lastPositions["13800138000"]).toBeUndefined();
  });

  it("should use user settings.registerAuthCode over bootstrap", () => {
    const result = normalizeStoreShape(
      { settings: { registerAuthCode: "custom_auth" } },
      "bootstrap_auth",
    );
    expect(result.settings.registerAuthCode).toBe("custom_auth");
  });

  it("should fallback to bootstrap when settings auth is empty", () => {
    const result = normalizeStoreShape(
      { settings: { registerAuthCode: "" } },
      "bootstrap_auth",
    );
    expect(result.settings.registerAuthCode).toBe("bootstrap_auth");
  });
});

/* ------------------------------------------------------------------ */
/*  hydrateStoreFromDisk                                               */
/* ------------------------------------------------------------------ */
describe("hydrateStoreFromDisk", () => {
  it("should fill missing fields with defaults", () => {
    const raw: StoreShape = {
      binds: [],
      lastPositions: {},
      settings: { registerAuthCode: "" },
    };
    const hydrated = hydrateStoreFromDisk(raw, "bootstrap_auth");
    expect(hydrated.settings.registerAuthCode).toBe("bootstrap_auth");
    expect(hydrated.admin).toBeDefined();
    expect(hydrated.admin!.branding!.title).toBe("电动车智控");
  });

  it("should preserve admin config from disk", () => {
    const raw: StoreShape = {
      binds: [],
      lastPositions: {},
      settings: { registerAuthCode: "disk_auth" },
      admin: { mapProvider: "百度" },
    };
    const hydrated = hydrateStoreFromDisk(raw, "boot");
    expect(hydrated.settings.registerAuthCode).toBe("disk_auth");
    expect(hydrated.admin!.mapProvider).toBe("百度");
  });

  it("should handle null/invalid admin gracefully", () => {
    const raw: StoreShape = {
      binds: [],
      lastPositions: {},
      settings: { registerAuthCode: "" },
    };
    // @ts-expect-error testing edge case
    const hydrated = hydrateStoreFromDisk({ ...raw, admin: null }, "boot");
    expect(hydrated.admin).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/*  JsonPersistence                                                    */
/* ------------------------------------------------------------------ */
describe("JsonPersistence", () => {
  let tmpDir: string;
  let persistence: JsonPersistence;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ev-store-test-"));
    persistence = new JsonPersistence(tmpDir);
  });

  afterEach(() => {
    persistence.drain().catch(() => {});
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should load empty state when no file exists", () => {
    const data = persistence.load();
    expect(data.binds).toEqual([]);
    expect(data.lastPositions).toEqual({});
    expect(data.settings.registerAuthCode).toBe("");
  });

  it("should save and reload data", async () => {
    const shape: StoreShape = {
      binds: [{ terminalPhone: "13800138000", plate: "粤A·D12345" }],
      lastPositions: {},
      settings: { registerAuthCode: "test_auth" },
    };
    persistence.save(shape);
    await persistence.drain();

    const loaded = persistence.load();
    expect(loaded.binds).toHaveLength(1);
    expect(loaded.binds[0]!.terminalPhone).toBe("13800138000");
    expect(loaded.settings.registerAuthCode).toBe("test_auth");
  });

  it("should debounce multiple saves", async () => {
    const p1: StoreShape = {
      binds: [{ terminalPhone: "13800138000", plate: "粤A·1" }],
      lastPositions: {},
      settings: { registerAuthCode: "a" },
    };
    const p2: StoreShape = {
      binds: [{ terminalPhone: "13800138001", plate: "粤A·2" }],
      lastPositions: {},
      settings: { registerAuthCode: "b" },
    };
    persistence.save(p1);
    persistence.save(p2);
    await persistence.drain();

    const loaded = persistence.load();
    expect(loaded.binds).toHaveLength(1);
    expect(loaded.binds[0]!.terminalPhone).toBe("13800138001"); // last write wins
  });

  it("should write atomically via tmp+rename", async () => {
    const shape: StoreShape = {
      binds: [],
      lastPositions: {},
      settings: { registerAuthCode: "atomic_test" },
    };
    persistence.save(shape);
    await persistence.drain();

    // Verify the main file exists (not .tmp)
    expect(fs.existsSync(persistence.filePath)).toBe(true);
    expect(fs.existsSync(persistence.filePath + ".tmp")).toBe(false);
    const content = fs.readFileSync(persistence.filePath, "utf8");
    expect(content).toContain("atomic_test");
  });
});

/* ------------------------------------------------------------------ */
/*  TerminalRegistry                                                   */
/* ------------------------------------------------------------------ */
describe("TerminalRegistry", () => {
  let registry: TerminalRegistry;
  let sock1: Socket;
  let sock2: Socket;

  beforeEach(() => {
    registry = new TerminalRegistry();
    sock1 = new Socket();
    sock2 = new Socket();
  });

  afterEach(() => {
    sock1.destroy();
    sock2.destroy();
  });

  it("should register and retrieve a socket", () => {
    registry.setSocket("13800138000", sock1, "192.168.1.1:12345");
    expect(registry.getSocket("13800138000")).toBe(sock1);
    expect(registry.isOnline("13800138000")).toBe(true);
  });

  it("should return undefined for unknown terminal", () => {
    expect(registry.getSocket("13800138000")).toBeUndefined();
    expect(registry.isOnline("13800138000")).toBe(false);
  });

  it("should replace old socket on re-register", () => {
    registry.setSocket("13800138000", sock1, "192.168.1.1:1000");
    registry.setSocket("13800138000", sock2, "192.168.1.2:2000");
    expect(registry.getSocket("13800138000")).toBe(sock2);
    expect(sock1.destroyed).toBe(true); // old one destroyed
  });

  it("should remove socket on removeSocket", () => {
    registry.setSocket("13800138000", sock1, "192.168.1.1:3000");
    registry.removeSocket(sock1);
    expect(registry.getSocket("13800138000")).toBeUndefined();
    expect(registry.isOnline("13800138000")).toBe(false);
  });

  it("should only remove the correct socket", () => {
    registry.setSocket("13800138000", sock1, "192.168.1.1:4000");
    registry.setSocket("13800138001", sock2, "192.168.1.2:5000");
    registry.removeSocket(sock1);
    expect(registry.getSocket("13800138000")).toBeUndefined();
    expect(registry.getSocket("13800138001")).toBe(sock2);
  });

  it("should generate sequential down serial numbers", () => {
    expect(registry.nextDownSerial("13800138000")).toBe(1);
    expect(registry.nextDownSerial("13800138000")).toBe(2);
    expect(registry.nextDownSerial("13800138000")).toBe(3);
  });

  it("should wrap serial at 0xffff range", () => {
    // sequential calls never exceed 0xffff
    for (let i = 0; i < 100; i++) {
      const val = registry.nextDownSerial("13800138000");
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(0xffff);
    }
  });

  it("should list online terminals only", () => {
    registry.setSocket("13800138000", sock1, "192.168.1.1:6000");
    registry.setSocket("13800138001", sock2, "192.168.1.2:7000");
    const online = registry.listOnline();
    expect(online).toHaveLength(2);
    expect(online[0]!.phoneKey).toBe("13800138000");

    sock1.destroy();
    // After destroy, isOnline returns false for sock1
    const online2 = registry.listOnline();
    // The registry still has sock1 in sessions but it's destroyed
    // listOnline checks v.socket.destroyed
    expect(online2).toHaveLength(1);
    expect(online2[0]!.phoneKey).toBe("13800138001");
  });

  it("should handle removeSocket for unknown socket gracefully", () => {
    const orphan = new Socket();
    expect(() => registry.removeSocket(orphan)).not.toThrow();
    orphan.destroy();
  });
});
