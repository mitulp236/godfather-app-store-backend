import dotenv from 'dotenv';

dotenv.config();

/**
 * Missing configuration is *collected*, not thrown on.
 *
 * Throwing here happens at module load. On a serverless host that means the
 * function dies before it can route anything, and all you get back is an opaque
 * FUNCTION_INVOCATION_FAILED with no clue which variable is missing. Collecting
 * instead lets the app boot far enough to answer with a readable 503 saying
 * exactly what to set — and `server.js` still fails fast locally.
 */
const missing = [];

function required(name) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    missing.push(name);
    return '';
  }
  return value;
}

/** Everything the app serves lives beneath this single prefix. */
const basePath = (process.env.BASE_PATH ?? '/godfather-app-store').replace(/\/+$/, '');

export const env = {
  port: Number(process.env.PORT ?? 4100),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',

  mongoUri: required('MONGODB_URI'),
  mongoDbName: process.env.MONGODB_DB_NAME ?? 'godfather_app_store',

  adminApiKey: required('ADMIN_API_KEY'),

  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  /** `/godfather-app-store` */
  basePath,
  /** `/godfather-app-store/api` — every JSON route. */
  apiPath: `${basePath}/api`,
  /** `/godfather-app-store/admin` — the static admin panel. */
  adminPath: `${basePath}/admin`,
  /** Session cookie scope: the whole app, so /api and /admin both see it. */
  adminCookiePath: basePath || '/',

  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 30),

  /** Names of required variables that were not supplied. */
  missing,
};
