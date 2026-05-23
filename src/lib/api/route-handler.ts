import { NextResponse } from "next/server";

import { apiLogger } from "@/lib/api/logger";
import {
  getHttpStatusForError,
  mapDomainErrorToResponse,
} from "@/lib/api/map-domain-error";
import {
  REQUEST_ID_HEADER,
  getRequestContextFromHeaders,
} from "@/lib/api/request-context";
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ok,
} from "@/lib/api/response";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type ApiHandler<T> = (
  request: Request,
  context: RouteContext,
  meta: { requestId: string },
) => Promise<T>;

export function withApiHandler<T>(handler: ApiHandler<T>) {
  return async (
    request: Request,
    context: RouteContext,
  ): Promise<NextResponse<ApiSuccessResponse<T> | ApiErrorResponse>> => {
    const { requestId } = getRequestContextFromHeaders(request);
    const startedAt = Date.now();

    apiLogger.info("api.request.start", {
      requestId,
      method: request.method,
      path: new URL(request.url).pathname,
    });

    try {
      const data = await handler(request, context, { requestId });
      const response = ok(data, {
        meta: { requestId },
        headers: {
          [REQUEST_ID_HEADER]: requestId,
        },
      });

      apiLogger.info("api.request.success", {
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        durationMs: Date.now() - startedAt,
      });

      return response;
    } catch (error) {
      apiLogger.error("api.request.error", {
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
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
