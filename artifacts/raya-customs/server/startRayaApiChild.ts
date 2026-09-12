import { spawn, ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";

let apiChild: ChildProcess | null = null;

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const finish = (value: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(180, () => finish(false));
  });
}

export async function ensureRayaApiRunning() {
  if (apiChild && apiChild.exitCode === null) return;
  // Vite/tsx can reload the parent process while the API child survives. Reuse
  // the healthy listener rather than spawning a second process on port 8787.
  if (await isPortOpen(8787)) return;

  const scriptPath = path.resolve(process.cwd(), "server", "raya-api", "index.mjs");
  const rawDbUrl = String(process.env.RAYA_DATABASE_URL || process.env.DATABASE_URL || "");
  const pgDbUrl = rawDbUrl.startsWith("postgres://") || rawDbUrl.startsWith("postgresql://") ? rawDbUrl : "";

  apiChild = spawn(process.execPath, [scriptPath], {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: "8787",
      HOST: "127.0.0.1",
      RAYA_DATABASE_URL: pgDbUrl,
      RAYA_ALLOW_DEMO_AUTH: "true",
    },
  });

  apiChild.on("exit", (code, signal) => {
    console.warn(`[raya-api] Exited with code=${code}, signal=${signal}`);
    apiChild = null;
  });
}
