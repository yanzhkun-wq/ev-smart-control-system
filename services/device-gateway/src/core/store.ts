import fs, { writeFile } from "node:fs";
import path from "node:path";
import type { Socket } from "node:net";
import { defaultMiniappFeatures } from "./miniapp-features-defaults.js";
import {
  defaultMiniappHomeLayout,
  mergeMiniappHomeLayout,
  mergeMiniappUiPolicy,
  type MiniappHomeLayout,
  type MiniappUiPolicy,
} from "./miniapp-home-layout-defaults.js";
import { defaultMiniappPages, type MiniappPageConfig } from "./miniapp-pages-defaults.js";

export type {
  MiniappCarouselItem,
  MiniappAdBlock,
  MiniappHomeBlock,
  MiniappHomeLayout,
  MiniappUiPolicy,
} from "./miniapp-home-layout-defaults.js";
export type { MiniappPageConfig };
export { defaultMiniappPages };

/**
 * 车辆与终端绑定关系
 * @property terminalPhone - 终端 SIM 卡手机号（11位数字，BCD编码用）
 * @property plate - 车牌号
 * @property note - 备注说明
 */
export type VehicleBind = {
  terminalPhone: string;
  plate: string;
  note?: string;
};

/**
 * 终端最后上报的位置信息（由 0x0200 / 0x0704 消息解析而来）
 * 包含基本定位数据 + TLV 附加信息（电压、ICCID、Gsensor 等）
 * @see parse0200FullBody - 消息体解析
 */
export type LastPosition = {
  terminalPhone: string;
  latDeg: number;
  lngDeg: number;
  speedKmh: number;
  alarm: number;
  status: number;
  deviceTime?: string;
  receivedAt: string;
  /** 表 17 常用位 */
  accOn?: boolean;
  positioned?: boolean;
  armed?: boolean;
  oilCut?: boolean;
  mainPowerDisconnected?: boolean;
  /** Bit18 GPS 定位 */
  gpsPositioned?: boolean;
  /** Bit19 北斗定位 */
  beidouPositioned?: boolean;
  direction?: number;
  altitudeM?: number;
  /** TLV 等 */
  mileageKm?: number;
  mainVoltageV?: number;
  csq?: number;
  gpsSatellites?: number;
  batteryPct?: number;
  iccid?: string;
  armAttach?: number;
  extendedAlarm?: number;
  /** 0xF5 Gsensor 三轴原始值 */
  gsensorX?: number;
  gsensorY?: number;
  gsensorZ?: number;
  /** 0xF6 工作模式 */
  workMode?: number;
  /** 0xF6 充电状态 */
  chargeStatus?: number;
  /** 0xF9 ACC 累计秒数 */
  accCumulativeSec?: number;
  /** 0xFA RFID */
  rfid?: string;
};

export type GatewaySettings = {
  /** 0x8100 下发鉴权码，终端 0x0102 须一致 */
  registerAuthCode: string;
};

export type AdminAlertRow = {
  key: string;
  time: string;
  terminalId: string;
  plate: string;
  type: string;
  level: "高" | "中" | "低";
  status: "未处理" | "已确认" | "已推送";
  source: string;
};

export type AdminGeofenceRow = {
  key: string;
  name: string;
  type: "圆形" | "多边形";
  bindPlates: string;
  alarm: "进区域" | "出区域" | "进出";
  enabled: boolean;
  centerLat?: number;
  centerLng?: number;
  radiusM?: number;
  polygon?: [number, number][];
};

export type AdminUserRow = {
  key: string;
  name: string;
  role: string;
  phone: string;
  fleet: string;
  devices: number;
};

export type OrgTreeNode = {
  title: string;
  key: string;
  children?: OrgTreeNode[];
};

/** 管理端可编辑的展示字段（808 未上报或需覆盖时） */
export type DevicePresentation = {
  armed?: boolean;
  acc?: boolean;
  mainPowerOk?: boolean;
  csq?: number;
  sat?: number;
  batteryPct?: number;
  locateMode?: string;
};

/** 侧栏菜单项：path 与前端路由一致，仅 label / 是否隐藏可改 */
export type AdminSidebarMenuItem = {
  path: string;
  label: string;
  hidden?: boolean;
};

export type AdminBranding = {
  title: string;
  subtitle: string;
};

/** 小程序防盗报警订阅消息：已授权用户 */
export type MiniappAlarmNotifySubscriber = {
  openid: string;
  updatedAt: string;
  acceptedTmplIds?: string[];
};

export type AdminStore = {
  restApiBase?: string;
  wsUrl?: string;
  jwtRefreshMin?: number;
  mapProvider?: string;
  mapWebKey?: string;
  mapStreetView?: boolean;
  notifyFcm?: string;
  notifySms?: string;
  notifyWebhook?: string;
  /** 小程序 AppID */
  miniappWxAppId?: string;
  /** 报警类订阅消息模板 ID 列表 */
  miniappAlarmSubscribeTmplIds?: string[];
  /** 已登记订阅用户 */
  miniappAlarmNotifySubscribers?: MiniappAlarmNotifySubscriber[];
  compatProtocolYear?: string;
  compatNoteTemplate?: string;
  compatFlags?: Record<string, string>;
  geofences?: AdminGeofenceRow[];
  alerts?: AdminAlertRow[];
  fleetUsers?: AdminUserRow[];
  orgTree?: OrgTreeNode[];
  /** 演示轨迹：11 位终端号为 key */
  trackDemo?: Record<string, [number, number][]>;
  dashboardTodayKm?: number;
  devicePresentations?: Record<string, DevicePresentation>;
  /** 侧栏产品名、菜单文案 */
  branding?: AdminBranding;
  sidebarMenu?: AdminSidebarMenuItem[];
  /** 微信小程序各页导航标题、开关与可下发文案 */
  miniappPages?: MiniappPageConfig[];
  /** 小程序界面模块级开关 */
  miniappFeatures?: Record<string, boolean>;
  /** 小程序首页轮播与广告 */
  miniappHomeLayout?: MiniappHomeLayout;
  /** 装修权限等 */
  miniappUiPolicy?: MiniappUiPolicy;
};

export type StoreShape = {
  binds: VehicleBind[];
  lastPositions: Record<string, LastPosition>;
  settings: GatewaySettings;
  admin?: AdminStore;
};

const DEFAULT_TRACK: [number, number][] = [
  [23.125, 113.255],
  [23.1262, 113.2581],
  [23.1275, 113.2615],
  [23.1284, 113.2638],
  [23.1291, 113.2644],
];

export function defaultSidebarMenuItems(): AdminSidebarMenuItem[] {
  return [
    { path: "/", label: "工作台" },
    { path: "/vehicle-risk", label: "车联与风控" },
    { path: "/miniapp-pages", label: "小程序页面" },
    { path: "/settings", label: "系统设置" },
  ];
}

export function defaultBranding(): AdminBranding {
  return {
    title: "电动车智控",
    subtitle: "WZ808 · 管理端",
  };
}

function mergeSidebarMenus(
  defaults: AdminSidebarMenuItem[],
  partial: AdminSidebarMenuItem[] | undefined,
): AdminSidebarMenuItem[] {
  if (!partial?.length) return defaults.map((d) => ({ ...d }));
  const map = new Map(defaults.map((d) => [d.path, { ...d }]));
  for (const p of partial) {
    const path = String(p.path ?? "").trim();
    if (!path) continue;
    const cur = map.get(path);
    if (cur) {
      if (typeof p.label === "string" && p.label.trim()) cur.label = p.label.trim();
      cur.hidden = !!p.hidden;
    }
  }
  return defaults.map((d) => map.get(d.path)!);
}

function mergeMiniappPages(
  baseList: MiniappPageConfig[],
  partial: MiniappPageConfig[] | undefined,
): MiniappPageConfig[] {
  if (!partial?.length) return baseList.map((x) => ({ ...x, strings: x.strings ? { ...x.strings } : {} }));
  const map = new Map(baseList.map((b) => [b.route, { ...b, strings: b.strings ? { ...b.strings } : {} }]));
  for (const p of partial) {
    const r = String(p.route ?? "").trim();
    if (!r) continue;
    const cur = map.get(r);
    if (cur) {
      if (typeof p.navigationBarTitle === "string") cur.navigationBarTitle = p.navigationBarTitle;
      if (typeof p.enabled === "boolean") cur.enabled = p.enabled;
      if (p.strings && typeof p.strings === "object") cur.strings = { ...cur.strings, ...p.strings };
      if (typeof p.adminNote === "string") cur.adminNote = p.adminNote;
    } else {
      map.set(r, {
        route: r,
        navigationBarTitle: p.navigationBarTitle || r,
        enabled: p.enabled !== false,
        strings: p.strings && typeof p.strings === "object" ? { ...p.strings } : {},
        adminNote: typeof p.adminNote === "string" ? p.adminNote : undefined,
      });
    }
  }
  return baseList.map((b) => map.get(b.route)!);
}

function mergeMiniappFeaturesSeed(partial: Record<string, boolean> | undefined): Record<string, boolean> {
  const seed = defaultMiniappFeatures();
  if (!partial || typeof partial !== "object") return { ...seed };
  const out = { ...seed };
  for (const k of Object.keys(seed)) {
    if (typeof partial[k] === "boolean") out[k] = partial[k]!;
  }
  return out;
}

function normalizeMiniappSubscribers(
  raw: unknown,
  seed: MiniappAlarmNotifySubscriber[],
): MiniappAlarmNotifySubscriber[] {
  if (!Array.isArray(raw)) return seed;
  const out: MiniappAlarmNotifySubscriber[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (typeof o.openid !== "string" || !o.openid.trim()) continue;
    out.push({
      openid: o.openid.trim(),
      updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
      acceptedTmplIds: Array.isArray(o.acceptedTmplIds) ? o.acceptedTmplIds.map(String).filter(Boolean) : undefined,
    });
  }
  return out;
}

export function mergeAdminWithSeed(partial: AdminStore | undefined): AdminStore {
  const seed = defaultAdminSeed();
  if (!partial || typeof partial !== "object") return seed;
  const branding = { ...(seed.branding ?? defaultBranding()), ...(partial.branding ?? {}) };
  const sidebarMenu = mergeSidebarMenus(seed.sidebarMenu ?? defaultSidebarMenuItems(), partial.sidebarMenu);
  const miniappPages = mergeMiniappPages(
    seed.miniappPages ?? defaultMiniappPages(),
    partial.miniappPages,
  );
  const miniappFeatures = mergeMiniappFeaturesSeed(partial.miniappFeatures);
  const miniappHomeLayout = mergeMiniappHomeLayout(
    seed.miniappHomeLayout ?? defaultMiniappHomeLayout(),
    partial.miniappHomeLayout,
  );
  const miniappUiPolicy = mergeMiniappUiPolicy(seed.miniappUiPolicy, partial.miniappUiPolicy);
  return {
    ...seed,
    ...partial,
    branding,
    sidebarMenu,
    miniappPages,
    miniappFeatures,
    miniappHomeLayout,
    miniappUiPolicy,
    compatFlags: partial.compatFlags ?? seed.compatFlags,
    geofences: partial.geofences ?? seed.geofences,
    alerts: partial.alerts ?? seed.alerts,
    fleetUsers: partial.fleetUsers ?? seed.fleetUsers,
    orgTree: partial.orgTree ?? seed.orgTree,
    trackDemo: partial.trackDemo ?? seed.trackDemo,
    devicePresentations: partial.devicePresentations ?? seed.devicePresentations,
    miniappAlarmSubscribeTmplIds: Array.isArray(partial.miniappAlarmSubscribeTmplIds)
      ? partial.miniappAlarmSubscribeTmplIds.map(String).filter(Boolean)
      : seed.miniappAlarmSubscribeTmplIds ?? [],
    miniappWxAppId:
      typeof partial.miniappWxAppId === "string" ? partial.miniappWxAppId.trim() : seed.miniappWxAppId ?? "",
    miniappAlarmNotifySubscribers: normalizeMiniappSubscribers(
      partial.miniappAlarmNotifySubscribers,
      seed.miniappAlarmNotifySubscribers ?? [],
    ),
  };
}

export function defaultAdminSeed(): AdminStore {
  return {
    restApiBase: "",
    wsUrl: "",
    jwtRefreshMin: 30,
    mapProvider: "高德 / 百度 / OpenStreetMap",
    mapWebKey: "",
    mapStreetView: true,
    notifyFcm: "",
    notifySms: "",
    notifyWebhook: "",
    compatProtocolYear: "2013",
    compatNoteTemplate: "",
    compatFlags: {},
    dashboardTodayKm: 1864.2,
    geofences: [
      {
        key: "g1",
        name: "总部停车场",
        type: "圆形",
        bindPlates: "粤A·D12345",
        alarm: "出区域",
        enabled: true,
        centerLat: 23.1291,
        centerLng: 113.2644,
        radiusM: 420,
      },
      {
        key: "g2",
        name: "夜间禁行区",
        type: "多边形",
        bindPlates: "粤B·F99887、粤A·D12345",
        alarm: "进区域",
        enabled: true,
        polygon: [
          [23.131, 113.262],
          [23.131, 113.268],
          [23.126, 113.268],
          [23.126, 113.262],
        ],
      },
    ],
    alerts: [
      {
        key: "a1",
        time: "2026-04-27 13:58:12",
        terminalId: "138081234567",
        plate: "粤A·D12345",
        type: "超速报警",
        level: "中",
        status: "未处理",
        source: "报警标志 bit1",
      },
      {
        key: "a2",
        time: "2026-04-27 12:20:44",
        terminalId: "138081234567",
        plate: "粤A·D12345",
        type: "震动报警（设防）",
        level: "高",
        status: "已推送",
        source: "报警标志 bit16 + 设防",
      },
      {
        key: "a3",
        time: "2026-04-27 09:02:01",
        terminalId: "138000000001",
        plate: "未上牌",
        type: "主电源断开",
        level: "高",
        status: "已确认",
        source: "状态位 主电 + 报警 bit8",
      },
      {
        key: "a4",
        time: "2026-04-26 22:15:33",
        terminalId: "138081234999",
        plate: "粤B·F99887",
        type: "扩展报警 · 急减速",
        level: "低",
        status: "已确认",
        source: "附加信息 0xF4",
      },
    ],
    fleetUsers: [
      {
        key: "u1",
        name: "张管理员",
        role: "超级管理员",
        phone: "138****8000",
        fleet: "全车队",
        devices: 128,
      },
      {
        key: "u2",
        name: "李车队长",
        role: "车队长",
        phone: "139****1201",
        fleet: "华南配送一组",
        devices: 32,
      },
    ],
    orgTree: [
      {
        title: "全车队",
        key: "root",
        children: [
          { title: "华南配送一组（32 终端）", key: "s1" },
          { title: "华南配送二组（18 终端）", key: "s2" },
          { title: "运维备用池（6 终端）", key: "s3" },
        ],
      },
    ],
    trackDemo: {
      "138081234567": [...DEFAULT_TRACK],
      "138081234999": [...DEFAULT_TRACK],
      "138000000001": [...DEFAULT_TRACK],
    },
    devicePresentations: {
      "138081234567": {
        armed: true,
        acc: true,
        mainPowerOk: true,
        csq: 24,
        sat: 9,
        batteryPct: 88,
        locateMode: "GPS+北斗",
      },
      "138081234999": {
        armed: false,
        acc: false,
        mainPowerOk: true,
        csq: 28,
        sat: 11,
        batteryPct: 72,
        locateMode: "Wi‑Fi+LBS",
      },
      "138000000001": {
        armed: false,
        acc: false,
        mainPowerOk: false,
        csq: 0,
        sat: 0,
        batteryPct: 41,
        locateMode: "—",
      },
    },
    branding: defaultBranding(),
    sidebarMenu: defaultSidebarMenuItems(),
    miniappPages: defaultMiniappPages(),
    miniappFeatures: defaultMiniappFeatures(),
    miniappHomeLayout: defaultMiniappHomeLayout(),
    miniappUiPolicy: { allowHomeLayoutEdit: true },
    miniappWxAppId: "",
    miniappAlarmSubscribeTmplIds: [],
    miniappAlarmNotifySubscribers: [],
  };
}

export function normalizeStoreShape(input: unknown, bootstrapAuthCode: string): StoreShape {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const bindsIn = Array.isArray(raw.binds) ? raw.binds : [];
  const binds: VehicleBind[] = [];
  for (const b of bindsIn) {
    if (!b || typeof b !== "object") continue;
    const o = b as Record<string, unknown>;
    const phone = String(o.terminalPhone ?? "").replace(/\D/g, "");
    const plate = String(o.plate ?? "").trim();
    if (phone.length !== 11 || !plate) continue;
    const row: VehicleBind = { terminalPhone: phone, plate };
    if (typeof o.note === "string" && o.note.length) row.note = o.note;
    binds.push(row);
  }

  const lastIn =
    raw.lastPositions && typeof raw.lastPositions === "object"
      ? (raw.lastPositions as Record<string, unknown>)
      : {};
  const lastPositions: Record<string, LastPosition> = {};
  for (const [k, v] of Object.entries(lastIn)) {
    const key = k.replace(/\D/g, "");
    if (key.length !== 11) continue;
    if (!v || typeof v !== "object") continue;
    const p = v as Record<string, unknown>;
    const lat = Number(p.latDeg);
    const lng = Number(p.lngDeg);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const lp: LastPosition = {
      terminalPhone: key,
      latDeg: lat,
      lngDeg: lng,
      speedKmh: Number.isFinite(Number(p.speedKmh)) ? Number(p.speedKmh) : 0,
      alarm: Number.isFinite(Number(p.alarm)) ? Number(p.alarm) : 0,
      status: Number.isFinite(Number(p.status)) ? Number(p.status) : 0,
      receivedAt: typeof p.receivedAt === "string" ? p.receivedAt : new Date().toISOString(),
    };
    if (typeof p.deviceTime === "string") lp.deviceTime = p.deviceTime;
    lastPositions[key] = lp;
  }

  let registerAuthCode = bootstrapAuthCode;
  if (raw.settings && typeof raw.settings === "object") {
    const s = (raw.settings as Record<string, unknown>).registerAuthCode;
    if (typeof s === "string" && s.trim().length > 0) registerAuthCode = s.trim();
  }

  let adminPatch: AdminStore | undefined;
  if (raw.admin && typeof raw.admin === "object") {
    adminPatch = raw.admin as AdminStore;
  }

  const mem: StoreShape = {
    binds,
    lastPositions,
    settings: { registerAuthCode },
    admin: mergeAdminWithSeed(adminPatch),
  };
  return mem;
}

/** 从磁盘读取后补齐 settings / admin，不覆盖已有有效值 */
export function hydrateStoreFromDisk(raw: StoreShape, bootstrapAuthCode: string): StoreShape {
  const registerAuthCode =
    typeof raw.settings?.registerAuthCode === "string" && raw.settings.registerAuthCode.trim().length > 0
      ? raw.settings.registerAuthCode.trim()
      : bootstrapAuthCode;
  const admin = mergeAdminWithSeed(
    raw.admin && typeof raw.admin === "object" ? (raw.admin as AdminStore) : undefined,
  );
  return {
    binds: Array.isArray(raw.binds) ? raw.binds : [],
    lastPositions:
      raw.lastPositions && typeof raw.lastPositions === "object" ? raw.lastPositions : {},
    settings: { registerAuthCode },
    admin,
  };
}

/**
 * JSON 文件持久化存储
 *
 * 以 JSON 格式将 StoreShape 写入磁盘文件，支持：
 * - 防重复写入（200ms 去抖合并）
 * - 原子写入（先写 .tmp 再 rename，防止写半截断电丢数据）
 * - 优雅关闭（drain 等待最后一次写入完成）
 *
 * @example
 * const storage = new JsonPersistence("/data");
 * storage.save(shape);
 * await storage.drain();
 */
export class JsonPersistence {
  readonly filePath: string;
  private writePending = false;
  private latestData: StoreShape | null = null;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, "evo-gateway-store.json");
  }

  loadPartial(): Partial<StoreShape> & { binds?: VehicleBind[]; lastPositions?: Record<string, LastPosition> } {
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const o = JSON.parse(raw) as StoreShape;
      return o && typeof o === "object" ? o : {};
    } catch {
      return {};
    }
  }

  load(): StoreShape {
    const partial = this.loadPartial();
    const binds = Array.isArray(partial.binds) ? partial.binds : [];
    const lastPositions =
      partial.lastPositions && typeof partial.lastPositions === "object" ? partial.lastPositions : {};
    const settings =
      partial.settings && typeof partial.settings === "object" && partial.settings !== null
        ? (partial.settings as GatewaySettings)
        : { registerAuthCode: "" };
    return {
      binds,
      lastPositions,
      settings: { registerAuthCode: settings.registerAuthCode ?? "" },
      admin: partial.admin,
    };
  }

  save(data: StoreShape): void {
    this.latestData = data;
    if (this.writePending) return;
    this.writePending = true;
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      void this.flush();
    }, 200);
  }

  private async flush(): Promise<void> {
    const data = this.latestData;
    this.latestData = null;
    this.writePending = false;
    if (!data) return;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = this.filePath + ".tmp";
    await new Promise<void>((resolve, reject) => {
      writeFile(tmp, JSON.stringify(data, null, 2), "utf8", (err) => {
        err ? reject(err) : resolve();
      });
    });
    await new Promise<void>((resolve, reject) => {
      fs.rename(tmp, this.filePath, (err) => {
        err ? reject(err) : resolve();
      });
    });
  }

  /** 等待最后一次排队的写入完成（用于优雅关闭） */
  async drain(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    if (this.writePending) {
      await this.flush();
    }
  }
}

/**
 * 规范化手机号：去除非数字字符，统一为 11 位数字
 *
 * @param input - 原始手机号（可包含 -、空格、86 前缀等）
 * @returns 11 位纯数字手机号
 * @throws 输入内容无法提取出 11 位数字时抛出异常
 *
 * @example
 * normalizePhoneDigits("138-0013-8000") // "13800138000"
 * normalizePhoneDigits("8613800138000") // "13800138000"
 */
export function normalizePhoneDigits(input: string): string {
  const d = input.replace(/\D/g, "");
  if (d.length === 11) return d;
  if (d.length === 12) return d.slice(1);
  if (d.length > 11) return d.slice(-11);
  throw new Error("手机号须为 11 位数字");
}

type SessionEntry = {
  socket: Socket;
  remote: string;
};

/**
 * 终端在线会话管理 + 平台侧下行流水号
 *
 * 维护每个终端（以 phoneKey 索引）的 TCP Socket 映射。
 * 同一终端重复连接时自动销毁旧连接，保证只有一条有效会话。
 * 下行流水号用于平台→终端消息的序列号，每个终端独立计数并限制在 16 位。
 *
 * @example
 * const reg = new TerminalRegistry();
 * reg.setSocket("13800138000", socket, "192.168.1.1:45231");
 * reg.isOnline("13800138000"); // true
 * reg.nextDownSerial("13800138000"); // 1
 */
export class TerminalRegistry {
  private readonly sessions = new Map<string, SessionEntry>();
  private downSerial = new Map<string, number>();

  setSocket(phoneKey: string, socket: Socket, remote: string): void {
    const prev = this.sessions.get(phoneKey);
    if (prev && prev.socket !== socket) {
      try {
        prev.socket.destroy();
      } catch {
        /* ignore */
      }
    }
    this.sessions.set(phoneKey, { socket, remote });
  }

  removeSocket(socket: Socket): void {
    for (const [k, v] of this.sessions) {
      if (v.socket === socket) {
        this.sessions.delete(k);
        console.info(`[registry] offline phoneKey=${k}`);
      }
    }
  }

  getSocket(phoneKey: string): Socket | undefined {
    return this.sessions.get(phoneKey)?.socket;
  }

  isOnline(phoneKey: string): boolean {
    const s = this.sessions.get(phoneKey)?.socket;
    return !!s && !s.destroyed;
  }

  nextDownSerial(phoneKey: string): number {
    const n = (this.downSerial.get(phoneKey) ?? 0) + 1;
    this.downSerial.set(phoneKey, n);
    return n & 0xffff;
  }

  listOnline(): { phoneKey: string; remote: string }[] {
    const out: { phoneKey: string; remote: string }[] = [];
    for (const [phoneKey, v] of this.sessions) {
      if (!v.socket.destroyed) out.push({ phoneKey, remote: v.remote });
    }
    return out;
  }
}
