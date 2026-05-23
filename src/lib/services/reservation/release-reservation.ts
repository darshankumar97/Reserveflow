import { ReservationStatus, type ReleaseReason } from "@prisma/client";

import { db } from "@/lib/db";
import { lazyExpireIfNeeded } from "@/lib/services/reservation/lazy-expire";
import { atomicDecrementReserved } from "@/lib/services/reservation/inventory-atomic";
import {
  InvalidReservationStateError,
  ReservationNotFoundError,
} from "@/lib/services/reservation/errors";
import { toReservationDetails } from "@/lib/services/reservation/mappers";
import type {
  ReleaseReservationInput,
  ReservationDetails,
} from "@/lib/services/reservation/types";

function isTerminalStatus(status: ReservationStatus): boolean {
  return (
    status === ReservationStatus.RELEASED ||
    status === ReservationStatus.EXPIRED
  );
}

/**
 * Idempotent release for pending reservations.
 * Frees reserved stock and marks the reservation as released.
 */
export async function releaseReservation(
  input: ReleaseReservationInput,
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

    if (isTerminalStatus(reservation.status)) {
      const inventory = await tx.inventory.findUniqueOrThrow({
        where: {
          warehouseId_productId: {
            warehouseId: reservation.warehouseId,
            productId: reservation.productId,
          },
        },
      });

      return toReservationDetails(reservation, reservation.product, inventory);
    }

    if (reservation.status === ReservationStatus.CONFIRMED) {
      throw new InvalidReservationStateError(
        "Confirmed reservations cannot be released through this operation",
      );
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

    const now = new Date();

    const stateUpdate = await tx.reservation.updateMany({
      where: {
        id: reservation.id,
        status: ReservationStatus.PENDING,
      },
      data: {
        status: ReservationStatus.RELEASED,
        releaseReason: input.reason,
        releasedAt: now,
      },
    });

    if (stateUpdate.count === 0) {
      const current = await tx.reservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });

      if (isTerminalStatus(current.status)) {
        const currentInventory = await tx.inventory.findUniqueOrThrow({
          where: { id: inventory.id },
        });

        return toReservationDetails(
          current,
          reservation.product,
          currentInventory,
        );
      }

      throw new InvalidReservationStateError(
        `Cannot release reservation in ${current.status} state`,
      );
    }

    const inventoryRows = await atomicDecrementReserved(
      tx,
      inventory.id,
      reservation.quantity,
    );

    if (inventoryRows === 0) {
      throw new InvalidReservationStateError(
        "Failed to release reserved inventory — reserved quantity inconsistent",
      );
    }

    const [released, updatedInventory] = await Promise.all([
      tx.reservation.findUniqueOrThrow({
        where: { id: reservation.id },
      }),
      tx.inventory.findUniqueOrThrow({
        where: { id: inventory.id },
      }),
    ]);

    return toReservationDetails(
      released,
      reservation.product,
      updatedInventory,
    );
  });
}

export type { ReleaseReason };
