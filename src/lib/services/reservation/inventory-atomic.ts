import type { Prisma } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;

/**
 * Atomically increases reserved stock only when available quantity is sufficient.
 * Available is always derived as total_quantity - reserved_quantity (never stored).
 *
 * Returns the number of rows updated (0 = insufficient stock, 1 = success).
 */
export async function atomicIncrementReserved(
  tx: TransactionClient,
  inventoryId: string,
  quantity: number,
): Promise<number> {
  const rowsAffected = await tx.$executeRaw`
    UPDATE inventory
    SET reserved_quantity = reserved_quantity + ${quantity}
    WHERE id = ${inventoryId}
      AND total_quantity - reserved_quantity >= ${quantity}
  `;

  return Number(rowsAffected);
}

/**
 * Releases a pending hold by decrementing reserved stock.
 * Guarded so reserved_quantity cannot go negative under concurrency.
 */
export async function atomicDecrementReserved(
  tx: TransactionClient,
  inventoryId: string,
  quantity: number,
): Promise<number> {
  const rowsAffected = await tx.$executeRaw`
    UPDATE inventory
    SET reserved_quantity = reserved_quantity - ${quantity}
    WHERE id = ${inventoryId}
      AND reserved_quantity >= ${quantity}
  `;

  return Number(rowsAffected);
}

/**
 * Confirms a reservation: converts a soft hold into a committed allocation.
 * Both total and reserved decrease — available (total - reserved) is unchanged.
 */
export async function atomicConfirmAllocation(
  tx: TransactionClient,
  inventoryId: string,
  quantity: number,
): Promise<number> {
  const rowsAffected = await tx.$executeRaw`
    UPDATE inventory
    SET
      total_quantity = total_quantity - ${quantity},
      reserved_quantity = reserved_quantity - ${quantity}
    WHERE id = ${inventoryId}
      AND reserved_quantity >= ${quantity}
      AND total_quantity >= ${quantity}
  `;

  return Number(rowsAffected);
}

export function computeAvailable(
  totalQuantity: number,
  reservedQuantity: number,
): number {
  return totalQuantity - reservedQuantity;
}
