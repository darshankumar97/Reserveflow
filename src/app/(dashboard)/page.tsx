import Link from "next/link";

import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  getDashboardStats,
  getReservationRows,
} from "@/lib/data/dashboard";
import { formatDate } from "@/lib/utils";

export default async function OverviewPage() {
  const [stats, recentReservations] = await Promise.all([
    getDashboardStats(),
    getReservationRows(),
  ]);

  const latest = recentReservations.slice(0, 5);

  return (
    <>
      <Header
        title="Overview"
        description="Inventory and reservation snapshot for operations."
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Products" value={stats.totalProducts} />
          <StatCard
            label="On hand"
            value={stats.totalOnHand}
            hint="Total physical stock"
          />
          <StatCard
            label="Reserved"
            value={stats.totalReserved}
            hint="Allocated to reservations"
          />
          <StatCard
            label="Active reservations"
            value={stats.activeReservations}
            hint="Pending or confirmed"
          />
        </section>

        <section className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-medium">Recent reservations</h3>
          </div>
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
                {latest.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No reservations yet. Run the seed script to load sample data.
                    </td>
                  </tr>
                ) : (
                  latest.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link
                          href={`/reservations/${row.id}`}
                          className="hover:underline"
                        >
                          {row.reference ?? row.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div>{row.productName}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.productSku}
                        </div>
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
        </section>
      </div>
    </>
  );
}
