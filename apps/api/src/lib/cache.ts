import type IORedis from 'ioredis';

export async function getCachedJson<T>(redis: IORedis, key: string): Promise<T | null> {
  const value = await redis.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function setCachedJson(redis: IORedis, key: string, value: unknown, ttlSeconds: number) {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function deleteCache(redis: IORedis, keys: string | string[]) {
  const list = Array.isArray(keys) ? keys : [keys];
  if (!list.length) return;
  await redis.del(list);
}
