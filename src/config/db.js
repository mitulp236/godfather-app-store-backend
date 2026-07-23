import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

/**
 * The connection is cached on globalThis, not in a module-scoped variable.
 *
 * On a serverless host the module scope can be re-evaluated while the
 * underlying container is reused. Without this cache each invocation opens a
 * fresh Atlas connection and the cluster hits its connection limit quickly.
 * Caching the *promise* (not just the resolved connection) also means
 * concurrent cold requests share one dial-out instead of racing each other.
 */
const globalCache = globalThis;
globalCache.__godfatherMongo ??= { conn: null, promise: null };
const cache = globalCache.__godfatherMongo;

export async function connectDatabase() {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(env.mongoUri, {
        // dbName is passed separately so the Atlas URI can stay generic and we
        // only ever touch our own database on that cluster.
        dbName: env.mongoDbName,
        serverSelectionTimeoutMS: 15000,
        // Serverless containers are many and short-lived; a large pool per
        // container is how you exhaust an Atlas free tier.
        maxPoolSize: 10,
      })
      .then((instance) => {
        console.log(`[db] connected to MongoDB Atlas → database "${env.mongoDbName}"`);
        return instance;
      })
      .catch((error) => {
        cache.promise = null; // let the next request retry instead of caching a failure
        throw error;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}
