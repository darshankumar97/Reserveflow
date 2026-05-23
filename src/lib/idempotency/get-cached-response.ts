import { IdempotencyConflictError } from "@/lib/idempotency/errors";
import { readIdempotentRecord } from "@/lib/idempotency/store";
import type { IdempotentRecord } from "@/lib/idempotency/types";

export type CachedIdempotentResponse = {
  httpStatus: number;
  body: string;
  replayed: true;
};

export async function getCachedResponse(
  redisKey: string,
  requestHash: string,
): Promise<CachedIdempotentResponse | null> {
  const record = await readIdempotentRecord(redisKey);

  if (!record) {
    return null;
  }

  if (record.requestHash !== requestHash) {
    throw new IdempotencyConflictError();
  }

  if (record.status === "processing") {
    return null;
  }

  return {
    httpStatus: record.httpStatus,
    body: record.body,
    replayed: true,
  };
}

export async function waitForCachedResponse(
  redisKey: string,
  requestHash: string,
  options?: { maxAttempts?: number; delayMs?: number },
): Promise<CachedIdempotentResponse | null> {
  const maxAttempts = options?.maxAttempts ?? 15;
  const delayMs = options?.delayMs ?? 100;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const cached = await getCachedResponse(redisKey, requestHash);

    if (cached) {
      return cached;
    }

    const record = await readIdempotentRecord(redisKey);

    if (record && record.requestHash !== requestHash) {
      throw new IdempotencyConflictError();
    }

    if (!record) {
      return null;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return null;
}

export function isProcessingRecord(record: IdempotentRecord | null): boolean {
  return record?.status === "processing";
}
