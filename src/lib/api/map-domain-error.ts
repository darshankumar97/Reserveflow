import { ZodError } from "zod";

import { ValidationError, isAppError } from "@/lib/api/errors";
import { errorBody, type ApiErrorResponse } from "@/lib/api/response";
import {
  IdempotencyConflictError,
  IdempotencyInProgressError,
} from "@/lib/idempotency/errors";
import {
  InsufficientInventoryError,
  InvalidReservationStateError,
  InventoryNotFoundError,
  ProductNotFoundError,
  ReservationAlreadyConfirmedError,
  ReservationAlreadyReleasedError,
  ReservationExpiredError,
  ReservationNotFoundError,
  WarehouseNotFoundError,
  isReservationDomainError,
} from "@/lib/services/reservation";

export function mapDomainErrorToResponse(
  error: unknown,
  requestId: string,
): ApiErrorResponse {
  if (error instanceof IdempotencyConflictError) {
    return errorBody(error.code, error.message);
  }

  if (error instanceof IdempotencyInProgressError) {
    return errorBody(error.code, error.message);
  }

  if (error instanceof ZodError) {
    const validation = new ValidationError("Request validation failed", {
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });

    return errorBody(
      validation.code,
      validation.message,
      validation.details,
    );
  }

  if (isAppError(error)) {
    return errorBody(error.code, error.message, error.details);
  }

  if (error instanceof InsufficientInventoryError) {
    return errorBody(error.code, error.message, {
      availableQuantity: error.availableQuantity,
    });
  }

  if (error instanceof ReservationExpiredError) {
    return errorBody(error.code, error.message);
  }

  if (
    error instanceof ReservationNotFoundError ||
    error instanceof ProductNotFoundError ||
    error instanceof WarehouseNotFoundError ||
    error instanceof InventoryNotFoundError
  ) {
    return errorBody(error.code, error.message);
  }

  if (
    error instanceof InvalidReservationStateError ||
    error instanceof ReservationAlreadyConfirmedError ||
    error instanceof ReservationAlreadyReleasedError
  ) {
    return errorBody(error.code, error.message);
  }

  if (isReservationDomainError(error)) {
    return errorBody(error.code, error.message);
  }

  return errorBody(
    "INTERNAL_ERROR",
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : error instanceof Error
        ? error.message
        : "Internal server error",
    process.env.NODE_ENV === "production" ? undefined : { requestId },
  );
}

export function getHttpStatusForError(body: ApiErrorResponse): number {
  const statusByCode: Record<string, number> = {
    VALIDATION_ERROR: 400,
    INVALID_RESERVATION_STATE: 400,
    RESERVATION_ALREADY_CONFIRMED: 400,
    RESERVATION_ALREADY_RELEASED: 400,
    INSUFFICIENT_INVENTORY: 409,
    RESERVATION_EXPIRED: 410,
    RESERVATION_NOT_FOUND: 404,
    PRODUCT_NOT_FOUND: 404,
    WAREHOUSE_NOT_FOUND: 404,
    INVENTORY_NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
    IDEMPOTENCY_CONFLICT: 422,
    IDEMPOTENCY_IN_PROGRESS: 409,
  };

  return statusByCode[body.error.code] ?? 400;
}
