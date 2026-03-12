// Redis Cache Utility for Low Bandwidth Optimization
// Implements aggressive caching to reduce server requests

import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    
    redisClient.on('error', (err) => console.error('Redis Error:', err));
    await redisClient.connect();
  }
  return redisClient;
}

// Cache with TTL
export async function cacheSet(
  key: string,
  value: any,
  ttl: number = parseInt(process.env.CACHE_TTL || '3600')
) {
  try {
    const client = await getRedisClient();
    await client.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

// Get from cache
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

// Delete from cache
export async function cacheDel(key: string) {
  try {
    const client = await getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

// Invalidate pattern (e.g., "user:123:*")
export async function cacheDelPattern(pattern: string) {
  try {
    const client = await getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.error('Cache pattern delete error:', error);
  }
}
