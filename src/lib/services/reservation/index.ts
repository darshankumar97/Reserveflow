export { createReservation } from "@/lib/services/reservation/create-reservation";
export { confirmReservation } from "@/lib/services/reservation/confirm-reservation";
export {
  releaseReservation,
  type ReleaseReason,
} from "@/lib/services/reservation/release-reservation";
export {
  expireReservation,
  expireStaleReservations,
} from "@/lib/services/reservation/expire-reservation";
export { lazyExpireIfNeeded } from "@/lib/services/reservation/lazy-expire";

export {
  InsufficientInventoryError,
  InvalidReservationStateError,
  InventoryNotFoundError,
  ProductNotFoundError,
  ReservationAlreadyConfirmedError,
  ReservationAlreadyReleasedError,
  ReservationDomainError,
  ReservationExpiredError,
  ReservationNotFoundError,
  WarehouseNotFoundError,
  isReservationDomainError,
} from "@/lib/services/reservation/errors";

export {
  RELEASE_REASON_MAP,
  RESERVATION_TTL_MS,
  type ConfirmReservationInput,
  type CreateReservationInput,
  type ExpireReservationInput,
  type ReleaseReasonInput,
  type ReleaseReservationInput,
  type ReservationDetails,
} from "@/lib/services/reservation/types";

export { computeAvailable } from "@/lib/services/reservation/inventory-atomic";
