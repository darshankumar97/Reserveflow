import { ReservationStatus } from "@prisma/client";

import { db } from "@/lib/db";
import {
  atomicIncrementReserved,
  computeAvailable,
} from "@/lib/services/reservation/inventory-atomic";
import {
  InsufficientInventoryError,
  InvalidReservationStateError,
  InventoryNotFoundError,
  ProductNotFoundError,
  WarehouseNotFoundError,
} from "@/lib/services/reservation/errors";
import { toReservationDetails } from "@/lib/services/reservation/mappers";
import {
  RESERVATION_TTL_MS,
  type CreateReservationInput,
  type ReservationDetails,
} from "@/lib/services/reservation/types";

function assertPositiveQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new InvalidReservationStateError(
      "Quantity must be a positive integer",
    );
  }
}

export async function createReservation(
  input: CreateReservationInput,
): Promise<ReservationDetails> {
  assertPositiveQuantity(input.quantity);

  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);

  return db.$transaction(async (tx) => {
    const warehouse = await tx.warehouse.findUnique({
      where: { id: input.warehouseId },
      select: { id: true },
    });

    if (!warehouse) {
      throw new WarehouseNotFoundError();
    }

    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { id: true, sku: true, name: true },
    });

    if (!product) {
      throw new ProductNotFoundError();
    }

    const inventory = await tx.inventory.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: input.warehouseId,
          productId: input.productId,
        },
      },
    });

    if (!inventory) {
      throw new InventoryNotFoundError();
    }

    // Concurrency-safe: single UPDATE guards against overselling the last unit.
    const rowsUpdated = await atomicIncrementReserved(
      tx,
      inventory.id,
      input.quantity,
    );

    if (rowsUpdated === 0) {
      const current = await tx.inventory.findUniqueOrThrow({
        where: { id: inventory.id },
      });

      throw new InsufficientInventoryError(
        "Insufficient inventory to complete the reservation",
        computeAvailable(current.totalQuantity, current.reservedQuantity),
      );
    }

    const reservation = await tx.reservation.create({
      data: {
        warehouseId: input.warehouseId,
        productId: input.productId,
        quantity: input.quantity,
        status: ReservationStatus.PENDING,
        reference: input.reference,
        expiresAt,
      },
    });

    const updatedInventory = await tx.inventory.findUniqueOrThrow({
      where: { id: inventory.id },
    });

    return toReservationDetails(reservation, product, updatedInventory);
  });
}
