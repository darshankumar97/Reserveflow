import { ReservationStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { computeAvailable } from "@/lib/services/reservation/inventory-atomic";
import type {
  DashboardStats,
  InventoryRow,
  ReservationRow,
} from "@/types/dashboard";

export async function getDashboardStats(): Promise<DashboardStats> {
  const [productCount, inventoryAgg, activeReservations] = await Promise.all([
    db.product.count(),
    db.inventory.aggregate({
      _sum: {
        totalQuantity: true,
        reservedQuantity: true,
      },
    }),
    db.reservation.count({
      where: {
        status: {
          in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        },
      },
    }),
  ]);

  return {
    totalProducts: productCount,
    totalOnHand: inventoryAgg._sum.totalQuantity ?? 0,
    totalReserved: inventoryAgg._sum.reservedQuantity ?? 0,
    activeReservations,
  };
}

export async function getInventoryRows(): Promise<InventoryRow[]> {
  const inventories = await db.inventory.findMany({
    include: {
      product: { select: { sku: true, name: true } },
      warehouse: { select: { code: true } },
    },
    orderBy: { product: { name: "asc" } },
  });

  return inventories.map((inventory) => ({
    id: inventory.id,
    sku: inventory.product.sku,
    name: inventory.product.name,
    warehouseCode: inventory.warehouse.code,
    totalQuantity: inventory.totalQuantity,
    reservedQuantity: inventory.reservedQuantity,
    available: computeAvailable(
      inventory.totalQuantity,
      inventory.reservedQuantity,
    ),
  }));
}

export async function getReservationRows(): Promise<ReservationRow[]> {
  const reservations = await db.reservation.findMany({
    include: {
      product: {
        select: { sku: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return reservations.map((reservation) => ({
    id: reservation.id,
    reference: reservation.reference,
    productSku: reservation.product.sku,
    productName: reservation.product.name,
    quantity: reservation.quantity,
    status: reservation.status,
    createdAt: reservation.createdAt,
  }));
}
