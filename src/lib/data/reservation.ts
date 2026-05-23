import { ReservationStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { computeAvailable } from "@/lib/services/reservation";
import { ReservationNotFoundError } from "@/lib/services/reservation/errors";
import { lazyExpireIfNeeded } from "@/lib/services/reservation/lazy-expire";

export type ReservationTimelineEvent = {
  type: "created" | "confirmed" | "released" | "expired";
  label: string;
  timestamp: Date;
};

export type ReservationView = {
  id: string;
  reference: string | null;
  status: string;
  quantity: number;
  expiresAt: Date;
  confirmedAt: Date | null;
  releasedAt: Date | null;
  releaseReason: string | null;
  createdAt: Date;
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  product: {
    id: string;
    sku: string;
    name: string;
  };
  availableQuantity: number;
  timeline: ReservationTimelineEvent[];
};

function buildTimeline(reservation: {
  status: ReservationStatus;
  createdAt: Date;
  confirmedAt: Date | null;
  releasedAt: Date | null;
  releaseReason: string | null;
}): ReservationTimelineEvent[] {
  const events: ReservationTimelineEvent[] = [
    {
      type: "created",
      label: "Reservation created",
      timestamp: reservation.createdAt,
    },
  ];

  if (reservation.confirmedAt) {
    events.push({
      type: "confirmed",
      label: "Purchase confirmed",
      timestamp: reservation.confirmedAt,
    });
  }

  if (reservation.status === ReservationStatus.EXPIRED && reservation.releasedAt) {
    events.push({
      type: "expired",
      label: "Reservation expired",
      timestamp: reservation.releasedAt,
    });
  }

  if (
    reservation.status === ReservationStatus.RELEASED &&
    reservation.releasedAt
  ) {
    const reason = reservation.releaseReason?.toLowerCase() ?? "released";

    events.push({
      type: "released",
      label: `Reservation released (${reason.replaceAll("_", " ")})`,
      timestamp: reservation.releasedAt,
    });
  }

  return events.sort(
    (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
  );
}

export async function getReservationById(
  id: string,
): Promise<ReservationView> {
  await lazyExpireIfNeeded(id);

  const reservation = await db.reservation.findUnique({
    where: { id },
    include: {
      warehouse: { select: { id: true, code: true, name: true } },
      product: { select: { id: true, sku: true, name: true } },
    },
  });

  if (!reservation) {
    throw new ReservationNotFoundError();
  }

  const inventory = await db.inventory.findUnique({
    where: {
      warehouseId_productId: {
        warehouseId: reservation.warehouseId,
        productId: reservation.productId,
      },
    },
  });

  const availableQuantity = inventory
    ? computeAvailable(inventory.totalQuantity, inventory.reservedQuantity)
    : 0;

  return {
    id: reservation.id,
    reference: reservation.reference,
    status: reservation.status,
    quantity: reservation.quantity,
    expiresAt: reservation.expiresAt,
    confirmedAt: reservation.confirmedAt,
    releasedAt: reservation.releasedAt,
    releaseReason: reservation.releaseReason,
    createdAt: reservation.createdAt,
    warehouse: reservation.warehouse,
    product: reservation.product,
    availableQuantity,
    timeline: buildTimeline(reservation),
  };
}
