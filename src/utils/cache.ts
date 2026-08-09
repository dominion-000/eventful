import { redis } from '../config/redis';

const DEFAULT_TTL_SECONDS = 60 * 5; // 5 minutes

/**
 * Cache-aside helper.
 * Tries Redis first; on a miss, runs `fetcher`, caches the result, and returns it.
 * Every read-heavy service call should go through this instead of hitting Mongo directly.
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<T> {
  const hit = await redis.get(key);
  if (hit !== null) {
    return JSON.parse(hit) as T;
  }

  const value = await fetcher();
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  return value;
}

/** Invalidate a single cache key. */
export async function invalidateCache(key: string): Promise<void> {
  await redis.del(key);
}

/** Invalidate all keys matching a prefix (e.g. "event:123:*"). Uses SCAN, safe for production. */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const stream = redis.scanStream({ match: pattern, count: 100 });
  const pipeline = redis.pipeline();
  let found = false;

  for await (const keys of stream) {
    if (keys.length) {
      found = true;
      keys.forEach((key: string) => pipeline.del(key));
    }
  }

  if (found) {
    await pipeline.exec();
  }
}
