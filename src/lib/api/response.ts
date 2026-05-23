import { NextResponse } from "next/server";

import { AppError, getErrorMessage, isAppError } from "@/lib/api/errors";

export type ApiMeta = {
  requestId?: string;
  [key: string]: unknown;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta?: ApiMeta;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiErrorResponse = {
  success: false;
  error: ApiErrorBody;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function ok<T>(
  data: T,
  options?: { meta?: ApiMeta; headers?: HeadersInit },
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(options?.meta ? { meta: options.meta } : {}),
    },
    { headers: options?.headers },
  );
}

export function errorBody(
  code: string,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(errorBody(code, message, details), { status });
}

export function fromAppError(error: AppError): NextResponse<ApiErrorResponse> {
  return fail(error.code, error.message, error.statusCode, error.details);
}

export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  if (isAppError(error)) {
    return fromAppError(error);
  }

  console.error("[api]", error);

  return fail(
    "INTERNAL_ERROR",
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : getErrorMessage(error),
    500,
  );
}
