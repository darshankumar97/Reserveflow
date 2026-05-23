import { NextResponse } from "next/server";

import { apiLogger } from "@/lib/api/logger";
import { logReservationAction } from "@/lib/api/log-context";
import { getHttpStatusForError, mapDomainErrorToResponse } from "@/lib/api/map-domain-error";
import {
  REQUEST_ID_HEADER,
  getRequestContextFromHeaders,
} from "@/lib/api/request-context";
import type { ApiSuccessResponse } from "@/lib/api/response";
import { withIdempotency } from "@/lib/idempotency";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type IdempotentRouteHandler<T> = (
  request: Request,
  context: RouteContext,
  meta: { requestId: string; requestBody: string },
) => Promise<T>;

type IdempotentRouteOptions = {
  getRequestPayload?: (
    request: Request,
    context: RouteContext,
  ) => Promise<string>;
};

export function withIdempotentPost<T>(
  scope: string,
  actionType: string,
  handler: IdempotentRouteHandler<T>,
  options?: IdempotentRouteOptions,
) {
  return async (
    request: Request,
    context: RouteContext,
  ): Promise<NextResponse> => {
    const { requestId } = getRequestContextFromHeaders(request);
    const startedAt = Date.now();
    const path = new URL(request.url).pathname;

    const requestBody = options?.getRequestPayload
      ? await options.getRequestPayload(request, context)
      : await request.text();

    apiLogger.info("api.request.start", {
      requestId,
      method: request.method,
      path,
      actionType,
    });

    try {
      const result = await withIdempotency({
        request,
        scope,
        requestId,
        requestPayload: requestBody,
        execute: () =>
          handler(request, context, { requestId, requestBody }),
        buildSuccessBody: (data) =>
          ({
            success: true,
            data,
            meta: { requestId },
          }) as ApiSuccessResponse<T>,
      });

      const response = NextResponse.json(JSON.parse(result.responseBody), {
        status: result.httpStatus,
        headers: {
          [REQUEST_ID_HEADER]: requestId,
          "Idempotent-Replayed": result.replayed ? "true" : "false",
        },
      });

      if (result.httpStatus < 400) {
        const body = JSON.parse(result.responseBody) as ApiSuccessResponse<T>;
        const reservation = (
          body.data as {
            reservation?: { id?: string; reference?: string | null };
          }
        ).reservation;

        logReservationAction({
          requestId,
          actionType,
          reservationId: reservation?.id,
          reservationReference: reservation?.reference ?? undefined,
          durationMs: Date.now() - startedAt,
          replayed: result.replayed,
        });
      }

      apiLogger.info("api.request.complete", {
        requestId,
        method: request.method,
        path,
        actionType,
        status: result.httpStatus,
        durationMs: Date.now() - startedAt,
        replayed: result.replayed,
      });

      return response;
    } catch (error) {
      apiLogger.error("api.request.error", {
        requestId,
        method: request.method,
        path,
        actionType,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      const body = mapDomainErrorToResponse(error, requestId);

      return NextResponse.json(body, {
        status: getHttpStatusForError(body),
        headers: {
          [REQUEST_ID_HEADER]: requestId,
        },
      });
    }
  };
}
