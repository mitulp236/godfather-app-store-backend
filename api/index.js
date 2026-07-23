/**
 * Serverless entrypoint (Vercel).
 *
 * `src/server.js` is the entrypoint for persistent hosts — it calls
 * app.listen() and owns the process. That is exactly wrong for a serverless
 * platform, which invokes an exported handler per request and never lets
 * anything listen on a port. This file exports the same Express app as a
 * handler instead, and connects to Mongo lazily so a cold start doesn't do it
 * at module load (where a failure is unattributable).
 */
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { connectDatabase } from '../src/config/db.js';

const app = createApp();

export default async function handler(req, res) {
  // Missing configuration must not crash the function — say what is missing.
  if (env.missing.length > 0) {
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    return res.end(
      JSON.stringify({
        success: false,
        error: {
          code: 'CONFIG_MISSING',
          message:
            'The server is missing required environment variables: ' +
            env.missing.join(', ') +
            '. Set them in your host\'s environment settings and redeploy.',
          details: env.missing,
        },
      })
    );
  }

  try {
    // Resolves instantly once the container is warm.
    await connectDatabase();
  } catch (error) {
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    return res.end(
      JSON.stringify({
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message:
            'Could not reach MongoDB. Check MONGODB_URI, and confirm Atlas ' +
            'Network Access allows 0.0.0.0/0 — serverless egress IPs are not static.',
          details: env.isProduction ? undefined : String(error && error.message),
        },
      })
    );
  }

  return app(req, res);
}
