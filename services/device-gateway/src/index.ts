import path from "node:path";
import { createApiServer } from "./api/http-server.js";
import { Jt808App } from "./core/jt808-app.js";
import { JsonPersistence, TerminalRegistry } from "./core/store.js";
import { TrackLog } from "./core/track-log.js";
import { createGateway } from "./tcp/gateway.js";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const GATEWAY_PORT = Number(process.env.GATEWAY_PORT ?? "7611");
const HTTP_PORT = Number(process.env.HTTP_PORT ?? "7612");
/** 注册应答 0x8100 里下发的鉴权码；终端 0x0102 须携带相同内容（可环境变量覆盖） */
const REGISTER_AUTH_CODE = process.env.REGISTER_AUTH_CODE ?? "";

const persistence = new JsonPersistence(DATA_DIR);
const registry = new TerminalRegistry();
const trackLog = new TrackLog(DATA_DIR);
const jtApp = new Jt808App({
  registry,
  persistence,
  registerAuthCode: REGISTER_AUTH_CODE,
  trackLog,
});

createApiServer(jtApp, HTTP_PORT);

createGateway({ port: GATEWAY_PORT, app: jtApp }).catch((err) => {
  console.error("[gateway] fatal", err);
  process.exit(1);
});

console.info(
  `[boot] dataDir=${DATA_DIR} registerAuth=${REGISTER_AUTH_CODE} (set REGISTER_AUTH_CODE to change)`,
);
