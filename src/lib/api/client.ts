import type { ReservationDetails } from "@/lib/services/reservation/types";

export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiResult<T> =
  | { success: true; data: T; meta?: { requestId?: string } }
  | { success: false; error: ApiErrorPayload; status: number };

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, error: ApiErrorPayload) {
    super(error.message);
    this.name = "ApiRequestError";
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

async function parseResponse<T>(response: Response): Promise<ApiResult<T>> {
  const json = (await response.json()) as {
    success: boolean;
    data?: T;
    error?: ApiErrorPayload;
    meta?: { requestId?: string };
  };

  if (!json.success) {
    return {
      success: false,
      error: json.error ?? {
        code: "INTERNAL_ERROR",
        message: "Request failed",
      },
      status: response.status,
    };
  }

  return {
    success: true,
    data: json.data as T,
    meta: json.meta,
  };
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const requestId = crypto.randomUUID();

  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-request-id": requestId,
      ...init?.headers,
    },
  });

  const result = await parseResponse<T>(response);

  if (!result.success) {
    throw new ApiRequestError(response.status, result.error);
  }

  return result.data;
}

export type CreateReservationPayload = {
  warehouseId: string;
  productId: string;
  quantity: number;
  reference?: string;
};

export async function createReservationApi(
  payload: CreateReservationPayload,
  idempotencyKey?: string,
) {
  const data = await apiRequest<{ reservation: ReservationDetails }>(
    "/api/reservations",
    {
      method: "POST",
      body: JSON.stringify(payload),
      headers: idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : undefined,
    },
  );

  return data.reservation;
}

export async function confirmReservationApi(
  id: string,
  idempotencyKey?: string,
) {
  const data = await apiRequest<{ reservation: ReservationDetails }>(
    `/api/reservations/${id}/confirm`,
    {
      method: "POST",
      headers: idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : undefined,
    },
  );

  return data.reservation;
}

export async function releaseReservationApi(
  id: string,
  reason: "cancelled" | "expired" | "payment_failed" = "cancelled",
) {
  const data = await apiRequest<{ reservation: ReservationDetails }>(
    `/api/reservations/${id}/release`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );

  return data.reservation;
}

export async function expireReservationApi(id: string) {
  const data = await apiRequest<{ reservation: ReservationDetails }>(
    `/api/reservations/${id}/expire`,
    { method: "POST" },
  );

  return data.reservation;
}

export async function fetchReservationApi(id: string) {
  const data = await apiRequest<{ reservation: ReservationViewSerialized }>(
    `/api/reservations/${id}`,
  );

  return data.reservation;
}

export type ReservationTimelineEventSerialized = {
  type: "created" | "confirmed" | "released" | "expired";
  label: string;
  timestamp: string;
};

export type ReservationViewSerialized = {
  id: string;
  reference: string | null;
  status: string;
  quantity: number;
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  releaseReason: string | null;
  createdAt: string;
  warehouse: { id: string; code: string; name: string };
  product: { id: string; sku: string; name: string };
  availableQuantity: number;
  timeline: ReservationTimelineEventSerialized[];
};

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === "INSUFFICIENT_INVENTORY") {
      const details = error.details as { availableQuantity?: number } | undefined;
      if (details?.availableQuantity !== undefined) {
        return `Insufficient stock. Only ${details.availableQuantity} unit(s) available.`;
      }
      return "Insufficient stock to complete this reservation.";
    }

    if (error.code === "RESERVATION_EXPIRED") {
      return "This reservation has expired.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
