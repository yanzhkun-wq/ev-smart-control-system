import net from "node:net";
import { unescape808 } from "../protocol/escape.js";
import { parseFrame } from "../protocol/frame-parser.js";
import type { Jt808App } from "../core/jt808-app.js";

export type GatewayOptions = {
  port: number;
  host?: string;
  app: Jt808App;
};

export async function createGateway(options: GatewayOptions): Promise<void> {
  const { port, host = "0.0.0.0", app } = options;

  const server = net.createServer((socket) => {
    const remote = `${socket.remoteAddress ?? "?"}:${socket.remotePort ?? "?"}`;
    let buffer = Buffer.alloc(0) as Buffer;

    socket.on("data", (chunk) => {
      const piece = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      buffer = Buffer.concat([buffer, piece]) as unknown as Buffer;
      buffer = drainFrames(buffer, remote, app, socket) as unknown as Buffer;
    });

    socket.on("error", (err) => {
      console.warn(`[tcp] socket error ${remote}`, err.message);
    });

    socket.on("close", () => {
      app.onSocketClose(socket);
      console.info(`[tcp] closed ${remote}`);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });

  console.info(`[gateway] tcp 808 listening on ${host}:${port}`);
}

function drainFrames(
  buffer: Buffer,
  remote: string,
  app: Jt808App,
  socket: net.Socket,
): Buffer {
  while (true) {
    const start = buffer.indexOf(0x7e);
    if (start === -1) {
      return (buffer.length > 65536 ? Buffer.alloc(0) : buffer) as Buffer;
    }
    if (start > 0) {
      buffer = buffer.subarray(start) as Buffer;
    }

    const end = buffer.indexOf(0x7e, 1);
    if (end === -1) {
      return buffer as Buffer;
    }

    const rawEscaped = buffer.subarray(1, end);
    buffer = buffer.subarray(end + 1) as Buffer;

    if (rawEscaped.length === 0) {
      continue;
    }

    try {
      const unescaped = unescape808(rawEscaped);
      const frame = parseFrame(unescaped);
      app.onSocketFrame(remote, socket, frame);
    } catch (e) {
      console.warn(`[808] drop frame from ${remote}`, e);
    }
  }
}
