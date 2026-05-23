import { db } from "@/lib/db";
import {
  type InventoryHealth,
  getInventoryHealth,
} from "@/lib/inventory/health";
import { computeAvailable } from "@/lib/services/reservation";

export type ProductDto = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
};

export type WarehouseDto = {
  id: string;
  code: string;
  name: string;
};

export type InventoryItemDto = {
  id: string;
  warehouseId: string;
  productId: string;
  productSku: string;
  productName: string;
  totalQuantity: number;
  reservedQuantity: number;
  available: number;
  health: InventoryHealth;
};

export type WarehouseInventoryGroup = {
  warehouse: WarehouseDto;
  items: InventoryItemDto[];
};

export async function listProducts(): Promise<ProductDto[]> {
  return db.product.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      description: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function listWarehouses(): Promise<WarehouseDto[]> {
  return db.warehouse.findMany({
    select: {
      id: true,
      code: true,
      name: true,
    },
    orderBy: { code: "asc" },
  });
}

export async function getInventoryGroupedByWarehouse(): Promise<
  WarehouseInventoryGroup[]
> {
  const warehouses = await db.warehouse.findMany({
    orderBy: { code: "asc" },
    include: {
      inventories: {
        include: {
          product: {
            select: { id: true, sku: true, name: true },
          },
        },
        orderBy: { product: { name: "asc" } },
      },
    },
  });

  return warehouses.map((warehouse) => ({
    warehouse: {
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
    },
    items: warehouse.inventories.map((inventory) => ({
      id: inventory.id,
      warehouseId: inventory.warehouseId,
      productId: inventory.productId,
      productSku: inventory.product.sku,
      productName: inventory.product.name,
      totalQuantity: inventory.totalQuantity,
      reservedQuantity: inventory.reservedQuantity,
      available: computeAvailable(
        inventory.totalQuantity,
        inventory.reservedQuantity,
      ),
      health: getInventoryHealth(
        inventory.totalQuantity,
        inventory.reservedQuantity,
      ),
    })),
  }));
}
