import { apiLogger } from "@/lib/api/logger";
import { getHttpStatusForError, mapDomainErrorToResponse } from "@/lib/api/map-domain-error";
import type { ApiSuccessResponse } from "@/lib/api/response";
import { IdempotencyConflictError } from "@/lib/idempotency/errors";
import { getCachedResponse, waitForCachedResponse } from "@/lib/idempotency/get-cached-response";
import { hashRequestPayload } from "@/lib/idempotency/hash";
import {
  acquireIdempotentLock,
  buildRedisKey,
  readIdempotentRecord,
} from "@/lib/idempotency/store";
import { saveIdempotentResponse } from "@/lib/idempotency/save-idempotent-response";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/idempotency/types";

export type IdempotentHttpResult = {
  httpStatus: number;
  responseBody: string;
  replayed: boolean;
};

type WithIdempotencyOptions<T> = {
  request: Request;
  scope: string;
  requestId: string;
  requestPayload: string;
  execute: () => Promise<T>;
  buildSuccessBody: (data: T) => ApiSuccessResponse<T>;
};

function attachReplayMeta(
  responseBody: string,
  replayed: boolean,
  requestId: string,
): string {
  if (!replayed) {
    return responseBody;
  }

  const parsed = JSON.parse(responseBody) as Record<string, unknown>;

  parsed.meta = {
    ...(typeof parsed.meta === "object" && parsed.meta !== null
      ? (parsed.meta as Record<string, unknown>)
      : {}),
    requestId,
    replayed: true,
  };

  return JSON.stringify(parsed);
}

export async function withIdempotency<T>(
  options: WithIdempotencyOptions<T>,
): Promise<IdempotentHttpResult> {
  const idempotencyKey = options.request.headers
    .get(IDEMPOTENCY_KEY_HEADER)
    ?.trim();

  if (!idempotencyKey) {
    const data = await options.execute();
    const responseBody = JSON.stringify(options.buildSuccessBody(data));

    return {
      httpStatus: 200,
      responseBody,
      replayed: false,
    };
  }

  const requestHash = hashRequestPayload(options.requestPayload);
  const redisKey = buildRedisKey(options.scope, idempotencyKey);

  const cached = await getCachedResponse(redisKey, requestHash);

  if (cached) {
    apiLogger.info("idempotency.replay", {
      requestId: options.requestId,
      scope: options.scope,
      idempotencyKey,
      actionType: options.scope,
    });

    return {
      httpStatus: cached.httpStatus,
      responseBody: attachReplayMeta(
        cached.body,
        true,
        options.requestId,
      ),
      replayed: true,
    };
  }

  const lockAcquired = await acquireIdempotentLock(redisKey, {
    requestHash,
    status: "processing",
    httpStatus: 0,
    body: "",
    createdAt: new Date().toISOString(),
  });

  if (!lockAcquired) {
    const waited = await waitForCachedResponse(redisKey, requestHash);

    if (waited) {
      return {
        httpStatus: waited.httpStatus,
        responseBody: attachReplayMeta(
          waited.body,
          true,
          options.requestId,
        ),
        replayed: true,
      };
    }

    const existing = await readIdempotentRecord(redisKey);

    if (existing && existing.requestHash !== requestHash) {
      throw new IdempotencyConflictError();
    }

    throw new IdempotencyConflictError(
      "Concurrent idempotent request could not be completed in time",
    );
  }

  const startedAt = Date.now();

  try {
    const data = await options.execute();
    const responseBody = JSON.stringify(options.buildSuccessBody(data));

    await saveIdempotentResponse(redisKey, {
      requestHash,
      httpStatus: 200,
      body: responseBody,
    });

    apiLogger.info("idempotency.stored", {
      requestId: options.requestId,
      scope: options.scope,
      idempotencyKey,
      actionType: options.scope,
      durationMs: Date.now() - startedAt,
    });

    return {
      httpStatus: 200,
      responseBody,
      replayed: false,
    };
  } catch (error) {
    const errorResponse = mapDomainErrorToResponse(error, options.requestId);
    const httpStatus = getHttpStatusForError(errorResponse);
    const responseBody = JSON.stringify(errorResponse);

    if (httpStatus < 500) {
      await saveIdempotentResponse(redisKey, {
        requestHash,
        httpStatus,
        body: responseBody,
      });

      return {
        httpStatus,
        responseBody,
        replayed: false,
      };
    }

    throw error;
  }
}
