import type { Socket } from "node:net";
import type { Parsed808Frame } from "../protocol/frame-parser.js";
import {
  buildPlatformAck,
  buildRegisterResponse,
  buildTerminalControl,
  bcd6TimeToIsoGuess,
  phoneDigitsToBcd,
} from "../protocol/frame-build.js";
import {
  decodeStatus808,
  parse0200FullBody,
  parse0704LocationItems,
  readAuthCodeFrom0102Body,
} from "../protocol/position-tlv.js";
import {
  dayYmdFromIso,
  type TrackLog,
  type TrackPointLine,
} from "./track-log.js";
import {
  defaultAdminSeed,
  hydrateStoreFromDisk,
  JsonPersistence,
  normalizePhoneDigits,
  TerminalRegistry,
  type LastPosition,
  type MiniappAlarmNotifySubscriber,
  type StoreShape,
} from "./store.js";
import {
  clampWxField,
  getStableAccessToken,
  subscribeMessageSend,
} from "./wechat-mp-client.js";

const MSG = {
  TERMINAL_ACK: 0x0001,
  HEARTBEAT: 0x0002,
  REGISTER: 0x0100,
  AUTH: 0x0102,
  LOCATION: 0x0200,
  BATCH_LOCATION: 0x0704,
} as const;

/** 从 808 头里的 BCD 手机号转成本地 11 位 key（兼容前置 0 / 86） */
export function phoneKeyFromHeader(phoneFromFrame: string): string {
  const d = phoneFromFrame.replace(/\D/g, "");
  if (d.length === 11) return d;
  if (d.length === 12) {
    if (d.startsWith("0")) return d.slice(1);
    if (d.startsWith("86")) return d.slice(2);
    return d.slice(1);
  }
  if (d.length === 13 && d.startsWith("86")) return d.slice(2);
  return d.length > 11 ? d.slice(-11) : d.padStart(11, "0");
}

export type Jt808AppOptions = {
  registry: TerminalRegistry;
  persistence: JsonPersistence;
  /** 注册成功后下发的鉴权码，终端下次 0102 需带上 same（演示默认；量产请改为平台签发） */
  registerAuthCode: string;
  /** 轨迹 JSONL 根目录（与 DATA_DIR 一致即可） */
  trackLog?: TrackLog;
};

export class Jt808App {
  readonly registry: TerminalRegistry;
  readonly persistence: JsonPersistence;
  readonly trackLog: TrackLog | undefined;
  private readonly bootstrapRegisterAuthCode: string;
  private mem: StoreShape;
  /** 同一终端订阅消息冷却，避免 0200/0704 高频刷屏 */
  private readonly alarmSubscribeCooldownMs = new Map<string, number>();

  constructor(opt: Jt808AppOptions) {
    this.registry = opt.registry;
    this.persistence = opt.persistence;
    this.trackLog = opt.trackLog;
    this.bootstrapRegisterAuthCode = opt.registerAuthCode;
    const loaded = this.persistence.load();
    this.mem = hydrateStoreFromDisk(
      {
        binds: loaded.binds,
        lastPositions: loaded.lastPositions,
        settings: loaded.settings,
        admin: loaded.admin,
      },
      opt.registerAuthCode,
    );
    const needPersist =
      !loaded.admin ||
      !(typeof loaded.settings?.registerAuthCode === "string" && loaded.settings.registerAuthCode.trim().length > 0);
    if (needPersist) this.persistence.save(this.mem);
  }

  reloadStore(): void {
    const loaded = this.persistence.load();
    this.mem = hydrateStoreFromDisk(
      {
        binds: loaded.binds,
        lastPositions: loaded.lastPositions,
        settings: loaded.settings,
        admin: loaded.admin,
      },
      this.bootstrapRegisterAuthCode,
    );
  }

  getMem(): StoreShape {
    return this.mem;
  }

  getRegisterAuthCode(): string {
    return this.mem.settings.registerAuthCode;
  }

  /** 进程启动时的环境变量默认值（PUT 省略鉴权码时回退用） */
  getBootstrapRegisterAuthCode(): string {
    return this.bootstrapRegisterAuthCode;
  }

  /** 管理端 PUT /api/store：整体替换并落盘 */
  replaceMem(next: StoreShape): void {
    this.mem = next;
    this.persistence.save(this.mem);
  }

  saveBind(terminalPhone: string, plate: string, note?: string): void {
    const key = normalizePhoneDigits(terminalPhone);
    const idx = this.mem.binds.findIndex((b) => b.terminalPhone === key);
    const row = { terminalPhone: key, plate, note };
    if (idx >= 0) this.mem.binds[idx] = row;
    else this.mem.binds.push(row);
    this.persistence.save(this.mem);
  }

  removeBind(terminalPhone: string): void {
    const key = normalizePhoneDigits(terminalPhone);
    this.mem.binds = this.mem.binds.filter((b) => b.terminalPhone !== key);
    this.persistence.save(this.mem);
  }

  /** 小程序端 wx.login code 换 openid 后登记，用于报警时 subscribeMessage.send */
  upsertMiniappAlarmSubscriber(openid: string, acceptedTmplIds: string[]): void {
    const admin = this.mem.admin ?? defaultAdminSeed();
    const list = [...(admin.miniappAlarmNotifySubscribers ?? [])];
    const row: MiniappAlarmNotifySubscriber = {
      openid,
      updatedAt: new Date().toISOString(),
      acceptedTmplIds: acceptedTmplIds.filter(Boolean),
    };
    const idx = list.findIndex((s) => s.openid === openid);
    if (idx >= 0) list[idx] = row;
    else list.push(row);
    this.mem.admin = { ...admin, miniappAlarmNotifySubscribers: list };
    this.persistence.save(this.mem);
  }

  private pickAlarmTmplForSubscriber(tmplList: string[], accepted?: string[]): string | undefined {
    if (!tmplList.length) return undefined;
    if (!accepted || !accepted.length) return tmplList[0];
    for (const id of tmplList) {
      if (accepted.includes(id)) return id;
    }
    return undefined;
  }

  /** 向已登记用户下发订阅消息（模板 data 默认 thing1/time2/thing3，须与公众平台模板关键词一致） */
  async broadcastAlarmSubscribeMessages(payload: { title: string; timeStr: string; detail: string }): Promise<void> {
    const admin = this.mem.admin;
    const tmplList = admin?.miniappAlarmSubscribeTmplIds?.map(String).filter(Boolean) ?? [];
    const subs = admin?.miniappAlarmNotifySubscribers ?? [];
    const appid = (process.env.WECHAT_MP_APPID ?? "").trim() || (admin?.miniappWxAppId ?? "").trim();
    const secret = (process.env.WECHAT_MP_SECRET ?? "").trim();
    if (!appid || !secret || !tmplList.length || !subs.length) return;

    const tok = await getStableAccessToken(appid, secret);
    if (!tok.ok) {
      console.warn("[miniapp-subscribe] access_token", tok.err);
      return;
    }
    const data = {
      thing1: { value: clampWxField(payload.title, 20) },
      time2: { value: clampWxField(payload.timeStr, 20) },
      thing3: { value: clampWxField(payload.detail, 20) },
    };
    for (const sub of subs) {
      const templateId = this.pickAlarmTmplForSubscriber(tmplList, sub.acceptedTmplIds);
      if (!templateId) continue;
      const r = await subscribeMessageSend(tok.token, {
        touser: sub.openid,
        template_id: templateId,
        page: "pages/alarm/alarm",
        data,
      });
      if (!r.ok) console.warn("[miniapp-subscribe] send", sub.openid.slice(0, 8), r.err);
    }
  }

  private maybeNotifyAlarmSubscribe(phoneKey: string, alarm: number): void {
    if (!alarm) return;
    const now = Date.now();
    const last = this.alarmSubscribeCooldownMs.get(phoneKey) ?? 0;
    if (now - last < 120_000) return;
    this.alarmSubscribeCooldownMs.set(phoneKey, now);
    const bind = this.mem.binds.find((b) => b.terminalPhone === phoneKey);
    const plate = bind?.plate ?? "";
    void this.broadcastAlarmSubscribeMessages({
      title: "车载终端告警",
      timeStr: new Date().toLocaleString("zh-CN", { hour12: false }),
      detail: `${plate ? plate + " · " : ""}尾号${phoneKey.slice(-4)} alarm=0x${alarm.toString(16)}`,
    }).catch((e) => console.warn("[miniapp-subscribe]", e));
  }

  safeWrite(socket: Socket, buf: Buffer): void {
    try {
      if (!socket.destroyed) socket.write(buf);
    } catch (e) {
      console.warn("[jt808] write fail", e);
    }
  }

  private appendTrackIfEnabled(phoneKey: string, lp: LastPosition, src: "0200" | "0704"): void {
    if (!this.trackLog) return;
    const day = dayYmdFromIso(lp.deviceTime ?? lp.receivedAt);
    const pt: TrackPointLine = {
      src,
      receivedAt: lp.receivedAt,
      deviceTime: lp.deviceTime,
      lat: lp.latDeg,
      lng: lp.lngDeg,
      speedKmh: lp.speedKmh,
      direction: lp.direction,
      alarm: lp.alarm,
      status: lp.status,
      altitudeM: lp.altitudeM,
    };
    this.trackLog.append(phoneKey, day, pt);
  }

  /** 单条 0x0200 体（与 0x0704 内每条相同结构） */
  private buildLastPositionFrom0200(phoneKey: string, body: Buffer): LastPosition | null {
    const p = parse0200FullBody(body);
    if (!p) return null;
    const latDeg = p.lat / 1e6;
    const lngDeg = p.lng / 1e6;
    const st = decodeStatus808(p.status);
    const tlv = p.tlv;
    return {
      terminalPhone: phoneKey,
      latDeg,
      lngDeg,
      speedKmh: p.speedTenthKmh / 10,
      alarm: p.alarm,
      status: p.status,
      deviceTime: bcd6TimeToIsoGuess(p.timeBcd6),
      receivedAt: new Date().toISOString(),
      direction: p.direction,
      altitudeM: p.altitudeM,
      ...st,
      mileageKm: tlv.mileageKm,
      mainVoltageV: tlv.mainVoltageV,
      csq: tlv.csq,
      gpsSatellites: tlv.gpsSatellites,
      batteryPct: tlv.batteryPct,
      iccid: tlv.iccid,
      armAttach: tlv.armAttach,
      extendedAlarm: tlv.extendedAlarm,
      gsensorX: tlv.gsensorX,
      gsensorY: tlv.gsensorY,
      gsensorZ: tlv.gsensorZ,
      workMode: tlv.workMode,
      chargeStatus: tlv.chargeStatus,
      accCumulativeSec: tlv.accCumulativeSec,
      rfid: tlv.rfid,
    };
  }

  onSocketFrame(remote: string, socket: Socket, frame: Parsed808Frame): void {
    const phoneKey = phoneKeyFromHeader(frame.header.phone);
    const phoneBcd = phoneDigitsToBcd(phoneKey);
    this.registry.setSocket(phoneKey, socket, remote);

    const { messageId, serial } = frame.header;
    const log = `[jt808] from=${remote} phone=${phoneKey} msg=0x${messageId.toString(16)} seq=${serial}`;

    try {
      switch (messageId) {
        case MSG.REGISTER: {
          console.info(`${log} register`);
          const down = this.registry.nextDownSerial(phoneKey);
          const wire = buildRegisterResponse(phoneBcd, down, serial, 0, this.getRegisterAuthCode());
          this.safeWrite(socket, wire);
          break;
        }
        case MSG.AUTH: {
          const received = readAuthCodeFrom0102Body(frame.body);
          const expected = this.getRegisterAuthCode().trim();
          const ok = received.length > 0 && received === expected;
          if (!ok) {
            console.warn(
              `${log} auth FAIL want=${JSON.stringify(expected)} got=${JSON.stringify(received)} len=${frame.body.length}`,
            );
          } else {
            console.info(`${log} auth ok`);
          }
          const down = this.registry.nextDownSerial(phoneKey);
          const wire = buildPlatformAck(phoneBcd, down, messageId, serial, ok ? 0 : 1);
          this.safeWrite(socket, wire);
          break;
        }
        case MSG.HEARTBEAT: {
          const down = this.registry.nextDownSerial(phoneKey);
          const wire = buildPlatformAck(phoneBcd, down, messageId, serial, 0);
          this.safeWrite(socket, wire);
          break;
        }
        case MSG.LOCATION: {
          const lp = this.buildLastPositionFrom0200(phoneKey, frame.body);
          if (lp) {
            this.mem.lastPositions[phoneKey] = lp;
            this.appendTrackIfEnabled(phoneKey, lp, "0200");
            this.persistence.save(this.mem);
            this.maybeNotifyAlarmSubscribe(phoneKey, lp.alarm);
            console.info(`${log} 0200 lat=${lp.latDeg.toFixed(6)} lng=${lp.lngDeg.toFixed(6)} spd=${lp.speedKmh}`);
          } else {
            console.warn(`${log} 0200 short body ${frame.body.length}`);
          }
          const down = this.registry.nextDownSerial(phoneKey);
          const wire = buildPlatformAck(phoneBcd, down, messageId, serial, 0);
          this.safeWrite(socket, wire);
          break;
        }
        case MSG.BATCH_LOCATION: {
          const items = parse0704LocationItems(frame.body);
          console.info(`${log} 0704 items=${items.length}`);
          let lastOk: LastPosition | null = null;
          let notifyAlarm = 0;
          for (const item of items) {
            const lp = this.buildLastPositionFrom0200(phoneKey, item);
            if (lp) {
              this.mem.lastPositions[phoneKey] = lp;
              this.appendTrackIfEnabled(phoneKey, lp, "0704");
              lastOk = lp;
              if (lp.alarm) notifyAlarm = lp.alarm;
            }
          }
          if (lastOk) this.persistence.save(this.mem);
          if (notifyAlarm) this.maybeNotifyAlarmSubscribe(phoneKey, notifyAlarm);
          const down = this.registry.nextDownSerial(phoneKey);
          const wire = buildPlatformAck(phoneBcd, down, messageId, serial, 0);
          this.safeWrite(socket, wire);
          break;
        }
        case MSG.TERMINAL_ACK: {
          console.info(`${log} terminal-ack`);
          break;
        }
        default: {
          const down = this.registry.nextDownSerial(phoneKey);
          const wire = buildPlatformAck(phoneBcd, down, messageId, serial, 0);
          this.safeWrite(socket, wire);
          console.info(`${log} default->8001`);
        }
      }
    } catch (e) {
      console.error(`${log} handler error`, e);
    }
  }

  onSocketClose(socket: Socket): void {
    this.registry.removeSocket(socket);
  }

  /**
   * 下发终端控制 0x8105。command 映射见 WZ 摘要；设备不接受时需厂家抓包改适配。
   */
  sendControl(terminalPhone: string, commandByte: number): { ok: boolean; reason?: string } {
    let phoneKey: string;
    try {
      phoneKey = normalizePhoneDigits(terminalPhone);
    } catch (e) {
      return { ok: false, reason: String(e) };
    }
    const sock = this.registry.getSocket(phoneKey);
    if (!sock || sock.destroyed) return { ok: false, reason: "终端未连接（离线）" };
    const phoneBcd = phoneDigitsToBcd(phoneKey);
    const down = this.registry.nextDownSerial(phoneKey);
    const wire = buildTerminalControl(phoneBcd, down, commandByte);
    this.safeWrite(sock, wire);
    console.info(`[jt808] down 8105 phone=${phoneKey} cmd=0x${commandByte.toString(16)}`);
    return { ok: true };
  }
}

export const ControlCmd = {
  CUT_FUEL: 0x64,
  RESTORE_FUEL: 0x65,
  ARM: 0x66,
  DISARM: 0x67,
} as const;
