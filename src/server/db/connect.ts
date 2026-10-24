import 'server-only';
import mongoose from 'mongoose';
import { env } from '@/lib/env';

const cache = globalThis as { vwMongoose?: Promise<typeof mongoose> };

// Cached on globalThis because Next.js dev reloads modules, and each reload would otherwise open a new pool.
export function connectDb() {
  cache.vwMongoose ??= mongoose
    .connect(env.MONGODB_URI, {
      // Only create indexes in production or if explicitly enabled
      autoIndex: process.env.AUTO_INDEX === 'true' || process.env.NODE_ENV === 'production',
      // Increase connection pool for better performance with cloud MongoDB
      maxPoolSize: 20,
      minPoolSize: 5,
      // Optimize timeouts for cloud MongoDB Atlas
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
      // Enable compression for faster data transfer
      compressors: ['zlib'],
      // Retry writes for better reliability
      retryWrites: true,
    })
    .catch((error: unknown) => {
      delete cache.vwMongoose;
      throw error;
    });
  return cache.vwMongoose;
}
