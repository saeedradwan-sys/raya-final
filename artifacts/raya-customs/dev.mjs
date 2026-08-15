/**
 * Dev runner: starts the Raya API server and Vite together and keeps their
 * lifecycles linked — if either process exits, the other is stopped and the
 * runner exits with a non-zero code so the workflow surfaces the failure.
 */
import { spawn } from 'node:child_process';

const children = [];
let shuttingDown = false;

function launch(name, command, args, env) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[dev] ${name} exited (code=${code}, signal=${signal}); stopping.`);
    shutdown(code ?? 1);
  });
  children.push(child);
  return child;
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 500);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

if (!process.env.DATABASE_URL) {
  console.warn(
    '[dev] DATABASE_URL is not set — the API server will fall back to in-memory/JSONL stores and data will not persist.',
  );
}

launch('raya-api', 'node', ['server/index.mjs'], {
  PORT: '8787',
  HOST: '127.0.0.1',
  RAYA_DATABASE_URL: process.env.DATABASE_URL || '',
});

launch('vite', 'npx', ['vite', '--config', 'vite.config.ts', '--host', '0.0.0.0'], {});
