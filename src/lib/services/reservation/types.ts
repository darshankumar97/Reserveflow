import type { ReleaseReason, ReservationStatus } from "@prisma/client";

export const RESERVATION_TTL_MS = 10 * 60 * 1000;

export type CreateReservationInput = {
  warehouseId: string;
  productId: string;
  quantity: number;
  reference?: string;
};

export type ConfirmReservationInput = {
  reservationId: string;
};

export type ReleaseReservationInput = {
  reservationId: string;
  reason: ReleaseReason;
};

export type ExpireReservationInput = {
  reservationId: string;
};

export type ReservationDetails = {
  id: string;
  warehouseId: string;
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  status: ReservationStatus;
  reference: string | null;
  releaseReason: ReleaseReason | null;
  expiresAt: Date;
  confirmedAt: Date | null;
  releasedAt: Date | null;
  createdAt: Date;
  availableQuantity: number;
};

export type ReleaseReasonInput = "cancelled" | "expired" | "payment_failed";

export const RELEASE_REASON_MAP = {
  cancelled: "CANCELLED",
  expired: "EXPIRED",
  payment_failed: "PAYMENT_FAILED",
} as const satisfies Record<ReleaseReasonInput, ReleaseReason>;
