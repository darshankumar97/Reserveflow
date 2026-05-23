import { ReservationStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { lazyExpireIfNeeded } from "@/lib/services/reservation/lazy-expire";
import { atomicConfirmAllocation } from "@/lib/services/reservation/inventory-atomic";
import {
  InsufficientInventoryError,
  InvalidReservationStateError,
  ReservationAlreadyConfirmedError,
  ReservationAlreadyReleasedError,
  ReservationExpiredError,
  ReservationNotFoundError,
} from "@/lib/services/reservation/errors";
import { toReservationDetails } from "@/lib/services/reservation/mappers";
import type {
  ConfirmReservationInput,
  ReservationDetails,
} from "@/lib/services/reservation/types";

export async function confirmReservation(
  input: ConfirmReservationInput,
): Promise<ReservationDetails> {
  await lazyExpireIfNeeded(input.reservationId);

  return db.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: input.reservationId },
      include: {
        product: { select: { sku: true, name: true } },
      },
    });

    if (!reservation) {
      throw new ReservationNotFoundError();
    }

    if (reservation.status === ReservationStatus.CONFIRMED) {
      throw new ReservationAlreadyConfirmedError();
    }

    if (
      reservation.status === ReservationStatus.RELEASED ||
      reservation.status === ReservationStatus.EXPIRED
    ) {
      throw new ReservationAlreadyReleasedError(
        `Reservation is ${reservation.status.toLowerCase()} and cannot be confirmed`,
      );
    }

    const now = new Date();

    if (reservation.expiresAt <= now) {
      throw new ReservationExpiredError();
    }

    const inventory = await tx.inventory.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: reservation.warehouseId,
          productId: reservation.productId,
        },
      },
    });

    if (!inventory) {
      throw new InvalidReservationStateError(
        "Inventory record missing for this reservation",
      );
    }

    // Optimistic lock on reservation state before mutating inventory.
    const stateUpdate = await tx.reservation.updateMany({
      where: {
        id: reservation.id,
        status: ReservationStatus.PENDING,
        expiresAt: { gt: now },
      },
      data: {
        status: ReservationStatus.CONFIRMED,
        confirmedAt: now,
      },
    });

    if (stateUpdate.count === 0) {
      throw new ReservationExpiredError(
        "Reservation is no longer pending or has expired",
      );
    }

    const inventoryRows = await atomicConfirmAllocation(
      tx,
      inventory.id,
      reservation.quantity,
    );

    if (inventoryRows === 0) {
      throw new InsufficientInventoryError(
        "Inventory state is inconsistent with the reservation",
      );
    }

    const [confirmed, updatedInventory] = await Promise.all([
      tx.reservation.findUniqueOrThrow({
        where: { id: reservation.id },
      }),
      tx.inventory.findUniqueOrThrow({
        where: { id: inventory.id },
      }),
    ]);

    return toReservationDetails(
      confirmed,
      reservation.product,
      updatedInventory,
    );
  });
}
