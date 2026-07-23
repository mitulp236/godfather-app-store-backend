import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';

async function main() {
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
