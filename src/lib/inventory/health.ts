export const LOW_STOCK_THRESHOLD = 10;
export const LOW_STOCK_RATIO = 0.1;

export type InventoryHealth = "healthy" | "low_stock" | "fully_reserved";

export function getInventoryHealth(
  totalQuantity: number,
  reservedQuantity: number,
): InventoryHealth {
  const available = totalQuantity - reservedQuantity;

  if (totalQuantity <= 0) {
    return "fully_reserved";
  }

  if (available <= 0) {
    return "fully_reserved";
  }

  const ratio = available / totalQuantity;

  if (available <= LOW_STOCK_THRESHOLD || ratio <= LOW_STOCK_RATIO) {
    return "low_stock";
  }

  return "healthy";
}

export const inventoryHealthLabel: Record<InventoryHealth, string> = {
  healthy: "Healthy",
  low_stock: "Low stock",
  fully_reserved: "Fully reserved",
};
