"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { InventoryHealthBadge } from "@/components/inventory/inventory-health-badge";
import { ReserveDialog } from "@/components/inventory/reserve-dialog";
import { Button } from "@/components/ui/button";
import type { InventoryItemDto, WarehouseInventoryGroup } from "@/lib/data/catalog";
import {
  ApiRequestError,
  createReservationApi,
  getApiErrorMessage,
} from "@/lib/api/client";
import { formatNumber } from "@/lib/utils";
import { useToast } from "@/components/providers/toast-provider";

type InventoryWorkspaceProps = {
  groups: WarehouseInventoryGroup[];
};

type ReserveTarget = InventoryItemDto & {
  warehouseCode: string;
  warehouseName: string;
};

export function InventoryWorkspace({ groups }: InventoryWorkspaceProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [reserveTarget, setReserveTarget] = React.useState<ReserveTarget | null>(
    null,
  );
  const [reservingId, setReservingId] = React.useState<string | null>(null);

  const handleReserve = async (quantity: number) => {
    if (!reserveTarget) {
      return;
    }

    setReservingId(reserveTarget.id);

    try {
      const reservation = await createReservationApi({
        warehouseId: reserveTarget.warehouseId,
        productId: reserveTarget.productId,
        quantity,
      });

      toast({
        title: "Reservation created",
        description: `Reference ${reservation.reference ?? reservation.id}`,
        variant: "success",
      });

      setReserveTarget(null);
      router.refresh();
      router.push(`/reservations/${reservation.id}`);
    } catch (error) {
      const message = getApiErrorMessage(error);

      toast({
        title:
          error instanceof ApiRequestError &&
          error.code === "INSUFFICIENT_INVENTORY"
            ? "Insufficient stock"
            : "Reservation failed",
        description: message,
        variant: "error",
      });

      if (
        error instanceof ApiRequestError &&
        error.code === "INSUFFICIENT_INVENTORY"
      ) {
        router.refresh();
      }
    } finally {
      setReservingId(null);
    }
  };

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-12 text-center">
        <p className="text-sm font-medium">No inventory records</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Run the database seed to load sample warehouse stock.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.warehouse.id} className="space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold">{group.warehouse.name}</h3>
                <p className="font-mono text-xs text-muted-foreground">
                  {group.warehouse.code}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {group.items.length} product
                {group.items.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">SKU</th>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      <th className="px-4 py-3 font-medium">Reserved</th>
                      <th className="px-4 py-3 font-medium">Available</th>
                      <th className="px-4 py-3 font-medium">Health</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-6 text-center text-muted-foreground"
                        >
                          No stock at this warehouse.
                        </td>
                      </tr>
                    ) : (
                      group.items.map((item) => {
                        const unavailable = item.available <= 0;
                        const isLoading = reservingId === item.id;

                        return (
                          <tr
                            key={item.id}
                            className="border-b last:border-b-0"
                          >
                            <td className="px-4 py-3 font-mono text-xs">
                              {item.productSku}
                            </td>
                            <td className="px-4 py-3">{item.productName}</td>
                            <td className="px-4 py-3 tabular-nums">
                              {formatNumber(item.totalQuantity)}
                            </td>
                            <td className="px-4 py-3 tabular-nums">
                              {formatNumber(item.reservedQuantity)}
                            </td>
                            <td className="px-4 py-3 tabular-nums font-medium">
                              {formatNumber(item.available)}
                            </td>
                            <td className="px-4 py-3">
                              <InventoryHealthBadge health={item.health} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={unavailable || isLoading}
                                onClick={() =>
                                  setReserveTarget({
                                    ...item,
                                    warehouseCode: group.warehouse.code,
                                    warehouseName: group.warehouse.name,
                                  })
                                }
                              >
                                {isLoading ? "Reserving…" : "Reserve"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ))}
      </div>

      <ReserveDialog
        key={reserveTarget?.id ?? "closed"}
        open={reserveTarget !== null}
        item={reserveTarget}
        loading={reservingId !== null}
        onClose={() => setReserveTarget(null)}
        onConfirm={handleReserve}
      />
    </>
  );
}
