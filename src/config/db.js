import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDatabase() {
  // dbName is passed separately so the Atlas URI can stay generic and we only
  // ever touch our own database on that cluster.
  await mongoose.connect(env.mongoUri, {
    dbName: env.mongoDbName,
    serverSelectionTimeoutMS: 15000,
  });

  console.log(`[db] connected to MongoDB Atlas → database "${env.mongoDbName}"`);
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
