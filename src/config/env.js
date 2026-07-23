import dotenv from 'dotenv';

dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
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
};
