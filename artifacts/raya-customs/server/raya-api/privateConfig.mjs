/**
 * Private deployment guardrails. Production must be explicit and fail closed.
 * This module intentionally has no demo fallback in production.
 */
const environment = (process.env.NODE_ENV || 'development').toLowerCase();
const isProduction = environment === 'production';
const isPrivateDeployment = (process.env.RAYA_DEPLOYMENT_MODE || (isProduction ? 'private' : 'development')).toLowerCase() === 'private';

function positiveInteger(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`Invalid ${name}`);
  return parsed;
}

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required for a private production deployment.`);
  return value;
}

const developmentSecret = 'raya-development-only-secret-not-for-production';
const jwtSecret = String(process.env.RAYA_JWT_SECRET || (isProduction ? '' : developmentSecret));
const corsOrigin = String(process.env.CORS_ORIGIN || (isProduction ? '' : '*')).trim();
const allowDemoAuth = String(process.env.RAYA_ALLOW_DEMO_AUTH || (!isProduction ? 'true' : 'false')).toLowerCase() === 'true';

if (isProduction || isPrivateDeployment) {
  if (!jwtSecret || jwtSecret === developmentSecret || jwtSecret.length < 48) {
    throw new Error('RAYA_JWT_SECRET must be a unique random secret of at least 48 characters in private production.');
  }
  required('CORS_ORIGIN');
  if (corsOrigin === '*' || corsOrigin.includes(',')) {
    throw new Error('CORS_ORIGIN must be one explicit trusted HTTPS origin in private production.');
  }
  try {
    const parsed = new URL(corsOrigin);
    if (parsed.protocol !== 'https:') throw new Error('not_https');
  } catch {
    throw new Error('CORS_ORIGIN must be a valid HTTPS URL in private production.');
  }
  required('RAYA_DATABASE_URL');
  if (allowDemoAuth) {
    throw new Error('RAYA_ALLOW_DEMO_AUTH must be false in private production. Provision real users before deployment.');
  }
}

export const PRIVATE_RUNTIME = Object.freeze({
  environment,
  isProduction,
  isPrivateDeployment,
  port: positiveInteger(process.env.PORT, 8787, 'PORT'),
  host: process.env.HOST || '127.0.0.1',
  jwtSecret,
  corsOrigin,
  allowDemoAuth,
  maxBodyBytes: positiveInteger(process.env.RAYA_MAX_BODY_BYTES, 1_048_576, 'RAYA_MAX_BODY_BYTES'),
  accessTtl: positiveInteger(process.env.RAYA_ACCESS_TTL, 15 * 60, 'RAYA_ACCESS_TTL'),
  refreshTtl: positiveInteger(process.env.RAYA_REFRESH_TTL, 7 * 24 * 3600, 'RAYA_REFRESH_TTL'),
});