import { spawnSync } from 'node:child_process';

const entry = "import './server/privateConfig.mjs';";

function run(env) {
  return spawnSync(process.execPath, ['--input-type=module', '--eval', entry], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

const development = run({ NODE_ENV: 'development', RAYA_DEPLOYMENT_MODE: '' });
if (development.status !== 0) {
  console.error('FAIL development configuration should remain usable', development.stderr);
  process.exit(1);
}

const missingSecret = run({
  NODE_ENV: 'production',
  RAYA_DEPLOYMENT_MODE: 'private',
  RAYA_JWT_SECRET: '',
  CORS_ORIGIN: 'https://ops.example.com',
  RAYA_ALLOW_DEMO_AUTH: 'false',
});
if (missingSecret.status === 0 || !missingSecret.stderr.includes('RAYA_JWT_SECRET')) {
  console.error('FAIL production must reject a missing JWT secret', missingSecret.stderr);
  process.exit(1);
}

const demoAuth = run({
  NODE_ENV: 'production',
  RAYA_DEPLOYMENT_MODE: 'private',
  RAYA_JWT_SECRET: 'a-unique-production-secret-with-at-least-forty-eight-characters',
  CORS_ORIGIN: 'https://ops.example.com',
  RAYA_DATABASE_URL: 'postgresql://raya:pass@127.0.0.1:5432/raya',
  RAYA_ALLOW_DEMO_AUTH: 'true',
});
if (demoAuth.status === 0 || !demoAuth.stderr.includes('RAYA_ALLOW_DEMO_AUTH')) {
  console.error('FAIL production must reject demo authentication', demoAuth.stderr);
  process.exit(1);
}

const missingDatabase = run({
  NODE_ENV: 'production',
  RAYA_DEPLOYMENT_MODE: 'private',
  RAYA_JWT_SECRET: 'a-unique-production-secret-with-at-least-forty-eight-characters',
  CORS_ORIGIN: 'https://ops.example.com',
  RAYA_DATABASE_URL: '',
  RAYA_ALLOW_DEMO_AUTH: 'false',
});
if (missingDatabase.status === 0 || !missingDatabase.stderr.includes('RAYA_DATABASE_URL')) {
  console.error('FAIL production must require a server-owned database', missingDatabase.stderr);
  process.exit(1);
}
console.log('private deployment guardrail tests passed');