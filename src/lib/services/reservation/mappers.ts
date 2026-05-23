import type { Inventory, Product, Reservation } from "@prisma/client";

import { computeAvailable } from "@/lib/services/reservation/inventory-atomic";
import type { ReservationDetails } from "@/lib/services/reservation/types";

export function toReservationDetails(
  reservation: Reservation,
  product: Pick<Product, "sku" | "name">,
  inventory: Pick<Inventory, "totalQuantity" | "reservedQuantity">,
): ReservationDetails {
  return {
    id: reservation.id,
    warehouseId: reservation.warehouseId,
    productId: reservation.productId,
    productSku: product.sku,
    productName: product.name,
    quantity: reservation.quantity,
    status: reservation.status,
    reference: reservation.reference,
    releaseReason: reservation.releaseReason,
    expiresAt: reservation.expiresAt,
    confirmedAt: reservation.confirmedAt,
    releasedAt: reservation.releasedAt,
    createdAt: reservation.createdAt,
    availableQuantity: computeAvailable(
      inventory.totalQuantity,
      inventory.reservedQuantity,
    ),
  };
}
