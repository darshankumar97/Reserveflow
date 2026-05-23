import { Redis } from "@upstash/redis";

import { apiLogger } from "@/lib/api/logger";

let redisClient: Redis | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export function getRedis(): Redis {
  if (!isRedisConfigured()) {
    throw new Error(
      "Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    );
  }

  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  return redisClient;
}

export function getRedisOrNull(): Redis | null {
  if (!isRedisConfigured()) {
    apiLogger.warn("redis.not_configured", {
      message: "Falling back to in-memory idempotency store (single-instance only)",
    });
    return null;
  }

  return getRedis();
}
