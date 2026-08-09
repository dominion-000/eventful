import { redis } from "../config/redis";

const DEFAULT_TTL_SECONDS = 60 * 5; // 5 minutes

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<T> {
  const hit = await redis.get(key);
  if (hit !== null) {
    return JSON.parse(hit) as T;
  }

  const value = await fetcher();
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  return value;
}

export async function invalidateCache(key: string): Promise<void> {
  await redis.del(key);
}

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
