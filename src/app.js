import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { apiRoutes } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const adminDir = path.resolve(here, '../web/admin');

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // Render/Railway/Fly all sit behind a proxy.

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          fontSrc: ["'self'"],
          // App icons and banners are arbitrary third-party URLs — that's the
          // whole model here, so images must not be restricted to same-origin.
          imgSrc: ["'self'", 'data:', 'https:', 'http:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    })
  );

  app.use(compression());
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));
  app.use(cookieParser());
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  app.use(
    cors({
      // credentials + a wildcard origin is not allowed by browsers, so when
      // CORS_ORIGIN is "*" we reflect the caller's origin instead.
      origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
    })
  );

  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 600,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skip: (req) => req.path.startsWith(`${env.adminPath}/`), // static assets
      message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
    })
  );

  /* --------------------------------- routes -------------------------------- */

  app.use(env.apiPath, apiRoutes);

  // Admin panel. `extensions` lets /admin/login resolve to login.html.
  app.use(
    env.adminPath,
    express.static(adminDir, {
      extensions: ['html'],
      index: 'index.html',
      maxAge: env.isProduction ? '1h' : 0,
    })
  );

  // Bare /godfather-app-store/admin (no trailing slash) → the dashboard.
  app.get(env.adminPath, (_req, res) => res.sendFile(path.join(adminDir, 'index.html')));

  const info = {
    name: 'Godfather App Store API',
    version: '1.1.0',
    adminPanel: env.adminPath,
    endpoints: [
      `GET  ${env.apiPath}/health`,
      `POST ${env.apiPath}/auth/login`,
      `POST ${env.apiPath}/auth/logout`,
      `GET  ${env.apiPath}/auth/me`,
      `GET  ${env.apiPath}/categories`,
      `GET  ${env.apiPath}/categories/:idOrSlug`,
      `GET  ${env.apiPath}/apps?category=&search=&featured=&page=&limit=&sort=`,
      `GET  ${env.apiPath}/apps/:idOrPackageName`,
      `GET  ${env.apiPath}/apps/:idOrPackageName/download`,
      `GET  ${env.apiPath}/apps/updates?packages=a.b.c,d.e.f`,
      `POST/PUT/DELETE ${env.apiPath}/admin/apps       (session cookie or x-admin-key)`,
      `POST/PUT/DELETE ${env.apiPath}/admin/categories (session cookie or x-admin-key)`,
    ],
  };

  app.get('/', (_req, res) => res.json({ success: true, data: info }));
  app.get(env.basePath, (_req, res) => res.json({ success: true, data: info }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
