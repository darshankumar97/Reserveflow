"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InventoryItemDto } from "@/lib/data/catalog";
import { formatNumber } from "@/lib/utils";

type ReserveDialogProps = {
  open: boolean;
  item:
    | (InventoryItemDto & {
        warehouseCode: string;
        warehouseName: string;
      })
    | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
};

export function ReserveDialog({
  open,
  item,
  loading = false,
  onClose,
  onConfirm,
}: ReserveDialogProps) {
  const [quantity, setQuantity] = React.useState(1);

  if (!open || !item) {
    return null;
  }

  const invalidQuantity =
    !Number.isInteger(quantity) || quantity < 1 || quantity > item.available;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reserve-dialog-title"
        className="relative z-10 w-full max-w-md rounded-lg border bg-card p-6 shadow-lg"
      >
        <h2 id="reserve-dialog-title" className="text-base font-semibold">
          Reserve stock
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {item.productName} · {item.warehouseName} ({item.warehouseCode})
        </p>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Available</p>
              <p className="font-medium tabular-nums">
                {formatNumber(item.available)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Reserved</p>
              <p className="font-medium tabular-nums">
                {formatNumber(item.reservedQuantity)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-medium tabular-nums">
                {formatNumber(item.totalQuantity)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="reserve-quantity" className="text-sm font-medium">
              Quantity
            </label>
            <Input
              id="reserve-quantity"
              type="number"
              min={1}
              max={item.available}
              value={quantity}
              onChange={(event) =>
                setQuantity(Number.parseInt(event.target.value, 10) || 0)
              }
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(quantity)}
            disabled={invalidQuantity || loading}
          >
            {loading ? "Creating…" : "Create reservation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
