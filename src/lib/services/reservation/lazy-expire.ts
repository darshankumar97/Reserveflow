import { ReservationStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { expireReservation } from "@/lib/services/reservation/expire-reservation";

/**
 * Lazily expires a pending reservation past its TTL.
 * Safe to call on reads and mutating actions in serverless environments
 * where background schedulers may not run continuously.
 */
export async function lazyExpireIfNeeded(reservationId: string): Promise<boolean> {
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!reservation) {
    return false;
  }

  if (reservation.status !== ReservationStatus.PENDING) {
    return false;
  }

  if (reservation.expiresAt > new Date()) {
    return false;
  }

  await expireReservation({ reservationId });

  return true;
}
