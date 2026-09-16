import Redis from "ioredis";

interface MemoryEntry<T> {
  value: T;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryEntry<unknown>>();
let redisClient: Redis | null | undefined;

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) {
    redisClient = null;
    return redisClient;
  }

  try {
    redisClient = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    redisClient.on("error", () => {
      // Swallow connection errors; callers fall back to the in-memory cache.
    });
  } catch {
    redisClient = null;
  }
  return redisClient;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      // fall through to memory cache
    }
  }

  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return;
    } catch {
      // fall through to memory cache
    }
  }

  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export function clearMemoryCache(): void {
  memoryStore.clear();
}

export async function cacheDeleteByPrefix(prefix: string): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length > 0) await redis.del(...keys);
    } catch {
      // fall through to memory cache
    }
  }

  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) memoryStore.delete(key);
  }
}
