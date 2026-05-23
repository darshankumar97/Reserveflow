import { ReservationStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { atomicDecrementReserved } from "@/lib/services/reservation/inventory-atomic";
import {
  InvalidReservationStateError,
  ReservationNotFoundError,
} from "@/lib/services/reservation/errors";
import { toReservationDetails } from "@/lib/services/reservation/mappers";
import type {
  ExpireReservationInput,
  ReservationDetails,
} from "@/lib/services/reservation/types";

/**
 * Expires a pending reservation and returns reserved stock.
 * Safe to call multiple times — duplicate calls return the existing expired record.
 */
export async function expireReservation(
  input: ExpireReservationInput,
): Promise<ReservationDetails> {
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

    if (reservation.status === ReservationStatus.EXPIRED) {
      const currentInventory = await tx.inventory.findUniqueOrThrow({
        where: { id: inventory.id },
      });

      return toReservationDetails(
        reservation,
        reservation.product,
        currentInventory,
      );
    }

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new InvalidReservationStateError(
        `Only pending reservations can expire (current: ${reservation.status})`,
      );
    }

    const now = new Date();

    // Transition only if still pending — prevents double stock release on retry.
    const stateUpdate = await tx.reservation.updateMany({
      where: {
        id: reservation.id,
        status: ReservationStatus.PENDING,
      },
      data: {
        status: ReservationStatus.EXPIRED,
        releasedAt: now,
      },
    });

    if (stateUpdate.count === 0) {
      const current = await tx.reservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });

      if (current.status === ReservationStatus.EXPIRED) {
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
        `Cannot expire reservation in ${current.status} state`,
      );
    }

    const inventoryRows = await atomicDecrementReserved(
      tx,
      inventory.id,
      reservation.quantity,
    );

    if (inventoryRows === 0) {
      throw new InvalidReservationStateError(
        "Failed to release reserved inventory on expiration",
      );
    }

    const [expired, updatedInventory] = await Promise.all([
      tx.reservation.findUniqueOrThrow({
        where: { id: reservation.id },
      }),
      tx.inventory.findUniqueOrThrow({
        where: { id: inventory.id },
      }),
    ]);

    return toReservationDetails(
      expired,
      reservation.product,
      updatedInventory,
    );
  });
}

/**
 * Expires all pending reservations past their TTL.
 * Intended for scheduled jobs; each reservation is processed in its own transaction.
 */
export async function expireStaleReservations(): Promise<ReservationDetails[]> {
  const now = new Date();

  const stale = await db.reservation.findMany({
    where: {
      status: ReservationStatus.PENDING,
      expiresAt: { lte: now },
    },
    select: { id: true },
  });

  const results: ReservationDetails[] = [];

  for (const { id } of stale) {
    results.push(await expireReservation({ reservationId: id }));
  }

  return results;
}
