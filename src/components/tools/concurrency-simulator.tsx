"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InventoryItemDto } from "@/lib/data/catalog";
import { ApiRequestError } from "@/lib/api/client";
import { useToast } from "@/components/providers/toast-provider";

type SimulationResult = {
  attempt: number;
  status: "success" | "conflict" | "error";
  reservationId?: string;
  message: string;
};

type ConcurrencySimulatorProps = {
  items: Array<
    InventoryItemDto & {
      warehouseCode: string;
      warehouseName: string;
    }
  >;
};

export function ConcurrencySimulator({ items }: ConcurrencySimulatorProps) {
  const { toast } = useToast();
  const [inventoryId, setInventoryId] = React.useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = React.useState(1);
  const [attempts, setAttempts] = React.useState(5);
  const [running, setRunning] = React.useState(false);
  const [results, setResults] = React.useState<SimulationResult[]>([]);

  const selected = items.find((item) => item.id === inventoryId);

  const runSimulation = async () => {
    if (!selected) {
      return;
    }

    setRunning(true);
    setResults([]);

    const attemptCount = Math.max(2, Math.min(attempts, 20));

    const requests = Array.from({ length: attemptCount }, (_, index) =>
      (async (): Promise<SimulationResult> => {
        const attempt = index + 1;

        try {
          const response = await fetch("/api/reservations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-request-id": crypto.randomUUID(),
              "Idempotency-Key": crypto.randomUUID(),
            },
            body: JSON.stringify({
              warehouseId: selected.warehouseId,
              productId: selected.productId,
              quantity,
            }),
          });

          const json = (await response.json()) as {
            success: boolean;
            data?: { reservation: { id: string } };
            error?: { message: string };
          };

          if (response.status === 409 || json.error?.message) {
            return {
              attempt,
              status: "conflict",
              message: json.error?.message ?? "Insufficient inventory",
            };
          }

          if (!json.success) {
            return {
              attempt,
              status: "error",
              message: json.error?.message ?? "Request failed",
            };
          }

          return {
            attempt,
            status: "success",
            reservationId: json.data?.reservation.id,
            message: "Reservation created",
          };
        } catch (error) {
          return {
            attempt,
            status: "error",
            message:
              error instanceof ApiRequestError
                ? error.message
                : "Network error",
          };
        }
      })(),
    );

    const settled = await Promise.all(requests);
    setResults(settled);
    setRunning(false);

    const successes = settled.filter((result) => result.status === "success").length;
    const conflicts = settled.filter((result) => result.status === "conflict").length;

    toast({
      title: "Simulation complete",
      description: `${successes} succeeded, ${conflicts} conflict(s), ${attemptCount} total attempts`,
      variant:
        successes === 1 && conflicts === attemptCount - 1 ? "success" : "error",
    });
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Seed inventory before running concurrency simulations.
      </p>
    );
  }

  return (
    <div className="space-y-6 rounded-lg border bg-card p-6">
      <div>
        <h3 className="text-sm font-semibold">Concurrency simulator</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Fires parallel reservation requests with unique idempotency keys to
          verify only one succeeds when stock is limited.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="sim-inventory" className="text-sm font-medium">
            Inventory row
          </label>
          <select
            id="sim-inventory"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={inventoryId}
            onChange={(event) => setInventoryId(event.target.value)}
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.warehouseCode} · {item.productSku} (available {item.available})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="sim-quantity" className="text-sm font-medium">
            Quantity per attempt
          </label>
          <Input
            id="sim-quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(event) =>
              setQuantity(Number.parseInt(event.target.value, 10) || 1)
            }
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="sim-attempts" className="text-sm font-medium">
            Parallel attempts
          </label>
          <Input
            id="sim-attempts"
            type="number"
            min={2}
            max={20}
            value={attempts}
            onChange={(event) =>
              setAttempts(Number.parseInt(event.target.value, 10) || 2)
            }
          />
        </div>
      </div>

      {selected ? (
        <p className="text-xs text-muted-foreground">
          Targeting {selected.productName} at {selected.warehouseName} with{" "}
          {selected.available} unit(s) currently available.
        </p>
      ) : null}

      <Button onClick={() => void runSimulation()} disabled={running || !selected}>
        {running ? "Running simulation…" : "Run parallel reservations"}
      </Button>

      {results.length > 0 ? (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Attempt</th>
                <th className="px-3 py-2 font-medium">Outcome</th>
                <th className="px-3 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.attempt} className="border-b last:border-b-0">
                  <td className="px-3 py-2 tabular-nums">#{result.attempt}</td>
                  <td className="px-3 py-2 capitalize">{result.status}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {result.message}
                    {result.reservationId
                      ? ` · ${result.reservationId.slice(0, 8)}`
                      : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
