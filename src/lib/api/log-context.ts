import { apiLogger } from "@/lib/api/logger";

type ReservationLogContext = {
  requestId: string;
  actionType: string;
  reservationId?: string;
  reservationReference?: string;
  warehouseId?: string;
  productId?: string;
  inventoryId?: string;
  durationMs?: number;
  replayed?: boolean;
};

export function logReservationAction(context: ReservationLogContext): void {
  apiLogger.info("reservation.action", context);
}

export function logInventoryAction(
  context: Omit<ReservationLogContext, "reservationId" | "reservationReference"> & {
    warehouseId: string;
    productId: string;
    inventoryId?: string;
  },
): void {
  apiLogger.info("inventory.action", context);
}
