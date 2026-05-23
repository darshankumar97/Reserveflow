import type { ReservationStatus } from "@prisma/client";

export type DashboardStats = {
  totalProducts: number;
  totalOnHand: number;
  totalReserved: number;
  activeReservations: number;
};

export type InventoryRow = {
  id: string;
  sku: string;
  name: string;
  warehouseCode: string;
  totalQuantity: number;
  reservedQuantity: number;
  available: number;
};

export type ReservationRow = {
  id: string;
  reference: string | null;
  productSku: string;
  productName: string;
  quantity: number;
  status: ReservationStatus;
  createdAt: Date;
};
