import { getRedisOrNull } from "@/lib/redis/client";
import type { IdempotentRecord } from "@/lib/idempotency/types";
import { DEFAULT_IDEMPOTENCY_TTL_SECONDS } from "@/lib/idempotency/types";

type MemoryEntry = {
  record: IdempotentRecord;
  expiresAt: number;
};

const memoryStore = new Map<string, MemoryEntry>();

function cleanupMemoryStore(): void {
  const now = Date.now();

  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
}

function getTtlSeconds(): number {
  const configured = process.env.IDEMPOTENCY_TTL_SECONDS;

  if (!configured) {
    return DEFAULT_IDEMPOTENCY_TTL_SECONDS;
  }

  const parsed = Number.parseInt(configured, 10);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_IDEMPOTENCY_TTL_SECONDS;
}

export async function readIdempotentRecord(
  redisKey: string,
): Promise<IdempotentRecord | null> {
  const redis = getRedisOrNull();

  if (redis) {
    return (await redis.get<IdempotentRecord>(redisKey)) ?? null;
  }

  cleanupMemoryStore();
  const entry = memoryStore.get(redisKey);

  if (!entry || entry.expiresAt <= Date.now()) {
    memoryStore.delete(redisKey);
    return null;
  }

  return entry.record;
}

export async function writeIdempotentRecord(
  redisKey: string,
  record: IdempotentRecord,
): Promise<void> {
  const ttl = getTtlSeconds();
  const redis = getRedisOrNull();

  if (redis) {
    await redis.set(redisKey, record, { ex: ttl });
    return;
  }

  memoryStore.set(redisKey, {
    record,
    expiresAt: Date.now() + ttl * 1000,
  });
}

export async function acquireIdempotentLock(
  redisKey: string,
  record: IdempotentRecord,
): Promise<boolean> {
  const ttl = getTtlSeconds();
  const redis = getRedisOrNull();

  if (redis) {
    const result = await redis.set(redisKey, record, {
      nx: true,
      ex: ttl,
    });

    return result === "OK";
  }

  cleanupMemoryStore();

  if (memoryStore.has(redisKey)) {
    return false;
  }

  memoryStore.set(redisKey, {
    record,
    expiresAt: Date.now() + ttl * 1000,
  });

  return true;
}

export function buildRedisKey(scope: string, idempotencyKey: string): string {
  return `idempotency:${scope}:${idempotencyKey}`;
}
