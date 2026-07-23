/**
 * Entrypoint for persistent hosts (local dev, Render, Railway, Fly).
 *
 * Serverless platforms use `api/index.js` instead — they invoke an exported
 * handler and never let a process listen on a port.
 */
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';

async function main() {
  // env.js collects missing variables rather than throwing, so a serverless
  // host can report them. On a long-lived server, failing fast is better.
  if (env.missing.length > 0) {
    console.error(
      `[api] missing required environment variable(s): ${env.missing.join(', ')}\n` +
        '[api] copy .env.example to .env and fill them in.'
    );
    process.exit(1);
  }

  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.port, () => {
    const origin = `http://localhost:${env.port}`;
    console.log(`[api]   Godfather App Store API  → ${origin}${env.apiPath}`);
    console.log(`[admin] Admin panel              → ${origin}${env.adminPath}`);
    console.log(`[api]   environment: ${env.nodeEnv}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[api] ${signal} received, shutting down…`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    // Don't hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('[api] failed to start:', error);
  process.exit(1);
});
