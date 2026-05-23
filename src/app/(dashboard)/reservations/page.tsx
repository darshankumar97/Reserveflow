import Link from "next/link";

import { Header } from "@/components/layout/header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getReservationRows } from "@/lib/data/dashboard";
import { formatDate } from "@/lib/utils";

export default async function ReservationsPage() {
  const rows = await getReservationRows();

  return (
    <>
      <Header
        title="Reservations"
        description="Active and historical stock reservations."
      />
      <div className="flex flex-1 flex-col p-6">
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No reservations yet. Reserve stock from the inventory page.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/reservations/${row.id}`}
                          className="font-mono text-xs font-medium hover:underline"
                        >
                          {row.reference ?? row.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/reservations/${row.id}`}
                          className="hover:underline"
                        >
                          <div>{row.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.productSku}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{row.quantity}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(row.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
